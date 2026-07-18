import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { replyToClient } from '../ai/router.js'

export const chats = Router()

chats.get('/', async (_req, res) => {
  res.json(
    await prisma.chat.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
  )
})

chats.get('/:id/messages', async (req, res) => {
  res.json(
    await prisma.message.findMany({
      where: { chatId: Number(req.params.id) },
      orderBy: { createdAt: 'asc' },
    }),
  )
})

// Тумблер "ИИ отвечает" / "Ручной режим"
chats.post('/:id/ai', async (req, res) => {
  const { aiEnabled } = z.object({ aiEnabled: z.boolean() }).parse(req.body)
  res.json(await prisma.chat.update({ where: { id: Number(req.params.id) }, data: { aiEnabled } }))
})

// Мой ручной ответ клиенту из админки
chats.post('/:id/reply', async (req, res) => {
  const { text } = z.object({ text: z.string().min(1) }).parse(req.body)
  const chatId = Number(req.params.id)
  const msg = await prisma.message.create({ data: { chatId, role: 'me', text } })
  await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })
  res.json(msg)
})

// Входящее сообщение от клиента (вызывается коннекторами мессенджеров или для теста)
chats.post('/incoming', async (req, res) => {
  const { messenger, externalId, clientName, text } = z
    .object({
      messenger: z.enum(['telegram', 'whatsapp', 'max']),
      externalId: z.string().min(1),
      clientName: z.string().default(''),
      text: z.string().min(1),
    })
    .parse(req.body)
  const chat = await prisma.chat.upsert({
    where: { messenger_externalId: { messenger, externalId } },
    update: { ...(clientName ? { clientName } : {}), updatedAt: new Date() },
    create: { messenger, externalId, clientName },
  })
  const answer = await replyToClient(chat.id, text)
  res.json({ chatId: chat.id, answer })
})
