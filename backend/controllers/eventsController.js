/**
 * Events Controller
 * Handles event types, events CRUD, registrations management, and WhatsApp message generation
 */

const { getDatabase } = require('../config/database');
const crypto = require('crypto');

/**
 * Ensure a date value is returned as 'YYYY-MM-DD' string.
 * Prevents timezone-related off-by-one errors when Date objects are serialized to JSON via toISOString().
 */
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

// ============================================
// EVENT TYPES
// ============================================

exports.getAllEventTypes = async (req, res) => {
  try {
    const db = getDatabase();

    const types = await db.prepare(`
      SELECT
        et.*,
        (SELECT COUNT(*) FROM events WHERE event_type_id = et.id) as events_count,
        pt.name as parent_name
      FROM event_types et
      LEFT JOIN event_types pt ON et.parent_type_id = pt.id
      ORDER BY et.sort_order ASC, et.name ASC
    `).all();

    res.json({ types });
  } catch (error) {
    console.error('Error getting event types:', error);
    res.status(500).json({ error: 'Failed to get event types' });
  }
};

exports.getEventTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const type = await db.prepare(`
      SELECT et.*, pt.name as parent_name
      FROM event_types et
      LEFT JOIN event_types pt ON et.parent_type_id = pt.id
      WHERE et.id = $1
    `).get(id);

    if (!type) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Get subgroups
    const subgroups = await db.prepare(`
      SELECT * FROM event_types WHERE parent_type_id = $1 ORDER BY sort_order ASC
    `).all(id);

    res.json({ type, subgroups });
  } catch (error) {
    console.error('Error getting event type:', error);
    res.status(500).json({ error: 'Failed to get event type' });
  }
};

exports.createEventType = async (req, res) => {
  try {
    const { name, description, whatsapp_group_link, whatsapp_group_name, parent_type_id, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const db = getDatabase();

    const result = await db.prepare(`
      INSERT INTO event_types (name, description, whatsapp_group_link, whatsapp_group_name, parent_type_id, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `).get(name, description || null, whatsapp_group_link || null, whatsapp_group_name || null, parent_type_id || null, sort_order || 0);

    const type = await db.prepare(`SELECT * FROM event_types WHERE id = $1`).get(result.id);

    res.status(201).json({ type, message: 'Event type created successfully' });
  } catch (error) {
    console.error('Error creating event type:', error);
    res.status(500).json({ error: 'Failed to create event type' });
  }
};

exports.updateEventType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, whatsapp_group_link, whatsapp_group_name, parent_type_id, sort_order, is_active } = req.body;

    const db = getDatabase();

    const existing = await db.prepare(`SELECT * FROM event_types WHERE id = $1`).get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    await db.prepare(`
      UPDATE event_types
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          whatsapp_group_link = COALESCE($3, whatsapp_group_link),
          whatsapp_group_name = COALESCE($4, whatsapp_group_name),
          parent_type_id = $5,
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `).run(
      name || null,
      description !== undefined ? description : null,
      whatsapp_group_link !== undefined ? whatsapp_group_link : null,
      whatsapp_group_name !== undefined ? whatsapp_group_name : null,
      parent_type_id !== undefined ? parent_type_id : existing.parent_type_id,
      sort_order !== undefined ? sort_order : null,
      is_active !== undefined ? is_active : null,
      id
    );

    const type = await db.prepare(`SELECT * FROM event_types WHERE id = $1`).get(id);
    res.json({ type, message: 'Event type updated successfully' });
  } catch (error) {
    console.error('Error updating event type:', error);
    res.status(500).json({ error: 'Failed to update event type' });
  }
};

exports.deleteEventType = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const events = await db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type_id = $1`).get(id);
    if (parseInt(events?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete event type with existing events. Delete or reassign events first.' });
    }

    // Unlink subgroups
    await db.prepare(`UPDATE event_types SET parent_type_id = NULL WHERE parent_type_id = $1`).run(id);

    await db.prepare(`DELETE FROM event_types WHERE id = $1`).run(id);
    res.json({ message: 'Event type deleted successfully' });
  } catch (error) {
    console.error('Error deleting event type:', error);
    res.status(500).json({ error: 'Failed to delete event type' });
  }
};

// ============================================
// EVENTS
// ============================================

exports.getAllEvents = async (req, res) => {
  try {
    const { event_type_id, status, from, to, q, upcoming, limit } = req.query;
    const db = getDatabase();

    let query = `
      SELECT
        e.*,
        et.name as event_type_name,
        et.whatsapp_group_name,
        et.whatsapp_group_link,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registrations_count
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (event_type_id) {
      query += ` AND e.event_type_id = $${paramIndex++}`;
      params.push(event_type_id);
    }

    if (status) {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }

    if (from) {
      query += ` AND e.date >= $${paramIndex++}`;
      params.push(from);
    }

    if (to) {
      query += ` AND e.date <= $${paramIndex++}`;
      params.push(to);
    }

    if (q) {
      query += ` AND (e.title ILIKE $${paramIndex++} OR e.description ILIKE $${paramIndex++})`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (upcoming === 'true') {
      query += ` AND e.date >= CURRENT_DATE`;
      query += ` ORDER BY e.date ASC`;
    } else {
      query += ` ORDER BY e.date DESC, e.created_at DESC`;
    }

    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit));
    }

    const events = await db.prepare(query).all(...params);

    // Normalize date fields to prevent timezone off-by-one
    events.forEach(e => { e.date = formatDateSafe(e.date); });

    res.json({ events });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const event = await db.prepare(`
      SELECT
        e.*,
        et.name as event_type_name,
        et.whatsapp_group_name,
        et.whatsapp_group_link,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registrations_count
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `).get(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get linked contract templates
    const contracts = await db.prepare(`
      SELECT ec.contract_template_id, ct.title, ct.nickname
      FROM event_contracts ec
      JOIN contract_templates ct ON ec.contract_template_id = ct.id
      WHERE ec.event_id = $1
    `).all(id);

    event.contracts = contracts;
    event.date = formatDateSafe(event.date);

    res.json({ event });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, event_type_id, event_type_name, date, time, end_time, location, requires_registration, status, whatsapp_message, contract_template_ids, custom_fields } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const db = getDatabase();

    // Resolve event_type_name to event_type_id
    let resolvedTypeId = event_type_id || null;
    if (!resolvedTypeId && event_type_name && event_type_name.trim()) {
      const existing = await db.prepare(`SELECT id FROM event_types WHERE LOWER(name) = LOWER($1)`).get(event_type_name.trim());
      if (existing) {
        resolvedTypeId = existing.id;
      } else {
        const newType = await db.prepare(`INSERT INTO event_types (name) VALUES ($1) RETURNING id`).get(event_type_name.trim());
        resolvedTypeId = newType.id;
      }
    }

    const result = await db.prepare(`
      INSERT INTO events (title, description, event_type_id, date, time, end_time, location, requires_registration, status, whatsapp_message, custom_fields, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `).get(
      title,
      description || null,
      resolvedTypeId,
      date,
      time || null,
      end_time || null,
      location || 'CEAS',
      requires_registration || false,
      status || 'draft',
      whatsapp_message || null,
      custom_fields ? JSON.stringify(custom_fields) : '[]',
      req.user.id
    );

    // Insert contract links
    if (contract_template_ids && contract_template_ids.length > 0) {
      for (const templateId of contract_template_ids) {
        await db.prepare(`
          INSERT INTO event_contracts (event_id, contract_template_id)
          VALUES ($1, $2)
        `).run(result.id, templateId);
      }
    }

    const event = await db.prepare(`
      SELECT e.*, et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = $1
    `).get(result.id);

    event.date = formatDateSafe(event.date);
    res.status(201).json({ event, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_type_id, event_type_name, date, time, end_time, location, requires_registration, status, whatsapp_message, contract_template_ids, custom_fields } = req.body;

    const db = getDatabase();

    // Resolve event_type_name to event_type_id
    let resolvedTypeId = event_type_id || null;
    if (!resolvedTypeId && event_type_name && event_type_name.trim()) {
      const existing = await db.prepare(`SELECT id FROM event_types WHERE LOWER(name) = LOWER($1)`).get(event_type_name.trim());
      if (existing) {
        resolvedTypeId = existing.id;
      } else {
        const newType = await db.prepare(`INSERT INTO event_types (name) VALUES ($1) RETURNING id`).get(event_type_name.trim());
        resolvedTypeId = newType.id;
      }
    }

    const existing = await db.prepare(`SELECT * FROM events WHERE id = $1`).get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await db.prepare(`
      UPDATE events
      SET title = COALESCE($1, title),
          description = $2,
          event_type_id = $3,
          date = COALESCE($4, date),
          time = $5,
          end_time = $6,
          location = COALESCE($7, location),
          requires_registration = COALESCE($8, requires_registration),
          status = COALESCE($9, status),
          whatsapp_message = $10,
          custom_fields = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
    `).run(
      title || null,
      description !== undefined ? description : existing.description,
      event_type_name !== undefined ? resolvedTypeId : existing.event_type_id,
      date || null,
      time !== undefined ? time : existing.time,
      end_time !== undefined ? end_time : existing.end_time,
      location || null,
      requires_registration !== undefined ? requires_registration : null,
      status || null,
      whatsapp_message !== undefined ? whatsapp_message : existing.whatsapp_message,
      custom_fields !== undefined ? JSON.stringify(custom_fields) : (existing.custom_fields || '[]'),
      id
    );

    // Sync contract links if provided
    if (contract_template_ids !== undefined) {
      await db.prepare(`DELETE FROM event_contracts WHERE event_id = $1`).run(id);
      if (contract_template_ids && contract_template_ids.length > 0) {
        for (const templateId of contract_template_ids) {
          await db.prepare(`
            INSERT INTO event_contracts (event_id, contract_template_id)
            VALUES ($1, $2)
          `).run(id, templateId);
        }
      }
    }

    const event = await db.prepare(`
      SELECT e.*, et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = $1
    `).get(id);

    event.date = formatDateSafe(event.date);
    res.json({ event, message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const existing = await db.prepare(`SELECT * FROM events WHERE id = $1`).get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Cascading delete handles registrations and event_contracts
    await db.prepare(`DELETE FROM events WHERE id = $1`).run(id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// ============================================
// REGISTRATIONS (admin view)
// ============================================

exports.getAllRegistrations = async (req, res) => {
  try {
    const { event_id, q } = req.query;
    const db = getDatabase();

    let query = `
      SELECT
        er.*,
        e.title as event_title,
        e.date as event_date,
        e.time as event_time,
        e.location as event_location
      FROM event_registrations er
      LEFT JOIN events e ON er.event_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (event_id) {
      query += ` AND er.event_id = $${paramIndex++}`;
      params.push(event_id);
    }

    if (q) {
      query += ` AND (er.full_name ILIKE $${paramIndex++} OR er.email ILIKE $${paramIndex++})`;
      params.push(`%${q}%`, `%${q}%`);
    }

    query += ` ORDER BY er.registered_at DESC`;

    const registrations = await db.prepare(query).all(...params);

    for (const reg of registrations) {
      reg.event_date = formatDateSafe(reg.event_date);
      const contracts = await db.prepare(`
        SELECT erc.*, ct.title as contract_title, ct.nickname as contract_nickname
        FROM event_registration_contracts erc
        LEFT JOIN contract_templates ct ON erc.contract_template_id = ct.id
        WHERE erc.registration_id = $1
      `).all(reg.id);
      reg.contracts = contracts;
    }

    res.json({ registrations });
  } catch (error) {
    console.error('Error getting all registrations:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
};

exports.getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const event = await db.prepare(`SELECT * FROM events WHERE id = $1`).get(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const registrations = await db.prepare(`
      SELECT * FROM event_registrations
      WHERE event_id = $1
      ORDER BY registered_at DESC
    `).all(id);

    // Get contract status for each registration
    for (const reg of registrations) {
      const contracts = await db.prepare(`
        SELECT
          erc.*,
          ct.title as contract_title,
          ct.nickname as contract_nickname
        FROM event_registration_contracts erc
        LEFT JOIN contract_templates ct ON erc.contract_template_id = ct.id
        WHERE erc.registration_id = $1
      `).all(reg.id);
      reg.contracts = contracts;
    }

    res.json({ registrations });
  } catch (error) {
    console.error('Error getting registrations:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
};

// ============================================
// WHATSAPP MESSAGE GENERATION
// ============================================

exports.generateWhatsAppMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const event = await db.prepare(`
      SELECT e.*, et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = $1
    `).get(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const registrationUrl = `${baseUrl}/planner/register/${event.id}`;

    // Format date
    const dateObj = new Date(event.date);
    const formattedDate = dateObj.toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let message = `📢 *${event.title}*\n\n`;

    if (event.description) {
      message += `${event.description}\n\n`;
    }

    message += `📅 ${formattedDate}`;
    if (event.time) {
      message += ` | ⏰ ${event.time}`;
      if (event.end_time) {
        message += ` - ${event.end_time}`;
      }
    }
    message += '\n';

    if (event.location) {
      message += `📍 ${event.location}\n`;
    }

    if (event.requires_registration) {
      message += `\n✍️ Înscriere necesară:\n${registrationUrl}`;
    }

    // WhatsApp deep link
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

    res.json({
      message,
      whatsapp_link: whatsappLink,
      registration_url: event.requires_registration ? registrationUrl : null,
      whatsapp_group_name: event.whatsapp_group_name
    });
  } catch (error) {
    console.error('Error generating WhatsApp message:', error);
    res.status(500).json({ error: 'Failed to generate message' });
  }
};
