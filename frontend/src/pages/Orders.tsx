import { useEffect, useState, useCallback } from 'react'
import { api, type Order, type InventoryItem } from '../api'

const statusLabels: Record<Order['status'], string> = {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Завершён',
  cancelled: 'Отменён',
}

const statusColors: Record<Order['status'], string> = {
  new: 'bg-sky-600',
  in_progress: 'bg-amber-600',
  done: 'bg-emerald-600',
  cancelled: 'bg-slate-600',
}

const emptyForm = {
  clientName: '',
  phone: '',
  address: '',
  acModel: '',
  routeLength: '',
  price: '',
  scheduledAt: '',
  note: '',
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [materials, setMaterials] = useState<{ itemId: number; quantity: number }[]>([])

  const load = useCallback(async () => {
    const [o, i] = await Promise.all([api.get<Order[]>('/orders'), api.get<InventoryItem[]>('/inventory')])
    setOrders(o)
    setItems(i)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!form.clientName) return
    await api.post('/orders', {
      ...form,
      routeLength: Number(form.routeLength) || 0,
      price: Number(form.price) || 0,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      materials: materials.filter((m) => m.quantity > 0),
    })
    setForm(emptyForm)
    setMaterials([])
    setShowForm(false)
    await load()
  }

  const setStatus = async (id: number, status: Order['status']) => {
    await api.post(`/orders/${id}/status`, { status })
    await load()
  }

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4 p-4">
      <button
        onClick={() => setShowForm((s) => !s)}
        className="w-full rounded-lg bg-sky-600 p-2 font-semibold hover:bg-sky-500"
      >
        {showForm ? 'Скрыть форму' : '+ Новый заказ'}
      </button>

      {showForm && (
        <div className="space-y-2 rounded-2xl bg-slate-900 p-4">
          <input placeholder="ФИО клиента *" value={form.clientName} onChange={set('clientName')} className="w-full rounded-lg bg-slate-800 p-2" />
          <input placeholder="Телефон" value={form.phone} onChange={set('phone')} className="w-full rounded-lg bg-slate-800 p-2" />
          <input placeholder="Адрес" value={form.address} onChange={set('address')} className="w-full rounded-lg bg-slate-800 p-2" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Модель кондиционера" value={form.acModel} onChange={set('acModel')} className="rounded-lg bg-slate-800 p-2" />
            <input type="number" placeholder="Трасса, м" value={form.routeLength} onChange={set('routeLength')} className="rounded-lg bg-slate-800 p-2" />
            <input type="number" placeholder="Стоимость, ₽" value={form.price} onChange={set('price')} className="rounded-lg bg-slate-800 p-2" />
            <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} className="rounded-lg bg-slate-800 p-2" />
          </div>
          <input placeholder="Заметка" value={form.note} onChange={set('note')} className="w-full rounded-lg bg-slate-800 p-2" />
          <div>
            <p className="mb-1 text-sm text-slate-400">Материалы (спишутся при завершении):</p>
            {items.map((item) => {
              const m = materials.find((x) => x.itemId === item.id)
              return (
                <div key={item.id} className="mb-1 flex items-center gap-2 text-sm">
                  <span className="flex-1">{item.name}</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={m?.quantity || ''}
                    onChange={(e) =>
                      setMaterials((ms) => [
                        ...ms.filter((x) => x.itemId !== item.id),
                        { itemId: item.id, quantity: Number(e.target.value) },
                      ])
                    }
                    className="w-20 rounded bg-slate-800 p-1 text-right"
                  />
                  <span className="w-10 text-slate-500">{item.unit}</span>
                </div>
              )
            })}
          </div>
          <button onClick={() => void save()} className="w-full rounded-lg bg-emerald-600 p-2 font-semibold hover:bg-emerald-500">
            Сохранить заказ
          </button>
        </div>
      )}

      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              #{o.id} {o.clientName}
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[o.status]}`}>{statusLabels[o.status]}</span>
          </div>
          <p className="text-sm text-slate-400">
            {o.scheduledAt && <>📅 {new Date(o.scheduledAt).toLocaleString('ru-RU')} · </>}
            {o.address && <>📍 {o.address} · </>}
            {o.phone && <>📞 {o.phone} · </>}
            {o.acModel && <>❄️ {o.acModel} · </>}
            {o.routeLength > 0 && <>трасса {o.routeLength} м · </>}
            💰 {o.price.toLocaleString('ru-RU')} ₽
          </p>
          {o.materials.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Материалы: {o.materials.map((m) => `${m.item.name} ×${m.quantity}`).join(', ')}
            </p>
          )}
          {o.status !== 'done' && o.status !== 'cancelled' && (
            <div className="mt-2 flex gap-2">
              {o.status === 'new' && (
                <button onClick={() => void setStatus(o.id, 'in_progress')} className="rounded bg-amber-600 px-3 py-1 text-sm hover:bg-amber-500">
                  В работу
                </button>
              )}
              <button onClick={() => void setStatus(o.id, 'done')} className="rounded bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-500">
                Завершить (списать материалы)
              </button>
              <button onClick={() => void setStatus(o.id, 'cancelled')} className="rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600">
                Отменить
              </button>
            </div>
          )}
        </div>
      ))}
      {orders.length === 0 && <p className="text-center text-slate-500">Заказов пока нет</p>}
    </div>
  )
}
