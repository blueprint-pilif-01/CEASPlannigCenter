const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

/**
 * Security: Validate password strength
 */
function validatePasswordStrength(password) {
  // Minimum 12 characters
  if (password.length < 12) {
    return {
      isValid: false,
      error: 'Parola trebuie să aibă minim 12 caractere'
    };
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Parola trebuie să conțină cel puțin o literă mare'
    };
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Parola trebuie să conțină cel puțin o literă mică'
    };
  }

  // At least one digit
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      error: 'Parola trebuie să conțină cel puțin o cifră'
    };
  }

  // At least one special character
  if (!/[@$!%*?&#^()_\-+=\[\]{}|;:,.<>~`]/.test(password)) {
    return {
      isValid: false,
      error: 'Parola trebuie să conțină cel puțin un caracter special (@$!%*?&#, etc.)'
    };
  }

  // Check against common passwords
  const commonPasswords = [
    'password123', 'admin123', 'qwerty123', 'welcome123',
    'password1234', 'admin1234', '123456789012', 'ceas123',
    'planning123', 'planner123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      error: 'Această parolă este prea comună. Alege o parolă mai puternică.'
    };
  }

  return { isValid: true };
}

/**
 * Login
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = getDatabase();

    // Get user (async PostgreSQL)
    const user = await db.prepare(`
      SELECT id, username, password_hash, full_name, email, phone, is_active, force_password_change
      FROM users
      WHERE username = $1
    `).get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      // Security: Log failed login attempts
      console.warn(`[SECURITY] Failed login attempt for user: ${username} from IP: ${req.ip} at ${new Date().toISOString()}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Security: Log successful login
    console.info(`[SECURITY] Successful login for user: ${username} from IP: ${req.ip} at ${new Date().toISOString()}`);

    // Update last login
    await db.prepare(`UPDATE users SET last_login = NOW() WHERE id = $1`).run(user.id);

    // Get roles
    const roles = await db.prepare(`
      SELECT r.name, r.display_name, r.category
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `).all(user.id);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Check if password change is needed
    const forcePasswordChange = user.force_password_change === true;

    // Remove password from response
    delete user.password_hash;

    res.json({
      token,
      user: {
        ...user,
        roles: roles.map(r => r.name),
        roleDetails: roles
      },
      forcePasswordChange
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current user (me)
 */
exports.me = (req, res) => {
  // req.user already populated by authenticateToken middleware
  res.json({ user: req.user });
};

/**
 * Logout (client-side doar șterge token-ul)
 */
exports.logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    // Security: Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const db = getDatabase();

    // Get current password hash
    const user = await db.prepare(`SELECT password_hash FROM users WHERE id = $1`).get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);
    
    // Update password and timestamp
    await db.prepare(
      `UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW() WHERE id = $2`
    ).run(newHash, req.user.id);

    console.info(`[SECURITY] Password changed for user: ${req.user.username} from IP: ${req.ip} at ${new Date().toISOString()}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * First-time password change (no current password required)
 */
exports.firstTimePasswordChange = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }

    // Security: Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const db = getDatabase();

    // Check if user exists
    const user = await db.prepare(`SELECT id FROM users WHERE id = $1`).get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);
    
    // Update password and timestamp
    await db.prepare(
      `UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW() WHERE id = $2`
    ).run(newHash, req.user.id);

    console.info(`[SECURITY] First-time password changed for user: ${req.user.username} from IP: ${req.ip} at ${new Date().toISOString()}`);

    res.json({ message: 'Password set successfully' });
  } catch (error) {
    console.error('First-time password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
