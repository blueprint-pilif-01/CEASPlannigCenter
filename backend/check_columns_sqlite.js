const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

try {
  const eventsColumns = db.prepare("PRAGMA table_info(events)").all();
  console.log('events columns:', eventsColumns.map(x => x.name).join(', '));

  const contractColumns = db.prepare("PRAGMA table_info(event_registration_contracts)").all();
  console.log('event_registration_contracts columns:', contractColumns.map(x => x.name).join(', '));
} catch (e) {
  console.error('DB error:', e.message);
} finally {
  db.close();
}
