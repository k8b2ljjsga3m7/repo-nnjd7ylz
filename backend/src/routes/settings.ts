import { Router } from 'express'
import { z } from 'zod'
import { prisma, getSettings } from '../db.js'
import { askAi } from '../ai/router.js'
import { sendTelegram, type NotifyKind } from '../notify.js'

export const settings = Router()

const mask = (v: string) => (v ? '••••' + v.slice(-4) : '')

settings.get('/', async (_req, res) => {
  const s = await getSettings()
  res.json({ ...s, aiApiKey: mask(s.aiApiKey), tgBotToken: mask(s.tgBotToken) })
})

settings.put('/', async (req, res) => {
  const data = z
    .object({
      aiProvider: z.enum(['openrouter', 'yandexgpt', 'openai', 'gemini', 'local']).optional(),
      aiApiKey: z.string().optional(),
      aiModel: z.string().optional(),
      aiLocalUrl: z.string().optional(),
      aiSystemPrompt: z.string().optional(),
      debtGoal: z.number().positive().optional(),
      shiftCycleStart: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(),
      tgBotToken: z.string().optional(),
      tgChatId: z.string().optional(),
      tgTopicClients: z.string().regex(/^\d*$/).optional(),
      tgTopicOrders: z.string().regex(/^\d*$/).optional(),
      tgTopicAlerts: z.string().regex(/^\d*$/).optional(),
    })
    .parse(req.body)
  if (data.aiApiKey?.startsWith('••••')) delete data.aiApiKey
  if (data.tgBotToken?.startsWith('••••')) delete data.tgBotToken
  const s = await prisma.settings.update({ where: { id: 1 }, data })
  res.json({ ...s, aiApiKey: mask(s.aiApiKey), tgBotToken: mask(s.tgBotToken) })
})

settings.post('/test-telegram', async (_req, res) => {
  const results = await Promise.all(
    (['client', 'order', 'alert'] as NotifyKind[]).map(async (kind) => ({
      kind,
      ...(await sendTelegram(kind, `🔔 Тест уведомлений «Кондей-Мастер»: топик ${kind}`)),
    })),
  )
  res.json({ ok: results.every((r) => r.ok), results })
})

settings.post('/test-ai', async (_req, res) => {
  try {
    const answer = await askAi([{ role: 'user', content: 'Ответь одним словом: работаешь?' }])
    res.json({ ok: true, answer })
  } catch (e) {
    res.json({ ok: false, error: (e as Error).message })
  }
})
