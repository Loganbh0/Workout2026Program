import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set. The API will fail on any DB query.');
}

// Supabase requires SSL. The pooler cert is not in the local trust store, so we
// disable strict verification (standard for Supabase connection strings). Local
// Postgres (localhost / 127.0.0.1 / ::1) is connected without SSL. Override with
// DB_SSL=true|false if needed.
function resolveSsl(cs) {
  const override = process.env.DB_SSL;
  if (override === 'true') return { rejectUnauthorized: false };
  if (override === 'false') return false;
  if (!cs) return false;
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/.test(cs);
  return isLocal ? false : { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString,
  ssl: resolveSsl(connectionString),
  max: 5,
  idleTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
