import { getDb } from '../../utils/db'
import { hashPassword, createSession, getUsersCount } from '../../utils/auth'
import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  if (getUsersCount() > 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Setup already completed'
    })
  }

  const body = await readBody(event)
  const { username, password, passwordHint } = body || {}

  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username must be at least 2 characters'
    })
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 6 characters'
    })
  }

  const db = getDb()
  const hash = hashPassword(password)

  const result = db.prepare(
    'INSERT INTO users (username, password_hash, password_hint, role) VALUES (?, ?, ?, ?)'
  ).run(username.trim(), hash, passwordHint || null, 'admin')

  const userId = result.lastInsertRowid as number
  const { token } = createSession(userId)

  setCookie(event, 'session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return {
    user: { id: userId, username, role: 'admin' },
    message: 'Admin user created'
  }
})
