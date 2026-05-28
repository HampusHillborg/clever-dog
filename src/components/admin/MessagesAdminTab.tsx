import { useEffect, useState } from 'react';
import { getAllMessageThreads, sendStaffMessage } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import { dayLabel, fmtHm, isLastOwnInSequence } from '../../lib/messageGrouping';

type Msg = {
  id: string;
  customer_id: string;
  dog_id: string | null;
  sender_role: string;
  sender_name: string | null;
  body: string;
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
  unread_count: number;
};

export default function MessagesAdminTab() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [allMessages, setAllMessages] = useState<Msg[]>([]);

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
      const first = msgs[0];
      t.push({
        customer_id: cid,
        customer_name: first.customers?.name ?? '?',
        customer_email: first.customers?.email ?? '',
        last_at: first.created_at ?? '',
        unread_count: msgs.filter(m => m.sender_role === 'customer' && !m.is_read).length,
      });
    }
    t.sort((a, b) => b.last_at.localeCompare(a.last_at));
    setThreads(t);
    if (selectedId) {
      setMessages(byCustomer.get(selectedId) ?? []);
    }
  };

  useEffect(() => { load(); }, []);
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

  const send = async () => {
    if (!selectedId || !text.trim()) return;
    const created = await sendStaffMessage({ customer_id: selectedId, body: text });
    sendNotification({ kind: 'staff_message', message_id: created.id });
    setText('');
    load();
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
              <p className="text-xs text-gray-500">{t.customer_email}</p>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 bg-white rounded-2xl shadow flex flex-col">
          {selectedId ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
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

                            <div className={`rounded-2xl px-4 py-2 ${isStaff ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                              <p className="text-xs opacity-60 mt-1">
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
              <div className="border-t p-3 flex gap-2">
                <input value={text} onChange={e => setText(e.target.value)}
                       onKeyDown={e => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           send();
                         }
                       }}
                       placeholder="Svara…" className="flex-1 rounded-lg border-gray-300" />
                <button onClick={send} disabled={!text.trim()}
                        className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50">
                  Skicka
                </button>
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
