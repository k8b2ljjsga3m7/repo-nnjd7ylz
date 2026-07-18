import { useEffect, useState, useCallback } from 'react'
import { api, type InventoryItem } from '../api'

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('шт')
  const [quantity, setQuantity] = useState('')

  const load = useCallback(async () => setItems(await api.get<InventoryItem[]>('/inventory')), [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async () => {
    if (!name) return
    await api.post('/inventory', { name, unit, quantity: Number(quantity) || 0 })
    setName('')
    setQuantity('')
    await load()
  }

  const adjust = async (item: InventoryItem, delta: number) => {
    await api.put(`/inventory/${item.id}`, { quantity: Math.max(0, item.quantity + delta) })
    await load()
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">Добавить позицию</h3>
        <div className="flex gap-2">
          <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg bg-slate-800 p-2" />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-lg bg-slate-800 p-2">
            <option value="шт">шт</option>
            <option value="м">м</option>
            <option value="компл">компл</option>
          </select>
          <input type="number" placeholder="Кол-во" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-24 rounded-lg bg-slate-800 p-2" />
          <button onClick={() => void add()} className="rounded-lg bg-emerald-600 px-4 hover:bg-emerald-500">+</button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">Остатки на складе</h3>
        <ul className="divide-y divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2">
              <span>
                {item.name}
                {item.quantity <= item.minStock && <span className="ml-2 rounded bg-rose-600 px-1.5 py-0.5 text-xs">мало!</span>}
              </span>
              <span className="flex items-center gap-2">
                <button onClick={() => void adjust(item, -1)} className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700">−</button>
                <span className="min-w-16 text-center font-mono">
                  {item.quantity} {item.unit}
                </span>
                <button onClick={() => void adjust(item, 1)} className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700">+</button>
              </span>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-500">Склад пуст</p>}
        </ul>
      </div>
    </div>
  )
}
