import { useEffect, useState, useCallback } from 'react'
import { api, type Chat, type Message } from '../api'

const messengerIcons: Record<string, string> = { telegram: '✈️', whatsapp: '🟢', max: '🔵' }

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([])
  const [active, setActive] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [testText, setTestText] = useState('')

  const load = useCallback(async () => setChats(await api.get<Chat[]>('/chats')), [])

  useEffect(() => {
    void load()
  }, [load])

  const open = async (chat: Chat) => {
    setActive(chat)
    setMessages(await api.get<Message[]>(`/chats/${chat.id}/messages`))
  }

  const toggleAi = async (chat: Chat) => {
    const updated = await api.post<Chat>(`/chats/${chat.id}/ai`, { aiEnabled: !chat.aiEnabled })
    setActive({ ...chat, aiEnabled: updated.aiEnabled })
    await load()
  }

  const reply = async () => {
    if (!active || !text) return
    await api.post(`/chats/${active.id}/reply`, { text })
    setText('')
    setMessages(await api.get<Message[]>(`/chats/${active.id}/messages`))
  }

  // Симуляция входящего сообщения клиента (для теста, пока мессенджеры не подключены)
  const simulate = async () => {
    if (!testText) return
    await api.post('/chats/incoming', {
      messenger: 'telegram',
      externalId: 'test-client',
      clientName: 'Тестовый клиент',
      text: testText,
    })
    setTestText('')
    await load()
    const c = (await api.get<Chat[]>('/chats')).find((x) => x.externalId === 'test-client')
    if (c) await open(c)
  }

  if (active) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-900 p-3">
          <button onClick={() => setActive(null)} className="text-slate-400">← Назад</button>
          <span className="font-semibold">
            {messengerIcons[active.messenger]} {active.clientName || active.externalId}
          </span>
          <button
            onClick={() => void toggleAi(active)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${active.aiEnabled ? 'bg-emerald-600' : 'bg-rose-600'}`}
          >
            {active.aiEnabled ? '🤖 ИИ отвечает' : '✋ Ручной режим'}
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                m.role === 'client' ? 'bg-slate-800' : m.role === 'ai' ? 'ml-auto bg-indigo-700' : 'ml-auto bg-emerald-700'
              }`}
            >
              <p className="mb-1 text-xs opacity-60">{m.role === 'client' ? 'Клиент' : m.role === 'ai' ? 'ИИ' : 'Я'}</p>
              {m.text}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            placeholder="Ответить клиенту…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reply()}
            className="flex-1 rounded-lg bg-slate-800 p-2"
          />
          <button onClick={() => void reply()} className="rounded-lg bg-emerald-600 px-4 hover:bg-emerald-500">➤</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">Диалоги с клиентами</h3>
        <ul className="divide-y divide-slate-800">
          {chats.map((c) => (
            <li key={c.id} onClick={() => void open(c)} className="flex cursor-pointer items-center justify-between py-3 hover:bg-slate-800/50">
              <span>
                {messengerIcons[c.messenger]} {c.clientName || c.externalId}
                <span className="block text-xs text-slate-500">{c.messages[0]?.text.slice(0, 60)}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${c.aiEnabled ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {c.aiEnabled ? 'ИИ' : 'Ручной'}
              </span>
            </li>
          ))}
          {chats.length === 0 && <p className="text-sm text-slate-500">Диалогов пока нет</p>}
        </ul>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">🧪 Тест: написать как клиент</h3>
        <p className="mb-2 text-xs text-slate-500">Проверка работы ИИ, пока мессенджеры не подключены.</p>
        <div className="flex gap-2">
          <input
            placeholder="Сколько стоит установка 9-ки?"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="flex-1 rounded-lg bg-slate-800 p-2"
          />
          <button onClick={() => void simulate()} className="rounded-lg bg-sky-600 px-4 hover:bg-sky-500">➤</button>
        </div>
      </div>
    </div>
  )
}
