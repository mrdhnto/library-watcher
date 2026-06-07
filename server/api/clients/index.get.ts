import { getDb } from '../../utils/db'
import { connectedClients } from '../../utils/ws-clients'

export default defineEventHandler(async () => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM clients ORDER BY connected_at DESC').all() as any[]

  return rows.map((row: any) => ({
    ...row,
    is_connected: connectedClients.has(row.client_id)
  }))
})
