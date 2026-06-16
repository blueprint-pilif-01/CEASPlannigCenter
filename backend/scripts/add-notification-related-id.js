const { initDatabaseAsync, getDatabase } = require('../config/database');

console.log('Adding related_id column to notifications table...');

async function migrate() {
  try {
    await initDatabaseAsync();
    const db = getDatabase();

    // Check if column already exists
    const columns = db.prepare('PRAGMA table_info(notifications)').all();
    const hasRelatedId = columns.some(col => col.name === 'related_id');

    if (!hasRelatedId) {
      db.prepare('ALTER TABLE notifications ADD COLUMN related_id INTEGER').run();
      console.log('✅ Added related_id column to notifications table');
    } else {
      console.log('ℹ️  Column related_id already exists');
    }

    console.log('✅ Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrate();
