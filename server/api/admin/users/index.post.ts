import { getDb } from '../../../utils/db'
import { hashPassword, requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const { username, password, passwordHint, role } = body || {}

  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Username must be at least 2 characters' })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters' })
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Username already exists' })
  }

  const hash = hashPassword(password)
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, password_hint, role) VALUES (?, ?, ?, ?)'
  ).run(username.trim(), hash, passwordHint || null, role === 'admin' ? 'admin' : 'user')

  return {
    id: result.lastInsertRowid,
    username: username.trim(),
    role: role === 'admin' ? 'admin' : 'user',
    message: 'User created'
  }
})
