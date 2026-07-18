// Коннекторы мессенджеров. Каждый коннектор принимает входящие сообщения и
// передаёт их в POST /api/chats/incoming, а ответы ИИ отправляет клиенту.
//
// Реальные интеграции подключаются здесь:
//  - whatsapp: whatsapp-web.js (QR-код -> сессия)
//  - telegram: gram.js userbot (номер телефона + код подтверждения)
//  - max: автоматизация web.max.ru через Puppeteer/Playwright
//
// Внимание: userbot-режимы нарушают условия использования WhatsApp/Telegram —
// есть риск блокировки номера. Подключайте осознанно.

export interface ConnectResult {
  status: 'pending' | 'connected' | 'disconnected'
  qr?: string
  message?: string
}

export interface Connector {
  available: boolean
  hint: string
  connect(): Promise<ConnectResult>
}

export const connectors: Record<'telegram' | 'whatsapp' | 'max', Connector> = {
  whatsapp: {
    available: false,
    hint: 'Интеграция через whatsapp-web.js: установите пакет, реализуйте connect() с генерацией QR-кода. Есть риск бана номера (нарушение ToS WhatsApp).',
    async connect() {
      return { status: 'disconnected', message: 'Коннектор WhatsApp не настроен. См. backend/src/messengers/index.ts' }
    },
  },
  telegram: {
    available: false,
    hint: 'Интеграция через gram.js (userbot): нужен api_id/api_hash с my.telegram.org, авторизация по номеру и коду. Есть риск ограничений аккаунта.',
    async connect() {
      return { status: 'disconnected', message: 'Коннектор Telegram не настроен. См. backend/src/messengers/index.ts' }
    },
  },
  max: {
    available: false,
    hint: 'Интеграция через Puppeteer + web.max.ru: авторизация по номеру телефона в headless-браузере.',
    async connect() {
      return { status: 'disconnected', message: 'Коннектор MAX не настроен. См. backend/src/messengers/index.ts' }
    },
  },
}
