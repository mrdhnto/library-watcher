import { getGlobalHeatmap } from '../../../utils/heatmap'

export default defineEventHandler((event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  return getGlobalHeatmap()
})
