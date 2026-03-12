import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

let db: Database.Database | null = null;

export const getDb = () => {
  if (!db) {
    const dbDir = join(process.cwd(), '.data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = join(dbDir, 'library.db');
    db = new Database(dbPath);

    // Initialize the database schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL UNIQUE,
        size INTEGER NOT NULL,
        hash TEXT NOT NULL,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS scan_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_path TEXT NOT NULL,
        status TEXT NOT NULL,
        total_files INTEGER DEFAULT 0,
        scanned_files INTEGER DEFAULT 0,
        duplicates_found INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        error_message TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS scan_job_duplicates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        filepath TEXT NOT NULL,
        filename TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES scan_jobs (id) ON DELETE CASCADE
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        file_id INTEGER PRIMARY KEY,
        is_deleted BOOLEAN DEFAULT 0,
        is_uploaded BOOLEAN DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);
  }
  return db;
};
