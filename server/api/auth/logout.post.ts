import { destroySession } from '../../utils/auth'
import { getCookie, deleteCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'session_token')
  if (token) {
    destroySession(token)
  }

  deleteCookie(event, 'session_token', { path: '/' })

  return { message: 'Logged out' }
})
