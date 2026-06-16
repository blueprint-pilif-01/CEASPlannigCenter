/**
 * Seed Database Script
 * Populează database cu roluri și date inițiale
 */

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

async function seedDatabase() {
  console.log('🌱 Seeding database...');
  console.log('📁 Database path:', DB_PATH);

  const SQL = await initSqlJs();
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found! Run init-database.js first.');
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  
  db.run('PRAGMA foreign_keys = ON');

  // Helper functions
  function getOne(sql, params = []) {
    const result = db.exec(sql, params);
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values[0];
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      return obj;
    }
    return null;
  }

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

  for (const role of roles) {
    db.run(`
      INSERT OR IGNORE INTO roles (name, display_name, category, description)
      VALUES (?, ?, ?, ?)
    `, [role.name, role.display_name, role.category, role.description]);
  }
  console.log(`✅ Inserted ${roles.length} roles`);

  // ============================================
  // 2. SEED ADMIN USER
  // ============================================
  console.log('\n👤 Creating admin user...');

  const adminPassword = bcrypt.hashSync('Admin123!', 10);

  db.run(`
    INSERT OR IGNORE INTO users (username, password_hash, full_name, email, phone, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `, ['admin', adminPassword, 'Administrator', 'admin@bisericavertical.ro', '+40700000000']);
  console.log('✅ Created user: admin (password: Admin123!)');

  // Get admin user ID
  const adminUser = getOne('SELECT id FROM users WHERE username = ?', ['admin']);

  // Get admin_global role ID
  const adminGlobalRole = getOne('SELECT id FROM roles WHERE name = ?', ['admin_global']);

  if (adminUser && adminGlobalRole) {
    db.run(`
      INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at)
      VALUES (?, ?, ?)
    `, [adminUser.id, adminGlobalRole.id, new Date().toISOString()]);
    console.log('✅ Assigned role: admin_global to admin');
  }

  // ============================================
  // 3. SEED TEST USERS
  // ============================================
  console.log('\n👥 Creating test users...');

  const testUsers = [
    { username: 'maria.popescu', full_name: 'Maria Popescu', email: 'maria@test.ro', roles: ['trupa'] },
    { username: 'ion.georgescu', full_name: 'Ion Georgescu', email: 'ion@test.ro', roles: ['trupa', 'sound'] },
    { username: 'ana.dumitrescu', full_name: 'Ana Dumitrescu', email: 'ana@test.ro', roles: ['trupa', 'tineret'] },
    { username: 'mihai.stan', full_name: 'Mihai Stan', email: 'mihai@test.ro', roles: ['media'] },
    { username: 'elena.ionescu', full_name: 'Elena Ionescu', email: 'elena@test.ro', roles: ['grupa_copii'] },
    { username: 'david.vlad', full_name: 'David Vlad', email: 'david@test.ro', roles: ['bun_venit', 'cafea'] },
    { username: 'sara.marin', full_name: 'Sara Marin', email: 'sara@test.ro', roles: ['tineret', 'bun_venit_tineret'] },
    { username: 'paul.radu', full_name: 'Paul Radu', email: 'paul@test.ro', roles: ['sound', 'admin_sound'] }
  ];

  const defaultPassword = bcrypt.hashSync('password123', 10);

  for (const user of testUsers) {
    db.run(`
      INSERT OR IGNORE INTO users (username, password_hash, full_name, email, phone, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [user.username, defaultPassword, user.full_name, user.email, null]);
    
    const userId = getOne('SELECT id FROM users WHERE username = ?', [user.username]);
    
    // Assign roles
    if (userId) {
      for (const roleName of user.roles) {
        const role = getOne('SELECT id FROM roles WHERE name = ?', [roleName]);
        if (role) {
          db.run(`
            INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at)
            VALUES (?, ?, ?)
          `, [userId.id, role.id, new Date().toISOString()]);
        }
      }
    }
    
    console.log(`✅ Created user: ${user.username} (roles: ${user.roles.join(', ')})`);
  }

  // ============================================
  // 4. SEED TEST SONGS
  // ============================================
  console.log('\n🎵 Creating test songs...');

  const songs = [
    {
      title: 'Dumnezeul Cel Viu',
      artist: 'Worship Together',
      key_signature: 'D',
      tempo: 72,
      tags: '["laudă", "închinare", "moderată"]',
      language: 'ro'
    },
    {
      title: 'Te Laud Isuse',
      artist: 'Vertical Worship',
      key_signature: 'G',
      tempo: 80,
      tags: '["laudă", "energică"]',
      language: 'ro'
    },
    {
      title: 'Bunătatea Ta',
      artist: 'Bethel Music',
      key_signature: 'C',
      tempo: 68,
      tags: '["închinare", "intimă"]',
      language: 'ro'
    },
    {
      title: 'Way Maker',
      artist: 'Sinach',
      key_signature: 'A',
      tempo: 72,
      tags: '["laudă", "proclamare"]',
      language: 'en'
    },
    {
      title: 'Goodness of God',
      artist: 'Bethel Music',
      key_signature: 'D',
      tempo: 70,
      tags: '["închinare", "recunoștință"]',
      language: 'en'
    }
  ];

  for (const song of songs) {
    db.run(`
      INSERT INTO songs (title, artist, key_signature, tempo, tags, language, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [song.title, song.artist, song.key_signature, song.tempo, song.tags, song.language, adminUser?.id || 1]);
  }

  console.log(`✅ Created ${songs.length} test songs`);

  // ============================================
  // 5. SEED TEST SERVICES
  // ============================================
  console.log('\n📅 Creating test services...');

  const services = [
    {
      title: 'Serviciu Biserică',
      service_type: 'biserica_duminica',
      date: '2025-10-20',
      time: '10:00',
      location: 'CEAS',
      status: 'scheduled'
    },
    {
      title: 'Serviciu Biserică',
      service_type: 'biserica_duminica',
      date: '2025-10-27',
      time: '10:00',
      location: 'CEAS',
      status: 'draft'
    },
    {
      title: 'Tineret UNITED',
      service_type: 'tineret_luni',
      date: '2025-10-21',
      time: '19:00',
      location: 'Sala Tineret',
      status: 'voting_open'
    },
    {
      title: 'Tineret UNITED',
      service_type: 'tineret_luni',
      date: '2025-10-28',
      time: '19:00',
      location: 'Sala Tineret',
      status: 'draft'
    },
    {
      title: 'Nuntă Popescu-Ionescu',
      service_type: 'special',
      date: '2025-11-02',
      time: '14:00',
      end_time: '18:00',
      location: 'CEAS - Sala mare',
      status: 'draft',
      description: 'Ceremonie + recepție'
    }
  ];

  for (const service of services) {
    db.run(`
      INSERT INTO services (title, service_type, date, time, end_time, location, status, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      service.title,
      service.service_type,
      service.date,
      service.time,
      service.end_time || null,
      service.location,
      service.status,
      service.description || null,
      adminUser?.id || 1
    ]);
  }

  console.log(`✅ Created ${services.length} test services`);

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  
  db.close();

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - 21 Roles (10 departments + 11 admin)`);
  console.log(`   - ${testUsers.length + 1} Users (1 admin + ${testUsers.length} test users)`);
  console.log(`   - ${songs.length} Songs`);
  console.log(`   - ${services.length} Services`);
  console.log('\n🔐 Admin credentials:');
  console.log('   Username: admin');
  console.log('   Password: Admin123!');
  console.log('\n🔐 Test user credentials:');
  console.log('   Username: maria.popescu (sau oricare din test users)');
  console.log('   Password: password123');
  console.log('\n✅ Ready to start server!');
  console.log('   Command: npm start');
}

seedDatabase().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
