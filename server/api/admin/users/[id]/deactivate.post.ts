import { getDb } from '../../../../utils/db'
import { requireAdmin, destroyUserSessions } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const userId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  }

  if (userId === admin.id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot deactivate yourself' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId)
  destroyUserSessions(userId)

  return { message: 'User deactivated' }
})
