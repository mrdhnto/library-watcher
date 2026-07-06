import { getUsersCount } from '../../utils/auth'

export default defineEventHandler(async () => {
  const count = getUsersCount()
  return { setupNeeded: count === 0 }
})
