import { getDb } from '../../../../utils/db'
import { hashPassword, requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const userId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  }

  const body = await readBody(event)
  const { password } = body || {}
  if (!password || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const hash = hashPassword(password)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId)

  return { message: 'Password reset successful' }
})
