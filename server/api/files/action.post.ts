import { getDb } from '../../utils/db';
import fs from 'fs';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { fileIds, action, value, deleteFromDisk } = body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'fileIds array is required',
    });
  }

  if (!['delete', 'upload'].includes(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid action. Must be "delete" or "upload"',
    });
  }

  const db = getDb();
  
  // Use a transaction for bulk updates
  const transaction = db.transaction((ids: number[]) => {
    for (const id of ids) {
      // If disk deletion is requested, handle it first
      if (action === 'delete' && value === true && deleteFromDisk === true) {
        const file = db.prepare('SELECT filepath FROM files WHERE id = ?').get(id) as { filepath: string } | undefined;
        if (file && file.filepath) {
          try {
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
          } catch (err) {
            console.error(`Failed to delete file from disk: ${file.filepath}`, err);
          }
        }
      }

      // Upsert into file_metadata
      const isDeleted = action === 'delete' ? (value ? 1 : 0) : null;
      const isUploaded = action === 'upload' ? (value ? 1 : 0) : null;
      
      const existing = db.prepare('SELECT * FROM file_metadata WHERE file_id = ?').get(id);
      
      if (existing) {
        if (action === 'delete') {
            db.prepare('UPDATE file_metadata SET is_deleted = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?').run(isDeleted, id);
        } else {
            db.prepare('UPDATE file_metadata SET is_uploaded = ?, updated_at = CURRENT_TIMESTAMP WHERE file_id = ?').run(isUploaded, id);
        }
      } else {
        db.prepare(`
          INSERT INTO file_metadata (file_id, is_deleted, is_uploaded) 
          VALUES (?, ?, ?)
        `).run(id, isDeleted || 0, isUploaded || 0);
      }
    }
  });

  transaction(fileIds);

  return {
    success: true,
    message: deleteFromDisk 
      ? `Successfully deleted ${fileIds.length} files from database and disk`
      : `Successfully marked ${fileIds.length} files`
  };
});
