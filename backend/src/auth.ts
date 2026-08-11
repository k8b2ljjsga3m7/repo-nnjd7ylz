import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { Router } from 'express'
import { z } from 'zod'

const password = process.env.ADMIN_PASSWORD || ''
const secret = process.env.AUTH_SECRET || password || 'dev-secret'
const SESSION_DAYS = 30

function sign(payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function makeToken() {
  const exp = Date.now() + SESSION_DAYS * 86400000
  return `${exp}.${sign(String(exp))}`
}

function validToken(token: string | undefined) {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  const expected = sign(exp)
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

function getToken(req: Request) {
  const cookie = req.headers.cookie || ''
  return cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('kondei_session='))
    ?.slice('kondei_session='.length)
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!password) return next() // auth disabled until ADMIN_PASSWORD is set
  if (req.path === '/health' || req.path.startsWith('/auth')) return next()
  if (validToken(getToken(req))) return next()
  res.status(401).json({ error: 'unauthorized' })
}

export const auth = Router()

auth.get('/me', (req, res) => {
  res.json({ authRequired: Boolean(password), authenticated: !password || validToken(getToken(req)) })
})

auth.post('/login', (req, res) => {
  const { password: given } = z.object({ password: z.string() }).parse(req.body)
  const a = Buffer.from(given)
  const b = Buffer.from(password)
  if (!password || a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }
  res.setHeader(
    'Set-Cookie',
    `kondei_session=${makeToken()}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; SameSite=Lax`,
  )
  res.json({ ok: true })
})

auth.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'kondei_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.json({ ok: true })
})
