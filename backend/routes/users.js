const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// IMPORTANT: Specific routes BEFORE parameterized routes!

// Get all roles (must be before /:id)
router.get('/roles/all', usersController.getAllRoles);

// Get all users (admin_global or super_admin only)
router.get('/', requireRole(['admin_global', 'super_admin']), usersController.getAllUsers);

// Create user (admin_global or super_admin only)
router.post('/', requireRole(['admin_global', 'super_admin']), usersController.createUser);

// Routes with :id parameter (after specific routes)
router.get('/:id', usersController.getUserById);

// Update user (admin_global or super_admin only)
router.put('/:id', requireRole(['admin_global', 'super_admin']), usersController.updateUser);

// Assign roles (admin_global or super_admin only)
router.post('/:id/roles', requireRole(['admin_global', 'super_admin']), usersController.assignRoles);

// Delete user (admin_global or super_admin only)
router.delete('/:id', requireRole(['admin_global', 'super_admin']), usersController.deleteUser);

module.exports = router;
