import { getDb } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = getDb()
  return db.prepare(`
    SELECT id, username, role, is_active, is_temp, password_hint, created_at
    FROM users
    ORDER BY created_at DESC
  `).all()
})
