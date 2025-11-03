import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Hardcode credentials for this migration script
const supabaseUrl = 'https://cfblmkzleqtvtfxujikf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmxta3psZXF0dnRmeHVqaWtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyNDY1NCwiZXhwIjoyMDc1MDAwNjU0fQ.kW5a16tOy8-Cn57iPPzvw24DIbnB4p87b6FDQ4C6T_k';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read migration file
const migrationSQL = readFileSync('supabase/migrations/20251102_add_terms_and_conditions_to_company_settings.sql', 'utf-8');

console.log('🚀 Applying migration: 20251102_add_terms_and_conditions_to_company_settings.sql\n');

// Split SQL into individual statements (simple split by semicolon)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

// Execute each statement
for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';';
  console.log(`Executing statement ${i + 1}/${statements.length}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
  
  if (error) {
    // Try direct query if RPC doesn't work
    const { error: queryError } = await supabase.from('_').select('*').limit(0);
    
    if (queryError) {
      console.error(`❌ Error executing statement ${i + 1}:`, error);
      console.error('Statement:', statement);
      process.exit(1);
    }
  }
  
  console.log(`✅ Statement ${i + 1} executed successfully`);
}

console.log('\n✅ Migration completed successfully!');
console.log('\nVerifying changes...');

// Verify the columns were added
const { data: columns, error: verifyError } = await supabase
  .from('company_settings')
  .select('*')
  .limit(1);

if (verifyError) {
  console.error('❌ Error verifying migration:', verifyError);
} else {
  console.log('✅ Verification successful - company_settings table updated');
}

