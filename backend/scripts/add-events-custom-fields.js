/**
 * Migration: Add custom_fields column to events table
 * Run once: node backend/scripts/add-events-custom-fields.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding custom_fields column to events table...');
    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS custom_fields TEXT DEFAULT '[]'
    `);
    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => { console.log('Migration completed!'); process.exit(0); })
  .catch(() => process.exit(1));
