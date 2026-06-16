/**
 * Fix missing columns in users table
 * Run this via: node scripts/fix-columns.js
 * Or access via browser: https://federatiaceas.ro/api/fix-db (temporary)
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing missing columns...\n');

    // Add last_login column
    try {
      await client.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP');
      console.log('✅ Added: last_login');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  last_login already exists');
      } else {
        console.log('❌ last_login:', e.message);
      }
    }

    // Add updated_at column
    try {
      await client.query('ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('✅ Added: updated_at');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  updated_at already exists');
      } else {
        console.log('❌ updated_at:', e.message);
      }
    }

    console.log('\n🎉 Done! Try logging in now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixColumns();
}

module.exports = fixColumns;
