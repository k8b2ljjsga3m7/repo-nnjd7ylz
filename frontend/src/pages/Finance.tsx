import { useEffect, useState, useCallback } from 'react'
import { api, type Summary, type Tx } from '../api'

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

const categories: Record<string, { label: string; type: Tx['type'] }> = {
  installation: { label: 'Установка кондиционера', type: 'income' },
  yandex: { label: 'Яндекс.Доставка (смена)', type: 'income' },
  materials: { label: 'Расходники', type: 'expense' },
  fuel: { label: 'Бензин', type: 'expense' },
  personal: { label: 'Личные траты', type: 'expense' },
  credit: { label: 'Платёж по кредиту (досрочно)', type: 'debt_payment' },
}

export default function Finance() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [category, setCategory] = useState('installation')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([api.get<Summary>('/finances/summary'), api.get<Tx[]>('/finances/transactions')])
    setSummary(s)
    setTxs(t)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async () => {
    const value = Number(amount)
    if (!value) return
    await api.post('/finances/transactions', { type: categories[category].type, category, amount: value, note })
    setAmount('')
    setNote('')
    await load()
  }

  if (!summary) return <p className="p-4">Загрузка…</p>
  const pct = Math.min(100, (summary.debtPaid / summary.debtGoal) * 100)

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-1 text-lg font-bold">Цель: закрыть долг {fmt(summary.debtGoal)}</h2>
        <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Выплачено {fmt(summary.debtPaid)} ({pct.toFixed(1)}%) · Осталось {fmt(summary.debtLeft)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Прибыль за неделю</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(summary.weekProfit)}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Рекомендую в досрочку</p>
          <p className="text-xl font-bold text-sky-400">{fmt(summary.recommendedPayment)}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">Быстрый ввод</h3>
        <div className="flex flex-col gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg bg-slate-800 p-2">
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Сумма, ₽"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg bg-slate-800 p-2"
          />
          <input
            placeholder="Комментарий (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg bg-slate-800 p-2"
          />
          <button onClick={() => void add()} className="rounded-lg bg-emerald-600 p-2 font-semibold hover:bg-emerald-500">
            Записать
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">История</h3>
        <ul className="divide-y divide-slate-800">
          {txs.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {categories[t.category]?.label ?? t.category}
                {t.note && <span className="text-slate-500"> · {t.note}</span>}
                <span className="block text-xs text-slate-500">{new Date(t.date).toLocaleDateString('ru-RU')}</span>
              </span>
              <span className={t.type === 'income' ? 'text-emerald-400' : t.type === 'debt_payment' ? 'text-sky-400' : 'text-rose-400'}>
                {t.type === 'income' ? '+' : '−'}
                {fmt(t.amount)}
              </span>
            </li>
          ))}
          {txs.length === 0 && <p className="text-sm text-slate-500">Пока нет записей</p>}
        </ul>
      </div>
    </div>
  )
}
