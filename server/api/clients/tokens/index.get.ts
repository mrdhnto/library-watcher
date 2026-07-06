import { getDb } from '../../../utils/db'

export default defineEventHandler(async () => {
  const db = getDb()
  return db.prepare(`
    SELECT ct.*, u.username as user_name
    FROM client_tokens ct
    LEFT JOIN users u ON ct.user_id = u.id
    ORDER BY ct.created_at DESC
  `).all()
})
