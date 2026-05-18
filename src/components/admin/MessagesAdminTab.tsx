import { useEffect, useState } from 'react';
import { getAllMessageThreads, sendStaffMessage } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';

type Msg = {
  id: string;
  customer_id: string;
  dog_id: string | null;
  sender_role: string;
  body: string;
  is_read: boolean | null;
  created_at: string | null;
  customers: { name: string; email: string } | null;
  dogs: { name: string } | null;
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
                {[...messages].reverse().map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === 'staff' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.sender_role === 'staff' ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                      <p className="text-xs opacity-60 mt-1">{m.created_at ? new Date(m.created_at).toLocaleString('sv-SE') : ''}</p>
                    </div>
                  </div>
                ))}
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
