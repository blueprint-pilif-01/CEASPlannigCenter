/**
 * Events Routes (Admin - requires authentication)
 */

const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// EVENT TYPES
// ============================================

router.get('/types', eventsController.getAllEventTypes);
router.get('/types/:id', eventsController.getEventTypeById);
router.post('/types', requireRole(['admin_global', 'super_admin']), eventsController.createEventType);
router.put('/types/:id', requireRole(['admin_global', 'super_admin']), eventsController.updateEventType);
router.delete('/types/:id', requireRole(['admin_global', 'super_admin']), eventsController.deleteEventType);

// ============================================
// EVENTS
// ============================================

router.get('/', eventsController.getAllEvents);
router.get('/registrations/all', requireRole(['admin_global', 'super_admin']), eventsController.getAllRegistrations);
router.get('/:id', eventsController.getEventById);
router.post('/', requireRole(['admin_global', 'super_admin']), eventsController.createEvent);
router.put('/:id', requireRole(['admin_global', 'super_admin']), eventsController.updateEvent);
router.delete('/:id', requireRole(['admin_global', 'super_admin']), eventsController.deleteEvent);

// ============================================
// REGISTRATIONS
// ============================================

router.get('/:id/registrations', eventsController.getEventRegistrations);

// ============================================
// WHATSAPP
// ============================================

router.post('/:id/whatsapp-message', eventsController.generateWhatsAppMessage);

module.exports = router;
