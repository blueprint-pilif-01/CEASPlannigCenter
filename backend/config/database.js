const { Pool, types } = require('pg');

// Return DATE columns as plain YYYY-MM-DD strings (not JS Date objects).
// Without this, pg converts DATE to a Date object which serializes to UTC ISO
// string — causing off-by-one-day errors for users in UTC+2/+3 timezones.
types.setTypeParser(1082, val => val); // DATE → 'YYYY-MM-DD'

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let dbWrapper = null;

// Create a statement-like object that mimics better-sqlite3 API for compatibility
function createStatement(sql) {
  return {
    // Get single row
    get: async function(...params) {
      try {
        const result = await pool.query(sql, params);
        return result.rows[0] || undefined;
      } catch (err) {
        console.error('SQL Error in get():', sql, params, err.message);
        throw err;
      }
    },
    
    // Get all rows
    all: async function(...params) {
      try {
        const result = await pool.query(sql, params);
        return result.rows;
      } catch (err) {
        console.error('SQL Error in all():', sql, params, err.message);
        throw err;
      }
    },
    
    // Run statement (INSERT, UPDATE, DELETE)
    run: async function(...params) {
      try {
        const result = await pool.query(sql, params);
        
        // Return info object similar to better-sqlite3
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id || 0
        };
      } catch (err) {
        console.error('SQL Error in run():', sql, params, err.message);
        throw err;
      }
    }
  };
}

// Database wrapper that mimics better-sqlite3 API
function createDatabaseWrapper() {
  return {
    prepare: function(sql) {
      // Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc.)
      let paramIndex = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
      return createStatement(pgSql);
    },
    
    exec: async function(sql) {
      try {
        await pool.query(sql);
      } catch (err) {
        console.error('SQL Error in exec():', sql, err.message);
        throw err;
      }
    },
    
    pragma: function(pragma) {
      // PostgreSQL doesn't use PRAGMA, skip silently
      console.log('PostgreSQL: PRAGMA not supported, skipping:', pragma);
    },
    
    close: async function() {
      await pool.end();
      dbWrapper = null;
    },
    
    // Direct query method for PostgreSQL
    query: async function(sql, params = []) {
      return await pool.query(sql, params);
    }
  };
}

// Initialize database (async - call once at startup)
async function initDatabaseAsync() {
  if (dbWrapper) {
    return dbWrapper;
  }
  
  console.log('📂 Connecting to PostgreSQL database...');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    
    dbWrapper = createDatabaseWrapper();
    return dbWrapper;
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    throw err;
  }
}

// Get database (sync - call after initDatabaseAsync)
function getDatabase() {
  if (!dbWrapper) {
    throw new Error('Database not initialized! Call initDatabaseAsync() first in server.js');
  }
  return dbWrapper;
}

// Close database
async function closeDatabase() {
  if (dbWrapper) {
    await dbWrapper.close();
  }
}

// Export pool for direct queries if needed
module.exports = {
  getDatabase,
  closeDatabase,
  initDatabaseAsync,
  pool
};
