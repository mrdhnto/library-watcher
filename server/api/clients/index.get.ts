import { getDb } from '../../utils/db'
import { connectedClients } from '../../utils/ws-clients'

export default defineEventHandler(async () => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.*, u.username as user_name
    FROM clients c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.connected_at DESC
  `).all() as any[]

  return rows.map((row: any) => ({
    ...row,
    is_connected: connectedClients.has(row.client_id)
  }))
})
