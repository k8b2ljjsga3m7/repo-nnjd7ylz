import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { ZodError } from 'zod'
import { finances } from './routes/finances.js'
import { orders } from './routes/orders.js'
import { inventory } from './routes/inventory.js'
import { calendar } from './routes/calendar.js'
import { chats } from './routes/chats.js'
import { settings } from './routes/settings.js'
import { notifications } from './routes/notifications.js'
import { messengers } from './routes/messengers.js'
import { auth, requireAuth } from './auth.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use('/api', requireAuth)
app.use('/api/auth', auth)

app.use('/api/finances', finances)
app.use('/api/orders', orders)
app.use('/api/inventory', inventory)
app.use('/api/calendar', calendar)
app.use('/api/chats', chats)
app.use('/api/settings', settings)
app.use('/api/notifications', notifications)
app.use('/api/messengers', messengers)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues })
  console.error(err)
  res.status(500).json({ error: (err as Error).message })
})

const port = Number(process.env.PORT || 3001)
app.listen(port, () => console.log(`Backend on http://localhost:${port}`))
