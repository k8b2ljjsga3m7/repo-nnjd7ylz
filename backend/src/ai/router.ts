import { getSettings, prisma } from '../db.js'
import { notify } from '../notify.js'

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface AiConfig {
  apiKey: string
  model: string
  localUrl: string
  systemPrompt: string
}

const TIMEOUT_MS = 15000

async function openAiCompatible(url: string, apiKey: string, model: string, turns: ChatTurn[]): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model, messages: turns }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`AI provider error ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content
}

async function yandexGpt(cfg: AiConfig, turns: ChatTurn[]): Promise<string> {
  // apiKey format: "<folderId>:<iamOrApiKey>"
  const [folderId, key] = cfg.apiKey.includes(':') ? cfg.apiKey.split(/:(.+)/) : ['', cfg.apiKey]
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${key}`,
    },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/${cfg.model || 'yandexgpt-lite'}`,
      completionOptions: { temperature: 0.3, maxTokens: 800 },
      messages: turns.map((t) => ({ role: t.role, text: t.content })),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`YandexGPT error ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { result: { alternatives: { message: { text: string } }[] } }
  return data.result.alternatives[0].message.text
}

const adapters: Record<string, (cfg: AiConfig, turns: ChatTurn[]) => Promise<string>> = {
  openrouter: (cfg, turns) =>
    openAiCompatible('https://openrouter.ai/api/v1/chat/completions', cfg.apiKey, cfg.model, turns),
  openai: (cfg, turns) =>
    openAiCompatible('https://api.openai.com/v1/chat/completions', cfg.apiKey, cfg.model || 'gpt-4o-mini', turns),
  yandexgpt: yandexGpt,
  gemini: (cfg, turns) =>
    openAiCompatible(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      cfg.apiKey,
      cfg.model || 'gemini-2.0-flash',
      turns,
    ),
  local: (cfg, turns) =>
    openAiCompatible(`${cfg.localUrl.replace(/\/$/, '')}/v1/chat/completions`, cfg.apiKey, cfg.model, turns),
}

async function buildContext(): Promise<string> {
  const [blocked, orders] = await Promise.all([
    prisma.blockedDay.findMany({ where: { date: { gte: new Date() } } }),
    prisma.order.findMany({ where: { status: { in: ['new', 'in_progress'] }, scheduledAt: { gte: new Date() } } }),
  ])
  const busy = [
    ...blocked.map((b) => b.date.toISOString().slice(0, 10)),
    ...orders.map((o) => o.scheduledAt!.toISOString().slice(0, 10)),
  ]
  return `Сегодня: ${new Date().toISOString().slice(0, 10)}. Занятые дни (не предлагай их клиенту): ${busy.join(', ') || 'нет'}.`
}

export async function askAi(turns: ChatTurn[]): Promise<string> {
  const s = await getSettings()
  const adapter = adapters[s.aiProvider]
  if (!adapter) throw new Error(`Unknown AI provider: ${s.aiProvider}`)
  const system: ChatTurn = { role: 'system', content: `${s.aiSystemPrompt}\n${await buildContext()}` }
  return adapter(
    { apiKey: s.aiApiKey, model: s.aiModel, localUrl: s.aiLocalUrl, systemPrompt: s.aiSystemPrompt },
    [system, ...turns],
  )
}

// Fallback: on AI failure, switch chat to manual mode and notify.
export async function replyToClient(chatId: number, clientText: string): Promise<string | null> {
  const chat = await prisma.chat.findUniqueOrThrow({ where: { id: chatId } })
  await prisma.message.create({ data: { chatId, role: 'client', text: clientText } })
  if (!chat.aiEnabled) return null
  const history = await prisma.message.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' }, take: 30 })
  const turns: ChatTurn[] = history.map((m) => ({
    role: m.role === 'client' ? 'user' : 'assistant',
    content: m.text,
  }))
  try {
    const answer = await askAi(turns)
    await prisma.message.create({ data: { chatId, role: 'ai', text: answer } })
    return answer
  } catch (e) {
    await prisma.chat.update({ where: { id: chatId }, data: { aiEnabled: false } })
    await notify(
      'alert',
      `⚠️ ИИ недоступен (${(e as Error).message.slice(0, 120)}). Клиент "${chat.clientName || chat.externalId}" ждёт ответа — диалог переведён в ручной режим.`,
    )
    return null
  }
}
