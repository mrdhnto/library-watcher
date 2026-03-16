import { getDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const currentPath = (query.path as string || '').replace(/\/$/, '')

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
      files: []
    }
  }

  // Normalize: ensure path uses backslash and ends with backslash for prefix matching
  const normalizedPath = currentPath.replace(/\//g, '\\')
  const prefix = normalizedPath.endsWith('\\') ? normalizedPath : normalizedPath + '\\'

  // Get all filepaths that start with this prefix
  const allFiles = db.prepare(`
    SELECT f.id, f.filename, f.filepath, f.size, f.hash, f.scanned_at,
           COALESCE(fm.is_uploaded, 0) as is_uploaded,
           (SELECT COUNT(*) FROM files f2 WHERE f2.hash = f.hash AND f2.id != f.id) as duplicate_count
    FROM files f
    LEFT JOIN file_metadata fm ON f.id = fm.file_id
    WHERE f.filepath LIKE ? ESCAPE '~'
      AND COALESCE(fm.is_deleted, 0) = 0
    ORDER BY f.filepath
  `).all(prefix.replace(/~/g, '~~').replace(/%/g, '~%').replace(/_/g, '~_') + '%') as any[]

  const foldersSet = new Set<string>()
  const directFiles: any[] = []

  for (const file of allFiles) {
    // Get the part of the path after the prefix
    const relativePath: string = file.filepath.substring(prefix.length)

    // Check if this file is a direct child or nested in a subfolder
    const separatorIndex = relativePath.indexOf('\\')

    if (separatorIndex === -1) {
      // Direct child file (no more backslashes after prefix)
      directFiles.push(file)
    } else {
      // Nested: extract the immediate subfolder name
      const folderName = relativePath.substring(0, separatorIndex)
      foldersSet.add(folderName)
    }
  }

  const folders = Array.from(foldersSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  return {
    currentPath: normalizedPath,
    folders,
    files: directFiles
  }
})
