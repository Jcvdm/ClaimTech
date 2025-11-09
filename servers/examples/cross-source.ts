/**
 * Example: Cross-Source Analysis
 *
 * Pattern 3 from code_execution_patterns.md
 *
 * This script demonstrates:
 * - Querying data from Supabase
 * - Searching GitHub for related code
 * - Correlating data across sources
 * - Generating insights from multiple systems
 *
 * Usage:
 * ```bash
 * # Once Phase 3 is complete
 * npx tsx servers/examples/cross-source.ts
 * ```
 */

import { executeSQL } from '../supabase/database';
import { searchCode, listPRs, listCommits } from '../github';
import { createIssue } from '../github/issues';

async function analyzeRecentChanges() {
  console.log('=== Cross-Source Analysis: Recent Changes ===\n');

  try {
    // Step 1: Get assessments created in last 7 days
    console.log('1. Fetching recent assessments from database...');
    const recentAssessments = await executeSQL({
      projectId: process.env.SUPABASE_PROJECT_ID!,
      query: `
        SELECT
          stage,
          COUNT(*) as count
        FROM assessments
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY stage
        ORDER BY count DESC
      `,
    });

    console.log(`   ✓ Found assessments in ${recentAssessments.length} stages`);
    console.table(
      recentAssessments.map((a) => ({
        Stage: a.stage,
        Count: a.count,
      }))
    );

    // Step 2: Get recent code changes
    console.log('\n2. Fetching recent code changes from GitHub...');
    const recentCommits = await listCommits({
      owner: 'claimtech',
      repo: 'platform',
      sha: 'dev',
      perPage: 20,
    });

    console.log(`   ✓ Found ${recentCommits.length} recent commits`);

    // Filter for assessment-related commits
    const assessmentCommits = recentCommits.filter(
      (c) =>
        c.message.toLowerCase().includes('assessment') ||
        c.message.toLowerCase().includes('stage') ||
        c.message.toLowerCase().includes('pipeline')
    );

    console.log(`   ✓ ${assessmentCommits.length} assessment-related commits`);

    // Step 3: Get recent PRs
    console.log('\n3. Fetching recent pull requests...');
    const recentPRs = await listPRs({
      owner: 'claimtech',
      repo: 'platform',
      state: 'closed',
      perPage: 10,
    });

    const mergedPRs = recentPRs.filter((pr) => pr.merged_at);
    console.log(`   ✓ ${mergedPRs.length} merged PRs`);

    // Step 4: Search for assessment service usage
    console.log('\n4. Searching for AssessmentService usage in codebase...');
    const serviceUsage = await searchCode({
      query: 'AssessmentService language:typescript repo:claimtech/platform',
      perPage: 10,
    });

    console.log(`   ✓ Found ${serviceUsage.totalCount} files using AssessmentService`);

    // Step 5: Generate insights
    console.log('\n=== Analysis Results ===\n');

    console.log('Database Activity (Last 7 Days):');
    const totalAssessments = recentAssessments.reduce(
      (sum, a) => sum + Number(a.count),
      0
    );
    console.log(`  - Total assessments created: ${totalAssessments}`);
    console.log(`  - Active stages: ${recentAssessments.length}`);

    console.log('\nCode Activity (Last 20 Commits):');
    console.log(`  - Total commits: ${recentCommits.length}`);
    console.log(`  - Assessment-related: ${assessmentCommits.length}`);
    console.log(`  - Recently merged PRs: ${mergedPRs.length}`);

    console.log('\nCodebase Health:');
    console.log(`  - AssessmentService usage: ${serviceUsage.totalCount} files`);

    // Step 6: Check for potential issues
    console.log('\n=== Issue Detection ===\n');

    const issues: string[] = [];

    // Check for stages with unusual counts
    const avgCount =
      recentAssessments.reduce((sum, a) => sum + Number(a.count), 0) /
      recentAssessments.length;
    for (const stage of recentAssessments) {
      if (Number(stage.count) > avgCount * 3) {
        issues.push(
          `High volume in stage '${stage.stage}': ${stage.count} (avg: ${avgCount.toFixed(0)})`
        );
      }
    }

    // Check for assessment changes without code changes
    if (totalAssessments > 100 && assessmentCommits.length === 0) {
      issues.push(
        `High assessment volume (${totalAssessments}) but no recent assessment code changes`
      );
    }

    if (issues.length > 0) {
      console.log('⚠️  Potential Issues Detected:');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    } else {
      console.log('✓ No issues detected');
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    throw error;
  }
}

async function correlateStageChangesWithCode() {
  console.log('=== Cross-Source Analysis: Stage Changes vs Code ===\n');

  try {
    // Step 1: Get stage transition data
    console.log('1. Analyzing stage transitions...');
    const transitions = await executeSQL({
      projectId: process.env.SUPABASE_PROJECT_ID!,
      query: `
        SELECT
          old_value as from_stage,
          new_value as to_stage,
          COUNT(*) as transition_count,
          DATE(created_at) as date
        FROM audit_logs
        WHERE field_name = 'stage'
        AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY old_value, new_value, DATE(created_at)
        ORDER BY transition_count DESC
        LIMIT 10
      `,
    });

    console.log(`   ✓ Found ${transitions.length} transition patterns`);
    console.table(
      transitions.map((t) => ({
        From: t.from_stage,
        To: t.to_stage,
        Count: t.transition_count,
        Date: t.date,
      }))
    );

    // Step 2: Search for stage-related code changes
    console.log('\n2. Searching for stage transition code...');
    const stageCode = await searchCode({
      query: 'updateStage language:typescript repo:claimtech/platform',
      perPage: 5,
    });

    console.log(`   ✓ Found ${stageCode.totalCount} files with updateStage`);

    // Step 3: Generate correlation report
    console.log('\n=== Correlation Report ===\n');
    console.log('Most frequent stage transitions may indicate:');
    console.log('  - Normal workflow patterns');
    console.log('  - Potential bottlenecks if stalled');
    console.log('  - Areas for automation');

    console.log('\nCode implementing stage transitions:');
    for (const result of stageCode.items) {
      console.log(`  - ${result.path}`);
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const analysis = process.argv[2] || 'changes';

  switch (analysis) {
    case 'changes':
      await analyzeRecentChanges();
      break;
    case 'stages':
      await correlateStageChangesWithCode();
      break;
    case 'all':
      await analyzeRecentChanges();
      console.log('\n' + '='.repeat(60) + '\n');
      await correlateStageChangesWithCode();
      break;
    default:
      console.error(`Unknown analysis: ${analysis}`);
      console.log('Usage: npx tsx cross-source.ts [changes|stages|all]');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
