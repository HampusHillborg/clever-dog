import { useEffect, useRef, useState } from 'react';
import { FaImage, FaTimes } from 'react-icons/fa';
import { getAllMessageThreads, sendStaffMessage } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import { pickPhoto } from '../../lib/photoPicker';
import { dayLabel, fmtHm, isLastOwnInSequence } from '../../lib/messageGrouping';

type Msg = {
  id: string;
  customer_id: string;
  dog_id: string | null;
  sender_role: string;
  sender_name: string | null;
  body: string;
  image_url: string | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
  customers: { name: string; email: string } | null;
  dogs: { name: string } | null;
};

const firstNameOf = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Personal';
  return fullName.split(' ')[0];
};

type Thread = {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  last_at: string;
  last_message: string;
  last_from_staff: boolean;
  unread_count: number;
};

export default function MessagesAdminTab() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [allMessages, setAllMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const all = (await getAllMessageThreads()) as unknown as Msg[];
    setAllMessages(all);
    const byCustomer = new Map<string, Msg[]>();
    for (const m of all) {
      if (!byCustomer.has(m.customer_id)) byCustomer.set(m.customer_id, []);
      byCustomer.get(m.customer_id)!.push(m);
    }
    const t: Thread[] = [];
    for (const [cid, msgs] of byCustomer) {
      // Meddelandena kommer nyast först från queryn → msgs[0] är det senaste.
      const first = msgs[0];
      t.push({
        customer_id: cid,
        customer_name: first.customers?.name ?? '?',
        customer_email: first.customers?.email ?? '',
        last_at: first.created_at ?? '',
        last_message: first.body?.trim() || (first.image_url ? '📷 Bild' : ''),
        last_from_staff: first.sender_role === 'staff',
        unread_count: msgs.filter(m => m.sender_role === 'customer' && !m.is_read).length,
      });
    }
    t.sort((a, b) => b.last_at.localeCompare(a.last_at));
    setThreads(t);
    if (selectedId) {
      setMessages(byCustomer.get(selectedId) ?? []);
    }
  };

  // Ref to the latest load() so the realtime subscription (mounted once) always
  // calls the current closure — load() refreshes allMessages, and the
  // [selectedId, allMessages] effect below re-derives the open conversation.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { load(); }, []);

  // Live updates: re-load when any message row changes. Staff RLS lets admins
  // see all messages, so this keeps both the thread list and the open
  // conversation in sync without a manual refresh.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('messages-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadRef.current();
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, []);

  // Fallback för live-uppdatering om Realtime tappar anslutningen: polla var
  // 5:e sekund och hämta om när fliken kommer i förgrunden.
  useEffect(() => {
    const interval = setInterval(() => { loadRef.current(); }, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const conversation = allMessages.filter(m => m.customer_id === selectedId);
    setMessages(conversation);
    // Mark all unread customer messages in this thread as read
    const unreadIds = conversation
      .filter(m => m.sender_role === 'customer' && !m.is_read)
      .map(m => m.id);
    if (unreadIds.length > 0 && supabase) {
      supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() }).in('id', unreadIds).then(() => {
        // Refresh threads so unread badges disappear
        load();
      });
    }
  }, [selectedId, allMessages]);

  // Always land on the latest message when opening a thread or when new
  // messages arrive. Fire on a couple of ticks because wrapped long bubbles
  // shift scrollHeight a frame after their initial paint.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    const scrollToEnd = () => { el.scrollTop = el.scrollHeight; };
    scrollToEnd();
    const raf = requestAnimationFrame(scrollToEnd);
    const t = setTimeout(scrollToEnd, 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [selectedId, messages.length]);

  const pickImage = async () => {
    const picked = await pickPhoto();
    if (!picked) return;
    setPendingImage(picked.file);
    setPendingPreview(URL.createObjectURL(picked.file));
  };

  const clearPendingImage = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(null);
    setPendingPreview(null);
  };

  const send = async () => {
    if (!selectedId || (!text.trim() && !pendingImage)) return;
    setSending(true);
    try {
      const created = await sendStaffMessage({ customer_id: selectedId, body: text, file: pendingImage });
      sendNotification({ kind: 'staff_message', message_id: created.id });
      setText('');
      clearPendingImage();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunde inte skicka');
    }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Meddelanden</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
        <div className="bg-white rounded-2xl shadow overflow-y-auto">
          {threads.length === 0 && (
            <p className="text-gray-400 text-center mt-8 px-4">Inga konversationer ännu.</p>
          )}
          {threads.map(t => (
            <button key={t.customer_id}
                    onClick={() => setSelectedId(t.customer_id)}
                    className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selectedId === t.customer_id ? 'bg-gray-100' : ''}`}>
              <p className="font-semibold flex justify-between items-center">
                <span>{t.customer_name}</span>
                {t.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{t.unread_count}</span>
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {t.last_message
                  ? `${t.last_from_staff ? 'Du: ' : ''}${t.last_message}`
                  : t.customer_email}
              </p>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 bg-white rounded-2xl shadow flex flex-col min-h-0 overflow-hidden">
          {selectedId ? (
            <>
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                {(() => {
                  // Messages arrive newest-first from the query; reverse for chronological display.
                  const sorted = [...messages].reverse();
                  let lastDayLbl = '';
                  return sorted.map((m, idx) => {
                    const isStaff = m.sender_role === 'staff';
                    const isLastOwn = isLastOwnInSequence(sorted, idx, 'staff');
                    const prev = sorted[idx - 1];
                    const isFirstInGroup = isStaff && (
                      prev?.sender_role !== 'staff' || prev?.sender_name !== m.sender_name
                    );

                    // Datum-sticker
                    const currentDayLbl = m.created_at ? dayLabel(m.created_at) : '';
                    const showDaySticker = currentDayLbl !== lastDayLbl;
                    if (showDaySticker) lastDayLbl = currentDayLbl;

                    return (
                      <div key={m.id}>
                        {/* Datum-sticker */}
                        {showDaySticker && currentDayLbl && (
                          <div className="text-center text-[11px] uppercase tracking-wide text-gray-400 my-2 select-none">
                            {currentDayLbl}
                          </div>
                        )}

                        {/* Meddelandebubbla */}
                        <div className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} max-w-[80%]`}>
                            {/* Avsändarens namn — visas över första bubblan i en svit från samma personal */}
                            {isStaff && isFirstInGroup && (
                              <p className="text-[11px] font-semibold text-primary mb-0.5 mr-1">
                                {firstNameOf(m.sender_name)}
                              </p>
                            )}

                            <div className={`rounded-2xl ${m.image_url ? 'p-1.5' : 'px-4 py-2'} ${isStaff ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                              {m.image_url && (
                                <a href={m.image_url} target="_blank" rel="noreferrer">
                                  <img src={m.image_url} alt="Bifogad bild" className="rounded-xl max-h-64 max-w-[260px] object-cover" loading="lazy" />
                                </a>
                              )}
                              {m.body && <p className={`text-sm whitespace-pre-wrap ${m.image_url ? 'px-2.5 pt-1.5' : ''}`}>{m.body}</p>}
                              <p className={`text-xs opacity-60 mt-1 ${m.image_url ? 'px-2.5 pb-1' : ''}`}>
                                {isStaff && m.sender_name ? `${firstNameOf(m.sender_name)} · ` : ''}
                                {m.created_at ? fmtHm(m.created_at) : ''}
                              </p>
                            </div>

                            {/* Read-receipt — visas bara under SENASTE egna (staff) meddelandet i sviten */}
                            {isStaff && isLastOwn && (
                              <p className="text-[10px] text-gray-400 mt-0.5 self-end">
                                {m.read_at
                                  ? `✓✓ Läst ${fmtHm(m.read_at)}`
                                  : `✓ Skickat ${m.created_at ? fmtHm(m.created_at) : ''}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="border-t p-3 shrink-0">
                {pendingPreview && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="relative">
                      <img src={pendingPreview} alt="Förhandsvisning" className="h-16 w-16 rounded-lg object-cover" />
                      <button
                        onClick={clearPendingImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center shadow"
                        aria-label="Ta bort bild"
                      >
                        <FaTimes className="text-[10px]" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">Bild bifogad</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={pickImage} disabled={sending}
                          className="bg-gray-100 text-gray-600 w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 shrink-0"
                          aria-label="Bifoga bild">
                    <FaImage />
                  </button>
                  <input value={text} onChange={e => setText(e.target.value)}
                         onKeyDown={e => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             send();
                           }
                         }}
                         placeholder="Svara…" className="flex-1 rounded-lg border-gray-300" />
                  <button onClick={send} disabled={sending || (!text.trim() && !pendingImage)}
                          className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50">
                    Skicka
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="m-auto text-gray-400">Välj en konversation</p>
          )}
        </div>
      </div>
    </div>
  );
}
