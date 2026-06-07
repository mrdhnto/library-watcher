import { getDb } from '../../../utils/db'
import { connectedClients } from '../../../utils/ws-clients'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const clientId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const newName = body?.name

  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: 'Client ID is required' })
  }

  if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }

  const result = db.prepare('UPDATE clients SET name = ? WHERE client_id = ?').run(newName.trim(), clientId)

  if (result.changes === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Client not found' })
  }

  // Notify connected client via WebSocket
  const entry = connectedClients.get(clientId)
  if (entry) {
    try {
      entry.peer.send(JSON.stringify({ type: 'rename', name: newName.trim() }))
    } catch {
      // Client may have disconnected
    }
  }

  return { success: true }
})
