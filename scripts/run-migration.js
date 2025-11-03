import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251102_add_terms_and_conditions_to_company_settings.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('Running migration: 20251102_add_terms_and_conditions_to_company_settings.sql');
console.log('SQL:', migrationSQL);

// Execute migration
const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

if (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

console.log('Migration completed successfully!');
console.log('Result:', data);

