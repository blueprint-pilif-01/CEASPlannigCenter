const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.db');

// All users with their roles
const users = [
  { username: 'AdiB', full_name: 'AdiB', email: 'bolosadrian@gmail.com', roles: ['vorbitor', 'admin_vorbitor'] },
  { username: 'Albert', full_name: 'Albert', email: 'feheralbert@yahoo.ro', roles: ['media'] },
  { username: 'Alin', full_name: 'Alin', email: 'alin.stanete@gmail.com', roles: ['media'] },
  { username: 'Amedeea', full_name: 'Amedeea', email: 'amedeeahnatiuc@yahoo.com', roles: ['trupa'] },
  { username: 'Amelia', full_name: 'Amelia', email: 'amelia.sophia1@icloud.com', roles: ['trupa'] },
  { username: 'Ana', full_name: 'Ana', email: 'anagubernu129@gmail.com', roles: ['trupa'] },
  { username: 'Andreas', full_name: 'Andreas', email: 'andreasmaghet@gmail.com', roles: ['media'] },
  { username: 'Bianca', full_name: 'Bianca', email: 'biancaivascu007@gmail.com', roles: ['trupa', 'media'] },
  { username: 'Bogdan', full_name: 'Bogdan', email: 'bogdan08ivascu@gmail.com', roles: ['trupa', 'media'] },
  { username: 'Calin', full_name: 'Calin', email: 'czatic97@gmail.com', roles: ['trupa'] },
  { username: 'Carmin', full_name: 'Carmin', email: 'carminlungu@yahoo.com', roles: ['vorbitor'] },
  { username: 'ClaudiuC', full_name: 'ClaudiuC', email: 'claudiuclauxiu95@gmail.com', roles: ['media'] },
  { username: 'ClaudiuH', full_name: 'ClaudiuH', email: 'hegedus.claudiu@gmail.com', roles: ['media', 'admin_media'] },
  { username: 'Cosmin', full_name: 'Cosmin', email: 'cos.craciun@gmail.com', roles: ['vorbitor', 'admin_vorbitor'] },
  { username: 'Criss', full_name: 'Criss', email: 'criss.neagu1000@yahoo.com', roles: ['trupa', 'admin_trupa'] },
  { username: 'Daniel', full_name: 'Daniel', email: 'chevron_dany@yahoo.com', roles: ['media'] },
  { username: 'David', full_name: 'David', email: 'david.bilauca@gmail.com', roles: ['media'] },
  { username: 'Eduard', full_name: 'Eduard', email: 'maghetedu@gmail.com', roles: ['media', 'trupa'] },
  { username: 'Emanuel', full_name: 'Emanuel', email: 'emanuel.cocora@gmail.com', roles: ['media'] },
  { username: 'EmiC', full_name: 'EmiC', email: 'emil_chindea@yahoo.com', roles: ['media'] },
  { username: 'Filip', full_name: 'Filip', email: 'bulcfilip641@gmail.com', roles: ['trupa', 'admin_trupa', 'super_admin'] },
  { username: 'Georgiana', full_name: 'Georgiana', email: 'filipgeorgiana@yahoo.com', roles: ['trupa', 'admin_trupa'] },
  { username: 'Iosua', full_name: 'Iosua', email: 'iosuatiprigan@gmail.com', roles: ['trupa'] },
  { username: 'Laurentiu', full_name: 'Laurențiu', email: 'laumoa@gmail.com', roles: ['trupa'] },
  { username: 'LiviuIv', full_name: 'LiviuIv', email: 'liviu.ivascu@gmail.com', roles: ['media', 'admin_media'] },
  { username: 'LiviuTi', full_name: 'LiviuTi', email: 'tiprigan_delialiviu@yahoo.com', roles: ['vorbitor'] },
  { username: 'Lois', full_name: 'Lois', email: 'bulclois@gmail.com', roles: ['trupa'] },
  { username: 'Marinusha', full_name: 'Marinusha', email: 'sinca_marinusha@yahoo.com', roles: ['trupa', 'admin_trupa'] },
  { username: 'Marius', full_name: 'Marius', email: 'ciocan.m@gmail.com', roles: ['vorbitor', 'admin_vorbitor'] },
  { username: 'MariusCristian', full_name: 'MariusCristian', email: 'ignatoaiemariuscristian@yahoo.com', roles: ['media'] },
  { username: 'Mathias', full_name: 'Mathias', email: 'sincamathias@gmail.com', roles: ['trupa'] },
  { username: 'Malina', full_name: 'Mălina', email: 'malina_basaraba@yahoo.com', roles: ['media', 'trupa'] },
  { username: 'Nicole', full_name: 'Nicole', email: 'nicole_irimia@yahoo.com', roles: ['trupa'] },
  { username: 'Rebeca', full_name: 'Rebeca', email: 'rebeca.teban@gmail.com', roles: ['media'] },
  { username: 'Robert', full_name: 'Robert', email: 'perjurobert@gmail.com', roles: [] },
  { username: 'Ruben', full_name: 'Ruben', email: 'ruben_iorga@yahoo.com', roles: ['media'] },
  { username: 'Vlad', full_name: 'Vlad', email: 'vladchindea94@gmail.com', roles: ['trupa'] },
];

// All roles that need to exist
const allRoles = [
  { name: 'super_admin', display_name: 'Super Admin', category: 'admin', description: 'Acces complet la toate funcționalitățile' },
  { name: 'admin_trupa', display_name: 'Admin Trupă', category: 'admin', description: 'Gestionează echipa de muzică' },
  { name: 'admin_media', display_name: 'Admin Media', category: 'admin', description: 'Gestionează echipa media' },
  { name: 'admin_vorbitor', display_name: 'Admin Vorbitor', category: 'admin', description: 'Gestionează vorbitorii' },
  { name: 'trupa', display_name: 'Trupă', category: 'department', description: 'Echipa de muzică' },
  { name: 'media', display_name: 'Media', category: 'department', description: 'Echipa media' },
  { name: 'vorbitor', display_name: 'Vorbitor', category: 'department', description: 'Predicatori și vorbitori' },
];

async function setupAllUsers() {
  console.log('🚀 Setting up all users and roles...\n');
  
  const SQL = await initSqlJs();
  
  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
    console.log('✅ Loaded existing database');
  } else {
    console.log('❌ Database not found at:', DB_PATH);
    return;
  }
  
  const db = new SQL.Database(fileBuffer);
  
  // 1. Ensure all roles exist
  console.log('\n📋 Setting up roles...');
  for (const role of allRoles) {
    try {
      const existing = db.exec(`SELECT id FROM roles WHERE name = '${role.name}'`);
      if (existing.length === 0 || existing[0].values.length === 0) {
        db.run(`INSERT INTO roles (name, display_name, category, description) VALUES (?, ?, ?, ?)`,
          [role.name, role.display_name, role.category, role.description]);
        console.log(`  ✅ Created role: ${role.name}`);
      } else {
        console.log(`  ⏭️  Role exists: ${role.name}`);
      }
    } catch (e) {
      console.log(`  ⚠️  Role ${role.name}: ${e.message}`);
    }
  }
  
  // Get role IDs
  const roleIds = {};
  const rolesResult = db.exec('SELECT id, name FROM roles');
  if (rolesResult.length > 0) {
    rolesResult[0].values.forEach(row => {
      roleIds[row[1]] = row[0];
    });
  }
  console.log('\n📋 Role IDs:', roleIds);
  
  // Default password
  const defaultPassword = await bcrypt.hash('vertical2024', 10);
  
  // 2. Create/update users and assign roles
  console.log('\n👥 Setting up users...');
  for (const user of users) {
    try {
      // Check if user exists
      const existingUser = db.exec(`SELECT id FROM users WHERE username = '${user.username}' OR email = '${user.email}'`);
      
      let userId;
      if (existingUser.length === 0 || existingUser[0].values.length === 0) {
        // Create new user
        db.run(`INSERT INTO users (username, email, password_hash, full_name, is_active) VALUES (?, ?, ?, ?, 1)`,
          [user.username, user.email, defaultPassword, user.full_name]);
        const newIdResult = db.exec('SELECT last_insert_rowid()');
        userId = newIdResult[0].values[0][0];
        console.log(`  ✅ Created user: ${user.username} (ID: ${userId})`);
      } else {
        userId = existingUser[0].values[0][0];
        // Update user info
        db.run(`UPDATE users SET full_name = ?, email = ?, is_active = 1 WHERE id = ?`,
          [user.full_name, user.email, userId]);
        console.log(`  ⏭️  User exists: ${user.username} (ID: ${userId})`);
      }
      
      // Clear existing roles for this user
      db.run(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
      
      // Assign new roles
      for (const roleName of user.roles) {
        const roleId = roleIds[roleName];
        if (roleId) {
          db.run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, roleId]);
          console.log(`     📌 Assigned role: ${roleName}`);
        } else {
          console.log(`     ⚠️  Role not found: ${roleName}`);
        }
      }
    } catch (e) {
      console.log(`  ❌ Error with user ${user.username}: ${e.message}`);
    }
  }
  
  // Save database
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  
  console.log('\n✅ All users and roles have been set up!');
  console.log('📤 Upload database.db to Hostico: /home/btrfscnu/backend/database.db');
}

setupAllUsers().catch(console.error);

