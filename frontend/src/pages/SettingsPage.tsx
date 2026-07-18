import { useEffect, useState } from 'react'
import { api, type Settings, type MessengerStatus } from '../api'

const providers = [
  { value: 'openrouter', label: 'OpenRouter (DeepSeek и др.)' },
  { value: 'yandexgpt', label: 'YandexGPT' },
  { value: 'openai', label: 'OpenAI (ChatGPT)' },
  { value: 'local', label: 'Локальный ПК (Ollama / LM Studio)' },
]

const messengerNames: Record<string, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp', max: 'MAX' }

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null)
  const [messengers, setMessengers] = useState<MessengerStatus[]>([])
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    void api.get<Settings>('/settings').then(setS)
    void api.get<MessengerStatus[]>('/messengers').then(setMessengers)
  }, [])

  if (!s) return <p className="p-4">Загрузка…</p>

  const save = async () => {
    setS(await api.put<Settings>('/settings', s))
    setTestResult('Сохранено ✓')
  }

  const testAi = async () => {
    setTestResult('Проверяю…')
    const r = await api.post<{ ok: boolean; answer?: string; error?: string }>('/settings/test-ai')
    setTestResult(r.ok ? `✅ ИИ отвечает: "${r.answer}"` : `❌ Ошибка: ${r.error}`)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-3 font-semibold">🤖 Настройки ИИ</h3>
        <label className="mb-1 block text-sm text-slate-400">Провайдер</label>
        <select
          value={s.aiProvider}
          onChange={(e) => setS({ ...s, aiProvider: e.target.value })}
          className="mb-2 w-full rounded-lg bg-slate-800 p-2"
        >
          {providers.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <label className="mb-1 block text-sm text-slate-400">
          API-ключ {s.aiProvider === 'yandexgpt' && '(формат: folderId:apiKey)'}
        </label>
        <input
          value={s.aiApiKey}
          onChange={(e) => setS({ ...s, aiApiKey: e.target.value })}
          className="mb-2 w-full rounded-lg bg-slate-800 p-2"
        />
        <label className="mb-1 block text-sm text-slate-400">Модель</label>
        <input
          value={s.aiModel}
          onChange={(e) => setS({ ...s, aiModel: e.target.value })}
          placeholder="deepseek/deepseek-chat"
          className="mb-2 w-full rounded-lg bg-slate-800 p-2"
        />
        {s.aiProvider === 'local' && (
          <>
            <label className="mb-1 block text-sm text-slate-400">URL локального сервера (Ollama)</label>
            <input
              value={s.aiLocalUrl}
              onChange={(e) => setS({ ...s, aiLocalUrl: e.target.value })}
              placeholder="http://192.168.1.10:11434"
              className="mb-2 w-full rounded-lg bg-slate-800 p-2"
            />
          </>
        )}
        <label className="mb-1 block text-sm text-slate-400">Системный промпт (как ИИ общается с клиентами)</label>
        <textarea
          value={s.aiSystemPrompt}
          onChange={(e) => setS({ ...s, aiSystemPrompt: e.target.value })}
          rows={4}
          className="mb-2 w-full rounded-lg bg-slate-800 p-2 text-sm"
        />
        <div className="flex gap-2">
          <button onClick={() => void save()} className="flex-1 rounded-lg bg-emerald-600 p-2 font-semibold hover:bg-emerald-500">
            Сохранить
          </button>
          <button onClick={() => void testAi()} className="flex-1 rounded-lg bg-sky-600 p-2 font-semibold hover:bg-sky-500">
            Проверить ИИ
          </button>
        </div>
        {testResult && <p className="mt-2 text-sm text-slate-300">{testResult}</p>}
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-3 font-semibold">💬 Мессенджеры</h3>
        {messengers.map((m) => (
          <div key={m.messenger} className="mb-3 rounded-lg bg-slate-800 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{messengerNames[m.messenger]}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${m.status === 'connected' ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                {m.status === 'connected' ? 'Подключён' : 'Не подключён'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{m.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold">🎯 Цель по долгу</h3>
        <input
          type="number"
          value={s.debtGoal}
          onChange={(e) => setS({ ...s, debtGoal: Number(e.target.value) })}
          className="mb-2 w-full rounded-lg bg-slate-800 p-2"
        />
        <button onClick={() => void save()} className="w-full rounded-lg bg-emerald-600 p-2 font-semibold hover:bg-emerald-500">
          Сохранить
        </button>
      </div>
    </div>
  )
}
