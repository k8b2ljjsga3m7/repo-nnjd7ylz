const base = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body?: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(p: string, body: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
}

export interface Summary {
  debtGoal: number
  debtPaid: number
  debtLeft: number
  totalIncome: number
  totalExpense: number
  weekIncome: number
  weekExpense: number
  weekProfit: number
  recommendedPayment: number
}

export interface Tx {
  id: number
  type: 'income' | 'expense' | 'debt_payment'
  category: string
  amount: number
  note: string
  date: string
}

export interface InventoryItem {
  id: number
  name: string
  unit: string
  quantity: number
  minStock: number
}

export interface OrderMaterial {
  id: number
  itemId: number
  quantity: number
  item: InventoryItem
}

export interface Order {
  id: number
  clientName: string
  phone: string
  address: string
  acModel: string
  routeLength: number
  price: number
  status: 'new' | 'in_progress' | 'done' | 'cancelled'
  scheduledAt: string | null
  note: string
  materials: OrderMaterial[]
}

export interface BlockedDay {
  id: number
  date: string
  reason: 'main_job' | 'day_off' | 'sick'
}

export interface Chat {
  id: number
  messenger: string
  externalId: string
  clientName: string
  aiEnabled: boolean
  messages: Message[]
}

export interface Message {
  id: number
  chatId: number
  role: 'client' | 'ai' | 'me'
  text: string
  createdAt: string
}

export interface Settings {
  debtGoal: number
  aiProvider: string
  aiApiKey: string
  aiModel: string
  aiLocalUrl: string
  aiSystemPrompt: string
}

export interface MessengerStatus {
  messenger: string
  status: string
  available: boolean
  hint: string
}

export interface Notification {
  id: number
  text: string
  read: boolean
  createdAt: string
}
