import { getDb } from '../../utils/db'
import { connectedClients } from '../../utils/ws-clients'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const db = getDb()
  let rows: any[]

  if (user.role === 'admin') {
    rows = db.prepare(`
      SELECT c.*, u.username as user_name
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.connected_at DESC
    `).all() as any[]
  } else {
    rows = db.prepare(`
      SELECT c.*, u.username as user_name
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.connected_at DESC
    `).all(user.id) as any[]
  }

  return rows.map((row: any) => ({
    ...row,
    is_connected: connectedClients.has(row.client_id)
  }))
})
