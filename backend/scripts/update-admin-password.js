/**
 * Update Admin Password Script
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function updateAdminPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Updating Admin password...\n');

    const newPassword = 'CeasPlanning1234!';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update Admin user if exists
    let result = await client.query(`
      UPDATE users 
      SET password_hash = $1, force_password_change = false
      WHERE username = 'Admin'
      RETURNING id
    `, [passwordHash]);
    
    if (result.rows.length > 0) {
      console.log('✅ Updated Admin password');
    } else {
      // Try updating 'admin' (lowercase)
      result = await client.query(`
        UPDATE users 
        SET password_hash = $1, force_password_change = false
        WHERE username = 'admin'
        RETURNING id
      `, [passwordHash]);
      
      if (result.rows.length > 0) {
        console.log('✅ Updated admin password');
      } else {
        console.log('❌ No admin user found');
      }
    }

    console.log('\n🎉 Done!');
    console.log('\n🔐 Admin credentials:');
    console.log('   Username: Admin (sau admin)');
    console.log('   Password: CeasPlanning1234!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminPassword().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
