import { getDb } from '../../utils/db'
import { verifyPassword, createSession } from '../../utils/auth'
import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username and password are required'
    })
  }

  const db = getDb()
  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1'
  ).get(username.trim()) as any

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid username or password'
    })
  }

  const { token } = createSession(user.id)

  setCookie(event, 'session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return {
    user: { id: user.id, username: user.username, role: user.role },
    message: 'Login successful'
  }
})
