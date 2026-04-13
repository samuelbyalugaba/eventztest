
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('Inspecting tickets table...');
  
  // Try to insert a dummy row to see errors, or select to see columns
  // Select is better.
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting from tickets:', error);
  } else {
    console.log('Tickets data (first row):', data);
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, cannot infer columns from data.');
      // Try to insert an empty object to get a schema error?
      // Or we can assume common columns.
    }
  }
}

inspectSchema();
