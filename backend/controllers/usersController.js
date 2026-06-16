const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

/**
 * Get all users (admin_global only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const db = getDatabase();

    const users = await db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.avatar_path, u.is_active, u.created_at
      FROM users u
      ORDER BY u.full_name ASC
    `).all();

    for (const user of users) {
      const roles = await db.prepare(`
        SELECT r.name, r.display_name, r.category
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
      `).all(user.id);
      user.roles = roles;
    }

    res.json({ users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const user = await db.prepare(`
      SELECT id, username, full_name, email, phone, avatar_path, is_active, created_at
      FROM users
      WHERE id = $1
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const roles = await db.prepare(`
      SELECT r.id, r.name, r.display_name, r.category
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `).all(id);

    user.roles = roles;

    res.json({ user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

/**
 * Create user (admin_global only)
 */
exports.createUser = async (req, res) => {
  try {
    const { username, password, full_name, email, phone } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDatabase();

    const existing = await db.prepare('SELECT id FROM users WHERE username = $1').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await db.prepare(`
      INSERT INTO users (username, password_hash, full_name, email, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `).get(username, passwordHash, full_name, email || null, phone || null);

    const user = await db.prepare('SELECT id, username, full_name, email, phone FROM users WHERE id = $1').get(result.id);

    res.status(201).json({ user, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, is_active } = req.body;

    const db = getDatabase();

    const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.prepare(`
      UPDATE users
      SET full_name = $1,
          email = $2,
          phone = $3,
          is_active = COALESCE($4, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `).run(full_name, email, phone, is_active, id);

    const updated = await db.prepare('SELECT id, username, full_name, email, phone, is_active FROM users WHERE id = $1').get(id);

    res.json({ user: updated, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Assign roles to user
 */
exports.assignRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleIds } = req.body;

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ error: 'roleIds must be an array' });
    }

    const db = getDatabase();

    await db.prepare('DELETE FROM user_roles WHERE user_id = $1').run(id);

    for (const roleId of roleIds) {
      await db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)').run(id, roleId);
    }

    const roles = await db.prepare(`
      SELECT r.id, r.name, r.display_name, r.category
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `).all(id);

    res.json({ roles, message: 'Roles assigned successfully' });
  } catch (error) {
    console.error('Error assigning roles:', error);
    res.status(500).json({ error: 'Error assigning roles' });
  }
};

/**
 * Get all roles
 */
exports.getAllRoles = async (req, res) => {
  try {
    const db = getDatabase();

    const roles = await db.prepare('SELECT * FROM roles ORDER BY category, display_name').all();

    const grouped = {
      department: roles.filter(r => r.category === 'department'),
      admin: roles.filter(r => r.category === 'admin')
    };

    res.json({ roles, grouped });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
};

/**
 * Delete user (admin_global or super_admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Nu te poți șterge pe tine însuți' });
    }

    const userRoles = await db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `).all(id);

    const isProtectedAdmin = userRoles.some(r =>
      r.name === 'super_admin' || r.name === 'admin_global'
    );

    if (isProtectedAdmin) {
      return res.status(400).json({ error: 'Nu poți șterge un administrator global' });
    }

    await db.prepare('DELETE FROM user_roles WHERE user_id = $1').run(id);

    try { await db.prepare('DELETE FROM monthly_availability WHERE user_id = $1').run(id); } catch (e) { /* table may not exist */ }
    try { await db.prepare('DELETE FROM assignments WHERE user_id = $1').run(id); } catch (e) { /* table may not exist */ }
    try { await db.prepare('DELETE FROM notifications WHERE user_id = $1').run(id); } catch (e) { /* table may not exist */ }
    try { await db.prepare('DELETE FROM availability_votes WHERE user_id = $1').run(id); } catch (e) { /* table may not exist */ }

    await db.prepare('DELETE FROM users WHERE id = $1').run(id);

    res.json({ message: 'Utilizatorul a fost șters cu succes' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Eroare la ștergerea utilizatorului' });
  }
};
