/**
 * Public Contracts Controller
 * Handles public contract signing (no authentication required)
 */

const { getDatabase } = require('../config/database');
const { renderContract, computeFieldGroups, expandGroupedFields } = require('../utils/contractParser');
const { generateContractPDF } = require('../utils/pdfGenerator');
const crypto = require('crypto');

/**
 * Get contract by invite token (public)
 */
exports.getContractByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const db = getDatabase();
    
    // Get invite
    const invite = await db.prepare(`
      SELECT * FROM contract_invites WHERE token = $1
    `).get(token);
    
    if (!invite) {
      return res.status(404).json({ error: 'Link invalid sau expirat' });
    }
    
    // Check if disabled
    if (invite.is_disabled) {
      return res.status(403).json({ error: 'Link-ul a fost dezactivat' });
    }
    
    // Check max uses
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return res.status(403).json({ error: 'Link-ul a atins limita de utilizări' });
    }
    
    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Link-ul a expirat' });
    }
    
    // Get template
    const template = await db.prepare(`
      SELECT id, title, raw_text, fields, signature_blocks
      FROM contract_templates WHERE id = $1
    `).get(invite.template_id);
    
    if (!template) {
      return res.status(404).json({ error: 'Șablonul nu a fost găsit' });
    }
    
    // Parse JSON fields if needed
    template.fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    template.signature_blocks = typeof template.signature_blocks === 'string'
      ? JSON.parse(template.signature_blocks)
      : template.signature_blocks;
    
    // Compute field groups for the signing page
    const fieldGroups = computeFieldGroups(template.fields);

    res.json({
      template,
      invite: {
        id: invite.id,
        code: invite.code,
        expires_at: invite.expires_at,
        remaining_uses: invite.max_uses ? invite.max_uses - invite.uses_count : null
      },
      fieldGroups
    });
  } catch (error) {
    console.error('Error getting contract:', error);
    res.status(500).json({ error: 'Eroare la încărcarea contractului' });
  }
};

/**
 * Lookup signer by code for auto-complete
 */
exports.lookupSigner = async (req, res) => {
  try {
    const { token } = req.params;
    const { signer_code } = req.body;
    
    if (!signer_code) {
      return res.status(400).json({ error: 'Codul este necesar' });
    }
    
    const db = getDatabase();
    
    // Verify invite is valid
    const invite = await db.prepare(`
      SELECT id FROM contract_invites WHERE token = $1 AND is_disabled = FALSE
    `).get(token);
    
    if (!invite) {
      return res.status(403).json({ error: 'Link invalid' });
    }
    
    // Find signer
    const signer = await db.prepare(`
      SELECT saved_fields, last_signature
      FROM contract_signers
      WHERE signer_code = $1
    `).get(signer_code.toUpperCase());
    
    if (!signer) {
      return res.status(404).json({ error: 'Codul nu a fost găsit' });
    }
    
    const savedFields = typeof signer.saved_fields === 'string'
      ? JSON.parse(signer.saved_fields)
      : signer.saved_fields;
    
    res.json({
      saved_fields: savedFields,
      has_signature: !!signer.last_signature
    });
  } catch (error) {
    console.error('Error looking up signer:', error);
    res.status(500).json({ error: 'Eroare la căutarea codului' });
  }
};

/**
 * Submit signed contract
 */
exports.submitContract = async (req, res) => {
  try {
    const { token } = req.params;
    const { filled_fields, signature_image, save_for_later = true } = req.body;
    
    if (!filled_fields) {
      return res.status(400).json({ error: 'Câmpurile sunt necesare' });
    }
    
    const db = getDatabase();
    
    // Get invite
    const invite = await db.prepare(`
      SELECT * FROM contract_invites WHERE token = $1
    `).get(token);
    
    if (!invite) {
      return res.status(404).json({ error: 'Link invalid' });
    }
    
    // Validate invite
    if (invite.is_disabled) {
      return res.status(403).json({ error: 'Link-ul a fost dezactivat' });
    }
    
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return res.status(403).json({ error: 'Link-ul a atins limita de utilizări' });
    }
    
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Link-ul a expirat' });
    }
    
    // Get template
    const template = await db.prepare(`
      SELECT * FROM contract_templates WHERE id = $1
    `).get(invite.template_id);
    
    if (!template) {
      return res.status(404).json({ error: 'Șablonul nu a fost găsit' });
    }
    
    // Parse template fields and signature blocks
    template.fields = typeof template.fields === 'string'
      ? JSON.parse(template.fields)
      : template.fields;
    
    template.signature_blocks = typeof template.signature_blocks === 'string'
      ? JSON.parse(template.signature_blocks)
      : (template.signature_blocks || []);
    
    // Expand grouped fields (copy values to all linked fields)
    const expandedFields = expandGroupedFields(template.fields, filled_fields);

    // Render contract with expanded fields
    const rendered_text = renderContract(template, expandedFields);
    
    // Convert signature from base64 to buffer (if provided)
    const signatureBuffer = signature_image 
      ? Buffer.from(signature_image.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : null;
    
    // Handle signer profile
    let signerId = null;
    
    // Extract CNP from various possible field keys
    const cnpValue = expandedFields.cnp || expandedFields.CNP ||
      Object.entries(expandedFields).find(([key]) => key.toLowerCase().includes('cnp'))?.[1];
    
    if (cnpValue && cnpValue.length >= 4) {
      const cnpClean = cnpValue.trim();
      const cnpLast4 = cnpClean.slice(-4);
      
      const identityHash = crypto
        .createHash('sha256')
        .update(cnpClean)
        .digest('hex');
      
      // Check if signer exists
      const existingSigner = await db.prepare(`
        SELECT id FROM contract_signers WHERE identity_key_hash = $1
      `).get(identityHash);
      
      if (existingSigner) {
        signerId = existingSigner.id;
        
        // Update saved fields and cnp_last4
        await db.prepare(`
          UPDATE contract_signers
          SET saved_fields = $1, last_signature = $2, cnp_last4 = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `).run(JSON.stringify(expandedFields), signatureBuffer, cnpLast4, signerId);
      } else {
        // Create new signer with cnp_last4
        const signerCode = generateShortCode(12);
        const signerSecret = crypto.randomBytes(32).toString('hex');
        
        const result = await db.prepare(`
          INSERT INTO contract_signers (identity_key_hash, signer_code, signer_secret, saved_fields, last_signature, cnp_last4)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `).get(identityHash, signerCode, signerSecret, JSON.stringify(expandedFields), signatureBuffer, cnpLast4);
        
        signerId = result.id;
      }
    }
    
    // Get client info
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Create submission first
    const submissionResult = await db.prepare(`
      INSERT INTO contract_submissions 
        (template_id, invite_id, signer_id, filled_fields, rendered_text, signature_image, status, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, 'SIGNED', $7, $8)
      RETURNING id
    `).get(
      template.id,
      invite.id,
      signerId,
      JSON.stringify(expandedFields),
      rendered_text,
      signatureBuffer,
      ipAddress,
      userAgent
    );
    
    // Generate contract number if template has a prefix configured
    let contractNumber = null;
    if (template.number_prefix) {
      const lastSubmission = await db.prepare(`
        SELECT contract_number FROM contract_submissions
        WHERE template_id = $1 AND contract_number IS NOT NULL
        ORDER BY id DESC LIMIT 1
      `).get(template.id);

      let nextNum = template.number_start || 1;
      if (lastSubmission?.contract_number) {
        const lastNum = parseInt(lastSubmission.contract_number.split('-').pop());
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      contractNumber = `${template.number_prefix}-${String(nextNum).padStart(3, '0')}`;

      await db.prepare(`
        UPDATE contract_submissions SET contract_number = $1 WHERE id = $2
      `).run(contractNumber, submissionResult.id);
    }

    // Generate PDF asynchronously (don't block the response)
    generateContractPDF({
      title: template.title,
      renderedText: rendered_text,
      signatureImage: signatureBuffer,
      filledFields: expandedFields,
      signatureBlocks: template.signature_blocks,
      contractNumber: contractNumber
    }).then(async (pdfBuffer) => {
      // Update submission with PDF
      await db.prepare(`
        UPDATE contract_submissions
        SET pdf_data = $1
        WHERE id = $2
      `).run(pdfBuffer, submissionResult.id);

      console.log(`✅ PDF generated for submission #${submissionResult.id}`);
    }).catch(err => {
      console.error(`❌ Failed to generate PDF for submission #${submissionResult.id}:`, err);
    });

    // Increment invite uses
    await db.prepare(`
      UPDATE contract_invites
      SET uses_count = uses_count + 1
      WHERE id = $1
    `).run(invite.id);

    // Get signer code for response (if saved)
    let signerCode = null;
    if (signerId) {
      const signer = await db.prepare(`
        SELECT signer_code FROM contract_signers WHERE id = $1
      `).get(signerId);
      signerCode = signer?.signer_code;
    }

    res.status(201).json({
      submission_id: submissionResult.id,
      signer_code: signerCode,
      contract_number: contractNumber,
      message: 'Contractul a fost semnat cu succes!'
    });
  } catch (error) {
    console.error('Error submitting contract:', error);
    res.status(500).json({ error: 'Eroare la trimiterea contractului' });
  }
};

/**
 * Lookup signer by last 4 digits of CNP for autocomplete
 */
exports.lookupByPartialCNP = async (req, res) => {
  try {
    const { token } = req.params;
    const { cnp_last4 } = req.body;
    
    // Validate input
    if (!cnp_last4 || cnp_last4.length !== 4 || !/^\d{4}$/.test(cnp_last4)) {
      return res.status(400).json({ error: 'Introduceti ultimele 4 cifre din CNP' });
    }
    
    const db = getDatabase();
    
    // Verify invite is valid (optional security check)
    const invite = await db.prepare(`
      SELECT id FROM contract_invites WHERE token = $1 AND is_disabled = FALSE
    `).get(token);
    
    if (!invite) {
      return res.status(403).json({ error: 'Link invalid' });
    }
    
    // Find signers with matching cnp_last4
    const signers = await db.prepare(`
      SELECT id, saved_fields
      FROM contract_signers
      WHERE cnp_last4 = $1
    `).all(cnp_last4);
    
    if (!signers || signers.length === 0) {
      return res.status(404).json({ error: 'Nu am găsit date salvate pentru aceste cifre' });
    }
    
    // If multiple matches, don't return data (security)
    if (signers.length > 1) {
      return res.status(409).json({ 
        error: 'Mai multe persoane au acelasi final de CNP. Completează manual datele.',
        multiple: true
      });
    }
    
    // Single match - return saved fields
    const signer = signers[0];
    const savedFields = typeof signer.saved_fields === 'string'
      ? JSON.parse(signer.saved_fields)
      : signer.saved_fields;
    
    // Don't return sensitive data like full CNP
    const safeFields = { ...savedFields };
    
    res.json({
      saved_fields: safeFields,
      message: 'Date găsite! Verifică și completează ce lipsește.'
    });
  } catch (error) {
    console.error('Error looking up by partial CNP:', error);
    res.status(500).json({ error: 'Eroare la căutare' });
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
