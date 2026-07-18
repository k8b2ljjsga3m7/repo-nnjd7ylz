import { Router } from 'express'
import { z } from 'zod'
import { prisma, getSettings } from '../db.js'
import { askAi } from '../ai/router.js'

export const settings = Router()

settings.get('/', async (_req, res) => {
  const s = await getSettings()
  res.json({ ...s, aiApiKey: s.aiApiKey ? '••••' + s.aiApiKey.slice(-4) : '' })
})

settings.put('/', async (req, res) => {
  const data = z
    .object({
      aiProvider: z.enum(['openrouter', 'yandexgpt', 'openai', 'local']).optional(),
      aiApiKey: z.string().optional(),
      aiModel: z.string().optional(),
      aiLocalUrl: z.string().optional(),
      aiSystemPrompt: z.string().optional(),
      debtGoal: z.number().positive().optional(),
      shiftCycleStart: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(),
    })
    .parse(req.body)
  if (data.aiApiKey?.startsWith('••••')) delete data.aiApiKey
  const s = await prisma.settings.update({ where: { id: 1 }, data })
  res.json({ ...s, aiApiKey: s.aiApiKey ? '••••' + s.aiApiKey.slice(-4) : '' })
})

settings.post('/test-ai', async (_req, res) => {
  try {
    const answer = await askAi([{ role: 'user', content: 'Ответь одним словом: работаешь?' }])
    res.json({ ok: true, answer })
  } catch (e) {
    res.json({ ok: false, error: (e as Error).message })
  }
})
