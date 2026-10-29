import { defineWebSocketHandler } from 'h3'
import { getDb } from '../../../utils/db'
import { connectedClients } from '../../../utils/ws-clients'
import { insertFileFormat } from '../../../utils/heatmap'
import { verifyAccessToken } from '../../../utils/jwt'
import { z } from 'zod'

// Zod schemas for incoming messages
const handshakeSchema = z.object({
  type: z.literal('handshake'),
  token: z.string()
})

const pingSchema = z.object({
  type: z.literal('ping')
})

const scanProgressSchema = z.object({
  type: z.literal('scan-progress'),
  taskId: z.number(),
  scanned: z.number(),
  total: z.number().optional(),
  currentFile: z.string().optional()
})

const scanCompleteSchema = z.object({
  type: z.literal('scan-complete'),
  taskId: z.number(),
  files: z.array(z.object({
    filename: z.string(),
    filepath: z.string(),
    size: z.number(),
    hash: z.string()
  })).max(5000, "Maximum of 5000 files per chunk allowed to prevent memory exhaustion")
})

const scanErrorSchema = z.object({
  type: z.literal('scan-error'),
  taskId: z.number(),
  message: z.string()
})

const scanStatusSchema = z.object({
  type: z.literal('scan-status'),
  taskId: z.number(),
  status: z.string()
})

export default defineWebSocketHandler({
  async upgrade(_request) {
    // Accept all WS connections here — auth happens in open/message
  },

  async open(peer) {
    peer.context.authenticated = false
    peer.context.rateLimitBucket = 50 // initial burst allowed
    peer.context.lastRateLimitCheck = Date.now()
  },

  async message(peer, message) {
    const db = getDb()
    let msg: any
    try {
      msg = message.json()
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      return
    }

    // --- Rate Limiting ---
    const now = Date.now()
    const timePassed = now - peer.context.lastRateLimitCheck
    peer.context.lastRateLimitCheck = now
    
    // Refill bucket at 20 tokens per second, max 50
    peer.context.rateLimitBucket = Math.min(50, peer.context.rateLimitBucket + (timePassed / 1000) * 20)
    peer.context.rateLimitBucket -= 1
    
    if (peer.context.rateLimitBucket < 0) {
      peer.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }))
      return // Drop message
    }

    // --- Handshake (unauthenticated only) ---
    if (!peer.context.authenticated) {
      const parsed = handshakeSchema.safeParse(msg)
      if (!parsed.success) {
        peer.send(JSON.stringify({ type: 'error', message: 'Invalid handshake payload' }))
        peer.close()
        return
      }

      const payload = await verifyAccessToken(parsed.data.token)
      if (!payload) {
        // Help diagnose the common mistake of sending a registration token
        // (what older lw-client versions did) instead of a JWT access token.
        const registrationToken = db.prepare('SELECT id FROM client_tokens WHERE token = ? AND is_active = 1').get(parsed.data.token)
        peer.send(JSON.stringify({
          type: 'error',
          message: registrationToken
            ? 'Registration token sent instead of an access token — update lw-client'
            : 'Invalid or expired access token'
        }))
        peer.close()
        return
      }

      const clientId = payload.clientId as string
      const hostname = payload.hostname as string
      const ipAddress = peer.remoteAddress || ''

      // Update client status
      db.prepare('UPDATE clients SET status = ?, ip_address = ?, last_heartbeat = CURRENT_TIMESTAMP WHERE client_id = ?')
        .run('connected', ipAddress, clientId)

      peer.context.authenticated = true
      peer.context.clientId = clientId
      connectedClients.set(clientId, { peer, clientData: { clientId, hostname, ipAddress, token: parsed.data.token } })

      peer.send(JSON.stringify({ type: 'handshake-ok', clientId, hostname }))
      return
    }

    // --- Authenticated messages ---
    const clientId = peer.context.clientId

    switch (msg.type) {
      case 'ping': {
        const parsed = pingSchema.safeParse(msg)
        if (!parsed.success) return
        db.prepare('UPDATE clients SET last_heartbeat = CURRENT_TIMESTAMP WHERE client_id = ?').run(clientId)
        peer.send(JSON.stringify({ type: 'pong' }))
        break
      }

      case 'scan-progress': {
        const parsed = scanProgressSchema.safeParse(msg)
        if (!parsed.success) {
          peer.send(JSON.stringify({ type: 'error', message: 'Validation failed: ' + parsed.error.errors[0]?.message }))
          return
        }
        db.prepare('UPDATE scan_jobs SET scanned_files = ?, status = ? WHERE id = ?')
          .run(parsed.data.scanned, 'hashing', parsed.data.taskId)
        break
      }

      case 'scan-complete': {
        const parsed = scanCompleteSchema.safeParse(msg)
        if (!parsed.success) {
          peer.send(JSON.stringify({ type: 'error', message: 'Validation failed: ' + parsed.error.errors[0]?.message }))
          return
        }
        
        const files = parsed.data.files
        let duplicatesFound = 0

        const insertFile = db.prepare('INSERT OR IGNORE INTO files (filename, filepath, size, hash) VALUES (?, ?, ?, ?)')
        const checkDup = db.prepare('SELECT id FROM files WHERE hash = ?')
        const updateJob = db.prepare('UPDATE scan_jobs SET scanned_files = ?, duplicates_found = ?, total_files = ? WHERE id = ?')

        for (let i = 0; i < files.length; i++) {
          const f = files[i]!

          const existingByName = db.prepare('SELECT id FROM files WHERE filename = ?').get(f.filename) as any
          if (existingByName) {
            duplicatesFound++
            db.prepare('INSERT INTO scan_job_duplicates (job_id, filepath, filename) VALUES (?, ?, ?)').run(parsed.data.taskId, f.filepath, f.filename)
            updateJob.run(i + 1, duplicatesFound, files.length, parsed.data.taskId)
            continue
          }

          // Check if hash already exists
          const existingByHash = checkDup.get(f.hash) as any
          if (existingByHash) {
            duplicatesFound++
          }

          // Insert the file (skip if path already exists)
          insertFile.run(f.filename, f.filepath, f.size, f.hash)

          // Track file format for heatmap
          const fileRecord = db.prepare('SELECT id FROM files WHERE filepath = ?').get(f.filepath) as any
          if (fileRecord) {
            insertFileFormat(fileRecord.id, f.filename)
          }

          if (existingByHash) {
            db.prepare('INSERT INTO scan_job_duplicates (job_id, filepath, filename) VALUES (?, ?, ?)').run(parsed.data.taskId, f.filepath, f.filename)
          }

          updateJob.run(i + 1, duplicatesFound, files.length, parsed.data.taskId)
        }

        db.prepare('UPDATE scan_jobs SET status = ?, duplicates_found = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', duplicatesFound, parsed.data.taskId)
        break
      }

      case 'scan-error': {
        const parsed = scanErrorSchema.safeParse(msg)
        if (!parsed.success) return
        db.prepare('UPDATE scan_jobs SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('error', parsed.data.message, parsed.data.taskId)
        break
      }

      case 'scan-status': {
        const parsed = scanStatusSchema.safeParse(msg)
        if (!parsed.success) return
        db.prepare('UPDATE scan_jobs SET status = ? WHERE id = ?').run(parsed.data.status, parsed.data.taskId)
        break
      }

      default:
        peer.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
    }
  },

  async close(peer) {
    if (peer.context.authenticated && peer.context.clientId) {
      const db = getDb()
      const clientId = peer.context.clientId as string
      db.prepare('UPDATE clients SET status = ? WHERE client_id = ?').run('disconnected', clientId)
      connectedClients.delete(clientId)

      db.prepare(`UPDATE scan_jobs SET status = 'error', error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE client_id = ? AND status NOT IN ('completed', 'error', 'terminated')`)
        .run('Client disconnected', clientId)
    }
  },

  async error(peer, error) {
    if ((error as any).message?.includes('ECONNRESET')) return
    if (peer.context.authenticated && peer.context.clientId) {
      const db = getDb()
      const clientId = peer.context.clientId as string
      db.prepare('UPDATE clients SET status = ? WHERE client_id = ?').run('disconnected', clientId)
      connectedClients.delete(clientId)
    }
    console.error('WebSocket error:', (error as any).message)
  }
})
