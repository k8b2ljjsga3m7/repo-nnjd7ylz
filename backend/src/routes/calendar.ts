import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

export const calendar = Router()

calendar.get('/blocked', async (_req, res) => {
  res.json(await prisma.blockedDay.findMany({ orderBy: { date: 'asc' } }))
})

calendar.post('/blocked', async (req, res) => {
  const { date, reason } = z
    .object({ date: z.coerce.date(), reason: z.enum(['main_job', 'day_off', 'sick']) })
    .parse(req.body)
  res.json(
    await prisma.blockedDay.upsert({
      where: { date },
      update: { reason },
      create: { date, reason },
    }),
  )
})

calendar.delete('/blocked/:id', async (req, res) => {
  await prisma.blockedDay.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})
