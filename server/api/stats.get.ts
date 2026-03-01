import { getDb } from '../utils/db';

export default defineEventHandler((event) => {
  const db = getDb();
  
  // Total files and size (excluding deleted)
  const totalQuery = db.prepare(`
    SELECT COUNT(*) as count, SUM(f.size) as size 
    FROM files f
    LEFT JOIN file_metadata m ON f.id = m.file_id
    WHERE m.is_deleted IS NULL OR m.is_deleted = 0
  `).get() as any;
  
  // Find duplicates count and size (excluding deleted)
  const duplicatesQuery = db.prepare(`
    SELECT 
      SUM(count - 1) as count, 
      SUM((count - 1) * size) as size 
    FROM (
      SELECT f.hash, COUNT(*) as count, MAX(f.size) as size
      FROM files f
      LEFT JOIN file_metadata m ON f.id = m.file_id
      WHERE m.is_deleted IS NULL OR m.is_deleted = 0
      GROUP BY f.hash 
      HAVING COUNT(*) > 1
    )
  `).get() as any;

  // Total uploaded files and size
  const uploadedQuery = db.prepare(`
    SELECT COUNT(*) as count, SUM(f.size) as size 
    FROM files f
    JOIN file_metadata m ON f.id = m.file_id
    WHERE m.is_uploaded = 1 AND (m.is_deleted IS NULL OR m.is_deleted = 0)
  `).get() as any;

  return {
    totalFiles: totalQuery?.count || 0,
    totalSize: totalQuery?.size || 0,
    totalDuplicates: duplicatesQuery?.count || 0,
    duplicateSize: duplicatesQuery?.size || 0,
    totalUploaded: uploadedQuery?.count || 0,
    uploadedSize: uploadedQuery?.size || 0
  };
});
