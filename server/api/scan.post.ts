import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { getDb } from '../utils/db';

async function calculateHash(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(
    fs.createReadStream(filePath),
    hash
  );
  return hash.digest('hex');
}

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

// Background scanner function
async function processScanJob(jobId: number, targetDir: string) {
  const db = getDb();
  try {
    // 1. Scan directory for all files
    db.prepare('UPDATE scan_jobs SET status = ? WHERE id = ?').run('scanning_dir', jobId);
    const allFiles = await scanDirectory(targetDir);
    
    db.prepare('UPDATE scan_jobs SET status = ?, total_files = ? WHERE id = ?').run('hashing', allFiles.length, jobId);

    let duplicatesFound = 0;

    for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        try {
            const stats = await fs.promises.stat(filePath);
            if (!stats.isFile()) continue;

            const fileHash = await calculateHash(filePath);
            const filename = path.basename(filePath);

            // Determine if this is an exact match we've seen before
            const existingExact = db.prepare('SELECT * FROM files WHERE filepath = ? AND filename = ? AND hash = ?').get(filePath, filename, fileHash) as any;
            
            if (existingExact) {
                // Exact same file already exists. Check if it's a duplicate of OTHERS.
                const otherInstances = db.prepare('SELECT COUNT(*) as count FROM files WHERE hash = ? AND id != ?').get(fileHash, existingExact.id) as any;
                if (otherInstances && otherInstances.count > 0) {
                    duplicatesFound++;
                }
            } else {
                // Something changed or it's new
                // Check if the content (hash) exists elsewhere
                const duplicateRecord = db.prepare('SELECT id FROM files WHERE hash = ?').get(fileHash) as any;
                if (duplicateRecord) {
                    duplicatesFound++;
                }

                // Check if we need to update or insert
                const recordByPath = db.prepare('SELECT id FROM files WHERE filepath = ?').get(filePath) as any;
                if (recordByPath) {
                    db.prepare('UPDATE files SET filename = ?, size = ?, hash = ?, scanned_at = CURRENT_TIMESTAMP WHERE id = ?')
                        .run(filename, stats.size, fileHash, recordByPath.id);
                } else {
                    db.prepare('INSERT INTO files (filename, filepath, size, hash) VALUES (?, ?, ?, ?)').run(filename, filePath, stats.size, fileHash);
                }
            }

            // Check if job was terminated
            const currentJob = db.prepare('SELECT status FROM scan_jobs WHERE id = ?').get(jobId) as any;
            if (currentJob?.status === 'terminated') {
                console.log(`Job ${jobId} terminated by user.`);
                return; // Stop processing
            }

            // Update progress
            db.prepare('UPDATE scan_jobs SET scanned_files = ?, duplicates_found = ? WHERE id = ?').run(i + 1, duplicatesFound, jobId);
        } catch (fileErr) {
             console.error(`Error processing file ${filePath}:`, fileErr);
             // Continue with next file
        }
    }

    // Mark as completed
    db.prepare(`
        UPDATE scan_jobs 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).run(jobId);

  } catch (error: any) {
    db.prepare(`
        UPDATE scan_jobs 
        SET status = 'error', error_message = ?, completed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).run(error.message || 'Unknown error', jobId);
  }
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
  
  // Insert initial job record
  const result = db.prepare(`
    INSERT INTO scan_jobs (target_path, status) 
    VALUES (?, ?)
  `).run(targetDir, 'pending');
  
  const jobId = result.lastInsertRowid as number;

  // We intentionally do not await this function so it runs in background
  processScanJob(jobId, targetDir as string).catch(console.error);

  return {
    jobId,
    targetDir,
    status: 'pending',
    message: 'Scan job added to queue'
  };
});
