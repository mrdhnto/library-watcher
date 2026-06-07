import { getDb } from '../../../utils/db'
import { connectedClients } from '../../../utils/ws-clients'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: 'Client ID is required' })
  }

  const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(clientId) as any
  if (!client) {
    throw createError({ statusCode: 404, statusMessage: 'Client not found' })
  }

  // Send kick via WebSocket
  const entry = connectedClients.get(clientId)
  if (entry) {
    try {
      entry.peer.send(JSON.stringify({ type: 'kick' }))
      entry.peer.close()
    } catch {
      // Client already disconnected
    }
    connectedClients.delete(clientId)
  }

  db.prepare('UPDATE clients SET status = ? WHERE client_id = ?').run('kicked', clientId)

  return { success: true }
})
