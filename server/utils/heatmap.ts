import { getDb } from './db'

interface HeatmapEntry {
  extension: string
  count: number
  totalSize: number
}

export interface HeatmapData {
  formats: HeatmapEntry[]
  totalFiles: number
  totalSize: number
}

export function getGlobalHeatmap(): HeatmapData {
  const db = getDb()

  const formatRows = db.prepare(`
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
    formats: formatRows.map((r: any) => ({
      extension: r.extension,
      count: r.count,
      totalSize: r.totalSize || 0
    })),
    totalFiles: totalRow?.count || 0,
    totalSize: totalRow?.totalSize || 0
  }
}

export function insertFileFormat(fileId: number, filename: string): void {
  const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : ''
  if (!ext) return

  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO file_formats (file_id, extension) VALUES (?, ?)').run(fileId, ext)
}
