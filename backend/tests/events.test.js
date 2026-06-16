/**
 * Integration Tests: Events & Public Registration
 *
 * Prerequisites:
 * - PostgreSQL running with ceas_planning database
 * - .env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (must match your local Postgres)
 * - Default admin login for protected routes: Admin / CeasPlanning1234!
 * - Optional override: TEST_ADMIN_USER, TEST_ADMIN_PASSWORD
 * - Run: npm install && npm test
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const request = require('supertest');
const express = require('express');
const { initDatabaseAsync, pool } = require('../config/database');

let app;
let authToken;
let testEventId;
/** Resurse create în teste E2E — curățate în afterAll dacă rămân */
const cleanupTemplateIds = [];
const cleanupEventIds = [];
const cleanupUserIds = [];

// ============================================
// SETUP
// ============================================

beforeAll(async () => {
  await initDatabaseAsync();

  // Run critical migrations (idempotent)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='custom_fields') THEN
        ALTER TABLE events ADD COLUMN custom_fields TEXT DEFAULT '[]';
      END IF;
    END $$;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_registration_contracts' AND column_name='contract_invite_id') THEN
        ALTER TABLE event_registration_contracts ADD COLUMN contract_invite_id INTEGER REFERENCES contract_invites(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // Build test app (same routes as server.js, without app.listen)
  const cors = require('cors');
  app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());
  app.use('/api/public', require('../routes/publicContracts'));
  app.use('/api/public', require('../routes/publicEvents'));
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/events', require('../routes/events'));
  app.use('/api/contracts', require('../routes/contracts'));
  app.use('/api/users', require('../routes/users'));
  app.use('/api/notifications', require('../routes/notifications'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Login: env first, then common local defaults (auth API uses username, not email)
  const loginAttempts = [
    {
      username: process.env.TEST_ADMIN_USER,
      password: process.env.TEST_ADMIN_PASSWORD
    },
    { username: 'Admin', password: 'CeasPlanning1234!' },
    { username: 'admin', password: 'CeasPlanning1234!' },
    { username: 'Admin', password: 'admin123' },
    { username: 'admin', password: 'admin123' }
  ].filter((c) => c.username && c.password);

  for (const cred of loginAttempts) {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: cred.username, password: cred.password });
    if (loginRes.status === 200 && loginRes.body.token) {
      authToken = loginRes.body.token;
      break;
    }
  }

  if (!authToken) {
    console.warn('⚠️  Could not login - protected route tests will be skipped');
    console.warn('   Expected: username Admin, password CeasPlanning1234! (or set TEST_ADMIN_*)');
  }
}, 30000);

afterAll(async () => {
  for (const tid of cleanupTemplateIds) {
    await pool.query('DELETE FROM contract_submissions WHERE template_id = $1', [tid]).catch(() => {});
    await pool.query('DELETE FROM contract_invites WHERE template_id = $1', [tid]).catch(() => {});
    await pool.query('DELETE FROM event_contracts WHERE contract_template_id = $1', [tid]).catch(() => {});
    await pool.query('DELETE FROM contract_templates WHERE id = $1', [tid]).catch(() => {});
  }
  for (const eid of cleanupEventIds) {
    await pool.query('DELETE FROM events WHERE id = $1', [eid]).catch(() => {});
  }
  for (const uid of cleanupUserIds) {
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [uid]).catch(() => {});
    await pool.query('DELETE FROM users WHERE id = $1', [uid]).catch(() => {});
  }
  if (testEventId) {
    await pool.query('DELETE FROM events WHERE id = $1', [testEventId]).catch(() => {});
  }
  await pool.end();
});

async function skipIfNoAuth(testFn) {
  if (!authToken) {
    console.warn('   Skipped (no auth token)');
    return;
  }
  return testFn();
}

// ============================================
// HEALTH CHECK
// ============================================

describe('Health Check', () => {
  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ============================================
// AUTHENTICATION
// ============================================

describe('Authentication', () => {
  test('POST /api/auth/login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword_xyz_123' });
    expect(res.status).toBe(401);
  });

  test('GET /api/events without token returns 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });
});

// ============================================
// EVENT TYPES
// ============================================

describe('Event Types', () => {
  test('GET /api/events/types returns list when authenticated', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/events/types')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('types');
      expect(Array.isArray(res.body.types)).toBe(true);
    });
  });
});

// ============================================
// EVENT CRUD
// ============================================

describe('Events CRUD', () => {
  test('GET /api/events returns list when authenticated', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
    });
  });

  test('POST /api/events creates event with custom_fields column', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event for Link Tests',
          date: '2026-09-15',
          time: '10:00',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: [
            { id: 'age', label: 'Varsta', type: 'number', required: false, options: '' }
          ]
        });
      expect(res.status).toBe(201);
      expect(res.body.event.title).toBe('[TEST] Event for Link Tests');
      expect(res.body.event.status).toBe('published');
      expect(res.body.event.requires_registration).toBe(true);
      testEventId = res.body.event.id;
    });
  });

  test('GET /api/events/:id returns event with contracts array', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      const res = await request(app)
        .get(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.event.id).toBe(testEventId);
      expect(Array.isArray(res.body.event.contracts)).toBe(true);
    });
  });

  test('GET /api/events/:id returns 404 for non-existent event', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/events/999999999')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });

  test('PUT /api/events/:id updates title and preserves requires_registration', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      const res = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });
      expect(res.status).toBe(200);
      expect(res.body.event.title).toBe('[TEST] Event UPDATED');
      expect(res.body.event.requires_registration).toBe(true);
      expect(res.body.event.status).toBe('published');
    });
  });

  test('PUT /api/events/:id can change status to draft', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      const res = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'draft',
          requires_registration: true,
          custom_fields: []
        });
      expect(res.status).toBe(200);
      expect(res.body.event.status).toBe('draft');
    });
  });

  test('PUT /api/events/:id can restore status back to published', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      const res = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: [
            { id: 'age', label: 'Varsta', type: 'number', required: false, options: '' }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body.event.status).toBe('published');
      expect(res.body.event.requires_registration).toBe(true);
    });
  });
});

// ============================================
// WHATSAPP / LINK GENERATION
// ============================================

describe('Link Generation (POST /api/events/:id/whatsapp-message)', () => {
  test('returns registration_url for published event with requires_registration=true', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });

      const res = await request(app)
        .post(`/api/events/${testEventId}/whatsapp-message`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.registration_url).not.toBeNull();
      expect(res.body.registration_url).toContain(`/planner/register/${testEventId}`);
      expect(res.body.message).toBeDefined();
      expect(res.body.whatsapp_link).toContain('wa.me');
    });
  });

  test('returns null registration_url when requires_registration=false', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: false,
          custom_fields: []
        });

      const res = await request(app)
        .post(`/api/events/${testEventId}/whatsapp-message`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.registration_url).toBeNull();
    });
  });

  test('link generation still works after updating event data', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Before Update',
          date: '2026-09-15',
          location: 'Old Location',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });

      // Change title, description, date, location, add custom fields
      const updateRes = await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] After Update',
          description: 'Changed description',
          date: '2026-10-01',
          time: '14:00',
          end_time: '16:00',
          location: 'New Location',
          status: 'published',
          requires_registration: true,
          custom_fields: [
            { id: 'group', label: 'Grup', type: 'select', required: true, options: 'Adulti\nCopii\nTineri' }
          ]
        });
      expect(updateRes.status).toBe(200);

      const linkRes = await request(app)
        .post(`/api/events/${testEventId}/whatsapp-message`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(linkRes.status).toBe(200);
      expect(linkRes.body.registration_url).not.toBeNull();
      expect(linkRes.body.registration_url).toContain(`/planner/register/${testEventId}`);
    });
  });
});

// ============================================
// PUBLIC EVENT REGISTRATION PAGE
// ============================================

describe('Public Event Page (GET /api/public/events/:id)', () => {
  beforeEach(async () => {
    if (authToken && testEventId) {
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: [
            { id: 'age', label: 'Varsta', type: 'number', required: false, options: '' }
          ]
        });
    }
  });

  test('returns 200 with event data and custom_fields as array', async () => {
    if (!testEventId) return;
    const res = await request(app).get(`/api/public/events/${testEventId}`);
    expect(res.status).toBe(200);
    expect(res.body.event).toBeDefined();
    expect(res.body.event.title).toBeDefined();
    expect(Array.isArray(res.body.event.custom_fields)).toBe(true);
    expect(Array.isArray(res.body.contracts)).toBe(true);
  });

  test('returns 403 when event is draft', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'draft',
          requires_registration: true,
          custom_fields: []
        });

      const res = await request(app).get(`/api/public/events/${testEventId}`);
      expect(res.status).toBe(403);
    });
  });

  test('returns 400 when requires_registration=false', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: false,
          custom_fields: []
        });

      const res = await request(app).get(`/api/public/events/${testEventId}`);
      expect(res.status).toBe(400);
    });
  });

  test('returns 404 for non-existent event', async () => {
    const res = await request(app).get('/api/public/events/999999999');
    expect(res.status).toBe(404);
  });

  test('public page reflects updated event data after admin saves', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Updated via Admin',
          description: 'New description after update',
          date: '2026-09-20',
          location: 'Updated Location',
          status: 'published',
          requires_registration: true,
          custom_fields: [
            { id: 'meal', label: 'Masa inclusa', type: 'checkbox', required: false, options: '' }
          ]
        });

      const res = await request(app).get(`/api/public/events/${testEventId}`);
      expect(res.status).toBe(200);
      expect(res.body.event.title).toBe('[TEST] Updated via Admin');
      expect(Array.isArray(res.body.event.custom_fields)).toBe(true);
      expect(res.body.event.custom_fields.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// SUBMIT REGISTRATION
// ============================================

describe('Submit Registration (POST /api/public/events/:id/register)', () => {
  beforeEach(async () => {
    if (authToken && testEventId) {
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });
    }
  });

  test('successfully registers a new user', async () => {
    if (!testEventId) return;
    const res = await request(app)
      .post(`/api/public/events/${testEventId}/register`)
      .send({
        full_name: 'Ion Popescu',
        email: `ion.popescu.${Date.now()}@test.com`,
        phone: '0712345678'
      });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.status_url).toContain('/planner/register/');
    expect(res.body.message).toBe('Inscriere realizata cu succes!');
  });

  test('returns 400 when full_name is missing', async () => {
    if (!testEventId) return;
    const res = await request(app)
      .post(`/api/public/events/${testEventId}/register`)
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  test('returns 409 on duplicate email registration', async () => {
    if (!testEventId) return;
    const email = `dup.test.${Date.now()}@test.com`;

    const first = await request(app)
      .post(`/api/public/events/${testEventId}/register`)
      .send({ full_name: 'First User', email });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/public/events/${testEventId}/register`)
      .send({ full_name: 'Second User', email });
    expect(second.status).toBe(409);
  });

  test('returns 403 when event is draft', async () => {
    await skipIfNoAuth(async () => {
      if (!testEventId) return;
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'draft',
          requires_registration: true,
          custom_fields: []
        });

      const res = await request(app)
        .post(`/api/public/events/${testEventId}/register`)
        .send({ full_name: 'Test User', email: `draft.test.${Date.now()}@test.com` });
      expect(res.status).toBe(403);
    });
  });

  test('registration with custom field data', async () => {
    if (!testEventId) return;
    const res = await request(app)
      .post(`/api/public/events/${testEventId}/register`)
      .send({
        full_name: 'Maria Ionescu',
        email: `maria.${Date.now()}@test.com`,
        additional_data: { age: '25', group: 'Adulti' }
      });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});

// ============================================
// REGISTRATION STATUS
// ============================================

describe('Registration Status (GET /api/public/events/registration/:token)', () => {
  let regToken;

  beforeAll(async () => {
    if (!testEventId) return;
    if (authToken) {
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });
    }

    const res = await request(app)
      .post(`/api/public/events/${testEventId}/register`)
      .send({
        full_name: 'Status Check User',
        email: `status.check.${Date.now()}@test.com`
      });
    if (res.status === 201) {
      regToken = res.body.token;
    }
  });

  test('returns registration details for valid token', async () => {
    if (!regToken) return;
    const res = await request(app)
      .get(`/api/public/events/registration/${regToken}`);
    expect(res.status).toBe(200);
    expect(res.body.registration).toBeDefined();
    expect(res.body.registration.full_name).toBe('Status Check User');
    expect(Array.isArray(res.body.contracts)).toBe(true);
  });

  test('returns 404 for invalid token', async () => {
    const res = await request(app)
      .get('/api/public/events/registration/thisIsAnInvalidTokenThatDoesNotExist');
    expect(res.status).toBe(404);
  });
});

// ============================================
// AUTO-FILL LOOKUP
// ============================================

describe('Auto-fill Lookup (POST /api/public/events/:id/lookup)', () => {
  test('returns 400 when neither email nor phone provided', async () => {
    if (!testEventId) return;
    const res = await request(app)
      .post(`/api/public/events/${testEventId}/lookup`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown email', async () => {
    if (!testEventId) return;
    if (authToken) {
      await request(app)
        .put(`/api/events/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[TEST] Event UPDATED',
          date: '2026-09-15',
          location: 'CEAS Test Hall',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });
    }
    const res = await request(app)
      .post(`/api/public/events/${testEventId}/lookup`)
      .send({ email: 'nobody.ever.registered.this.email.xyz@unknown.com' });
    expect(res.status).toBe(404);
  });
});

// ============================================
// REGRESSION: Full scenario - create, publish, update, link works
// ============================================

describe('Regression: Link stability after event data changes', () => {
  test('full flow: create → publish → generate link → update data → link still works → register', async () => {
    await skipIfNoAuth(async () => {
      // 1. Create event
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[REGRESSION] Original Title',
          date: '2026-11-01',
          time: '09:00',
          location: 'CEAS',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });
      expect(createRes.status).toBe(201);
      const eventId = createRes.body.event.id;

      try {
        // 2. Generate link - should return valid registration_url
        const link1 = await request(app)
          .post(`/api/events/${eventId}/whatsapp-message`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(link1.status).toBe(200);
        expect(link1.body.registration_url).toContain(`/planner/register/${eventId}`);

        // 3. Public link should work
        const pub1 = await request(app).get(`/api/public/events/${eventId}`);
        expect(pub1.status).toBe(200);

        // 4. Admin updates the event (simulating user's reported scenario)
        const updateRes = await request(app)
          .put(`/api/events/${eventId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '[REGRESSION] Updated Title',
            description: 'Updated description for the event',
            date: '2026-11-15',
            time: '10:00',
            end_time: '12:00',
            location: 'Sala Mare',
            status: 'published',
            requires_registration: true,
            custom_fields: [
              { id: 'church', label: 'Biserica', type: 'text', required: false, options: '' },
              { id: 'diet', label: 'Meniu', type: 'select', required: true, options: 'Normal\nVegetarian' }
            ]
          });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.event.status).toBe('published');
        expect(updateRes.body.event.requires_registration).toBe(true);

        // 5. Generate link AGAIN after update - must still work
        const link2 = await request(app)
          .post(`/api/events/${eventId}/whatsapp-message`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(link2.status).toBe(200);
        expect(link2.body.registration_url).not.toBeNull();
        expect(link2.body.registration_url).toContain(`/planner/register/${eventId}`);

        // 6. Public page should still work and reflect updates
        const pub2 = await request(app).get(`/api/public/events/${eventId}`);
        expect(pub2.status).toBe(200);
        expect(pub2.body.event.title).toBe('[REGRESSION] Updated Title');
        expect(Array.isArray(pub2.body.event.custom_fields)).toBe(true);
        expect(pub2.body.event.custom_fields.length).toBe(2);

        // 7. Register via the public link
        const regRes = await request(app)
          .post(`/api/public/events/${eventId}/register`)
          .send({
            full_name: 'Regression Test Person',
            email: `regression.${Date.now()}@test.com`,
            additional_data: { diet: 'Normal' }
          });
        expect(regRes.status).toBe(201);
        expect(regRes.body.token).toBeDefined();

        // 8. Check registration status
        const statusRes = await request(app)
          .get(`/api/public/events/registration/${regRes.body.token}`);
        expect(statusRes.status).toBe(200);
        expect(statusRes.body.registration.full_name).toBe('Regression Test Person');

      } finally {
        await pool.query('DELETE FROM events WHERE id = $1', [eventId]).catch(() => {});
      }
    });
  });

  test('requires_registration stays true after updating only title/description', async () => {
    await skipIfNoAuth(async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[REGRESSION] Preserve Reg Test',
          date: '2026-11-05',
          location: 'CEAS',
          status: 'published',
          requires_registration: true,
          custom_fields: []
        });
      expect(createRes.status).toBe(201);
      const eventId = createRes.body.event.id;

      try {
        // Update only title and description
        const update = await request(app)
          .put(`/api/events/${eventId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '[REGRESSION] Preserve Reg Test - NEW TITLE',
            description: 'Just changed the title',
            date: '2026-11-05',
            location: 'CEAS',
            status: 'published',
            requires_registration: true,
            custom_fields: []
          });
        expect(update.status).toBe(200);

        // requires_registration must still be true
        const getRes = await request(app)
          .get(`/api/events/${eventId}`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(getRes.body.event.requires_registration).toBe(true);
        expect(getRes.body.event.status).toBe('published');

        // Public link must still work
        const pub = await request(app).get(`/api/public/events/${eventId}`);
        expect(pub.status).toBe(200);

      } finally {
        await pool.query('DELETE FROM events WHERE id = $1', [eventId]).catch(() => {});
      }
    });
  });
});

// ============================================
// E2E: auth, users, notifications, contracts, event types, admin registrations
// ============================================

describe('Auth /me', () => {
  test('GET /api/auth/me returns current user and roles', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBeDefined();
      expect(Array.isArray(res.body.user.roles)).toBe(true);
    });
  });
});

describe('Users API', () => {
  test('GET /api/users/roles/all returns roles list', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/users/roles/all')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.roles)).toBe(true);
      expect(res.body.roles.length).toBeGreaterThan(0);
    });
  });

  test('GET /api/users returns users each with roles array', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      const admin = res.body.users.find((u) => u.username === 'Admin');
      expect(admin).toBeDefined();
      expect(Array.isArray(admin.roles)).toBe(true);
    });
  });

  test('POST create user, GET, PUT, assign roles, DELETE', async () => {
    await skipIfNoAuth(async () => {
      const rolesRes = await request(app)
        .get('/api/users/roles/all')
        .set('Authorization', `Bearer ${authToken}`);
      const rid =
        rolesRes.body.roles.find((r) => r.category === 'department')?.id ||
        rolesRes.body.roles[0].id;

      const u = `e2e_${Date.now()}`;
      const create = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: u,
          password: 'testpass123',
          full_name: 'E2E Test User',
          email: `${u}@test.local`
        });
      expect(create.status).toBe(201);
      const uid = create.body.user.id;
      cleanupUserIds.push(uid);

      const getOne = await request(app)
        .get(`/api/users/${uid}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getOne.status).toBe(200);
      expect(getOne.body.user.username).toBe(u);

      const put = await request(app)
        .put(`/api/users/${uid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'E2E Updated',
          email: `${u}@updated.test`
        });
      expect(put.status).toBe(200);

      const assign = await request(app)
        .post(`/api/users/${uid}/roles`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roleIds: [rid] });
      expect(assign.status).toBe(200);
      expect(assign.body.roles.length).toBeGreaterThan(0);

      const del = await request(app)
        .delete(`/api/users/${uid}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(del.status).toBe(200);
      const i = cleanupUserIds.indexOf(uid);
      if (i !== -1) cleanupUserIds.splice(i, 1);
    });
  });
});

describe('Notifications API', () => {
  test('GET /api/notifications returns notifications array', async () => {
    await skipIfNoAuth(async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });
  });
});

describe('Contracts: parse, templates, invites, public sign, submissions', () => {
  test('POST /api/contracts/parse-fields returns fields', async () => {
    await skipIfNoAuth(async () => {
      const text = 'Subsemnatul cu CNP _______________ si numele _______________';
      const res = await request(app)
        .post('/api/contracts/parse-fields')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.fields)).toBe(true);
      expect(res.body.fields.length).toBeGreaterThan(0);
    });
  });

  test('template duplicate, update, invite, public sign, submissions, disable invite', async () => {
    await skipIfNoAuth(async () => {
      const text =
        'CNP _______________\nNume complet _______________\nSemnatura ...............';
      const parseRes = await request(app)
        .post('/api/contracts/parse-fields')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text });
      expect(parseRes.status).toBe(200);
      const { fields, signatureBlocks } = parseRes.body;

      const createT = await request(app)
        .post('/api/contracts/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `[TEST] E2E Template ${Date.now()}`,
          raw_text: text,
          fields,
          signature_blocks: signatureBlocks || []
        });
      expect(createT.status).toBe(201);
      const templateId = createT.body.template.id;
      cleanupTemplateIds.push(templateId);

      const dupRes = await request(app)
        .post(`/api/contracts/templates/${templateId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      expect(dupRes.status).toBe(201);
      const dupId = dupRes.body.template.id;
      cleanupTemplateIds.push(dupId);

      const putDup = await request(app)
        .put(`/api/contracts/templates/${dupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: `[TEST] Dup updated ${Date.now()}` });
      expect(putDup.status).toBe(200);

      const inviteRes = await request(app)
        .post(`/api/contracts/templates/${templateId}/invites`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ max_uses: 10 });
      expect(inviteRes.status).toBe(201);
      const inviteToken = inviteRes.body.invite.token;
      const inviteId = inviteRes.body.invite.id;

      const invitesList = await request(app)
        .get(`/api/contracts/templates/${templateId}/invites`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(invitesList.status).toBe(200);
      expect(invitesList.body.invites.length).toBeGreaterThan(0);

      const pubGet = await request(app).get(`/api/public/sign/${inviteToken}`);
      expect(pubGet.status).toBe(200);
      expect(pubGet.body.template).toBeDefined();

      let fk = pubGet.body.template.fields;
      fk = typeof fk === 'string' ? JSON.parse(fk) : fk;
      const filled = {};
      for (const f of fk) {
        const k = f.key;
        if (String(k).toLowerCase().includes('cnp') || f.type === 'cnp') {
          filled[k] = '1890101123456';
        } else {
          filled[k] = 'Ion Test E2E';
        }
      }
      if (Object.keys(filled).length === 0) {
        filled.test = 'x';
      }

      const submit = await request(app)
        .post(`/api/public/sign/${inviteToken}/submit`)
        .send({ filled_fields: filled, save_for_later: true });
      expect(submit.status).toBe(201);
      const submissionId = submit.body.submission_id;
      const signerCode = submit.body.signer_code;

      if (signerCode) {
        const look = await request(app)
          .post(`/api/public/sign/${inviteToken}/lookup-signer`)
          .send({ signer_code: signerCode });
        expect(look.status).toBe(200);
      }

      const lookCnp = await request(app)
        .post(`/api/public/sign/${inviteToken}/lookup-cnp`)
        .send({ cnp_last4: '3456' });
      expect([200, 404, 409]).toContain(lookCnp.status);

      const subs = await request(app)
        .get('/api/contracts/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ template_id: templateId });
      expect(subs.status).toBe(200);
      expect(subs.body.submissions.some((s) => s.id === submissionId)).toBe(true);

      const oneSub = await request(app)
        .get(`/api/contracts/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(oneSub.status).toBe(200);
      expect(oneSub.body.submission).toBeDefined();

      const patchRes = await request(app)
        .patch(`/api/contracts/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contract_number: 'E2E-TEST-001' });
      expect(patchRes.status).toBe(200);

      await request(app)
        .post(`/api/contracts/invites/${inviteId}/disable`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      const pubAfter = await request(app).get(`/api/public/sign/${inviteToken}`);
      expect(pubAfter.status).toBe(403);

      await request(app)
        .delete(`/api/contracts/templates/${dupId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const j = cleanupTemplateIds.indexOf(dupId);
      if (j !== -1) cleanupTemplateIds.splice(j, 1);

      await request(app)
        .delete(`/api/contracts/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const k = cleanupTemplateIds.indexOf(templateId);
      if (k !== -1) cleanupTemplateIds.splice(k, 1);
    });
  });
});

describe('Events: linked contracts + admin registrations list', () => {
  test('contract_template_ids appear on event and public page; admin lists registrations', async () => {
    await skipIfNoAuth(async () => {
      const text = 'Camp test _______________';
      const parseRes = await request(app)
        .post('/api/contracts/parse-fields')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text });
      expect(parseRes.status).toBe(200);

      const createT = await request(app)
        .post('/api/contracts/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `[TEST] Event link ${Date.now()}`,
          raw_text: text,
          fields: parseRes.body.fields,
          signature_blocks: parseRes.body.signatureBlocks || []
        });
      expect(createT.status).toBe(201);
      const tid = createT.body.template.id;
      cleanupTemplateIds.push(tid);

      const ev = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '[E2E] Event with contract',
          date: '2026-12-10',
          location: 'Sala test',
          status: 'published',
          requires_registration: true,
          contract_template_ids: [tid],
          custom_fields: []
        });
      expect(ev.status).toBe(201);
      const eid = ev.body.event.id;
      cleanupEventIds.push(eid);

      const getEv = await request(app)
        .get(`/api/events/${eid}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getEv.status).toBe(200);
      expect(
        getEv.body.event.contracts.some(
          (c) => Number(c.contract_template_id) === Number(tid)
        )
      ).toBe(true);

      const pub = await request(app).get(`/api/public/events/${eid}`);
      expect(pub.status).toBe(200);
      expect(pub.body.contracts.some((c) => Number(c.id) === Number(tid))).toBe(true);

      const email = `e2e.reg.${Date.now()}@test.com`;
      const reg = await request(app)
        .post(`/api/public/events/${eid}/register`)
        .send({ full_name: 'Registrant E2E', email });
      expect(reg.status).toBe(201);

      const regList = await request(app)
        .get(`/api/events/${eid}/registrations`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(regList.status).toBe(200);
      expect(regList.body.registrations.some((r) => r.email === email)).toBe(true);

      const allReg = await request(app)
        .get('/api/events/registrations/all')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ event_id: eid });
      expect(allReg.status).toBe(200);
      expect(
        allReg.body.registrations.some((r) => r.email === email)
      ).toBe(true);

      await pool.query('DELETE FROM events WHERE id = $1', [eid]).catch(() => {});
      const ei = cleanupEventIds.indexOf(eid);
      if (ei !== -1) cleanupEventIds.splice(ei, 1);

      await request(app)
        .delete(`/api/contracts/templates/${tid}`)
        .set('Authorization', `Bearer ${authToken}`);
      const ti = cleanupTemplateIds.indexOf(tid);
      if (ti !== -1) cleanupTemplateIds.splice(ti, 1);
    });
  });
});

describe('Event types admin CRUD', () => {
  test('POST /types, PUT /types/:id, DELETE /types/:id', async () => {
    await skipIfNoAuth(async () => {
      const cr = await request(app)
        .post('/api/events/types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `[TEST] E2E Type ${Date.now()}` });
      expect(cr.status).toBe(201);
      const typeId = cr.body.type.id;

      const up = await request(app)
        .put(`/api/events/types/${typeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'E2E description' });
      expect(up.status).toBe(200);

      const del = await request(app)
        .delete(`/api/events/types/${typeId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(del.status).toBe(200);
    });
  });
});
