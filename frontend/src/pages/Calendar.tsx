import { useEffect, useState, useCallback } from 'react'
import { api, type BlockedDay, type Order, type Settings } from '../api'

const reasons = {
  main_job: { label: 'Основная работа', color: 'bg-rose-600' },
  day_off: { label: 'Выходной', color: 'bg-sky-600' },
  sick: { label: 'Заболел', color: 'bg-amber-600' },
} as const

const shiftPhases = [
  {
    key: 'day',
    badge: 'Д',
    label: 'Дневная смена (7:00–20:00)',
    color: 'text-rose-400',
    ring: 'ring-1 ring-rose-500/60',
    hint: 'Занят на основной работе весь день — монтажи не планировать.',
  },
  {
    key: 'night',
    badge: 'Н',
    label: 'Ночная смена (20:00–9:00)',
    color: 'text-violet-400',
    ring: 'ring-1 ring-violet-500/60',
    hint: 'До ~17:00 свободен: можно взять 1–2 кондиционера перед сменой.',
  },
  {
    key: 'sleep',
    badge: 'О',
    label: 'Отсыпной (сон до 14:00–15:00)',
    color: 'text-amber-400',
    ring: 'ring-1 ring-amber-500/60',
    hint: 'После ~15:00 можно Яндекс.Доставку или монтаж — либо отдых после ночи.',
  },
  {
    key: 'free',
    badge: 'В',
    label: 'Выходной',
    color: 'text-emerald-400',
    ring: 'ring-1 ring-emerald-500/60',
    hint: 'Полностью свободен — лучший день для монтажей.',
  },
] as const

function shiftPhase(cycleStart: string, key: string) {
  if (!cycleStart) return null
  const diff = Math.round((Date.parse(key) - Date.parse(cycleStart)) / 86400000)
  return shiftPhases[((diff % 4) + 4) % 4]
}

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // ISO: Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { startOffset, daysInMonth }
}

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [blocked, setBlocked] = useState<BlockedDay[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [cycleStart, setCycleStart] = useState('')

  const load = useCallback(async () => {
    const [b, o, s] = await Promise.all([
      api.get<BlockedDay[]>('/calendar/blocked'),
      api.get<Order[]>('/orders'),
      api.get<Settings>('/settings'),
    ])
    setBlocked(b)
    setOrders(o)
    setCycleStart(s.shiftCycleStart)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { startOffset, daysInMonth } = monthDays(year, month)
  const blockedMap = new Map(blocked.map((b) => [b.date.slice(0, 10), b]))
  const orderDays = new Set(
    orders.filter((o) => o.scheduledAt && o.status !== 'cancelled').map((o) => o.scheduledAt!.slice(0, 10)),
  )

  const block = async (reason: keyof typeof reasons) => {
    if (!selected) return
    await api.post('/calendar/blocked', { date: selected, reason })
    await load()
  }

  const saveCycle = async (value: string) => {
    setCycleStart(value)
    await api.put('/settings', { shiftCycleStart: value })
  }

  const unblock = async () => {
    const b = selected && blockedMap.get(selected)
    if (!b) return
    await api.del(`/calendar/blocked/${b.id}`)
    await load()
  }

  const prev = () => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1))
  const next = () => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1))

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={prev} className="rounded bg-slate-800 px-3 py-1">←</button>
          <h2 className="font-bold">
            {new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={next} className="rounded bg-slate-800 px-3 py-1">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const key = dateKey(new Date(year, month, i + 1))
            const b = blockedMap.get(key)
            const hasOrder = orderDays.has(key)
            const phase = shiftPhase(cycleStart, key)
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`relative aspect-square rounded-lg text-sm ${
                  b ? reasons[b.reason as keyof typeof reasons].color : 'bg-slate-800 hover:bg-slate-700'
                } ${selected === key ? 'ring-2 ring-white' : phase && !b ? phase.ring : ''}`}
              >
                {i + 1}
                {hasOrder && <span className="absolute right-1 top-0.5 text-[10px]">❄️</span>}
                {phase && !b && (
                  <span className={`absolute bottom-0.5 left-1 text-[10px] font-bold ${phase.color}`}>{phase.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl bg-slate-900 p-4">
          <h3 className="mb-2 font-semibold">{new Date(selected).toLocaleDateString('ru-RU')}</h3>
          {(() => {
            const phase = shiftPhase(cycleStart, selected)
            return phase ? (
              <p className="mb-2 text-sm">
                <span className={`font-semibold ${phase.color}`}>{phase.label}</span>
                <span className="text-slate-400"> — {phase.hint}</span>
              </p>
            ) : null
          })()}
          <div className="flex flex-wrap gap-2">
            {Object.entries(reasons).map(([k, v]) => (
              <button key={k} onClick={() => void block(k as keyof typeof reasons)} className={`rounded px-3 py-1 text-sm ${v.color}`}>
                {v.label}
              </button>
            ))}
            {blockedMap.has(selected) && (
              <button onClick={() => void unblock()} className="rounded bg-slate-700 px-3 py-1 text-sm">
                Разблокировать
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-400">
            {orders
              .filter((o) => o.scheduledAt?.slice(0, 10) === selected && o.status !== 'cancelled')
              .map((o) => (
                <li key={o.id}>
                  ❄️ #{o.id} {o.clientName} · {o.address}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-1 font-semibold">🔁 Сменный график (цикл 4 дня)</h3>
        <p className="mb-2 text-xs text-slate-400">
          День (7–20) → ночь (20–9) → отсыпной → выходной. Укажи дату любой дневной смены — календарь разметит все дни и подскажет, когда можно брать монтажи и доставку.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={cycleStart}
            onChange={(e) => void saveCycle(e.target.value)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
          />
          {cycleStart && (
            <button onClick={() => void saveCycle('')} className="rounded bg-slate-700 px-3 py-1 text-sm">
              Сбросить
            </button>
          )}
        </div>
        {cycleStart && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            {shiftPhases.map((p) => (
              <span key={p.key} className="flex items-center gap-1">
                <span className={`font-bold ${p.color}`}>{p.badge}</span> {p.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {Object.values(reasons).map((r) => (
          <span key={r.label} className="flex items-center gap-1">
            <span className={`h-3 w-3 rounded ${r.color}`} /> {r.label}
          </span>
        ))}
        <span>❄️ — заказ на установку</span>
      </div>
    </div>
  )
}
