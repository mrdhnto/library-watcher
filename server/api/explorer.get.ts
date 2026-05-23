import { getDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const currentPath = (query.path as string || '').replace(/\/$/, '')
  const limit = parseInt(query.limit as string) || 25
  const offset = parseInt(query.offset as string) || 0

  const db = getDb()

  // Root view: extract distinct volume/drive letters
  if (!currentPath) {
    const rows = db.prepare(`
      SELECT DISTINCT SUBSTR(filepath, 1, 2) as volume
      FROM files f
      LEFT JOIN file_metadata fm ON f.id = fm.file_id
      WHERE COALESCE(fm.is_deleted, 0) = 0
      ORDER BY volume
    `).all() as { volume: string }[]

    const volumes = rows.map(r => r.volume).filter(v => /^[A-Za-z]:$/.test(v))

    return {
      currentPath: '',
      folders: volumes,
      files: [],
      totalFiles: 0
    }
  }

  const normalizedPath = currentPath.replace(/\//g, '\\')
  const prefix = normalizedPath.endsWith('\\') ? normalizedPath : normalizedPath + '\\'
  const likePrefix = prefix.replace(/~/g, '~~').replace(/%/g, '~%').replace(/_/g, '~_') + '%'
  const prefixLen = prefix.length + 1

  // Count total direct files (for pagination)
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM files f
    LEFT JOIN file_metadata fm ON f.id = fm.file_id
    WHERE f.filepath LIKE ? ESCAPE '~'
      AND COALESCE(fm.is_deleted, 0) = 0
      AND SUBSTR(f.filepath, ?) NOT LIKE '%\\%'
  `).get(likePrefix, prefixLen) as any

  // Get paginated direct files
  const directFiles = db.prepare(`
    SELECT f.id, f.filename, f.filepath, f.size, f.hash, f.scanned_at,
           COALESCE(fm.is_uploaded, 0) as is_uploaded,
           (SELECT COUNT(*) FROM files f2 WHERE f2.hash = f.hash AND f2.id != f.id) as duplicate_count,
           (SELECT filename FROM files f3 WHERE f3.hash = f.hash AND f3.id != f.id ORDER BY f3.scanned_at ASC LIMIT 1) as duplicate_with
    FROM files f
    LEFT JOIN file_metadata fm ON f.id = fm.file_id
    WHERE f.filepath LIKE ? ESCAPE '~'
      AND COALESCE(fm.is_deleted, 0) = 0
      AND SUBSTR(f.filepath, ?) NOT LIKE '%\\%'
    ORDER BY f.filepath
    LIMIT ? OFFSET ?
  `).all(likePrefix, prefixLen, limit, offset) as any[]

  // Get distinct subfolder names (lightweight query, only filepath needed)
  const folderRows = db.prepare(`
    SELECT DISTINCT SUBSTR(f.filepath, ?, INSTR(SUBSTR(f.filepath, ?), '\\') - 1) as folder
    FROM files f
    LEFT JOIN file_metadata fm ON f.id = fm.file_id
    WHERE f.filepath LIKE ? ESCAPE '~'
      AND COALESCE(fm.is_deleted, 0) = 0
      AND SUBSTR(f.filepath, ?) LIKE '%\\%'
    ORDER BY folder
  `).all(prefixLen, prefixLen, likePrefix, prefixLen) as { folder: string }[]

  const folders = folderRows
    .map(r => r.folder)
    .filter(Boolean)

  return {
    currentPath: normalizedPath,
    folders,
    files: directFiles,
    totalFiles: countResult?.total || 0
  }
})
