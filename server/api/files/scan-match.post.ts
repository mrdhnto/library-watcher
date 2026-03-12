import { getDb } from '../../utils/db';
import fs from 'node:fs';
import path from 'node:path';

async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanDirectory(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const targetDir = body?.path;

  if (!targetDir || typeof targetDir !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Path is required',
    });
  }

  if (!fs.existsSync(targetDir)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Directory not found',
    });
  }

  const db = getDb();

  // Scan the directory for all file paths
  const allFiles = await scanDirectory(targetDir);

  // Extract just the filenames
  const filenames = allFiles.map(f => path.basename(f));

  if (filenames.length === 0) {
    return { matches: [], scannedCount: 0 };
  }

  // Query DB for files matching any of these filenames (excluding deleted)
  // Use batched queries to avoid SQLite parameter limits
  const batchSize = 500;
  const matches: any[] = [];

  for (let i = 0; i < filenames.length; i += batchSize) {
    const batch = filenames.slice(i, i + batchSize);
    const placeholders = batch.map(() => '?').join(',');

    const sql = `
      SELECT f.id, f.filename, f.filepath, f.size, f.hash,
        COALESCE(fm.is_uploaded, 0) as is_uploaded,
        COALESCE(fm.is_deleted, 0) as is_deleted,
        (SELECT COUNT(*) FROM files f2 WHERE f2.hash = f.hash AND f2.id != f.id) as duplicate_count
      FROM files f
      LEFT JOIN file_metadata fm ON f.id = fm.file_id
      WHERE f.filename IN (${placeholders})
        AND COALESCE(fm.is_deleted, 0) = 0
      ORDER BY f.filename ASC
    `;

    const rows = db.prepare(sql).all(...batch);
    matches.push(...rows);
  }

  return {
    matches,
    scannedCount: filenames.length,
  };
});
