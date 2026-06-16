/**
 * Public Contracts Routes (No authentication required)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const publicContractsController = require('../controllers/publicContractsController');

// Rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Prea multe cereri. Încearcă din nou în 15 minute.'
  }
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 submissions per hour
  message: {
    error: 'Prea multe semnări. Încearcă din nou mai târziu.'
  }
});

// Strict rate limiting for CNP lookup (prevents brute force)
const cnpLookupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 lookup attempts per minute
  message: {
    error: 'Prea multe încercări. Așteaptă 1 minut.'
  }
});

// Apply rate limiting
router.use(publicLimiter);

// Get contract by token
router.get('/sign/:token', publicContractsController.getContractByToken);

// Lookup signer by code for auto-complete (old method)
router.post('/sign/:token/lookup-signer', publicContractsController.lookupSigner);

// Lookup signer by last 4 digits of CNP for auto-complete
router.post('/sign/:token/lookup-cnp', cnpLookupLimiter, publicContractsController.lookupByPartialCNP);

// Submit signed contract
router.post('/sign/:token/submit', submitLimiter, publicContractsController.submitContract);

module.exports = router;
