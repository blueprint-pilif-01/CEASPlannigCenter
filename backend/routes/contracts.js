/**
 * Contracts Routes (Admin - requires authentication)
 */

const express = require('express');
const router = express.Router();
const contractsController = require('../controllers/contractsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// TEMPLATES
// ============================================

// Get all templates
router.get('/templates', contractsController.getAllTemplates);

// Get template by ID
router.get('/templates/:id', contractsController.getTemplateById);

// Create template
router.post('/templates', requireRole(['admin_global', 'super_admin']), contractsController.createTemplate);

// Update template
router.put('/templates/:id', requireRole(['admin_global', 'super_admin']), contractsController.updateTemplate);

// Delete template
router.delete('/templates/:id', requireRole(['admin_global', 'super_admin']), contractsController.deleteTemplate);

// Duplicate template
router.post('/templates/:id/duplicate', requireRole(['admin_global', 'super_admin']), contractsController.duplicateTemplate);

// Parse fields from text
router.post('/parse-fields', contractsController.parseFields);

// ============================================
// INVITES
// ============================================

// Generate invite for template
router.post('/templates/:id/invites', requireRole(['admin_global', 'super_admin']), contractsController.createInvite);

// Get invites for template
router.get('/templates/:id/invites', contractsController.getTemplateInvites);

// Disable invite
router.post('/invites/:inviteId/disable', requireRole(['admin_global', 'super_admin']), contractsController.disableInvite);

// ============================================
// SUBMISSIONS
// ============================================

// Get all submissions
router.get('/submissions', contractsController.getAllSubmissions);

// Get submission by ID
router.get('/submissions/:id', contractsController.getSubmissionById);

// Update submission (contract_number)
router.put('/submissions/:id', requireRole(['admin_global', 'super_admin']), contractsController.updateSubmission);

// Download PDF
router.get('/submissions/:id/pdf', contractsController.downloadSubmissionPdf);

// Download signature
router.get('/submissions/:id/signature', contractsController.downloadSubmissionSignature);

// ============================================
// SIGNERS
// ============================================

// Get all signers
router.get('/signers', contractsController.getAllSigners);

// Regenerate signer code
router.post('/signers/:id/regenerate-code', requireRole(['admin_global', 'super_admin']), contractsController.regenerateSignerCode);

// Delete signer (GDPR)
router.delete('/signers/:id', requireRole(['admin_global', 'super_admin']), contractsController.deleteSigner);

module.exports = router;
