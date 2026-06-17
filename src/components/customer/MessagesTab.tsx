import { useEffect, useRef, useState } from 'react';
import { FaPaperPlane, FaCommentDots, FaCheck } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import type { Dog } from '../../lib/customerApi';
import {
  getMyChatMessages,
  getMyCustomerId,
  getMyDogs,
  sendMessage,
  markMessagesRead,
  getChatThreadMemberCount,
  type Message,
} from '../../lib/customerApi';
import { sendNotification } from '../../lib/notifications';
import { tapLight } from '../../lib/haptics';

// Visa bara HH:MM inuti bubblan — datumet kommer från datum-stickern ovanför.
const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

const formatDayLabel = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'IDAG';
  if (d.toDateString() === yesterday.toDateString()) return 'IGÅR';
  return d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
};

const getDateKey = (iso: string): string => new Date(iso).toDateString();

const firstNameOf = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Kund';
  return fullName.split(' ')[0];
};

const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] ?? '?').toUpperCase();
};

export default function MessagesTab({ dog }: { dog: Dog }) {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coOwnerCount, setCoOwnerCount] = useState(1);
  const [myCustomerId, setMyCustomerId] = useState<string | null>(null);
  const [dogNameMap, setDogNameMap] = useState<Record<string, string>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstPaintRef = useRef(true);

  const refresh = async () => {
    const msgs = await getMyChatMessages();
    setItems(msgs);
    setLoading(false);
    const unreadStaffIds = msgs.filter(m => m.sender_role === 'staff' && !m.is_read).map(m => m.id);
    if (unreadStaffIds.length > 0) markMessagesRead(unreadStaffIds);
  };

  // Keep a ref to the latest refresh so the realtime subscription (mounted
  // once) always calls the current closure.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
    getMyCustomerId().then(setMyCustomerId);
    getChatThreadMemberCount().then(setCoOwnerCount);
    getMyDogs().then(dogs => {
      const map: Record<string, string> = {};
      for (const d of dogs) map[d.id] = d.name;
      setDogNameMap(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates: re-fetch whenever any row in our thread changes. RLS limits
  // the events we receive to messages we're allowed to read, so a blanket
  // table subscription is safe and keeps the chat in sync without refresh.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('messages-customer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        refreshRef.current();
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, []);

  useEffect(() => {
    isFirstPaintRef.current = true;
    refresh();
  }, [dog.id]);

  useEffect(() => {
    if (loading || items.length === 0) return;
    const useSmooth = !isFirstPaintRef.current;
    isFirstPaintRef.current = false;

    // Direct scrollTop manipulation is more reliable than scrollIntoView in
    // Capacitor WebView. Fire on multiple ticks because long text bubbles
    // wrap to extra lines a frame after their initial paint, which shifts
    // scrollHeight upward — a single scroll often lands above the actual
    // bottom on the very first open.
    const scrollToEnd = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: useSmooth ? 'smooth' : 'auto' });
    };
    scrollToEnd();
    const raf = requestAnimationFrame(scrollToEnd);
    const t = setTimeout(scrollToEnd, 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [items.length, loading]);

  const send = async () => {
    if (!text.trim()) return;
    tapLight();
    setSending(true);
    try {
      const created = await sendMessage({ dog_id: dog.id, body: text });
      // Triggrar push till admins (email-utskicket borttaget i edge-funktionen v10).
      sendNotification({ kind: 'customer_message', message_id: created.id });
      setText('');
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte skicka';
      alert(msg);
    }
    setSending(false);
  };

  // Build a flat list of renderable items (day stickers + messages).
  // Also compute grouping metadata for each message.
  type RenderItem =
    | { kind: 'day'; label: string; key: string }
    | { kind: 'msg'; msg: Message; isFirst: boolean; isLast: boolean; showAvatar: boolean; showTimestamp: boolean };

  // Group bubbles by the specific sender (not just role), so a co-owner's
  // messages don't get visually merged into the logged-in user's own chain.
  const senderKey = (m: Message): string =>
    m.sender_role === 'staff'
      ? `staff:${m.sender_user_id ?? m.sender_name ?? ''}`
      : `customer:${m.customer_id}`;

  const renderItems: RenderItem[] = [];
  let lastDateKey = '';

  for (let i = 0; i < items.length; i++) {
    const m = items[i];
    const prev = items[i - 1];
    const next = items[i + 1];

    const dk = m.created_at ? getDateKey(m.created_at) : '';
    if (dk && dk !== lastDateKey) {
      renderItems.push({ kind: 'day', label: m.created_at ? formatDayLabel(m.created_at) : '', key: `day-${dk}` });
      lastDateKey = dk;
    }

    const key = senderKey(m);
    const sameAsPrev = prev && senderKey(prev) === key;
    const sameAsNext = next && senderKey(next) === key;
    const isFirst = !sameAsPrev;
    const isLast = !sameAsNext;
    // Only show timestamp on the last bubble of each same-author chain.
    const showTimestamp = isLast;
    // Show avatar only on the first staff bubble in a run.
    const showAvatar = m.sender_role === 'staff' && isFirst;

    renderItems.push({ kind: 'msg', msg: m, isFirst, isLast, showAvatar, showTimestamp });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-5 bg-stone-50">
        {loading ? (
          <ChatSkeleton />
        ) : items.length === 0 ? (
          <EmptyChat />
        ) : (
          <div className="space-y-0">
            {renderItems.map(item => {
              if (item.kind === 'day') {
                return (
                  <div key={item.key} className="flex items-center gap-2 py-4 px-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-semibold text-gray-400 tracking-wide shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                );
              }

              const { msg: m, isFirst, isLast, showAvatar, showTimestamp } = item;
              const isMine = m.sender_role === 'customer' && m.customer_id === myCustomerId;
              const isCoOwner = m.sender_role === 'customer' && !isMine;
              const otherDogName = m.dog_id && m.dog_id !== dog.id
                ? (dogNameMap[m.dog_id] ?? null)
                : null;

              // Bubble corner shape: only the first bubble in a chain gets the "tail"
              // (asymmetric corner). Following bubbles get fully rounded.
              const bubbleShape = isMine
                ? isLast ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'
                : isFirst ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl';

              const spacingTop = isFirst ? 'mt-4' : 'mt-1';

              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-1.5 ${spacingTop}`}
                >
                  {/* Avatar placeholder (always 28px wide to keep alignment).
                      Staff = orange, co-owner = gray, so they're visually distinct. */}
                  {!isMine && (
                    <div className="w-7 shrink-0 self-end mb-0.5">
                      {showAvatar || (isCoOwner && isFirst) ? (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCoOwner
                              ? 'bg-gray-200 text-gray-600'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {getInitials(m.sender_name)}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[78%]`}>
                    {/* Sender name: shown on first bubble in any non-mine chain,
                        plus on own chains when co-owners exist (so the co-owner
                        can tell which of us wrote it). */}
                    {!isMine && isFirst && (
                      <p
                        className={`text-[11px] font-semibold mb-0.5 ml-1 ${
                          isCoOwner ? 'text-gray-500' : 'text-orange-700'
                        }`}
                      >
                        {firstNameOf(m.sender_name)}
                      </p>
                    )}
                    {isMine && coOwnerCount >= 2 && isFirst && (
                      <p className="text-[11px] font-semibold text-gray-400 mb-0.5 mr-1">
                        {firstNameOf(m.sender_name)}
                      </p>
                    )}

                    <div
                      className={`px-4 py-2.5 ${bubbleShape} ${
                        isMine
                          ? 'bg-primary text-white'
                          : 'bg-white text-dark shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    </div>

                    {/* "om {hund}"-label for cross-dog messages */}
                    {otherDogName && (
                      <p className="text-[10px] text-gray-400 italic mt-0.5 px-1">
                        om {otherDogName}
                      </p>
                    )}

                    {/* Tidsstämpel utanför bubblan — bara för personalmeddelanden */}
                    {showTimestamp && !isMine && m.created_at && (
                      <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                        {formatTime(m.created_at)}
                      </p>
                    )}

                    {/* Read receipt — only on last outgoing message */}
                    {isMine && isLast && items[items.length - 1]?.id === m.id && (
                      <div className="flex items-center gap-0.5 mt-0.5 mr-1">
                        {m.is_read ? (
                          <>
                            <FaCheck className="text-[8px] text-primary" />
                            <FaCheck className="text-[8px] text-primary -ml-1" />
                            <span className="text-[10px] text-gray-400 ml-0.5">Läst</span>
                          </>
                        ) : (
                          <>
                            <FaCheck className="text-[8px] text-gray-400" />
                            <span className="text-[10px] text-gray-400 ml-0.5">Skickat</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Customer side spacer to mirror staff avatar width */}
                  {isMine && <div className="w-7 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-3 flex gap-2.5 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Skriv ett meddelande…"
          className="flex-1 rounded-2xl bg-stone-100 px-4 py-2.5 text-sm placeholder-gray-400 resize-none max-h-32 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
          style={{ minHeight: '42px' }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 hover:bg-orange-600 active:scale-95 transition-all shadow-md shrink-0"
          aria-label="Skicka"
        >
          <FaPaperPlane className="text-sm" />
        </button>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 max-w-xs mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-4">
        <FaCommentDots className="text-2xl" />
      </div>
      <p className="font-semibold text-base mb-2">Säg hej till personalen 👋</p>
      <p className="text-sm text-gray-500 leading-relaxed">
        Du kan skriva om frågor, ändringar eller bara en uppdatering om din hund.
      </p>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex justify-start items-end gap-1.5">
        <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
        <div className="h-10 w-52 bg-gray-200 rounded-2xl rounded-bl-md" />
      </div>
      <div className="flex justify-start items-end gap-1.5 mt-1">
        <div className="w-7 shrink-0" />
        <div className="h-14 w-44 bg-gray-200 rounded-2xl" />
      </div>
      <div className="flex justify-end mt-4">
        <div className="h-10 w-40 bg-orange-200 rounded-2xl rounded-br-md" />
      </div>
      <div className="flex justify-end mt-1">
        <div className="h-8 w-56 bg-orange-200 rounded-2xl" />
      </div>
      <div className="flex justify-start items-end gap-1.5 mt-4">
        <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
        <div className="h-16 w-60 bg-gray-200 rounded-2xl rounded-bl-md" />
      </div>
    </div>
  );
}
