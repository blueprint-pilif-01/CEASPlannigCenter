/**
 * Migration Script: Create Events Tables
 * Tables: event_types, events, event_contracts, event_registrations, event_registration_contracts
 * Compatible with older PostgreSQL versions (uses TEXT for JSON fields)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createEventsTables() {
  const client = await pool.connect();

  try {
    console.log('🚀 Creating events tables...\n');

    // 1. Event Types (6 CEAS branches + subgroup support)
    console.log('📋 Creating event_types table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        whatsapp_group_link VARCHAR(500),
        whatsapp_group_name VARCHAR(200),
        parent_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ event_types created');

    // 2. Events
    console.log('📅 Creating events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        time VARCHAR(10),
        end_time VARCHAR(10),
        location VARCHAR(200) DEFAULT 'CEAS',
        requires_registration BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'draft',
        whatsapp_message TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ events created');

    // 3. Event-Contract link (M:N)
    console.log('🔗 Creating event_contracts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_contracts (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        contract_template_id INTEGER REFERENCES contract_templates(id) ON DELETE CASCADE,
        UNIQUE(event_id, contract_template_id)
      )
    `);
    console.log('   ✅ event_contracts created');

    // 4. Event Registrations (public, token-based)
    console.log('👤 Creating event_registrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        token VARCHAR(64) UNIQUE NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        phone VARCHAR(30),
        additional_data TEXT DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'registered',
        ip_address VARCHAR(45),
        user_agent TEXT,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ event_registrations created');

    // 5. Registration-Contract submissions link
    console.log('📝 Creating event_registration_contracts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_registration_contracts (
        id SERIAL PRIMARY KEY,
        registration_id INTEGER REFERENCES event_registrations(id) ON DELETE CASCADE,
        contract_submission_id INTEGER REFERENCES contract_submissions(id) ON DELETE SET NULL,
        contract_template_id INTEGER REFERENCES contract_templates(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending'
      )
    `);
    console.log('   ✅ event_registration_contracts created');

    // Create indexes
    console.log('\n📊 Creating indexes...');

    const indexes = [
      'CREATE INDEX idx_events_date ON events(date)',
      'CREATE INDEX idx_events_type ON events(event_type_id)',
      'CREATE INDEX idx_events_status ON events(status)',
      'CREATE INDEX idx_event_contracts_event ON event_contracts(event_id)',
      'CREATE INDEX idx_event_contracts_template ON event_contracts(contract_template_id)',
      'CREATE INDEX idx_registrations_event ON event_registrations(event_id)',
      'CREATE INDEX idx_registrations_token ON event_registrations(token)',
      'CREATE INDEX idx_registrations_email ON event_registrations(email)',
      'CREATE INDEX idx_registrations_phone ON event_registrations(phone)',
      'CREATE INDEX idx_reg_contracts_registration ON event_registration_contracts(registration_id)',
      'CREATE INDEX idx_reg_contracts_submission ON event_registration_contracts(contract_submission_id)',
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.log(`   ⚠️ Index: ${e.message}`);
        }
      }
    }
    console.log('   ✅ Indexes created');

    console.log('\n✅ All events tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createEventsTables()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
