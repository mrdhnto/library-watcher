import { defineEventHandler, readBody, createError } from 'h3'
import { getDb } from '../../utils/db'
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt'
import { randomUUID, randomBytes } from 'node:crypto'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, hostname = 'unknown', hardwareId = 'unknown' } = body

  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' })
  }

  const db = getDb()

  // Validate token exists + is active
  const tokenRecord = db.prepare('SELECT id, claimed_by, claimed_hardware_id, user_id FROM client_tokens WHERE token = ? AND is_active = 1').get(token) as any
  if (!tokenRecord) {
    throw createError({ statusCode: 401, message: 'Invalid or inactive registration token' })
  }

  // Token claim check: first use or reconnection by same hostname/hardware_id
  if (tokenRecord.claimed_by) {
    if (tokenRecord.claimed_hardware_id && tokenRecord.claimed_hardware_id !== hardwareId) {
      throw createError({ statusCode: 403, message: `Hardware fingerprint mismatch. Generate a new token.` })
    }
    if (tokenRecord.claimed_by !== hostname) {
      throw createError({ statusCode: 403, message: `Token already claimed by ${tokenRecord.claimed_by}. Generate a new token.` })
    }
  }

  // Claim token on first use
  if (!tokenRecord.claimed_by) {
    db.prepare('UPDATE client_tokens SET claimed_by = ?, claimed_hardware_id = ?, claimed_at = CURRENT_TIMESTAMP WHERE id = ?').run(hostname, hardwareId, tokenRecord.id)
  }

  // Temp user auto-provisioning
  let boundUserId = tokenRecord.user_id || null
  let tempCreds: any = null

  function ensureTempUser(hostname: string, preferredId: number | null): { id: number } {
    const byName = db.prepare('SELECT id, is_active FROM users WHERE username = ? AND is_temp = 1').get(hostname) as any

    let userId: number
    if (byName) {
      userId = byName.id
      if (!byName.is_active) {
        db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(userId)
      }
    } else if (preferredId) {
      const byId = db.prepare('SELECT id, is_temp FROM users WHERE id = ?').get(preferredId) as any
      if (byId?.is_temp) {
        userId = byId.id
        db.prepare('UPDATE users SET is_active = 1, username = ? WHERE id = ?').run(hostname, userId)
      } else {
        const result = db.prepare('INSERT INTO users (username, password_hash, role, is_active, is_temp) VALUES (?, ?, ?, ?, ?)').run(hostname, '', 'user', 1, 1)
        userId = result.lastInsertRowid as number
      }
    } else {
      const result = db.prepare('INSERT INTO users (username, password_hash, role, is_active, is_temp) VALUES (?, ?, ?, ?, ?)').run(hostname, '', 'user', 1, 1)
      userId = result.lastInsertRowid as number
    }

    // Generate fresh password (not strictly needed for auth endpoint unless returning tempCreds, but good for consistency)
    const rawPassword = randomBytes(12).toString('base64url').slice(0, 16)
    const pwHash = hashPassword(rawPassword)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(pwHash, userId)

    return { id: userId, creds: { username: hostname, password: rawPassword } }
  }

  if (!boundUserId) {
    const result = ensureTempUser(hostname, null)
    boundUserId = result.id
    db.prepare('UPDATE client_tokens SET user_id = ? WHERE id = ?').run(boundUserId, tokenRecord.id)
    tempCreds = result.creds
  } else {
    const boundUser = db.prepare('SELECT id, is_temp FROM users WHERE id = ? AND is_active = 1').get(boundUserId) as any
    if (!boundUser) {
      const result = ensureTempUser(hostname, boundUserId)
      boundUserId = result.id
      db.prepare('UPDATE client_tokens SET user_id = ? WHERE id = ?').run(boundUserId, tokenRecord.id)
      tempCreds = result.creds
    } else if (boundUser.is_temp === 1) {
      // Regenerate password for temp user
      const rawPassword = randomBytes(12).toString('base64url').slice(0, 16)
      const pwHash = hashPassword(rawPassword)
      db.prepare('UPDATE users SET password_hash = ?, username = ? WHERE id = ?').run(pwHash, hostname, boundUserId)
      tempCreds = { username: hostname, password: rawPassword }
    }
  }

  // Find existing client record for this token+hostname
  let clientRecord = db.prepare('SELECT client_id, name FROM clients WHERE token = ? AND hostname = ? AND (hardware_id = ? OR hardware_id IS NULL)').get(token, hostname, hardwareId) as any

  if (!clientRecord) {
    const newClientId = randomUUID()
    db.prepare('INSERT INTO clients (client_id, name, token, hostname, hardware_id, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(newClientId, hostname, token, hostname, hardwareId, 'disconnected', boundUserId)
    clientRecord = { client_id: newClientId, name: hostname }
  } else {
    db.prepare('UPDATE clients SET hardware_id = ?, user_id = ? WHERE client_id = ?')
      .run(hardwareId, boundUserId, clientRecord.client_id)
  }

  const clientId = clientRecord.client_id
  const accessToken = await generateAccessToken(clientId, hostname)
  const refreshToken = generateRefreshToken()

  // Set refresh token expiration (30 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Store refresh token
  db.prepare('INSERT INTO client_refresh_tokens (token, client_id, expires_at) VALUES (?, ?, ?)').run(refreshToken, clientId, expiresAt.toISOString())

  return {
    accessToken,
    refreshToken,
    clientId,
    hostname,
    tempCreds
  }
})
