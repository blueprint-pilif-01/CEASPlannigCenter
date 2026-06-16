/**
 * Seed Script: Insert 6 default CEAS branch event types
 * Admin can configure WhatsApp group links later from the UI
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

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding event types...\n');

    const types = [
      { name: 'Tip 1', sort_order: 1 },
      { name: 'Tip 2', sort_order: 2 },
      { name: 'Tip 3', sort_order: 3 },
      { name: 'Tip 4', sort_order: 4 },
      { name: 'Tip 5', sort_order: 5 },
      { name: 'Tip 6', sort_order: 6 },
    ];

    for (const type of types) {
      const existing = await client.query(
        'SELECT id FROM event_types WHERE name = $1',
        [type.name]
      );

      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO event_types (name, sort_order) VALUES ($1, $2)',
          [type.name, type.sort_order]
        );
        console.log(`   ✅ Created: ${type.name}`);
      } else {
        console.log(`   ⏭️  Skipped (exists): ${type.name}`);
      }
    }

    console.log('\n🎉 Seeding completed!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
