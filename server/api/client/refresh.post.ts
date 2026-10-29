import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../utils/db'
import { generateAccessToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { refreshToken } = body

  if (!refreshToken) {
    throw createError({ statusCode: 400, message: 'Refresh token is required' })
  }

  const db = getDb()

  // Validate refresh token
  const tokenRecord = db.prepare('SELECT id, client_id, expires_at FROM client_refresh_tokens WHERE token = ?').get(refreshToken) as any
  if (!tokenRecord) {
    throw createError({ statusCode: 401, message: 'Invalid refresh token' })
  }

  // Check expiration
  const now = new Date()
  const expiresAt = new Date(tokenRecord.expires_at)
  if (now > expiresAt) {
    // Delete expired token
    db.prepare('DELETE FROM client_refresh_tokens WHERE id = ?').run(tokenRecord.id)
    throw createError({ statusCode: 401, message: 'Refresh token expired' })
  }

  // Get client details for access token
  const clientRecord = db.prepare('SELECT hostname, status FROM clients WHERE client_id = ?').get(tokenRecord.client_id) as any
  if (!clientRecord) {
    throw createError({ statusCode: 401, message: 'Client not found' })
  }

  // Generate new access token
  const accessToken = await generateAccessToken(tokenRecord.client_id, clientRecord.hostname)

  return {
    accessToken
  }
})
