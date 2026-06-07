import { getDb } from '../../../utils/db'
import { randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event)
  const token = randomBytes(24).toString('hex')
  const label = body?.label || ''

  db.prepare('INSERT INTO client_tokens (token, label) VALUES (?, ?)').run(token, label)

  const row = db.prepare('SELECT * FROM client_tokens WHERE token = ?').get(token)
  return row
})
