require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function activateAdmin() {
  const client = await pool.connect();
  try {
    console.log('Activating Admin account...');
    
    // Activate Admin account
    await client.query(`UPDATE users SET is_active = true WHERE username = 'Admin'`);
    
    // Check result
    const result = await client.query(`SELECT id, username, is_active FROM users WHERE username = 'Admin'`);
    console.log('Admin user:', result.rows[0]);
    
    // Check roles
    const adminId = result.rows[0]?.id;
    if (adminId) {
      const rolesResult = await client.query(`
        SELECT r.name, r.display_name 
        FROM roles r 
        JOIN user_roles ur ON r.id = ur.role_id 
        WHERE ur.user_id = $1
      `, [adminId]);
      
      if (rolesResult.rows.length === 0) {
        console.log('No roles found, assigning admin_global...');
        
        // Get admin_global role id
        const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'admin_global'`);
        if (roleRes.rows.length > 0) {
          await client.query(`
            INSERT INTO user_roles (user_id, role_id) 
            VALUES ($1, $2) 
            ON CONFLICT (user_id, role_id) DO NOTHING
          `, [adminId, roleRes.rows[0].id]);
          console.log('Assigned admin_global role');
        }
      } else {
        console.log('Roles:', rolesResult.rows.map(r => r.name).join(', '));
      }
    }
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

activateAdmin();
