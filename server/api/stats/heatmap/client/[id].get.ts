import { getDb } from '../../../../utils/db'

export default defineEventHandler((event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const db = getDb()
  const rows = db.prepare(`
    SELECT ff.extension, COUNT(*) as count, SUM(f.size) as totalSize
    FROM file_formats ff
    JOIN files f ON ff.file_id = f.id
    GROUP BY ff.extension
    ORDER BY count DESC
  `).all() as any[]

  const totalRow = db.prepare(`
    SELECT COUNT(*) as count, SUM(size) as totalSize
    FROM files
  `).get() as any

  return {
    formats: rows.map((r: any) => ({
      extension: r.extension,
      count: r.count,
      totalSize: r.totalSize || 0
    })),
    totalFiles: totalRow?.count || 0,
    totalSize: totalRow?.totalSize || 0
  }
})
