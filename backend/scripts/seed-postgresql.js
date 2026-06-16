/**
 * Seed PostgreSQL Database Script
 * Populează database cu roluri și date inițiale pentru PostgreSQL
 * Compatible cu versiuni vechi de PostgreSQL (fără ON CONFLICT)
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

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding PostgreSQL database...\n');

    // First, create roles and user_roles tables if they don't exist
    console.log('📋 Creating roles tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100),
        category VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: roles');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      )
    `);
    console.log('✅ Table: user_roles');

    // ============================================
    // 1. SEED ROLES (21 roluri)
    // ============================================
    console.log('\n📋 Seeding roles...');

    const roles = [
      // Departamente (10 roluri)
      { name: 'trupa', display_name: 'Trupă Laudă', category: 'department', description: 'Vocaliști, instrumentiști pentru serviciu Biserică' },
      { name: 'trupa_tabara', display_name: 'Trupă Tabără', category: 'department', description: 'Echipă muzicală pentru tabere și retrageri' },
      { name: 'media', display_name: 'Media/Video', category: 'department', description: 'Video streaming, editing, prezentări' },
      { name: 'cafea', display_name: 'Cafenea/Ospitalitate', category: 'department', description: 'Serviciu cafea, catering, ospitalitate' },
      { name: 'tineret', display_name: 'Tineret UNITED', category: 'department', description: 'Echipă evenimente tineret Luni' },
      { name: 'grupa_copii', display_name: 'Grupă Copii', category: 'department', description: 'Kids ministry, Sunday school' },
      { name: 'bun_venit', display_name: 'Bun venit Biserică', category: 'department', description: 'Greeters serviciu principal Duminică' },
      { name: 'bun_venit_tineret', display_name: 'Bun venit Tineret', category: 'department', description: 'Greeters tineret UNITED' },
      { name: 'special', display_name: 'Evenimente Speciale', category: 'department', description: 'Echipă pentru evenimente ad-hoc (nunți, conferințe, Crăciun, Paște)' },
      { name: 'sound', display_name: 'Sound/Tehnic', category: 'department', description: 'Sonorizare, lumini, echipament tehnic' },
      
      // Admin (11 roluri)
      { name: 'admin_trupa', display_name: 'Admin Trupă', category: 'admin', description: 'Gestionează trupa + song library' },
      { name: 'admin_trupa_tabara', display_name: 'Admin Tabără', category: 'admin', description: 'Planificare tabere' },
      { name: 'admin_media', display_name: 'Admin Media', category: 'admin', description: 'Gestionează media team' },
      { name: 'admin_cafea', display_name: 'Admin Cafenea', category: 'admin', description: 'Planificare ospitalitate' },
      { name: 'admin_tineret', display_name: 'Admin Tineret', category: 'admin', description: 'Full control tineret + poll-uri' },
      { name: 'admin_grupa_copii', display_name: 'Admin Copii', category: 'admin', description: 'Planificare kids ministry' },
      { name: 'admin_bun_venit', display_name: 'Admin Bun Venit', category: 'admin', description: 'Gestionează greeters biserică' },
      { name: 'admin_bun_venit_tineret', display_name: 'Admin Bun Venit Tineret', category: 'admin', description: 'Gestionează greeters tineret' },
      { name: 'admin_special', display_name: 'Admin Evenimente Speciale', category: 'admin', description: 'Creare evenimente custom (orice dată)' },
      { name: 'admin_sound', display_name: 'Admin Sound', category: 'admin', description: 'Gestionează echipa tehnică' },
      { name: 'admin_global', display_name: 'Super Admin', category: 'admin', description: 'Acces complet la tot' }
    ];

    let rolesInserted = 0;
    for (const role of roles) {
      // Check if role exists
      const existing = await client.query(`SELECT id FROM roles WHERE name = $1`, [role.name]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO roles (name, display_name, category, description)
          VALUES ($1, $2, $3, $4)
        `, [role.name, role.display_name, role.category, role.description]);
        rolesInserted++;
      }
    }
    console.log(`✅ Inserted ${rolesInserted} new roles (${roles.length - rolesInserted} already existed)`);

    // ============================================
    // 2. SEED ADMIN USER
    // ============================================
    console.log('\n👤 Creating admin user...');

    const adminPassword = await bcrypt.hash('CeasPlanning1234!', 10);

    // Check if admin exists
    let adminResult = await client.query(`SELECT id FROM users WHERE username = $1`, ['Admin']);
    let adminId;
    
    if (adminResult.rows.length === 0) {
      // Create admin user
      const insertResult = await client.query(`
        INSERT INTO users (username, password_hash, full_name, email, phone, is_active, force_password_change)
        VALUES ($1, $2, $3, $4, $5, true, false)
        RETURNING id
      `, ['Admin', adminPassword, 'Administrator', 'admin@federatiaceas.ro', '+40700000000']);
      adminId = insertResult.rows[0].id;
      console.log('✅ Created user: Admin');
    } else {
      // Update password
      adminId = adminResult.rows[0].id;
      await client.query(`UPDATE users SET password_hash = $1, is_active = true WHERE id = $2`, [adminPassword, adminId]);
      console.log('✅ Updated user: Admin');
    }
    
    console.log('   Password: CeasPlanning1234!');

    // Get admin_global role ID
    const roleResult = await client.query(`SELECT id FROM roles WHERE name = $1`, ['admin_global']);
    const adminGlobalRoleId = roleResult.rows[0]?.id;

    if (adminId && adminGlobalRoleId) {
      // Check if role assignment exists
      const existingRole = await client.query(
        `SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2`,
        [adminId, adminGlobalRoleId]
      );
      
      if (existingRole.rows.length === 0) {
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
        `, [adminId, adminGlobalRoleId]);
      }
      console.log('✅ Assigned role: admin_global to Admin');
    }

    // ============================================
    // 3. CREATE INDEXES (one by one)
    // ============================================
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX idx_user_roles_user ON user_roles(user_id)',
      'CREATE INDEX idx_user_roles_role ON user_roles(role_id)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
      } catch (e) {
        // Index might already exist
        if (!e.message.includes('already exists')) {
          console.log(`   ⚠️ ${e.message}`);
        }
      }
    }
    console.log('✅ Indexes created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${roles.length} Roles (10 departments + 11 admin)`);
    console.log(`   - 1 Admin user`);
    console.log('\n🔐 Admin credentials:');
    console.log('   Username: Admin');
    console.log('   Password: CeasPlanning1234!');
    console.log('\n✅ Ready to start server!');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
