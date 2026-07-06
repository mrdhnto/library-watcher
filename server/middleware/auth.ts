import { validateSession } from '../utils/auth'
import { getCookie, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return

  const token = getCookie(event, 'session_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (token) {
    const user = validateSession(token)
    if (user) {
      event.context.user = user
    }
  }
})
