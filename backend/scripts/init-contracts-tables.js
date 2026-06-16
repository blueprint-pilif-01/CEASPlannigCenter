/**
 * Migration Script: Create Contracts Tables
 * Tables: contract_templates, contract_invites, contract_signers, contract_submissions
 * Compatible with older PostgreSQL versions (uses TEXT instead of JSONB)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceas_planning',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createContractsTables() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating contracts tables...\n');

    // 1. Contract Templates
    console.log('📄 Creating contract_templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_templates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        raw_text TEXT NOT NULL,
        fields TEXT DEFAULT '[]',
        signature_blocks TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ contract_templates created');

    // 2. Contract Invites
    console.log('🔗 Creating contract_invites table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_invites (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES contract_templates(id) ON DELETE CASCADE,
        token VARCHAR(64) UNIQUE NOT NULL,
        code VARCHAR(8) UNIQUE NOT NULL,
        expires_at TIMESTAMP,
        max_uses INTEGER DEFAULT NULL,
        uses_count INTEGER DEFAULT 0,
        is_disabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ contract_invites created');

    // 3. Contract Signers (pentru autocompletare)
    console.log('👤 Creating contract_signers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_signers (
        id SERIAL PRIMARY KEY,
        identity_key_hash VARCHAR(64) UNIQUE NOT NULL,
        signer_code VARCHAR(12) UNIQUE NOT NULL,
        signer_secret VARCHAR(64) NOT NULL,
        saved_fields TEXT DEFAULT '{}',
        cnp_last4 VARCHAR(4),
        last_signature BYTEA,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ contract_signers created');

    // 4. Contract Submissions
    console.log('📝 Creating contract_submissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_submissions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES contract_templates(id),
        invite_id INTEGER REFERENCES contract_invites(id),
        signer_id INTEGER REFERENCES contract_signers(id),
        filled_fields TEXT NOT NULL,
        rendered_text TEXT NOT NULL,
        signature_image BYTEA,
        status VARCHAR(20) DEFAULT 'SIGNED',
        pdf_data BYTEA,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ contract_submissions created');

    // Create indexes for better performance (one by one)
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX idx_invites_template ON contract_invites(template_id)',
      'CREATE INDEX idx_invites_token ON contract_invites(token)',
      'CREATE INDEX idx_submissions_template ON contract_submissions(template_id)',
      'CREATE INDEX idx_submissions_invite ON contract_submissions(invite_id)',
      'CREATE INDEX idx_submissions_signer ON contract_submissions(signer_id)',
      'CREATE INDEX idx_signers_code ON contract_signers(signer_code)',
      'CREATE INDEX idx_signers_cnp_last4 ON contract_signers(cnp_last4)'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
      } catch (e) {
        // Index might already exist, ignore
        if (!e.message.includes('already exists')) {
          console.log(`   ⚠️ Index: ${e.message}`);
        }
      }
    }
    console.log('   ✅ Indexes created');

    console.log('\n✅ All contracts tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createContractsTables()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
