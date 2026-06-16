/**
 * Migration: Add nickname column to contract_templates table
 * Internal nickname visible only to admins, doesn't affect the contract document
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
    console.log('Adding nickname column to contract_templates...');

    await client.query(`
      ALTER TABLE contract_templates
      ADD COLUMN IF NOT EXISTS nickname VARCHAR(255)
    `);
    console.log('✅ Column nickname added');

    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
