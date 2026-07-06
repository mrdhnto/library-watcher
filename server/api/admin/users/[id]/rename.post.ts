import { getDb } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const userId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  }

  const body = await readBody(event)
  const { username } = body || {}
  if (!username || username.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Username must be at least 2 characters' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId) as any
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Username already taken' })
  }

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId)
  return { message: 'Username updated' }
})
