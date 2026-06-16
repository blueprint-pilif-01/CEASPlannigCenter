/**
 * Migration: Add cnp_last4 column to contract_signers table
 * This enables lookup by last 4 digits of CNP for autocomplete
 */

require('dotenv').config();
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
    console.log('Adding cnp_last4 column to contract_signers...');
    
    // Add column if not exists
    await client.query(`
      ALTER TABLE contract_signers 
      ADD COLUMN IF NOT EXISTS cnp_last4 VARCHAR(4)
    `);
    console.log('✅ Column cnp_last4 added');
    
    // Create index for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_signers_cnp_last4 
      ON contract_signers(cnp_last4)
    `);
    console.log('✅ Index idx_signers_cnp_last4 created');
    
    // Update existing records that have CNP in saved_fields
    const result = await client.query(`
      UPDATE contract_signers 
      SET cnp_last4 = RIGHT(saved_fields->>'cnp', 4)
      WHERE saved_fields->>'cnp' IS NOT NULL 
        AND LENGTH(saved_fields->>'cnp') >= 4
        AND cnp_last4 IS NULL
    `);
    console.log(`✅ Updated ${result.rowCount} existing records with cnp_last4`);
    
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
