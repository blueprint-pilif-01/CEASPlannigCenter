const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { transporter, EMAIL_FROM } = require('../utils/emailTransporter');

/**
 * Generate a random temporary password
 */
function generateTempPassword(username) {
  // Create a simple but secure temporary password based on username
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${username}${randomNum}!`;
}

/**
 * Send credentials email to selected users
 */
exports.sendCredentials = async (req, res) => {
  const { userIds } = req.body;

  // Check if user is superadmin
  if (!req.user.roles || !req.user.roles.includes('admin_global')) {
    return res.status(403).json({ error: 'Only superadmin can send credentials' });
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'User IDs required' });
  }

  const db = getDatabase();

  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const users = await db.prepare(`
    SELECT id, username, email, full_name
    FROM users
    WHERE id IN (${placeholders})
  `).all(...userIds);

  if (!users || users.length === 0) {
    return res.status(404).json({ error: 'No users found' });
  }

  const results = {
    success: [],
    failed: []
  };

  for (const user of users) {
    try {
      const tempPassword = generateTempPassword(user.username);
      const hashedPassword = bcrypt.hashSync(tempPassword, 10);
      
      await db.prepare('UPDATE users SET password_hash = $1, force_password_change = true WHERE id = $2')
        .run(hashedPassword, user.id);

      const mailOptions = {
        from: EMAIL_FROM,
        to: user.email,
        replyTo: process.env.EMAIL_USER,
        subject: 'CEAS Planning Center - Credentiale acces',
        text: `
Bună ${user.full_name || user.username},

Contul tău pentru Planning Center a fost creat/actualizat.

Credențiale de autentificare:
Username: ${user.username}
Parolă: ${tempPassword}
Email: ${user.email}
Link: ${process.env.FRONTEND_URL || 'http://localhost:5174'}/planner/login

IMPORTANT: La prima autentificare, vei fi rugat să îți schimbi parola.
Parola de mai sus este temporară și trebuie schimbată la prima autentificare.

Dacă ai nevoie de ajutor, contactează administratorul.

---
Acest email a fost trimis automat de CEAS Planning Center
        `,
        html: `
          <!DOCTYPE html>
          <html lang="ro">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Credențiale Planning Center</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">CEAS Planning Center</h1>
                        <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">Sistem de planificare</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Bună <strong>${user.full_name || user.username}</strong>,</p>
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.6;">Contul tău pentru Planning Center a fost creat/actualizat. Folosește credențialele de mai jos pentru a te autentifica.</p>

                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; border-radius: 8px; margin: 20px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong style="color: #333;">Username:</strong> ${user.username}</p>
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong style="color: #333;">Parolă:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #333;">${tempPassword}</code></p>
                              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong style="color: #333;">Email:</strong> ${user.email}</p>
                            </td>
                          </tr>
                        </table>

                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                          <tr>
                            <td align="center">
                              <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/planner/login" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Autentifică-te Acum</a>
                            </td>
                          </tr>
                        </table>

                        <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0 0 10px 0; font-size: 14px; color: #e65100;"><strong>⚠️ Important:</strong></p>
                          <p style="margin: 0; font-size: 13px; color: #f57c00; line-height: 1.5;">Parola de mai sus este temporară. La prima autentificare, vei fi rugat să o schimbi cu o parolă personală și sigură.</p>
                        </div>

                        <p style="margin: 20px 0 0 0; font-size: 13px; color: #999; line-height: 1.5;">Dacă ai nevoie de ajutor sau nu ai solicitat acest email, te rugăm să contactezi administratorul.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #999;">Acest email a fost trimis automat de CEAS Planning Center</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">CEAS © ${new Date().getFullYear()}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      results.success.push({ userId: user.id, email: user.email, tempPassword: tempPassword });
      console.info(`[EMAIL] Credentials sent to ${user.email} with temp password at ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[EMAIL] Failed to send to ${user.email}:`, error.message);
      results.failed.push({ userId: user.id, email: user.email, error: error.message });
    }
  }

  res.json({
    message: `Emails sent: ${results.success.length} success, ${results.failed.length} failed`,
    results
  });
};

/**
 * Get all users for selection (superadmin only)
 */
exports.getUsersForEmail = async (req, res) => {
  if (!req.user.roles || !req.user.roles.includes('admin_global')) {
    return res.status(403).json({ error: 'Only superadmin can access this' });
  }

  try {
    const db = getDatabase();
    
    const users = await db.prepare(`
      SELECT id, username, full_name, email, is_active
      FROM users
      ORDER BY username
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('Error getting users for email:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * Send reminder email to vote for availability
 */
exports.sendVoteReminder = async (req, res) => {
  const { userIds } = req.body;

  // Check if user is superadmin
  if (!req.user.roles || !req.user.roles.includes('admin_global')) {
    return res.status(403).json({ error: 'Only superadmin can send reminders' });
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'User IDs required' });
  }

  const db = getDatabase();

  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const users = await db.prepare(`
    SELECT id, username, email, full_name
    FROM users
    WHERE id IN (${placeholders})
  `).all(...userIds);

  if (!users || users.length === 0) {
    return res.status(404).json({ error: 'No users found' });
  }

  // Get current month info
  const now = new Date();
  const monthName = now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  const results = {
    success: [],
    failed: []
  };

  for (const user of users) {
    try {
      const mailOptions = {
        from: EMAIL_FROM,
        to: user.email,
        subject: `📅 Reminder: Votează disponibilitatea pentru ${monthName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF8C42;">CEAS Planning Center</h2>
            <p>Bună <strong>${user.full_name || user.username}</strong>,</p>
            <p>Acesta este un reminder să îți marchezi disponibilitatea pentru <strong>${monthName}</strong>.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>📅 Luna:</strong> ${monthName}</p>
              <p style="margin: 5px 0;"><strong>📍 Zile relevante:</strong> Duminici (10:00) și Luni (19:00)</p>
            </div>

            <p><strong>De ce este important?</strong></p>
            <ul style="line-height: 1.8;">
              <li>Adminii planifică serviciile în funcție de disponibilitatea ta</li>
              <li>Votând la timp, evitați suprapunerile și conflictele</li>
              <li>Durează doar 2 minute să marchezi zilele când ești disponibil</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/planner/vote" 
                 style="display: inline-block; padding: 14px 32px; background: #4CAF50; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📅 Votează Acum
              </a>
            </p>
            
            <p>Mulțumim pentru răspuns prompt!</p>
            
            <br>
            <p style="color: #666; font-size: 12px;">
              Acest email a fost trimis automat de CEAS Planning Center
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      results.success.push({ userId: user.id, email: user.email });
      console.info(`[EMAIL] Reminder sent to ${user.email} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[EMAIL] Failed to send reminder to ${user.email}:`, error.message);
      results.failed.push({ userId: user.id, email: user.email, error: error.message });
    }
  }

  res.json({
    message: `Reminders sent: ${results.success.length} success, ${results.failed.length} failed`,
    results
  });
};

