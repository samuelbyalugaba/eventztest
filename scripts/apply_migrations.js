
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    const migrations = [
      '../supabase/migrations/20240214_add_missing_ticket_columns.sql',
      '../supabase/migrations/20240214_update_purchase_ticket_v2.sql'
    ];

    for (const migration of migrations) {
      const filePath = path.join(__dirname, migration);
      console.log(`Applying migration: ${migration}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`Successfully applied: ${migration}`);
    }

    console.log('All migrations applied successfully');
  } catch (err) {
    console.error('Error applying migrations:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
