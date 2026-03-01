import { getDb } from '../utils/db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const showOnlyDuplicates = query.duplicates === 'true';
  const searchQuery = query.search ? `%${query.search}%` : null;

  const db = getDb();

  let baseSql = `
    SELECT f1.*, 
    COALESCE(fm.is_deleted, 0) as is_deleted,
    COALESCE(fm.is_uploaded, 0) as is_uploaded,
    (SELECT COUNT(*) FROM files f2 WHERE f2.hash = f1.hash AND f2.id != f1.id) as duplicate_count,
    (SELECT filename FROM files f3 WHERE f3.hash = f1.hash AND f3.id != f1.id ORDER BY f3.scanned_at ASC LIMIT 1) as duplicate_with
    FROM files f1
    LEFT JOIN file_metadata fm ON f1.id = fm.file_id
  `;

  const conditions = ['COALESCE(fm.is_deleted, 0) = 0'];
  const params = [];

  if (showOnlyDuplicates) {
    conditions.push(`(SELECT COUNT(*) FROM files f2 WHERE f2.hash = f1.hash AND f2.id != f1.id) > 0`);
  }

  if (searchQuery) {
    conditions.push(`f1.filename LIKE ?`);
    params.push(searchQuery);
  }

  if (conditions.length > 0) {
    baseSql += ` WHERE ` + conditions.join(' AND ');
  }

  // Count total for pagination
  const countSql = `SELECT COUNT(*) as total FROM (${baseSql})`;
  const totalResult = db.prepare(countSql).get(...params) as any;
  const total = totalResult?.total || 0;

  // Actual data query
  const dataSql = `${baseSql} ORDER BY f1.scanned_at DESC LIMIT ? OFFSET ?`;
  const items = db.prepare(dataSql).all(...params, limit, offset);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
});
