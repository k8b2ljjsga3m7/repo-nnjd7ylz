import { Router } from 'express'
import { z } from 'zod'
import { prisma, getSettings } from '../db.js'

export const finances = Router()

const txSchema = z.object({
  type: z.enum(['income', 'expense', 'debt_payment']),
  category: z.string(),
  amount: z.number().positive(),
  note: z.string().default(''),
  date: z.coerce.date().optional(),
})

finances.get('/transactions', async (_req, res) => {
  res.json(await prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 200 }))
})

finances.post('/transactions', async (req, res) => {
  const data = txSchema.parse(req.body)
  res.json(await prisma.transaction.create({ data }))
})

finances.delete('/transactions/:id', async (req, res) => {
  await prisma.transaction.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

finances.get('/summary', async (_req, res) => {
  const s = await getSettings()
  const all = await prisma.transaction.findMany()
  const sum = (f: (t: (typeof all)[number]) => boolean) =>
    all.filter(f).reduce((a, t) => a + t.amount, 0)
  const weekAgo = new Date(Date.now() - 7 * 86400_000)
  const weekIncome = sum((t) => t.type === 'income' && t.date >= weekAgo)
  const weekExpense = sum((t) => t.type === 'expense' && t.date >= weekAgo)
  const weekProfit = weekIncome - weekExpense
  const paid = sum((t) => t.type === 'debt_payment')
  res.json({
    debtGoal: s.debtGoal,
    debtPaid: paid,
    debtLeft: Math.max(0, s.debtGoal - paid),
    totalIncome: sum((t) => t.type === 'income'),
    totalExpense: sum((t) => t.type === 'expense'),
    weekIncome,
    weekExpense,
    weekProfit,
    // Рекомендация: 60% чистой прибыли за неделю — в досрочное погашение
    recommendedPayment: Math.max(0, Math.round(weekProfit * 0.6)),
  })
})

finances.put('/goal', async (req, res) => {
  const { debtGoal } = z.object({ debtGoal: z.number().positive() }).parse(req.body)
  res.json(await prisma.settings.update({ where: { id: 1 }, data: { debtGoal } }))
})
