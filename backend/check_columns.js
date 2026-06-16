require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='events' ORDER BY ordinal_position")
  .then(r => {
    console.log('events columns:', r.rows.map(x => x.column_name).join(', '));
    return pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='event_registration_contracts' ORDER BY ordinal_position");
  })
  .then(r => {
    console.log('event_registration_contracts columns:', r.rows.map(x => x.column_name).join(', '));
    pool.end();
  })
  .catch(e => {
    console.error('DB error:', e.message);
    pool.end();
  });
