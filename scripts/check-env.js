const dotenv = require('dotenv');

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const errors = [];

if (!url) errors.push('Missing VITE_SUPABASE_URL');
if (!key) errors.push('Missing VITE_SUPABASE_KEY (or VITE_SUPABASE_ANON_KEY)');
if (url === 'https://placeholder.supabase.co') errors.push('VITE_SUPABASE_URL is still set to placeholder');

if (errors.length) {
  console.error('\nBuild blocked: Supabase configuration is missing.\n');
  for (const e of errors) console.error(`- ${e}`);
  console.error('\nFix: add these to your .env (project root) before running build.\n');
  process.exit(1);
}
