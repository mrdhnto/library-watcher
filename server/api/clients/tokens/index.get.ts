import { getDb } from '../../../utils/db'

export default defineEventHandler(async () => {
  const db = getDb()
  return db.prepare('SELECT * FROM client_tokens ORDER BY created_at DESC').all()
})
