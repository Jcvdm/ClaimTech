/**
 * Example: Data Analysis with MCP Servers
 *
 * Pattern 1 from code_execution_patterns.md
 *
 * This script demonstrates:
 * - Executing complex SQL queries
 * - Analyzing data with aggregations
 * - Cross-referencing multiple tables
 * - Formatting results for reporting
 *
 * Usage:
 * ```bash
 * # Once Phase 3 is complete
 * npx tsx servers/examples/data-analysis.ts
 * ```
 */

import { executeSQL } from '../supabase/database';

async function analyzeAssessmentPipeline() {
  console.log('=== Assessment Pipeline Analysis ===\n');

  // 1. Pipeline stage statistics
  console.log('1. Analyzing pipeline bottlenecks...');
  const stageStats = await executeSQL({
    projectId: process.env.SUPABASE_PROJECT_ID!,
    query: `
      SELECT
        stage,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours,
        MAX(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as max_hours,
        MIN(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as min_hours
      FROM assessments
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY stage
      ORDER BY avg_hours DESC
    `,
  });

  console.log('\nPipeline Bottlenecks (Last 30 Days):');
  console.table(
    stageStats.map((s) => ({
      Stage: s.stage,
      Count: s.count,
      'Avg Hours': Number(s.avg_hours).toFixed(2),
      'Max Hours': Number(s.max_hours).toFixed(2),
      'Min Hours': Number(s.min_hours).toFixed(2),
    }))
  );

  // 2. Engineer workload distribution
  console.log('\n2. Analyzing engineer workload...');
  const engineerWorkload = await executeSQL({
    projectId: process.env.SUPABASE_PROJECT_ID!,
    query: `
      SELECT
        e.name as engineer_name,
        COUNT(*) as total_assessments,
        COUNT(*) FILTER (WHERE a.stage IN ('inspection_scheduled', 'inspection_in_progress')) as active,
        COUNT(*) FILTER (WHERE a.stage = 'completed') as completed,
        AVG(
          CASE
            WHEN a.stage = 'completed'
            THEN EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/3600
          END
        ) as avg_completion_hours
      FROM assessments a
      JOIN engineers e ON a.engineer_id = e.id
      WHERE a.created_at > NOW() - INTERVAL '30 days'
      GROUP BY e.id, e.name
      ORDER BY total_assessments DESC
    `,
  });

  console.log('\nEngineer Workload Distribution:');
  console.table(
    engineerWorkload.map((e) => ({
      Engineer: e.engineer_name,
      Total: e.total_assessments,
      Active: e.active,
      Completed: e.completed,
      'Avg Completion (hrs)': e.avg_completion_hours
        ? Number(e.avg_completion_hours).toFixed(2)
        : 'N/A',
    }))
  );

  // 3. Client assessment volume
  console.log('\n3. Analyzing client volumes...');
  const clientVolumes = await executeSQL({
    projectId: process.env.SUPABASE_PROJECT_ID!,
    query: `
      SELECT
        c.client_name,
        COUNT(*) as total_assessments,
        COUNT(*) FILTER (WHERE a.stage = 'completed') as completed,
        COUNT(*) FILTER (WHERE a.stage IN ('inspection_scheduled', 'inspection_in_progress')) as in_progress,
        ROUND(
          COUNT(*) FILTER (WHERE a.stage = 'completed')::NUMERIC / COUNT(*)::NUMERIC * 100,
          2
        ) as completion_rate
      FROM assessments a
      JOIN claims c ON a.claim_id = c.id
      WHERE a.created_at > NOW() - INTERVAL '30 days'
      GROUP BY c.id, c.client_name
      HAVING COUNT(*) >= 5
      ORDER BY total_assessments DESC
      LIMIT 10
    `,
  });

  console.log('\nTop 10 Clients by Volume (Last 30 Days):');
  console.table(
    clientVolumes.map((c) => ({
      Client: c.client_name,
      Total: c.total_assessments,
      Completed: c.completed,
      'In Progress': c.in_progress,
      'Completion %': `${c.completion_rate}%`,
    }))
  );

  // 4. Daily assessment trends
  console.log('\n4. Analyzing daily trends...');
  const dailyTrends = await executeSQL({
    projectId: process.env.SUPABASE_PROJECT_ID!,
    query: `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE stage = 'completed') as completed_same_day
      FROM assessments
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
  });

  console.log('\nDaily Assessment Trends (Last 14 Days):');
  console.table(
    dailyTrends.map((d) => ({
      Date: d.date,
      Created: d.created,
      'Completed Same Day': d.completed_same_day,
    }))
  );

  console.log('\n=== Analysis Complete ===');
}

// Run analysis
analyzeAssessmentPipeline().catch((error) => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
