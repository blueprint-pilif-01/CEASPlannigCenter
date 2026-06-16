/**
 * CEAS Planning Center - PostgreSQL Database Initialization
 * 
 * Run this script to create all necessary tables in PostgreSQL
 * Usage: node scripts/init-postgresql.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Initializing PostgreSQL database for CEAS Planning Center...\n');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        roles TEXT DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        force_password_change BOOLEAN DEFAULT true,
        avatar_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: users');

    // Services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        service_type VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        time VARCHAR(10),
        end_time VARCHAR(10),
        location VARCHAR(200) DEFAULT 'CEAS',
        description TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        voting_open BOOLEAN DEFAULT false,
        voting_deadline TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: services');

    // Service items (songs in service)
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_items (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        song_id INTEGER,
        item_type VARCHAR(50) DEFAULT 'song',
        position INTEGER DEFAULT 0,
        notes TEXT,
        selected_key VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: service_items');

    // Assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_type VARCHAR(50) NOT NULL,
        role_detail VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        assigned_by INTEGER REFERENCES users(id),
        confirmed_at TIMESTAMP,
        declined_at TIMESTAMP,
        decline_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: assignments');

    // Songs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        artist VARCHAR(200),
        original_key VARCHAR(10),
        tempo INTEGER,
        time_signature VARCHAR(10),
        lyrics TEXT,
        notes TEXT,
        tags TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: songs');

    // Song files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS song_files (
        id SERIAL PRIMARY KEY,
        song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
        file_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255),
        file_key VARCHAR(10),
        file_size INTEGER,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: song_files');

    // Votes table (availability voting)
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        available BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);
    console.log('✅ Table: votes');

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        action_url VARCHAR(500),
        action_label VARCHAR(100),
        related_id INTEGER,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: notifications');

    // Create indexes for better performance (one by one to avoid syntax errors)
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_services_date ON services(date)',
      'CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_service ON assignments(service_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_votes_user_date ON votes(user_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_song_files_song ON song_files(song_id)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
      } catch (e) {
        // Index might already exist, ignore error
        if (!e.message.includes('already exists')) {
          console.log(`⚠️ Index warning: ${e.message}`);
        }
      }
    }
    console.log('✅ Indexes created');

    console.log('\n🎉 Database initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run db:seed to add initial data');
    console.log('2. Start the server: npm start');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch(console.error);
