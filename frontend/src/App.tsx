import { useEffect, useState } from 'react'
import Finance from './pages/Finance'
import Orders from './pages/Orders'
import Calendar from './pages/Calendar'
import Inventory from './pages/Inventory'
import Chats from './pages/Chats'
import SettingsPage from './pages/SettingsPage'
import { api, type Notification } from './api'

const tabs = [
  { id: 'finance', label: '💰', title: 'Финансы' },
  { id: 'orders', label: '📋', title: 'Заказы' },
  { id: 'calendar', label: '📅', title: 'Календарь' },
  { id: 'inventory', label: '📦', title: 'Склад' },
  { id: 'chats', label: '💬', title: 'Чаты' },
  { id: 'settings', label: '⚙️', title: 'Настройки' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function App() {
  const [tab, setTab] = useState<TabId>('finance')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const load = () => void api.get<Notification[]>('/notifications').then(setNotifications)
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const unread = notifications.filter((n) => !n.read).length

  const markRead = async () => {
    setShowNotif(!showNotif)
    if (!showNotif && unread > 0) {
      await api.post('/notifications/read-all')
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <h1 className="text-lg font-bold">❄️ Кондей-Мастер · {tabs.find((t) => t.id === tab)?.title}</h1>
        <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="text-xl"
          title="Сменить тему"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button onClick={() => void markRead()} className="relative text-xl">
          🔔
          {unread > 0 && (
            <span className="absolute -right-2 -top-1 rounded-full bg-rose-600 px-1.5 text-xs">{unread}</span>
          )}
        </button>
        </div>
      </header>

      {showNotif && (
        <div className="max-h-60 overflow-y-auto border-b border-slate-800 bg-slate-900 p-3">
          {notifications.length === 0 && <p className="text-sm text-slate-500">Уведомлений нет</p>}
          {notifications.map((n) => (
            <p key={n.id} className="border-b border-slate-800 py-2 text-sm last:border-0">
              {n.text}
              <span className="block text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('ru-RU')}</span>
            </p>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {tab === 'finance' && <Finance />}
        {tab === 'orders' && <Orders />}
        {tab === 'calendar' && <Calendar />}
        {tab === 'inventory' && <Inventory />}
        {tab === 'chats' && <Chats />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <nav className="grid grid-cols-6 border-t border-slate-800 bg-slate-900">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center py-2 text-xl ${tab === t.id ? 'bg-slate-800' : ''}`}
          >
            {t.label}
            <span className="text-[10px] text-slate-400">{t.title}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
