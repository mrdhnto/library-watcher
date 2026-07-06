import { getDb } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = getRouterParam(event, 'id')
  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client ID' })
  }

  const body = await readBody(event)
  const { userId } = body || {}

  const db = getDb()
  const client = db.prepare('SELECT client_id FROM clients WHERE client_id = ?').get(clientId) as any
  if (!client) {
    throw createError({ statusCode: 404, statusMessage: 'Client not found' })
  }

  if (userId) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
  }

  db.prepare('UPDATE clients SET user_id = ? WHERE client_id = ?').run(userId || null, clientId)

  // Also rebind the token to the same user
  const clientToken = db.prepare('SELECT token FROM clients WHERE client_id = ?').get(clientId) as any
  if (clientToken && clientToken.token) {
    db.prepare('UPDATE client_tokens SET user_id = ? WHERE token = ?').run(userId || null, clientToken.token)
  }

  return { message: userId ? 'Client bound to user' : 'Client unbound' }
})
