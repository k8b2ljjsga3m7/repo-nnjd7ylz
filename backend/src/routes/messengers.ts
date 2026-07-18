import { Router } from 'express'
import { prisma } from '../db.js'
import { connectors } from '../messengers/index.js'

export const messengers = Router()

messengers.get('/', async (_req, res) => {
  const sessions = await prisma.messengerSession.findMany()
  const list = (['telegram', 'whatsapp', 'max'] as const).map((m) => ({
    messenger: m,
    status: sessions.find((s) => s.messenger === m)?.status ?? 'disconnected',
    available: connectors[m].available,
    hint: connectors[m].hint,
  }))
  res.json(list)
})

messengers.post('/:messenger/connect', async (req, res) => {
  const m = req.params.messenger as keyof typeof connectors
  if (!connectors[m]) return res.status(404).json({ error: 'unknown messenger' })
  const result = await connectors[m].connect()
  await prisma.messengerSession.upsert({
    where: { messenger: m },
    update: { status: result.status },
    create: { messenger: m, status: result.status },
  })
  res.json(result)
})

messengers.post('/:messenger/disconnect', async (req, res) => {
  const m = req.params.messenger
  await prisma.messengerSession.upsert({
    where: { messenger: m },
    update: { status: 'disconnected', data: '' },
    create: { messenger: m, status: 'disconnected' },
  })
  res.json({ ok: true })
})
