import { getDb } from '../../../utils/db';

export default defineEventHandler((event) => {
  const jobId = getRouterParam(event, 'id');
  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Job ID is required',
    });
  }

  const db = getDb();
  
  try {
    const duplicates = db.prepare(`
      SELECT filepath, filename 
      FROM scan_job_duplicates 
      WHERE job_id = ?
    `).all(jobId);

    return duplicates;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch duplicates',
    });
  }
});
