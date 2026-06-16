const cron = require('node-cron');
const { getDatabase } = require('../config/database');
const { transporter, EMAIL_FROM } = require('../utils/emailTransporter');

function startEventReminderCron() {
  // Run every day at 9:00 AM Bucharest time
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running event reminder check...');

    try {
      const db = getDatabase();

      // Find events 2 days from now that are published and require registration
      const events = await db.prepare(`
        SELECT * FROM events
        WHERE date = CURRENT_DATE + INTERVAL '2 days'
        AND status = 'published'
        AND requires_registration = TRUE
      `).all();

      if (events.length === 0) {
        console.log('[CRON] No events found 2 days from now');
        return;
      }

      for (const event of events) {
        // Get registrations that haven't received reminder
        const registrations = await db.prepare(`
          SELECT * FROM event_registrations
          WHERE event_id = $1
          AND status = 'registered'
          AND (reminder_sent = FALSE OR reminder_sent IS NULL)
          AND email IS NOT NULL
          AND email != ''
        `).all(event.id);

        console.log(`[CRON] Event "${event.title}" (${event.date}): ${registrations.length} reminders to send`);

        for (const reg of registrations) {
          try {
            // Check contract status
            const contracts = await db.prepare(`
              SELECT erc.status, ct.title as contract_title
              FROM event_registration_contracts erc
              LEFT JOIN contract_templates ct ON erc.contract_template_id = ct.id
              WHERE erc.registration_id = $1
            `).all(reg.id);

            const pendingContracts = contracts.filter(c => c.status === 'pending');
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const statusUrl = `${baseUrl}/planner/register/${event.id}/status/${reg.token}`;

            // Format date in Romanian
            const dateObj = new Date(event.date);
            const formattedDate = dateObj.toLocaleDateString('ro-RO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            const contractReminder = pendingContracts.length > 0
              ? `<div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-weight: bold; color: #e65100;">Contracte nesemnate:</p>
                  <p style="margin: 0; color: #f57c00;">Ai ${pendingContracts.length} contract(e) care trebuie semnat(e) inainte de eveniment.</p>
                  <p style="margin: 10px 0 0 0;"><a href="${statusUrl}" style="color: #e65100; font-weight: bold;">Verifica si semneaza aici</a></p>
                </div>`
              : '';

            await transporter.sendMail({
              from: EMAIL_FROM,
              to: reg.email,
              subject: `Reminder: ${event.title} - ne vedem in 2 zile!`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #fff; font-size: 22px;">Ne vedem in 2 zile!</h1>
                  </div>
                  <div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
                    <p>Buna <strong>${reg.full_name}</strong>,</p>
                    <p>Iti amintim ca te-ai inscris la:</p>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h2 style="margin: 0 0 12px 0; color: #333;">${event.title}</h2>
                      <p style="margin: 4px 0;">Data: <strong>${formattedDate}</strong></p>
                      ${event.time ? `<p style="margin: 4px 0;">Ora: <strong>${event.time}${event.end_time ? ' - ' + event.end_time : ''}</strong></p>` : ''}
                      ${event.location ? `<p style="margin: 4px 0;">Locatie: <strong>${event.location}</strong></p>` : ''}
                    </div>
                    ${contractReminder}
                    <p style="color: #666; font-size: 13px; margin-top: 30px;">Acest email a fost trimis automat de CEAS Planning Center.</p>
                  </div>
                </div>
              `
            });

            // Mark reminder as sent
            await db.prepare(`UPDATE event_registrations SET reminder_sent = TRUE WHERE id = $1`).run(reg.id);
            console.log(`[CRON] Reminder sent to ${reg.email} for "${event.title}"`);

            // 1s delay between emails to respect cPanel rate limits
            await new Promise(r => setTimeout(r, 1000));
          } catch (emailErr) {
            console.error(`[CRON] Failed to send to ${reg.email}:`, emailErr.message);
          }
        }
      }

      console.log('[CRON] Event reminder check completed');
    } catch (error) {
      console.error('[CRON] Event reminder error:', error);
    }
  }, {
    timezone: 'Europe/Bucharest'
  });

  console.log('Cron: Event reminders scheduled (daily at 9:00 AM Bucharest time)');
}

module.exports = { startEventReminderCron };
