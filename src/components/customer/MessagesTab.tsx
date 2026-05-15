import { useEffect, useRef, useState } from 'react';
import type { Dog } from '../../lib/customerApi';
import { getMyMessages, sendMessage, markMessagesRead, type Message } from '../../lib/customerApi';
import { sendNotification } from '../../lib/notifications';

export default function MessagesTab({ dog }: { dog: Dog }) {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const msgs = await getMyMessages(dog.id);
    setItems(msgs);
    const unreadStaffIds = msgs.filter(m => m.sender_role === 'staff' && !m.is_read).map(m => m.id);
    if (unreadStaffIds.length > 0) markMessagesRead(unreadStaffIds);
  };

  useEffect(() => { refresh(); }, [dog.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
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
    <div className="bg-white rounded-2xl shadow flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 && (
          <p className="text-gray-400 text-center mt-8">Inga meddelanden ännu. Säg hej!</p>
        )}
        {items.map(m => (
          <div key={m.id} className={`flex ${m.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              m.sender_role === 'customer' ? 'bg-primary text-white' : 'bg-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              <p className="text-xs opacity-60 mt-1">
                {m.created_at ? new Date(m.created_at).toLocaleString('sv-SE') : ''}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Skriv ett meddelande…"
          className="flex-1 rounded-lg border-gray-300"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Skicka
        </button>
      </div>
    </div>
  );
}
