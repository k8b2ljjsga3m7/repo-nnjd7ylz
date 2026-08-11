import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { notify } from '../notify.js'

export const orders = Router()

const fmtDate = (d: Date | null) => (d ? d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'без даты')

const orderSchema = z.object({
  clientName: z.string().min(1),
  phone: z.string().default(''),
  address: z.string().default(''),
  acModel: z.string().default(''),
  routeLength: z.number().default(0),
  price: z.number().default(0),
  scheduledAt: z.coerce.date().nullable().optional(),
  note: z.string().default(''),
  materials: z.array(z.object({ itemId: z.number(), quantity: z.number().positive() })).default([]),
})

orders.get('/', async (_req, res) => {
  res.json(
    await prisma.order.findMany({
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      include: { materials: { include: { item: true } } },
    }),
  )
})

orders.post('/', async (req, res) => {
  const { materials, ...data } = orderSchema.parse(req.body)
  const order = await prisma.order.create({
    data: { ...data, materials: { create: materials } },
    include: { materials: { include: { item: true } } },
  })
  await notify(
    'order',
    `📝 Новая запись: заказ #${order.id} — ${order.clientName}, ${fmtDate(order.scheduledAt)}${order.address ? `, ${order.address}` : ''}${order.price ? `, ${order.price} ₽` : ''}`,
  )
  res.json(order)
})

orders.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { materials, ...data } = orderSchema.partial().parse(req.body)
  const order = await prisma.order.update({
    where: { id },
    data: {
      ...data,
      ...(materials
        ? { materials: { deleteMany: {}, create: materials } }
        : {}),
    },
    include: { materials: { include: { item: true } } },
  })
  res.json(order)
})

// Смена статуса. При переводе в "done": списание материалов со склада + доход в финансы.
orders.post('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = z.object({ status: z.enum(['new', 'in_progress', 'done', 'cancelled']) }).parse(req.body)
  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: { materials: { include: { item: true } } } })
  const result = await prisma.$transaction(async (tx) => {
    if (status === 'done' && order.status !== 'done') {
      for (const m of order.materials) {
        await tx.inventoryItem.update({ where: { id: m.itemId }, data: { quantity: { decrement: m.quantity } } })
      }
      if (order.price > 0) {
        await tx.transaction.create({
          data: { type: 'income', category: 'installation', amount: order.price, note: `Заказ #${order.id}: ${order.clientName}` },
        })
      }
    }
    return tx.order.update({ where: { id }, data: { status }, include: { materials: { include: { item: true } } } })
  })
  if (status === 'done' && order.status !== 'done') {
    await notify('order', `✅ Заказ #${order.id} (${order.clientName}) завершён${order.price ? `: +${order.price} ₽` : ''}`)
  }
  // Алерт по низким остаткам
  const low = await prisma.inventoryItem.findMany({ where: { quantity: { lte: prisma.inventoryItem.fields.minStock } } })
  for (const item of low) {
    await notify('alert', `📦 Мало на складе: ${item.name} — осталось ${item.quantity} ${item.unit}`)
  }
  res.json(result)
})

orders.delete('/:id', async (req, res) => {
  await prisma.order.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})
