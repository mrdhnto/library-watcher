import { defineWebSocketHandler } from 'h3'
import { getDb } from '../../../utils/db'
import { connectedClients } from '../../../utils/ws-clients'
import { randomUUID } from 'node:crypto'

export default defineWebSocketHandler({
  async upgrade(_request) {
    // Accept all WS connections here — auth happens in open/message
  },

  async open(peer) {
    // Wait for handshake message — store nothing until authenticated
    peer.context = { authenticated: false }
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

    // --- Handshake (unauthenticated only) ---
    if (!peer.context.authenticated) {
      if (msg.type !== 'handshake') {
        peer.send(JSON.stringify({ type: 'error', message: 'Handshake required' }))
        peer.close()
        return
      }

      const token = msg.token
      const hostname = msg.hostname || 'unknown'
      const ipAddress = peer.remoteAddress || ''

      // Validate token exists + is active
      const tokenRecord = db.prepare('SELECT id, claimed_by FROM client_tokens WHERE token = ? AND is_active = 1').get(token) as any
      if (!tokenRecord) {
        peer.send(JSON.stringify({ type: 'error', message: 'Invalid or inactive token' }))
        peer.close()
        return
      }

      // Token claim check: first use or reconnection by same hostname
      if (tokenRecord.claimed_by && tokenRecord.claimed_by !== hostname) {
        peer.send(JSON.stringify({ type: 'error', message: `Token already claimed by ${tokenRecord.claimed_by}. Generate a new token.` }))
        peer.close()
        return
      }

      // Claim token on first use
      if (!tokenRecord.claimed_by) {
        db.prepare('UPDATE client_tokens SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP WHERE id = ?').run(hostname, tokenRecord.id)
      }

      // Find existing client record for this token+hostname (reconnect case)
      let clientRecord = db.prepare('SELECT client_id, name FROM clients WHERE token = ? AND hostname = ?').get(token, hostname) as any

      if (!clientRecord) {
        // First connection — create new record
        const newClientId = randomUUID()
        db.prepare('INSERT INTO clients (client_id, name, token, hostname, status, ip_address, last_heartbeat) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
          .run(newClientId, hostname, token, hostname, 'connected', ipAddress)
        clientRecord = { client_id: newClientId, name: hostname }
      } else {
        // Reconnection — update status, IP, heartbeat; keep name (admin alias) intact
        db.prepare('UPDATE clients SET status = ?, ip_address = ?, last_heartbeat = CURRENT_TIMESTAMP WHERE client_id = ?')
          .run('connected', ipAddress, clientRecord.client_id)
      }

      peer.context.authenticated = true
      peer.context.clientId = clientRecord.client_id
      connectedClients.set(clientRecord.client_id, { peer, clientData: { clientId: clientRecord.client_id, hostname, ipAddress, token } })

      peer.send(JSON.stringify({ type: 'handshake-ok', clientId: clientRecord.client_id, hostname }))
      return
    }

    // --- Authenticated messages ---
    const clientId = peer.context.clientId

    switch (msg.type) {
      case 'ping': {
        db.prepare('UPDATE clients SET last_heartbeat = CURRENT_TIMESTAMP WHERE client_id = ?').run(clientId)
        peer.send(JSON.stringify({ type: 'pong' }))
        break
      }

      case 'scan-progress': {
        db.prepare('UPDATE scan_jobs SET scanned_files = ?, status = ? WHERE id = ?')
          .run(msg.scanned, 'hashing', msg.taskId)
        break
      }

      case 'scan-complete': {
        const files: Array<{ filename: string; filepath: string; size: number; hash: string }> = msg.files || []
        let duplicatesFound = 0

        const insertFile = db.prepare('INSERT OR IGNORE INTO files (filename, filepath, size, hash) VALUES (?, ?, ?, ?)')
        const checkDup = db.prepare('SELECT id FROM files WHERE hash = ?')
        const updateJob = db.prepare('UPDATE scan_jobs SET scanned_files = ?, duplicates_found = ?, total_files = ? WHERE id = ?')

        for (let i = 0; i < files.length; i++) {
          const f = files[i]

          // Check if filename already exists in DB (fast path for known dupes)
          const existingByName = db.prepare('SELECT id FROM files WHERE filename = ?').get(f.filename) as any
          if (existingByName) {
            duplicatesFound++
            db.prepare('INSERT INTO scan_job_duplicates (job_id, filepath, filename) VALUES (?, ?, ?)').run(msg.taskId, f.filepath, f.filename)
            updateJob.run(i + 1, duplicatesFound, files.length, msg.taskId)
            continue
          }

          // Check if hash already exists
          const existingByHash = checkDup.get(f.hash) as any
          if (existingByHash) {
            duplicatesFound++
          }

          // Insert the file (skip if path already exists)
          insertFile.run(f.filename, f.filepath, f.size, f.hash)

          if (existingByHash) {
            db.prepare('INSERT INTO scan_job_duplicates (job_id, filepath, filename) VALUES (?, ?, ?)').run(msg.taskId, f.filepath, f.filename)
          }

          updateJob.run(i + 1, duplicatesFound, files.length, msg.taskId)
        }

        db.prepare('UPDATE scan_jobs SET status = ?, duplicates_found = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', duplicatesFound, msg.taskId)
        break
      }

      case 'scan-error': {
        db.prepare('UPDATE scan_jobs SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('error', msg.message, msg.taskId)
        break
      }

      case 'scan-status': {
        db.prepare('UPDATE scan_jobs SET status = ? WHERE id = ?').run(msg.status, msg.taskId)
        break
      }

      default:
        peer.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
    }
  },

  async close(peer) {
    if (peer.context.authenticated && peer.context.clientId) {
      const db = getDb()
      db.prepare('UPDATE clients SET status = ? WHERE client_id = ?').run('disconnected', peer.context.clientId)
      connectedClients.delete(peer.context.clientId)

      db.prepare(`UPDATE scan_jobs SET status = 'error', error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE client_id = ? AND status NOT IN ('completed', 'error', 'terminated')`)
        .run('Client disconnected', peer.context.clientId)
    }
  },

  async error(peer, error) {
    if (error.message?.includes('ECONNRESET')) return
    if (peer.context.authenticated && peer.context.clientId) {
      const db = getDb()
      db.prepare('UPDATE clients SET status = ? WHERE client_id = ?').run('disconnected', peer.context.clientId)
      connectedClients.delete(peer.context.clientId)
    }
    console.error('WebSocket error:', error.message)
  }
})
