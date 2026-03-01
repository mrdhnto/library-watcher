import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jobId } = body;

  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'jobId is required',
    });
  }

  const db = getDb();
  
  // Update status to terminated
  const result = db.prepare(`
    UPDATE scan_jobs 
    SET status = 'terminated', completed_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND status NOT IN ('completed', 'error', 'terminated')
  `).run(jobId);

  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Job not found or already finished/terminated',
    });
  }

  return {
    success: true,
    message: `Job ${jobId} termination signal sent.`
  };
});
