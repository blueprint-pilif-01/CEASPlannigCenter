/**
 * Reset Users Script
 * Șterge utilizatorii curenti și adaugă noile conturi pentru Vertical
 */

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

async function resetUsers() {
  console.log('🔄 Resetting users in database...');
  console.log('📁 Database path:', DB_PATH);

  const SQL = await initSqlJs();
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found! Run init-database.js first.');
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  
  db.run('PRAGMA foreign_keys = ON');

  // ============================================
  // 1. DELETE ALL EXISTING USERS
  // ============================================
  console.log('\n🗑️  Deleting all existing users and related data...');

  // Delete in order to respect foreign key constraints
  db.run('DELETE FROM audit_log');
  db.run('DELETE FROM notifications');
  db.run('DELETE FROM availability_votes');
  db.run('DELETE FROM assignments');
  db.run('DELETE FROM availability_polls');
  db.run('DELETE FROM service_items');
  db.run('DELETE FROM services');
  db.run('DELETE FROM song_key_files');
  db.run('DELETE FROM song_keys');
  db.run('DELETE FROM song_files');
  db.run('DELETE FROM songs');
  db.run('DELETE FROM user_roles');
  db.run('DELETE FROM users');

  console.log('✅ All users and related data deleted');

  // ============================================
  // 2. CREATE NEW USERS
  // ============================================
  console.log('\n👥 Creating new Vertical accounts...');

  const newUsers = [
    { username: 'Amedeea', email: 'amedeeahnatiuc@yahoo.com', password: 'amedeeah' },
    { username: 'Amelia', email: 'amelia.sophia1@icloud.com', password: 'ameliac' },
    { username: 'Ana', email: 'anagubernu129@gmail.com', password: 'anach' },
    { username: 'Bianca', email: 'biancaivascu007@gmail.com', password: 'biaiv' },
    { username: 'Bogdan', email: 'bogdan08ivascu@gmail.com', password: 'bogdiiv' },
    { username: 'Calin', email: 'czatic97@gmail.com', password: 'calinz' },
    { username: 'Criss', email: 'criss.neagu1000@yahoo.com', password: 'crissn' },
    { username: 'Daniel', email: 'chevron_dany@yahoo.com', password: 'danih' },
    { username: 'Eduard', email: 'maghetedu@gmail.com', password: 'edema' },
    { username: 'Filip', email: 'bulcfilip641@gmail.com', password: 'filipb' },
    { username: 'Georgiana', email: 'filipgeorgiana@yahoo.com', password: 'georgic' },
    { username: 'Iosua', email: 'iosuatiprigan@gmail.com', password: 'iosuati' },
    { username: 'Laurențiu', email: 'laumoa@gmail.com', password: 'lauma' },
    { username: 'Lois', email: 'bulclois@gmail.com', password: 'lois' },
    { username: 'Mălina', email: 'malina_basaraba@yahoo.com', password: 'malih' },
    { username: 'Marinusha', email: 'sinca_marinusha@yahoo.com', password: 'maris' },
    { username: 'Mathias', email: 'sincamathias@gmail.com', password: 'maths' },
    { username: 'Nicole', email: 'nicole_irimia@yahoo.com', password: 'nice' },
    { username: 'Robert', email: 'perjurobert@gmail.com', password: 'robertper' },
    { username: 'Vlad', email: 'vladchindea94@gmail.com', password: 'vlchd' },
    { username: 'Albert', email: 'feheralbert@yahoo.ro', password: 'feheralbert@yahoo.ro' },
    { username: 'Alin', email: 'alin.stanete@gmail.com', password: 'alinstan' },
    { username: 'Andreas', email: 'andreasmaghet@gmail.com', password: 'andreasmgh' },
    { username: 'ClaudiuH', email: 'hegedus.claudiu@gmail.com', password: 'claudiuheg' },
    { username: 'ClaudiuC', email: 'claudiuclauxiu95@gmail.com', password: 'claudiuclau' },
    { username: 'David', email: 'david.bilauca@gmail.com', password: 'davidB' },
    { username: 'Emanuel', email: 'emanuel.cocora@gmail.com', password: 'emco' },
    { username: 'MariusCristian', email: 'ignatoaiemariuscristian@yahoo.com', password: 'MariusCristian' },
    { username: 'Rebeca', email: 'rebeca.teban@gmail.com', password: 'Rebeca' }
  ];

  for (const user of newUsers) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    db.run(`
      INSERT INTO users (username, password_hash, full_name, email, is_active, force_password_change)
      VALUES (?, ?, ?, ?, 1, 1)
    `, [user.username, passwordHash, user.username, user.email]);
    console.log(`✅ Created user: ${user.username} (${user.email})`);
  }

  console.log(`\n✅ Created ${newUsers.length} users (all with force_password_change = 1)`);

  // ============================================
  // 3. MAKE FILIP SUPERADMIN
  // ============================================
  console.log('\n👑 Making Filip superadmin...');

  // Get Filip's user ID
  const filipResult = db.exec('SELECT id FROM users WHERE username = ?', ['Filip']);
  const filipId = filipResult.length > 0 && filipResult[0].values.length > 0 ? filipResult[0].values[0][0] : null;

  // Get admin_global role ID
  const roleResult = db.exec('SELECT id FROM roles WHERE name = ?', ['admin_global']);
  const roleId = roleResult.length > 0 && roleResult[0].values.length > 0 ? roleResult[0].values[0][0] : null;

  if (filipId && roleId) {
    db.run(`
      INSERT INTO user_roles (user_id, role_id, assigned_at)
      VALUES (?, ?, ?)
    `, [filipId, roleId, new Date().toISOString()]);
    console.log('✅ Filip is now superadmin (admin_global)');
  } else {
    console.log('❌ Could not assign superadmin role to Filip');
    console.log('   Filip ID:', filipId, '| Role ID:', roleId);
  }

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  
  db.close();

  console.log('\n🎉 Users reset successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - All old users deleted`);
  console.log(`   - ${newUsers.length} new users created`);
  console.log(`   - All users must change password on first login`);
  console.log(`   - Filip has superadmin access`);
  console.log('\n✅ Ready to start server!');
  console.log('   Command: npm start');
}

resetUsers().catch(err => {
  console.error('❌ Reset users failed:', err);
  process.exit(1);
});
