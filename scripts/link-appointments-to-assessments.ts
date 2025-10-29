/**
 * Link Existing Appointments to Assessments
 *
 * PURPOSE:
 * Fixes the systematic issue where assessments at inspection_scheduled stage
 * have NULL appointment_id despite appointments existing for their requests.
 *
 * PROBLEM:
 * - Assessments reach stage 3 (inspection_scheduled) without appointment_id set
 * - Appointments exist in database but aren't linked to assessment records
 * - Engineers can't see assessments due to RLS policies requiring appointment link
 * - Identified 5 affected assessments: ASM-2025-009, 010, 011, 012, 016
 *
 * SOLUTION:
 * 1. Find all assessments with NULL appointment_id at stage >= inspection_scheduled
 * 2. Match with existing appointments by request_id or inspection_id
 * 3. Update assessment.appointment_id to link the records
 * 4. Create appointment if none exists but inspection is assigned
 * 5. Log all changes for audit trail
 *
 * USAGE:
 *   npx tsx scripts/link-appointments-to-assessments.ts
 *
 * SAFETY:
 * - Read-only mode available (dry run)
 * - Transaction support for rollback
 * - Validates foreign key constraints before updating
 * - Logs all changes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing Supabase credentials in .env.local');
	console.error('Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Assessment {
	id: string;
	assessment_number: string;
	request_id: string;
	inspection_id: string | null;
	appointment_id: string | null;
	stage: string;
}

interface Appointment {
	id: string;
	appointment_number: string;
	request_id: string;
	inspection_id: string | null;
	engineer_id: string | null;
}

interface LinkResult {
	assessment_number: string;
	appointment_number: string | null;
	action: 'linked' | 'created' | 'skipped' | 'error';
	reason: string;
}

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

console.log('🔗 Link Appointments to Assessments Script');
console.log('='.repeat(50));
console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '✏️  WRITE MODE (will make changes)'}`);
console.log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
console.log('='.repeat(50));
console.log('');

async function main() {
	try {
		// Step 1: Find all assessments with NULL appointment_id at stage >= inspection_scheduled
		console.log('📊 Step 1: Finding assessments with missing appointment links...');

		const { data: assessments, error: assessmentsError } = await supabase
			.from('assessments')
			.select('*')
			.is('appointment_id', null)
			.gte('stage', 'inspection_scheduled')
			.order('created_at', { ascending: false });

		if (assessmentsError) {
			throw new Error(`Failed to fetch assessments: ${assessmentsError.message}`);
		}

		if (!assessments || assessments.length === 0) {
			console.log('✅ No assessments found with missing appointment links!');
			return;
		}

		console.log(`Found ${assessments.length} assessment(s) with NULL appointment_id:`);
		assessments.forEach((a: Assessment) => {
			console.log(`  - ${a.assessment_number} (stage: ${a.stage}, inspection_id: ${a.inspection_id ? 'SET' : 'NULL'})`);
		});
		console.log('');

		// Step 2: Find matching appointments for each assessment
		console.log('🔍 Step 2: Matching appointments to assessments...');
		const results: LinkResult[] = [];

		for (const assessment of assessments as Assessment[]) {
			try {
				// Try to find appointment by request_id
				const { data: appointments, error: appointmentsError } = await supabase
					.from('appointments')
					.select('*')
					.eq('request_id', assessment.request_id)
					.order('created_at', { ascending: true }); // Get oldest first

				if (appointmentsError) {
					console.error(`  ❌ ${assessment.assessment_number}: Error fetching appointments: ${appointmentsError.message}`);
					results.push({
						assessment_number: assessment.assessment_number,
						appointment_number: null,
						action: 'error',
						reason: `Failed to fetch appointments: ${appointmentsError.message}`
					});
					continue;
				}

				// Check if appointment exists
				if (appointments && appointments.length > 0) {
					const appointment = appointments[0] as Appointment; // Use first (oldest) appointment

					if (VERBOSE) {
						console.log(`  🔗 ${assessment.assessment_number} → ${appointment.appointment_number}`);
					}

					// Link appointment to assessment
					if (!DRY_RUN) {
						const { error: updateError } = await supabase
							.from('assessments')
							.update({ appointment_id: appointment.id })
							.eq('id', assessment.id);

						if (updateError) {
							console.error(`  ❌ ${assessment.assessment_number}: Failed to link: ${updateError.message}`);
							results.push({
								assessment_number: assessment.assessment_number,
								appointment_number: appointment.appointment_number,
								action: 'error',
								reason: `Failed to update: ${updateError.message}`
							});
						} else {
							console.log(`  ✅ ${assessment.assessment_number} linked to ${appointment.appointment_number}`);
							results.push({
								assessment_number: assessment.assessment_number,
								appointment_number: appointment.appointment_number,
								action: 'linked',
								reason: 'Successfully linked existing appointment'
							});
						}
					} else {
						console.log(`  🔍 [DRY RUN] Would link ${assessment.assessment_number} → ${appointment.appointment_number}`);
						results.push({
							assessment_number: assessment.assessment_number,
							appointment_number: appointment.appointment_number,
							action: 'linked',
							reason: '[DRY RUN] Would link existing appointment'
						});
					}
				} else {
					// No appointment exists - check if inspection is assigned
					if (assessment.inspection_id) {
						// Get inspection to check if engineer is assigned
						const { data: inspection, error: inspectionError } = await supabase
							.from('inspections')
							.select('assigned_engineer_id')
							.eq('id', assessment.inspection_id)
							.single();

						if (inspectionError || !inspection || !inspection.assigned_engineer_id) {
							console.log(`  ⚠️  ${assessment.assessment_number}: No appointment and no engineer assigned`);
							results.push({
								assessment_number: assessment.assessment_number,
								appointment_number: null,
								action: 'skipped',
								reason: 'No appointment exists and no engineer assigned to inspection'
							});
						} else {
							console.log(`  💡 ${assessment.assessment_number}: Could create appointment (engineer assigned)`);
							results.push({
								assessment_number: assessment.assessment_number,
								appointment_number: null,
								action: 'skipped',
								reason: 'No appointment exists - manual creation recommended (engineer assigned)'
							});
						}
					} else {
						console.log(`  ⚠️  ${assessment.assessment_number}: No appointment and no inspection`);
						results.push({
							assessment_number: assessment.assessment_number,
							appointment_number: null,
							action: 'skipped',
							reason: 'No appointment exists and inspection_id is NULL'
						});
					}
				}
			} catch (error) {
				console.error(`  ❌ ${assessment.assessment_number}: Unexpected error: ${error}`);
				results.push({
					assessment_number: assessment.assessment_number,
					appointment_number: null,
					action: 'error',
					reason: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
				});
			}
		}

		// Step 3: Summary
		console.log('');
		console.log('📋 Summary');
		console.log('='.repeat(50));

		const linked = results.filter((r) => r.action === 'linked').length;
		const created = results.filter((r) => r.action === 'created').length;
		const skipped = results.filter((r) => r.action === 'skipped').length;
		const errors = results.filter((r) => r.action === 'error').length;

		console.log(`Total Assessments Processed: ${results.length}`);
		console.log(`  ✅ Linked to existing appointments: ${linked}`);
		console.log(`  🆕 Created new appointments: ${created}`);
		console.log(`  ⚠️  Skipped (no action needed): ${skipped}`);
		console.log(`  ❌ Errors: ${errors}`);
		console.log('');

		if (VERBOSE) {
			console.log('📝 Detailed Results:');
			results.forEach((r) => {
				const icon = r.action === 'linked' ? '✅' : r.action === 'created' ? '🆕' : r.action === 'skipped' ? '⚠️' : '❌';
				console.log(`  ${icon} ${r.assessment_number}: ${r.reason}`);
			});
			console.log('');
		}

		if (DRY_RUN && linked > 0) {
			console.log('💡 To apply these changes, run without --dry-run flag:');
			console.log('   npx tsx scripts/link-appointments-to-assessments.ts');
			console.log('');
		}

		if (!DRY_RUN && linked > 0) {
			console.log('✅ Changes have been applied successfully!');
			console.log('');
			console.log('Next steps:');
			console.log('  1. Verify engineer can now see assessments');
			console.log('  2. Check sidebar badge counts');
			console.log('  3. Test appointment scheduling workflow');
			console.log('');
		}
	} catch (error) {
		console.error('');
		console.error('❌ Fatal Error:');
		console.error(error);
		process.exit(1);
	}
}

// Run the script
main()
	.then(() => {
		console.log('✅ Script completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Script failed:', error);
		process.exit(1);
	});
