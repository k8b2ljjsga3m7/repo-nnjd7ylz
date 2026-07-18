import { Router } from 'express'
import { prisma } from '../db.js'

export const notifications = Router()

notifications.get('/', async (_req, res) => {
  res.json(await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }))
})

notifications.post('/read-all', async (_req, res) => {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } })
  res.json({ ok: true })
})
