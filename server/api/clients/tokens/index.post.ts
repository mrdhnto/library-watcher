import { getDb } from '../../../utils/db'
import { randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event)
  const token = randomBytes(24).toString('hex')
  const label = body?.label || ''
  const userId = body?.userId || null

  if (userId) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      throw createError({ statusCode: 400, statusMessage: 'User not found' })
    }
  }

  db.prepare('INSERT INTO client_tokens (token, label, user_id) VALUES (?, ?, ?)').run(token, label, userId)

  const row = db.prepare(`
    SELECT ct.*, u.username as user_name
    FROM client_tokens ct
    LEFT JOIN users u ON ct.user_id = u.id
    WHERE ct.token = ?
  `).get(token)
  return row
})
