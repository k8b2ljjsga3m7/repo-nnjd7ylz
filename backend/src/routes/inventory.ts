import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

export const inventory = Router()

const itemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().default('шт'),
  quantity: z.number().default(0),
  minStock: z.number().default(0),
})

inventory.get('/', async (_req, res) => {
  res.json(await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }))
})

inventory.post('/', async (req, res) => {
  res.json(await prisma.inventoryItem.create({ data: itemSchema.parse(req.body) }))
})

inventory.put('/:id', async (req, res) => {
  res.json(
    await prisma.inventoryItem.update({
      where: { id: Number(req.params.id) },
      data: itemSchema.partial().parse(req.body),
    }),
  )
})

inventory.delete('/:id', async (req, res) => {
  await prisma.inventoryItem.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})
