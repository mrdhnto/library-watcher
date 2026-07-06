import { getDb } from '../../utils/db'
import { hashPassword, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readBody(event)
  const { currentPassword, newPassword } = body || {}
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Current password and new password (min 6 chars) required' })
  }
  if (currentPassword === newPassword) {
    throw createError({ statusCode: 400, statusMessage: 'New password must differ from current password' })
  }

  const db = getDb()
  const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any
  if (!stored || !verifyPassword(currentPassword, stored.password_hash)) {
    throw createError({ statusCode: 403, statusMessage: 'Current password is incorrect' })
  }

  const hash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)

  return { message: 'Password updated' }
})
