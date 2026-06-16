/**
 * Public Events Routes (No authentication required)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const publicEventsController = require('../controllers/publicEventsController');

// Rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Prea multe cereri. Incearca din nou in 15 minute.'
  }
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: 'Prea multe inscrieri. Incearca din nou mai tarziu.'
  }
});

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    error: 'Prea multe incercari. Asteapta 1 minut.'
  }
});

router.use(publicLimiter);

// Get event details for registration
router.get('/events/:eventId', publicEventsController.getEventForRegistration);

// Lookup previous registration for auto-fill
router.post('/events/:eventId/lookup', lookupLimiter, publicEventsController.lookupPreviousRegistration);

// Submit registration
router.post('/events/:eventId/register', submitLimiter, publicEventsController.submitRegistration);

// Get registration status
router.get('/events/registration/:token', publicEventsController.getRegistrationStatus);

module.exports = router;
