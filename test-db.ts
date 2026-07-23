import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTable() {
  const { data, error } = await supabase
    .from('scrape_runs')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error querying scrape_runs:', error.message, error.code);
  } else {
    console.log('Successfully queried scrape_runs table. Data:', data);
  }
}

checkTable();
