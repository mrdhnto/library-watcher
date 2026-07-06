import { getGlobalHeatmap } from '../../../utils/heatmap'

export default defineEventHandler((event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  return getGlobalHeatmap()
})
