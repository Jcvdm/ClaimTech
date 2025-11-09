/**
 * Example: Batch Update Operations
 *
 * Pattern 2 from code_execution_patterns.md
 *
 * This script demonstrates:
 * - Querying data from Supabase
 * - Transforming and processing data
 * - Pushing updates to GitHub
 * - Coordinating multiple MCP operations
 *
 * Usage:
 * ```bash
 * # Once Phase 3 is complete
 * npx tsx servers/examples/batch-update.ts
 * ```
 */

import { executeSQL, generateTypes } from '../supabase/database';
import { pushFiles } from '../github/repo';

async function batchUpdateDatabaseTypes() {
  console.log('=== Batch Update: Database Types ===\n');

  try {
    // Step 1: Generate TypeScript types from database schema
    console.log('1. Generating TypeScript types from database schema...');
    const types = await generateTypes({
      projectId: process.env.SUPABASE_PROJECT_ID!,
    });

    console.log(`   ✓ Generated ${types.split('\n').length} lines of types`);

    // Step 2: Get current database statistics
    console.log('\n2. Gathering database statistics...');
    const tableCount = await executeSQL({
      projectId: process.env.SUPABASE_PROJECT_ID!,
      query: `
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `,
    });

    const columnCount = await executeSQL({
      projectId: process.env.SUPABASE_PROJECT_ID!,
      query: `
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `,
    });

    console.log(`   ✓ ${tableCount[0].count} tables`);
    console.log(`   ✓ ${columnCount[0].count} columns`);

    // Step 3: Generate documentation header
    const timestamp = new Date().toISOString();
    const header = `/**
 * Database Type Definitions
 *
 * Auto-generated from Supabase database schema
 *
 * Generated: ${timestamp}
 * Tables: ${tableCount[0].count}
 * Columns: ${columnCount[0].count}
 *
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * To regenerate, run: npm run generate-types
 */

`;

    const fullContent = header + types;

    // Step 4: Push to GitHub
    console.log('\n3. Pushing updated types to GitHub...');
    await pushFiles({
      owner: 'claimtech',
      repo: 'platform',
      branch: 'dev',
      files: [
        {
          path: 'src/lib/types/database.types.ts',
          content: fullContent,
        },
      ],
      message: `chore: update database types

Auto-generated database types from schema.

- ${tableCount[0].count} tables
- ${columnCount[0].count} columns
- Generated: ${timestamp}

🤖 Generated with MCP Code Execution`,
    });

    console.log('   ✓ Types pushed to GitHub');

    console.log('\n=== Batch Update Complete ===');
    console.log('\nSummary:');
    console.log(`  - Generated types for ${tableCount[0].count} tables`);
    console.log(`  - Committed to dev branch`);
    console.log(`  - Ready for review`);
  } catch (error) {
    console.error('\n❌ Batch update failed:', error);
    throw error;
  }
}

async function batchUpdateMigrationDocs() {
  console.log('=== Batch Update: Migration Documentation ===\n');

  try {
    // Step 1: Get all applied migrations
    console.log('1. Fetching applied migrations...');
    const migrations = await executeSQL({
      projectId: process.env.SUPABASE_PROJECT_ID!,
      query: `
        SELECT
          name,
          executed_at
        FROM supabase_migrations.schema_migrations
        ORDER BY executed_at DESC
      `,
    });

    console.log(`   ✓ Found ${migrations.length} migrations`);

    // Step 2: Generate migration index
    console.log('\n2. Generating migration index...');
    const migrationIndex = `# Database Migrations

**Last Updated**: ${new Date().toISOString()}
**Total Migrations**: ${migrations.length}

## Applied Migrations

${migrations
  .map(
    (m, i) => `${i + 1}. **${m.name}**
   - Executed: ${m.executed_at}`
  )
  .join('\n')}

---

*Auto-generated migration index*
`;

    // Step 3: Push to GitHub
    console.log('\n3. Pushing migration index to GitHub...');
    await pushFiles({
      owner: 'claimtech',
      repo: 'platform',
      branch: 'dev',
      files: [
        {
          path: 'docs/database/migrations.md',
          content: migrationIndex,
        },
      ],
      message: `docs: update migration index

Updated migration index with ${migrations.length} applied migrations.

🤖 Generated with MCP Code Execution`,
    });

    console.log('   ✓ Migration index pushed to GitHub');

    console.log('\n=== Batch Update Complete ===');
  } catch (error) {
    console.error('\n❌ Batch update failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const operation = process.argv[2] || 'types';

  switch (operation) {
    case 'types':
      await batchUpdateDatabaseTypes();
      break;
    case 'migrations':
      await batchUpdateMigrationDocs();
      break;
    case 'all':
      await batchUpdateDatabaseTypes();
      await batchUpdateMigrationDocs();
      break;
    default:
      console.error(`Unknown operation: ${operation}`);
      console.log('Usage: npx tsx batch-update.ts [types|migrations|all]');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Operation failed:', error);
  process.exit(1);
});
