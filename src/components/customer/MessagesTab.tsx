import { useEffect, useRef, useState } from 'react';
import { FaPaperPlane, FaCommentDots } from 'react-icons/fa';
import type { Dog } from '../../lib/customerApi';
import {
  getMyChatMessages,
  getMyDogs,
  sendMessage,
  markMessagesRead,
  getChatThreadMemberCount,
  type Message,
} from '../../lib/customerApi';
import { sendNotification } from '../../lib/notifications';
import { tapLight } from '../../lib/haptics';

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const firstNameOf = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Kund';
  return fullName.split(' ')[0];
};

export default function MessagesTab({ dog }: { dog: Dog }) {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coOwnerCount, setCoOwnerCount] = useState(1);
  const [dogNameMap, setDogNameMap] = useState<Record<string, string>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const msgs = await getMyChatMessages();
    setItems(msgs);
    setLoading(false);
    const unreadStaffIds = msgs.filter(m => m.sender_role === 'staff' && !m.is_read).map(m => m.id);
    if (unreadStaffIds.length > 0) markMessagesRead(unreadStaffIds);
  };

  useEffect(() => {
    refresh();
    getChatThreadMemberCount().then(setCoOwnerCount);
    // Build dog name map for "om {hund}"-pill on messages with a dog_id
    // that differs from the currently active dog.
    getMyDogs().then(dogs => {
      const map: Record<string, string> = {};
      for (const d of dogs) map[d.id] = d.name;
      setDogNameMap(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when active dog tab changes (dog_id context for outbound messages).
  useEffect(() => { refresh(); }, [dog.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length]);

  const send = async () => {
    if (!text.trim()) return;
    tapLight();
    setSending(true);
    try {
      // Attach current dog as context so staff sees which dog tab was active.
      const created = await sendMessage({ dog_id: dog.id, body: text });
      sendNotification({ kind: 'customer_message', message_id: created.id });
      setText('');
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte skicka';
      alert(msg);
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card flex flex-col h-[65vh] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gray-50/50">
        {loading ? (
          <ChatSkeleton />
        ) : items.length === 0 ? (
          <EmptyChat />
        ) : (
          items.map((m, idx) => {
            const prev = items[idx - 1];
            const sameAuthor = prev?.sender_role === m.sender_role;
            const isMine = m.sender_role === 'customer';
            // Show "om {hund}"-pill when the message has a dog_id that differs
            // from the currently active dog.
            const otherDogName = m.dog_id && m.dog_id !== dog.id
              ? (dogNameMap[m.dog_id] ?? null)
              : null;
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${sameAuthor ? 'mt-1' : 'mt-3'}`}
              >
                <div
                  className={`max-w-[82%] px-4 py-2.5 ${
                    isMine
                      ? 'bg-primary text-white rounded-2xl rounded-br-md shadow-card'
                      : 'bg-white text-dark rounded-2xl rounded-bl-md border border-gray-200'
                  }`}
                >
                  {!isMine && (!sameAuthor || !prev) && (
                    <p className="text-[11px] font-semibold text-orange-700 mb-0.5">
                      {m.sender_name ?? 'Personal'}
                    </p>
                  )}
                  {/* Sender attribution for co-owner customer messages */}
                  {isMine && coOwnerCount >= 2 && (!sameAuthor || !prev) && (
                    <p className="text-[11px] font-semibold text-white/80 mb-0.5">
                      {firstNameOf(m.sender_name)}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                    {m.created_at ? formatTime(m.created_at) : ''}
                  </p>
                  {/* "om {hund}"-pill when message context differs from active dog */}
                  {otherDogName && (
                    <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                      om {otherDogName}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-gray-200 bg-white p-3 flex gap-2 items-end">
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
          className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary resize-none max-h-32"
          style={{ minHeight: '42px' }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 active:scale-95 transition-all shadow-card shrink-0"
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
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3">
        <FaCommentDots className="text-2xl" />
      </div>
      <p className="font-semibold mb-1">Säg hej!</p>
      <p className="text-sm text-gray-500 max-w-xs">
        Skriv till personalen om något — frågor, ändringar eller bara en uppdatering.
      </p>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex justify-start"><div className="h-10 w-48 bg-gray-200 rounded-2xl rounded-bl-md" /></div>
      <div className="flex justify-end"><div className="h-10 w-40 bg-orange-200 rounded-2xl rounded-br-md" /></div>
      <div className="flex justify-start"><div className="h-16 w-56 bg-gray-200 rounded-2xl rounded-bl-md" /></div>
    </div>
  );
}
