import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getDb } from './db'

const SALT_LENGTH = 32
const KEY_LENGTH = 64
const SESSION_EXPIRY_DAYS = 7

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [salt, hash] = parts
  const derived = scryptSync(password, salt!, KEY_LENGTH).toString('hex')
  return timingSafeEqual(Buffer.from(derived), Buffer.from(hash!))
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function createSession(userId: number): { token: string; expiresAt: Date } {
  const db = getDb()
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  db.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(userId, token, expiresAt.toISOString())

  return { token, expiresAt }
}

export function validateSession(token: string): any | null {
  const db = getDb()
  const session = db.prepare(`
    SELECT s.user_id, u.username, u.role, u.is_active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
  `).get(token) as any

  if (!session) return null

  return {
    id: session.user_id,
    username: session.username,
    role: session.role,
    is_active: session.is_active
  }
}

export function destroySession(token: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function destroyUserSessions(userId: number): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export function getUsersCount(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as any
  return row?.count || 0
}

export function requireAdmin(event: any): { id: number; username: string; role: string } {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return user
}
