/**
 * Public Events Controller
 * Handles public event registration (no authentication required)
 */

const { getDatabase } = require('../config/database');
const crypto = require('crypto');

function formatDateSafe(val) {
  if (!val) return val;
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  if (typeof val === 'string' && val.includes('T')) {
    return val.split('T')[0];
  }
  return val;
}

/**
 * Get event details for public registration
 */
exports.getEventForRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const db = getDatabase();

    const event = await db.prepare(`
      SELECT e.id, e.title, e.description, e.date, e.time, e.end_time, e.location,
             e.requires_registration, e.status,
             COALESCE(e.custom_fields, '[]') as custom_fields,
             et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = $1
    `).get(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Evenimentul nu a fost gasit' });
    }

    if (event.status !== 'published') {
      return res.status(403).json({ error: 'Evenimentul nu este disponibil pentru inscriere' });
    }

    if (!event.requires_registration) {
      return res.status(400).json({ error: 'Evenimentul nu necesita inscriere' });
    }

    // Get required contract templates
    const contracts = await db.prepare(`
      SELECT ct.id, ct.title, ct.nickname
      FROM event_contracts ec
      JOIN contract_templates ct ON ec.contract_template_id = ct.id
      WHERE ec.event_id = $1
    `).all(eventId);

    let customFields = [];
    try { customFields = JSON.parse(event.custom_fields || '[]'); } catch {}

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: formatDateSafe(event.date),
        time: event.time,
        end_time: event.end_time,
        location: event.location,
        event_type_name: event.event_type_name,
        custom_fields: customFields
      },
      contracts
    });
  } catch (error) {
    console.error('Error getting event for registration:', error);
    res.status(500).json({ error: 'Eroare la incarcarea evenimentului' });
  }
};

/**
 * Lookup previous registration data for auto-fill
 */
exports.lookupPreviousRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email sau telefon necesar' });
    }

    const db = getDatabase();

    // Verify event exists and is published
    const event = await db.prepare(`
      SELECT id FROM events WHERE id = $1 AND status = 'published' AND requires_registration = TRUE
    `).get(eventId);

    if (!event) {
      return res.status(403).json({ error: 'Eveniment invalid' });
    }

    // Look up most recent registration by email or phone
    let registration;
    if (email) {
      registration = await db.prepare(`
        SELECT full_name, email, phone, additional_data
        FROM event_registrations
        WHERE email = $1
        ORDER BY registered_at DESC
        LIMIT 1
      `).get(email.trim().toLowerCase());
    } else if (phone) {
      registration = await db.prepare(`
        SELECT full_name, email, phone, additional_data
        FROM event_registrations
        WHERE phone = $1
        ORDER BY registered_at DESC
        LIMIT 1
      `).get(phone.trim());
    }

    if (!registration) {
      return res.status(404).json({ error: 'Nu am gasit date anterioare' });
    }

    res.json({
      saved_fields: {
        full_name: registration.full_name,
        email: registration.email,
        phone: registration.phone
      },
      message: 'Date gasite! Verifica si completeaza ce lipseste.'
    });
  } catch (error) {
    console.error('Error looking up registration:', error);
    res.status(500).json({ error: 'Eroare la cautare' });
  }
};

/**
 * Submit event registration
 */
exports.submitRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { full_name, email, phone, additional_data } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Numele complet este necesar' });
    }

    const db = getDatabase();

    // Verify event
    const event = await db.prepare(`
      SELECT * FROM events WHERE id = $1 AND status = 'published' AND requires_registration = TRUE
    `).get(eventId);

    if (!event) {
      return res.status(403).json({ error: 'Evenimentul nu este disponibil pentru inscriere' });
    }

    // Check for duplicate registration (same event + same email or phone)
    if (email) {
      const existingByEmail = await db.prepare(`
        SELECT id FROM event_registrations WHERE event_id = $1 AND email = $2 AND status = 'registered'
      `).get(eventId, email.trim().toLowerCase());
      if (existingByEmail) {
        return res.status(409).json({ error: 'Esti deja inscris la acest eveniment cu acest email' });
      }
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Client info
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create registration
    const result = await db.prepare(`
      INSERT INTO event_registrations (event_id, token, full_name, email, phone, additional_data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `).get(
      eventId,
      token,
      full_name.trim(),
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      additional_data ? JSON.stringify(additional_data) : '{}',
      ipAddress,
      userAgent
    );

    // Handle required contracts
    const requiredContracts = await db.prepare(`
      SELECT ec.contract_template_id, ct.title
      FROM event_contracts ec
      JOIN contract_templates ct ON ec.contract_template_id = ct.id
      WHERE ec.event_id = $1
    `).all(eventId);

    const contractSigningUrls = [];
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    for (const contract of requiredContracts) {
      // Create a contract invite for this registration
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const inviteCode = generateShortCode(8);

      const inviteResult = await db.prepare(`
        INSERT INTO contract_invites (template_id, token, code, max_uses)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `).get(contract.contract_template_id, inviteToken, inviteCode, 1);

      // Link registration to contract (store invite_id for later signing URL lookup)
      await db.prepare(`
        INSERT INTO event_registration_contracts (registration_id, contract_template_id, contract_invite_id, status)
        VALUES ($1, $2, $3, 'pending')
      `).run(result.id, contract.contract_template_id, inviteResult.id);

      contractSigningUrls.push({
        contract_title: contract.title,
        contract_template_id: contract.contract_template_id,
        signing_url: `${baseUrl}/planner/sign/${inviteToken}`,
        invite_id: inviteResult.id
      });
    }

    res.status(201).json({
      registration_id: result.id,
      token,
      contracts: contractSigningUrls,
      status_url: `${baseUrl}/planner/register/${eventId}/status/${token}`,
      message: 'Inscriere realizata cu succes!'
    });
  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({ error: 'Eroare la inscriere' });
  }
};

/**
 * Get registration status (for post-registration status page)
 */
exports.getRegistrationStatus = async (req, res) => {
  try {
    const { token } = req.params;
    const db = getDatabase();

    const registration = await db.prepare(`
      SELECT er.*, e.title as event_title, e.date as event_date, e.time as event_time, e.location as event_location
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      WHERE er.token = $1
    `).get(token);

    if (!registration) {
      return res.status(404).json({ error: 'Inregistrarea nu a fost gasita' });
    }

    // Get contract completion status
    const contracts = await db.prepare(`
      SELECT
        erc.*,
        ct.title as contract_title,
        ct.nickname as contract_nickname
      FROM event_registration_contracts erc
      LEFT JOIN contract_templates ct ON erc.contract_template_id = ct.id
      WHERE erc.registration_id = $1
    `).all(registration.id);

    // For pending contracts, find their invite URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    for (const contract of contracts) {
      if (contract.status === 'pending') {
        // Find the invite that was created for this registration's contract
        const invite = await db.prepare(`
          SELECT ci.token FROM contract_invites ci
          JOIN event_registration_contracts erc ON erc.contract_invite_id = ci.id
          WHERE erc.registration_id = $1 AND erc.contract_template_id = $2
        `).get(registration.id, contract.contract_template_id);

        if (invite) {
          contract.signing_url = `${baseUrl}/planner/sign/${invite.token}`;
        }
      }
    }

    res.json({
      registration: {
        id: registration.id,
        full_name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        status: registration.status,
        registered_at: registration.registered_at,
        event_title: registration.event_title,
        event_date: formatDateSafe(registration.event_date),
        event_time: registration.event_time,
        event_location: registration.event_location
      },
      contracts
    });
  } catch (error) {
    console.error('Error getting registration status:', error);
    res.status(500).json({ error: 'Eroare la incarcarea statusului' });
  }
};

// ============================================
// HELPERS
// ============================================

function generateShortCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
