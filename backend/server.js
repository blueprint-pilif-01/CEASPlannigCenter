require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// PostgreSQL database
const { initDatabaseAsync, closeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - important pentru rate limiting corect în producție
// Allows Express to read the real IP from X-Forwarded-For header
// Trust proxy only in production (behind reverse proxy)
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

const defaultAllowedOrigins = (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.length > 0)
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];
const frameAncestors = ["'self'", ...defaultAllowedOrigins];

// Security: Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", ...defaultAllowedOrigins],
      frameAncestors
    },
  },
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: false
}));

// Security: HTTPS Redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Middleware: CORS with strict origin
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check (before auth routes)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// PUBLIC routes - NO AUTHENTICATION (must be before other /api routes)
app.use('/api/public', require('./routes/publicContracts'));
app.use('/api/public', require('./routes/publicEvents'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/email', require('./routes/email'));

// Contracts routes (protected - require auth)
app.use('/api/contracts', require('./routes/contracts'));

// Events routes (protected - require auth)
app.use('/api/events', require('./routes/events'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Auto-migrate: ensure all tables exist on startup
async function runAutoMigrations() {
  const { pool } = require('./config/database');

  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_contracts (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      contract_template_id INTEGER REFERENCES contract_templates(id) ON DELETE CASCADE,
      UNIQUE(event_id, contract_template_id)
    )
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_registration_contracts (
      id SERIAL PRIMARY KEY,
      registration_id INTEGER REFERENCES event_registrations(id) ON DELETE CASCADE,
      contract_submission_id INTEGER REFERENCES contract_submissions(id) ON DELETE SET NULL,
      contract_template_id INTEGER REFERENCES contract_templates(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'pending'
    )
  `);

  // Contract nickname column
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contract_templates' AND column_name='nickname') THEN
          ALTER TABLE contract_templates ADD COLUMN nickname VARCHAR(255);
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn('⚠️  Failed to add nickname column:', e.message);
  }

  // Reminder sent tracking column
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_registrations' AND column_name='reminder_sent') THEN
          ALTER TABLE event_registrations ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn('⚠️  Failed to add reminder_sent column:', e.message);
  }

  // Contract numbering columns
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contract_templates' AND column_name='number_prefix') THEN
          ALTER TABLE contract_templates ADD COLUMN number_prefix VARCHAR(20);
          ALTER TABLE contract_templates ADD COLUMN number_start INTEGER DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contract_submissions' AND column_name='contract_number') THEN
          ALTER TABLE contract_submissions ADD COLUMN contract_number VARCHAR(50);
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn('⚠️  Failed to add contract numbering columns:', e.message);
  }

  // Custom fields for event registration forms
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='custom_fields') THEN
          ALTER TABLE events ADD COLUMN custom_fields TEXT DEFAULT '[]';
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn('⚠️  Failed to add custom_fields column to events:', e.message);
  }

  // Link event_registration_contracts to specific contract_invites
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_registration_contracts' AND column_name='contract_invite_id') THEN
          ALTER TABLE event_registration_contracts ADD COLUMN contract_invite_id INTEGER REFERENCES contract_invites(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn('⚠️  Failed to add contract_invite_id column:', e.message);
  }

  // Seed default event types if table is empty
  const { rows } = await pool.query('SELECT COUNT(*) as count FROM event_types');
  if (parseInt(rows[0].count) === 0) {
    console.log('   Seeding default event types...');
    for (let i = 1; i <= 6; i++) {
      await pool.query('INSERT INTO event_types (name, sort_order) VALUES ($1, $2)', [`Tip ${i}`, i]);
    }
    console.log('   Seeded Tip 1 - Tip 6');
  }

  console.log('✅ Auto-migrations complete');
}

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await initDatabaseAsync();
    console.log('✅ Database initialized');

    // Run auto-migrations (create tables if missing, seed data)
    await runAutoMigrations();

    // Start cron jobs
    try {
      const { startEventReminderCron } = require('./cron/eventReminders');
      startEventReminderCron();
    } catch (cronErr) {
      console.warn('⚠️  Cron jobs failed to start:', cronErr.message);
      console.warn('   Run "npm install" to install node-cron');
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 CEAS Planning Center Backend');
      console.log('================================');
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'NOT SET!'}`);
      console.log('');
      console.log('📡 Available endpoints:');
      console.log('   POST   /api/auth/login');
      console.log('   GET    /api/auth/me');
      console.log('   GET    /api/events');
      console.log('   GET    /api/notifications');
      console.log('   GET    /api/contracts/templates');
      console.log('   GET    /api/public/sign/:token');
      console.log('   GET    /api/public/events/:id');
      console.log('');
      console.log(`🔗 API Documentation: http://localhost:${PORT}/api/health`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  closeDatabase();
  console.log('✅ Database closed');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
