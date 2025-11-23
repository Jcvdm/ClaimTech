import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateFRCReportHTML } from '$lib/templates/frc-report-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';
import { getClientByRequestId, getRepairerForEstimate } from '$lib/utils/supabase-query-helpers';
import { normalizeEstimate, normalizeCompanySettings, normalizeAssessment } from '$lib/utils/type-normalizers';
import { getBrandLogoBase64 } from '$lib/utils/branding';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const assessmentId = body.assessmentId;
	const requestId = Math.random().toString(36).substring(7);

	console.log(`\n${'='.repeat(80)}`);
	console.log(`[${new Date().toISOString()}] [Request ${requestId}] NEW FRC REPORT GENERATION REQUEST`);
	console.log(`[${new Date().toISOString()}] [Request ${requestId}] Assessment ID: ${assessmentId}`);
	console.log(`${'='.repeat(80)}\n`);

	if (!assessmentId) {
		throw error(400, 'Assessment ID is required');
	}

	return createStreamingResponse(async function* () {
		try {
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generator started`);

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 5%`);
			yield { status: 'processing', progress: 5, message: 'Fetching assessment data...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 5% yielded successfully`);

			// Fetch assessment data
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Fetching assessment from database...`);
			const { data: assessment, error: assessmentError } = await locals.supabase
				.from('assessments')
				.select('*')
				.eq('id', assessmentId)
				.single();

			if (assessmentError || !assessment) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Assessment not found:`, assessmentError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Assessment not found'
				};
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error yielded, returning from generator`);
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Assessment found: ${assessment.assessment_number}`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 15%`);
			yield { status: 'processing', progress: 15, message: 'Loading FRC data...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 15% yielded successfully`);

			// Fetch FRC data
			const { data: frc, error: frcError } = await locals.supabase
				.from('assessment_frc')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single();

			if (frcError || !frc) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] FRC not found:`, frcError);
				yield {
					status: 'error',
					progress: 0,
					error: 'FRC not found for this assessment'
				};
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 25%`);
			yield { status: 'processing', progress: 25, message: 'Loading related data...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 25% yielded successfully`);

			// Fetch related data (excluding client and repairer which have nested dependencies)
			const [
				{ data: vehicleIdentification },
				{ data: estimate },
				{ data: additionals },
				{ data: companySettings }
			] = await Promise.all([
				locals.supabase
					.from('assessment_vehicle_identification')
					.select('*')
					.eq('assessment_id', assessmentId)
					.single(),
				locals.supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
				locals.supabase.from('assessment_additionals').select('*').eq('assessment_id', assessmentId).single(),
				locals.supabase.from('company_settings').select('*').single()
			]);

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 40%`);
			yield { status: 'processing', progress: 40, message: 'Loading repairer and documents...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 40% yielded successfully`);

			// Fetch client and repairer sequentially (they have nested dependencies)
			const { data: client } = await getClientByRequestId(
				assessment.request_id,
				locals.supabase
			);

			const normalizedEstimate = normalizeEstimate(estimate);
			const normalizedCompanySettings = normalizeCompanySettings(companySettings);
			const normalizedAssessment = normalizeAssessment(assessment);

			const { data: repairer } = await getRepairerForEstimate(
				normalizedEstimate,
				locals.supabase
			);

			// Fetch FRC documents
			const { data: frcDocuments } = await locals.supabase
				.from('assessment_frc_documents')
				.select('*')
				.eq('frc_id', frc.id)
				.order('created_at', { ascending: true });

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 50%`);
			yield { status: 'processing', progress: 50, message: 'Generating HTML template...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 50% yielded successfully`);

			// Determine T&Cs to use (client-specific or company defaults)
			// Fallback pattern: client T&Cs → company T&Cs → empty
			const termsAndConditions = (client as any)?.frc_terms_and_conditions || normalizedCompanySettings?.frc_terms_and_conditions || null;

			// Generate HTML
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generating HTML template...`);
			const html = generateFRCReportHTML({
				assessment: (normalizedAssessment || {}) as any,
				frc: (frc || {}) as any,
				vehicleIdentification: (vehicleIdentification || {}) as any,
				estimate: (normalizedEstimate || {}) as any,
				additionals: (additionals || {}) as any,
				repairer: (repairer || {}) as any,
				companySettings: normalizedCompanySettings ? {
					...normalizedCompanySettings,
					frc_terms_and_conditions: termsAndConditions
				} as any : normalizedCompanySettings,
				logoBase64: getBrandLogoBase64(),
				frcDocuments: (frcDocuments || []) as any
			});

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 60%`);
			yield { status: 'processing', progress: 60, message: 'Rendering PDF (this may take 1-2 minutes)...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 60% yielded successfully`);

			// Generate PDF with keep-alive pings to prevent timeout
			let pdfBuffer: Buffer;
			try {
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Starting PDF generation with Puppeteer...`);

				// Start PDF generation
				const pdfPromise = generatePDF(html, {
					format: 'A4',
					margin: {
						top: '15mm',
						right: '15mm',
						bottom: '15mm',
						left: '15mm'
					}
				});

				// Send keep-alive pings every 2 seconds while PDF generates
				let currentProgress = 62;
				const startTime = Date.now();

				// Poll until PDF is complete, sending keep-alive pings
				while (true) {
					const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
					const result = await Promise.race([pdfPromise, timeoutPromise]);

					// If result is a Buffer, PDF is complete
					if (result instanceof Buffer) {
						pdfBuffer = result;
						break;
					}

					// Otherwise, it was a timeout - send keep-alive ping
					currentProgress = Math.min(currentProgress + 2, 80);
					const elapsed = Math.round((Date.now() - startTime) / 1000);
					console.log(`[${new Date().toISOString()}] [Request ${requestId}] Keep-alive ping: ${currentProgress}% (${elapsed}s elapsed)`);
					yield {
						status: 'processing',
						progress: currentProgress,
						message: `Rendering PDF... (${elapsed}s)`
					};
				}

				console.log(`[${new Date().toISOString()}] [Request ${requestId}] PDF generation completed successfully. Size: ${pdfBuffer.length} bytes`);
			} catch (pdfError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] PDF generation error:`, pdfError);
				yield {
					status: 'error',
					progress: 0,
					error: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
				};
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error yielded, returning from generator`);
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 85%`);
			yield { status: 'processing', progress: 85, message: 'Uploading PDF to storage...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 85% yielded successfully`);

			// Delete previous file if it exists to avoid orphaned files
			if (frc.frc_report_url) {
				// Extract path from URL
				const urlParts = frc.frc_report_url.split('/documents/');
				if (urlParts.length > 1) {
					const previousPath = urlParts[1];
					console.log(`[${new Date().toISOString()}] [Request ${requestId}] Deleting previous FRC report: ${previousPath}`);
					const { error: removeError } = await locals.supabase.storage
						.from('documents')
						.remove([previousPath]);

					if (removeError) {
						console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Could not remove previous FRC report:`, removeError);
						// Non-fatal: continue to upload the new file
					} else {
						console.log(`[${new Date().toISOString()}] [Request ${requestId}] Previous FRC report deleted successfully`);
					}
				}
			}

			// Upload to Supabase Storage with timestamp to avoid caching
			const timestamp = new Date().getTime();
			const fileName = `${assessment.assessment_number}_FRC_Report_${timestamp}.pdf`;
			const filePath = `assessments/${assessmentId}/frc/${fileName}`;

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Uploading PDF to Supabase storage: ${filePath}`);
			const { error: uploadError } = await locals.supabase.storage
				.from('documents')
				.upload(filePath, pdfBuffer, {
					contentType: 'application/pdf',
					upsert: true
				});

			if (uploadError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Upload error:`, uploadError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to upload PDF to storage'
				};
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error yielded, returning from generator`);
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] PDF uploaded successfully`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 95%`);
			yield { status: 'processing', progress: 95, message: 'Finalizing...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 95% yielded successfully`);

			// Generate signed URL (1 hour expiry) for immediate download
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generating signed URL for PDF...`);
			const { data: signedUrlData, error: signedUrlError } = await locals.supabase.storage
				.from('documents')
				.createSignedUrl(filePath, 3600);

			if (signedUrlError || !signedUrlData) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Signed URL error:`, signedUrlError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to generate signed URL'
				};
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error yielded, returning from generator`);
				return;
			}

			const signedUrl = signedUrlData.signedUrl;
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Signed URL: ${signedUrl}`);

			// Update FRC record with PDF URL
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Updating FRC record with PDF URL...`);
			const { error: updateError } = await locals.supabase
				.from('assessment_frc')
				.update({
					frc_report_url: signedUrl // Store signed URL for immediate use
				})
				.eq('id', frc.id);

			if (updateError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Update error:`, updateError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to update FRC record'
				};
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error yielded, returning from generator`);
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] FRC record updated successfully`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding FINAL complete status with URL`);
			yield {
				status: 'complete',
				progress: 100,
				message: 'FRC report generated successfully!',
				url: signedUrl
			};
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] ✅ COMPLETE status yielded successfully - generator will now exit`);

		} catch (err) {
			console.error(`\n${'='.repeat(80)}`);
			console.error(`[${new Date().toISOString()}] [Request ${requestId}] ❌ CAUGHT ERROR IN GENERATOR`);
			console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error:`, err);
			if (err instanceof Error) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error message:`, err.message);
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error stack:`, err.stack);
			}
			console.error(`[${new Date().toISOString()}] [Request ${requestId}] Assessment ID: ${assessmentId}`);
			console.error(`${'='.repeat(80)}\n`);

			// Provide more specific error message
			const errorMessage =
				err instanceof Error
					? err.message
					: 'An unknown error occurred while generating the FRC report';

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding error status to client`);
			yield {
				status: 'error',
				progress: 0,
				error: errorMessage
			};
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error status yielded, generator will now exit`);
		}

		console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generator function exiting (end of try-catch)`);
	});
};

