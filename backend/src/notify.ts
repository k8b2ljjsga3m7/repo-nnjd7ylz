import { prisma, getSettings } from './db.js'

export type NotifyKind = 'client' | 'order' | 'alert'

export async function sendTelegram(kind: NotifyKind, text: string): Promise<{ ok: boolean; error?: string }> {
  const s = await getSettings()
  if (!s.tgBotToken || !s.tgChatId) return { ok: false, error: 'Telegram не настроен (нужны токен бота и ID чата)' }
  const topic = { client: s.tgTopicClients, order: s.tgTopicOrders, alert: s.tgTopicAlerts }[kind]
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.tgBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: s.tgChatId,
        text,
        ...(topic ? { message_thread_id: Number(topic) } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { ok: false, error: `Telegram API ${res.status}: ${await res.text()}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// In-app notification + Telegram (if configured). Telegram failures are logged, never thrown.
export async function notify(kind: NotifyKind, text: string) {
  await prisma.notification.create({ data: { text } })
  const r = await sendTelegram(kind, text)
  if (!r.ok) console.error(`Telegram notify failed: ${r.error}`)
}
