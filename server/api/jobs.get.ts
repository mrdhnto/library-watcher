import { getDb } from '../utils/db';

export default defineEventHandler((event) => {
  const db = getDb();
  
  const jobs = db.prepare(`
    SELECT * FROM scan_jobs 
    ORDER BY started_at DESC
  `).all();

  return jobs;
});
