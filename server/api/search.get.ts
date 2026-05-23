import { getDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 50, 200)
  const offset = (page - 1) * limit

  if (!q || q.length < 1) {
    return { items: [], total: 0, page, limit }
  }

  const db = getDb()
  const searchPattern = `%${q}%`

  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM files f
    LEFT JOIN file_metadata fm ON f.id = fm.file_id
    WHERE COALESCE(fm.is_deleted, 0) = 0
      AND (f.filename LIKE ? OR f.filepath LIKE ? OR f.hash LIKE ?)
  `).get(searchPattern, searchPattern, searchPattern) as any

  const items = db.prepare(`
    SELECT f.id, f.filename, f.filepath, f.size, f.hash, f.scanned_at,
           COALESCE(fm.is_uploaded, 0) as is_uploaded,
           (SELECT COUNT(*) FROM files f2 WHERE f2.hash = f.hash AND f2.id != f.id) as duplicate_count
    FROM files f
    LEFT JOIN file_metadata fm ON f.id = fm.file_id
    WHERE COALESCE(fm.is_deleted, 0) = 0
      AND (f.filename LIKE ? OR f.filepath LIKE ? OR f.hash LIKE ?)
    ORDER BY f.scanned_at DESC
    LIMIT ? OFFSET ?
  `).all(searchPattern, searchPattern, searchPattern, limit, offset)

  return {
    items,
    total: countResult?.total || 0,
    page,
    limit,
    query: q
  }
})
