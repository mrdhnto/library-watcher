import { getDb } from '../../../../utils/db'
import { requireAdmin, hashPassword } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const userId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  }

  const body = await readBody(event)
  const { username, password } = body || {}
  if (!username || !password || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password (min 6 chars) required' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id, is_temp FROM users WHERE id = ?').get(userId) as any
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (!user.is_temp) {
    throw createError({ statusCode: 400, statusMessage: 'User is already a permanent account' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId) as any
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Username already taken' })
  }

  const hash = hashPassword(password)
  db.prepare('UPDATE users SET is_temp = 0, username = ?, password_hash = ?, role = ? WHERE id = ?')
    .run(username, hash, 'user', userId)

  return { message: 'User promoted to permanent account' }
})
