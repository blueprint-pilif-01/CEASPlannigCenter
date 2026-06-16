/**
 * Health Check Script - Verifies database and application state
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function healthCheck() {
  console.log('🔍 Running health check...\n');
  
  const client = await pool.connect();
  try {
    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('📋 Tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check users
    const users = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('👤 Users:', users.rows[0].count);
    
    // Check Admin user
    const admin = await client.query(`SELECT username, is_active FROM users WHERE username = 'Admin'`);
    if (admin.rows.length > 0) {
      console.log('✅ Admin user:', admin.rows[0].is_active ? 'ACTIVE' : 'INACTIVE');
    } else {
      console.log('❌ Admin user: NOT FOUND');
    }
    
    // Check contract_signers has cnp_last4
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'contract_signers' AND column_name = 'cnp_last4'
    `);
    console.log('🔑 cnp_last4 column:', cols.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
    // Check roles
    const roles = await client.query('SELECT COUNT(*) as count FROM roles');
    console.log('🎭 Roles:', roles.rows[0].count);
    
    // Check contract templates
    const templates = await client.query('SELECT COUNT(*) as count FROM contract_templates');
    console.log('📄 Contract templates:', templates.rows[0].count);
    
    // Check services
    const services = await client.query('SELECT COUNT(*) as count FROM services');
    console.log('📅 Services:', services.rows[0].count);
    
    console.log('\n✅ Health check completed!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

healthCheck();
