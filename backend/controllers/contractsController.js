/**
 * Contracts Controller
 * Handles contract templates, invites, submissions, and signers management
 */

const { getDatabase } = require('../config/database');
const { parseContractText } = require('../utils/contractParser');
const crypto = require('crypto');

// ============================================
// TEMPLATES
// ============================================

/**
 * Get all templates
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const db = getDatabase();
    
    const templates = await db.prepare(`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM contract_invites WHERE template_id = t.id) as invites_count,
        (SELECT COUNT(*) FROM contract_submissions WHERE template_id = t.id) as submissions_count
      FROM contract_templates t
      ORDER BY t.updated_at DESC
    `).all();
    
    res.json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
};

/**
 * Get template by ID
 */
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const template = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
};

/**
 * Create template
 */
exports.createTemplate = async (req, res) => {
  try {
    const { title, raw_text, fields, signature_blocks, nickname, number_prefix, number_start } = req.body;

    if (!title || !raw_text) {
      return res.status(400).json({ error: 'Title and raw_text are required' });
    }

    const db = getDatabase();

    // If fields not provided, parse them from text
    let parsedFields = fields;
    let parsedSignatures = signature_blocks;

    if (!fields || !signature_blocks) {
      const parsed = parseContractText(raw_text);
      parsedFields = fields || parsed.fields;
      parsedSignatures = signature_blocks || parsed.signatureBlocks;
    }

    const result = await db.prepare(`
      INSERT INTO contract_templates (title, raw_text, fields, signature_blocks, nickname, number_prefix, number_start)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `).get(title, raw_text, JSON.stringify(parsedFields), JSON.stringify(parsedSignatures), nickname || null, number_prefix || null, number_start || 1);
    
    const template = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(result.id);
    
    res.status(201).json({ template, message: 'Template created successfully' });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

/**
 * Update template
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, raw_text, fields, signature_blocks, nickname, number_prefix, number_start } = req.body;

    const db = getDatabase();

    const existing = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await db.prepare(`
      UPDATE contract_templates
      SET title = COALESCE($1, title),
          raw_text = COALESCE($2, raw_text),
          fields = COALESCE($3, fields),
          signature_blocks = COALESCE($4, signature_blocks),
          nickname = $5,
          number_prefix = $6,
          number_start = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `).run(
      title || null,
      raw_text || null,
      fields ? JSON.stringify(fields) : null,
      signature_blocks ? JSON.stringify(signature_blocks) : null,
      nickname !== undefined ? nickname : existing.nickname,
      number_prefix !== undefined ? (number_prefix || null) : existing.number_prefix,
      number_start !== undefined ? (number_start || 1) : existing.number_start,
      id
    );
    
    const template = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(id);
    
    res.json({ template, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
};

/**
 * Delete template
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    // Check if template has submissions
    const submissions = await db.prepare(`
      SELECT COUNT(*) as count FROM contract_submissions WHERE template_id = $1
    `).get(id);
    
    const submissionCount = parseInt(submissions?.count || 0);
    
    if (submissionCount > 0) {
      // Ask for confirmation - for now, we'll delete everything
      // In production, you might want to archive instead
      
      // Delete submissions first
      await db.prepare(`DELETE FROM contract_submissions WHERE template_id = $1`).run(id);
    }
    
    // Delete invites
    await db.prepare(`DELETE FROM contract_invites WHERE template_id = $1`).run(id);
    
    // Delete template
    await db.prepare(`DELETE FROM contract_templates WHERE id = $1`).run(id);
    
    res.json({ 
      message: 'Template deleted successfully',
      deletedSubmissions: submissionCount
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

/**
 * Duplicate template
 */
exports.duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const original = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(id);

    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const fieldsJson =
      typeof original.fields === 'string'
        ? original.fields
        : JSON.stringify(original.fields || []);
    const signatureJson =
      typeof original.signature_blocks === 'string'
        ? original.signature_blocks
        : JSON.stringify(original.signature_blocks || []);

    const result = await db.prepare(`
      INSERT INTO contract_templates (title, raw_text, fields, signature_blocks, nickname)
      VALUES ($1, $2, $3::json, $4::json, $5)
      RETURNING id
    `).get(
      `Copie - ${original.title}`,
      original.raw_text,
      fieldsJson,
      signatureJson,
      original.nickname || null
    );

    const template = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(result.id);

    res.status(201).json({ template, message: 'Template duplicated successfully' });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
};

/**
 * Parse fields from text
 */
exports.parseFields = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const { fields, signatureBlocks } = parseContractText(text);
    
    res.json({ fields, signatureBlocks });
  } catch (error) {
    console.error('Error parsing fields:', error);
    res.status(500).json({ error: 'Failed to parse fields' });
  }
};

// ============================================
// INVITES
// ============================================

/**
 * Generate invite for template
 */
exports.createInvite = async (req, res) => {
  try {
    const { id: templateId } = req.params;
    const { max_uses = null, expires_at } = req.body; // null = unlimited
    
    const db = getDatabase();
    
    // Verify template exists
    const template = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Generate unique token and code
    const token = crypto.randomBytes(32).toString('hex');
    const code = generateShortCode(8);
    
    const result = await db.prepare(`
      INSERT INTO contract_invites (template_id, token, code, max_uses, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `).get(templateId, token, code, max_uses, expires_at || null);
    
    const invite = await db.prepare(`
      SELECT * FROM contract_invites WHERE id = $1
    `).get(result.id);
    
    // Build public URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const publicUrl = `${baseUrl}/planner/sign/${token}`;
    
    res.status(201).json({ 
      invite,
      publicUrl,
      code,
      message: 'Invite created successfully' 
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
};

/**
 * Get invites for template
 */
exports.getTemplateInvites = async (req, res) => {
  try {
    const { id: templateId } = req.params;
    const db = getDatabase();
    
    const invites = await db.prepare(`
      SELECT * FROM contract_invites
      WHERE template_id = $1
      ORDER BY created_at DESC
    `).all(templateId);
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitesWithUrls = invites.map(invite => ({
      ...invite,
      publicUrl: `${baseUrl}/planner/sign/${invite.token}`
    }));
    
    res.json({ invites: invitesWithUrls });
  } catch (error) {
    console.error('Error getting invites:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
};

/**
 * Disable invite
 */
exports.disableInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const db = getDatabase();
    
    await db.prepare(`
      UPDATE contract_invites
      SET is_disabled = TRUE
      WHERE id = $1
    `).run(inviteId);
    
    res.json({ message: 'Invite disabled successfully' });
  } catch (error) {
    console.error('Error disabling invite:', error);
    res.status(500).json({ error: 'Failed to disable invite' });
  }
};

// ============================================
// SUBMISSIONS
// ============================================

/**
 * Get all submissions
 */
exports.getAllSubmissions = async (req, res) => {
  try {
    const { template_id, status, from, to, q } = req.query;
    const db = getDatabase();
    
    let query = `
      SELECT
        s.*,
        t.title as template_title,
        t.nickname as template_nickname,
        i.code as invite_code,
        cs.saved_fields as signer_saved_fields
      FROM contract_submissions s
      LEFT JOIN contract_templates t ON s.template_id = t.id
      LEFT JOIN contract_invites i ON s.invite_id = i.id
      LEFT JOIN contract_signers cs ON s.signer_id = cs.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (template_id) {
      query += ` AND s.template_id = $${paramIndex++}`;
      params.push(template_id);
    }
    
    if (status) {
      query += ` AND s.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (from) {
      query += ` AND s.created_at >= $${paramIndex++}`;
      params.push(from);
    }
    
    if (to) {
      query += ` AND s.created_at <= $${paramIndex++}`;
      params.push(to);
    }
    
    if (q) {
      query += ` AND (s.filled_fields::text ILIKE $${paramIndex++} OR s.rendered_text ILIKE $${paramIndex++})`;
      params.push(`%${q}%`, `%${q}%`);
    }
    
    query += ` ORDER BY s.created_at DESC`;
    
    const submissions = await db.prepare(query).all(...params);
    
    // Mask CNP in response
    const maskedSubmissions = submissions.map(s => {
      const filledFields = typeof s.filled_fields === 'string' 
        ? JSON.parse(s.filled_fields) 
        : s.filled_fields;
      
      // Mask sensitive fields
      if (filledFields.cnp) {
        filledFields.cnp_masked = maskCNP(filledFields.cnp);
      }
      
      return {
        ...s,
        filled_fields: filledFields,
        // Don't include PDF data in list response
        pdf_data: undefined,
        signature_image: undefined
      };
    });
    
    res.json({ submissions: maskedSubmissions });
  } catch (error) {
    console.error('Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
};

/**
 * Update submission (contract_number)
 */
exports.updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { contract_number } = req.body;
    const db = getDatabase();

    const existing = await db.prepare(`SELECT id FROM contract_submissions WHERE id = $1`).get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    await db.prepare(`
      UPDATE contract_submissions SET contract_number = $1 WHERE id = $2
    `).run(contract_number || null, id);

    res.json({ message: 'Updated successfully', contract_number: contract_number || null });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
};

/**
 * Get submission by ID
 */
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const submission = await db.prepare(`
      SELECT 
        s.*,
        t.title as template_title
      FROM contract_submissions s
      LEFT JOIN contract_templates t ON s.template_id = t.id
      WHERE s.id = $1
    `).get(id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({ submission });
  } catch (error) {
    console.error('Error getting submission:', error);
    res.status(500).json({ error: 'Failed to get submission' });
  }
};

/**
 * Download submission PDF
 */
exports.downloadSubmissionPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const submission = await db.prepare(`
      SELECT pdf_data, filled_fields FROM contract_submissions WHERE id = $1
    `).get(id);
    
    if (!submission || !submission.pdf_data) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    const filledFields = typeof submission.filled_fields === 'string'
      ? JSON.parse(submission.filled_fields)
      : submission.filled_fields;
    
    const filename = `contract_${filledFields.nume || 'semnatar'}_${id}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(submission.pdf_data);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
};

/**
 * Download submission signature
 */
exports.downloadSubmissionSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const submission = await db.prepare(`
      SELECT signature_image FROM contract_submissions WHERE id = $1
    `).get(id);
    
    if (!submission || !submission.signature_image) {
      return res.status(404).json({ error: 'Signature not found' });
    }
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="signature_${id}.png"`);
    res.send(submission.signature_image);
  } catch (error) {
    console.error('Error downloading signature:', error);
    res.status(500).json({ error: 'Failed to download signature' });
  }
};

// ============================================
// SIGNERS
// ============================================

/**
 * Get all signers
 */
exports.getAllSigners = async (req, res) => {
  try {
    const { q } = req.query;
    const db = getDatabase();
    
    let query = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM contract_submissions WHERE signer_id = s.id) as submissions_count
      FROM contract_signers s
      WHERE 1=1
    `;
    const params = [];
    
    if (q) {
      query += ` AND (s.saved_fields::text ILIKE $1 OR s.signer_code ILIKE $2)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    
    query += ` ORDER BY s.updated_at DESC`;
    
    const signers = await db.prepare(query).all(...params);
    
    // Mask sensitive data
    const maskedSigners = signers.map(s => {
      const savedFields = typeof s.saved_fields === 'string'
        ? JSON.parse(s.saved_fields)
        : s.saved_fields;
      
      return {
        ...s,
        saved_fields: {
          ...savedFields,
          cnp: savedFields.cnp ? maskCNP(savedFields.cnp) : undefined
        },
        identity_key_hash: undefined,
        signer_secret: undefined,
        last_signature: undefined
      };
    });
    
    res.json({ signers: maskedSigners });
  } catch (error) {
    console.error('Error getting signers:', error);
    res.status(500).json({ error: 'Failed to get signers' });
  }
};

/**
 * Regenerate signer code
 */
exports.regenerateSignerCode = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const newCode = generateShortCode(12);
    
    await db.prepare(`
      UPDATE contract_signers
      SET signer_code = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `).run(newCode, id);
    
    res.json({ signer_code: newCode, message: 'Code regenerated successfully' });
  } catch (error) {
    console.error('Error regenerating code:', error);
    res.status(500).json({ error: 'Failed to regenerate code' });
  }
};

/**
 * Delete signer (GDPR)
 */
exports.deleteSigner = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    // Delete signer data
    await db.prepare(`DELETE FROM contract_signers WHERE id = $1`).run(id);
    
    // Update submissions to remove signer reference
    await db.prepare(`
      UPDATE contract_submissions
      SET signer_id = NULL
      WHERE signer_id = $1
    `).run(id);
    
    res.json({ message: 'Signer data deleted successfully (GDPR compliance)' });
  } catch (error) {
    console.error('Error deleting signer:', error);
    res.status(500).json({ error: 'Failed to delete signer' });
  }
};

// ============================================
// HELPERS
// ============================================

function generateShortCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function maskCNP(cnp) {
  if (!cnp || cnp.length < 6) return cnp;
  return cnp.substring(0, 3) + '*'.repeat(cnp.length - 5) + cnp.substring(cnp.length - 2);
}
