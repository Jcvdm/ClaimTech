import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateEstimateHTML } from '$lib/templates/estimate-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';
import { getClientByRequestId, getRepairerForEstimate } from '$lib/utils/supabase-query-helpers';
import { normalizeEstimate, normalizeCompanySettings, normalizeAssessment } from '$lib/utils/type-normalizers';
import { getVehicleDetails, getClientDetails, getInsuredDetails } from '$lib/utils/report-data-helpers';
import { getBrandLogoBase64 } from '$lib/utils/branding';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const assessmentId = body.assessmentId;
	const requestId = Math.random().toString(36).substring(7);

	console.log(`\n${'='.repeat(80)}`);
	console.log(`[${new Date().toISOString()}] [Request ${requestId}] NEW ESTIMATE GENERATION REQUEST`);
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
			yield { status: 'processing', progress: 15, message: 'Loading estimate data...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 15% yielded successfully`);

			// Fetch related data (Step 1: fetch everything except client and repairer)
		const [
			{ data: vehicleIdentification, error: vehicleError },
			{ data: estimate, error: estimateError },
			{ data: companySettings, error: settingsError },
			{ data: requestData, error: requestError },
			{ data: inspection, error: inspectionError }
		] = await Promise.all([
			locals.supabase
				.from('assessment_vehicle_identification')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			locals.supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
			locals.supabase.from('company_settings').select('*').single(),
			locals.supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
			assessment.inspection_id ? locals.supabase.from('inspections').select('*').eq('id', assessment.inspection_id).single() : Promise.resolve({ data: null, error: null })
		]);

		// Check for errors
		if (estimateError) {
			console.error('Estimate fetch error:', estimateError);
		}

		console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 35%`);
		yield { status: 'processing', progress: 35, message: 'Loading repairer and line items...' };
		console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 35% yielded successfully`);

		// Step 2: Fetch client and repairer sequentially (now that we have assessment data)
		const { data: client, error: clientError } = await getClientByRequestId(
			assessment.request_id,
			locals.supabase
		);

		const normalizedEstimate = normalizeEstimate(estimate);
		const normalizedCompanySettings = normalizeCompanySettings(companySettings);
		const normalizedAssessment = normalizeAssessment(assessment);

		const { data: repairer, error: repairerError } = await getRepairerForEstimate(
			normalizedEstimate,
			locals.supabase
		);

		// Fetch engineer/assessor info if inspection exists with assigned_engineer_id
		let engineer = null;
		if (inspection?.assigned_engineer_id) {
			const { data: engineerData } = await locals.supabase
				.from('engineers')
				.select('id, name, email, phone, company_name, specialization')
				.eq('id', inspection.assigned_engineer_id)
				.single();
			engineer = engineerData;
		}

			// Line items are stored in the estimate JSONB column
			const lineItems = (normalizedEstimate?.line_items as any[]) || [];

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 45%`);
			yield { status: 'processing', progress: 45, message: 'Generating HTML template...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 45% yielded successfully`);

			// Determine T&Cs to use (client-specific or company defaults)
			// Fallback pattern: client T&Cs → company T&Cs → empty
			const termsAndConditions = (client as any)?.estimate_terms_and_conditions || normalizedCompanySettings?.estimate_terms_and_conditions || null;

			// Prepare vehicle, client, and insured details
			const vehicleDetails = getVehicleDetails(vehicleIdentification as any, requestData as any, inspection as any);
			const clientDetails = getClientDetails(client as any);
			const insuredDetails = getInsuredDetails(requestData as any);

			// Generate HTML
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generating HTML template...`);
			const html = generateEstimateHTML({
				assessment: (normalizedAssessment || {}) as any,
				vehicleIdentification: (vehicleIdentification || {}) as any,
				estimate: (normalizedEstimate || {}) as any,
				lineItems,
				companySettings: normalizedCompanySettings ? {
					...normalizedCompanySettings,
					estimate_terms_and_conditions: termsAndConditions
				} as any : normalizedCompanySettings,
				request: (requestData || {}) as any,
				client: (client || {}) as any,
				repairer: (repairer || {}) as any,
				engineer: engineer || {},
				logoBase64: getBrandLogoBase64(),
				vehicleDetails,
				clientDetails,
				insuredDetails,
				excessAmount: (requestData as any)?.excess_amount
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
			if (assessment.estimate_pdf_path) {
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Deleting previous estimate PDF: ${assessment.estimate_pdf_path}`);
				const { error: removeError } = await locals.supabase.storage
					.from('documents')
					.remove([assessment.estimate_pdf_path]);

				if (removeError) {
					console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Could not remove previous estimate PDF:`, removeError);
					// Non-fatal: continue to upload the new file
				} else {
					console.log(`[${new Date().toISOString()}] [Request ${requestId}] Previous estimate PDF deleted successfully`);
				}
			}

			// Upload to Supabase Storage with timestamp to avoid caching
			const timestamp = new Date().getTime();
			const fileName = `${assessment.assessment_number}_Estimate_${timestamp}.pdf`;
			const filePath = `assessments/${assessmentId}/estimates/${fileName}`;

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Uploading PDF to Supabase storage: ${filePath}`);
            {
                let ok = false;
                let lastErr: any = null;
                for (let i = 0; i < 3; i++) {
                    const { error: uploadError } = await locals.supabase.storage
                        .from('documents')
                        .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
                    if (!uploadError) { ok = true; break; }
                    lastErr = uploadError;
                    await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
                }
                if (!ok) {
                    yield { status: 'error', progress: 0, error: 'Failed to upload PDF to storage' };
                    return;
                }
            }

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] PDF uploaded successfully`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding progress: 95%`);
			yield { status: 'processing', progress: 95, message: 'Finalizing...' };
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Progress 95% yielded successfully`);

			// Use proxy URL instead of signed URL to avoid CORS/ORB issues with private bucket
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generating proxy URL for PDF...`);
			const proxyUrl = `/api/document/${filePath}`;
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Proxy URL: ${proxyUrl}`);

			// Update assessment with proxy URL
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Updating assessment record with PDF URL...`);
			const { error: updateError } = await locals.supabase
				.from('assessments')
				.update({
					estimate_pdf_url: proxyUrl, // Store proxy URL (doesn't expire)
					estimate_pdf_path: filePath,
					documents_generated_at: new Date().toISOString()
				})
				.eq('id', assessmentId);

			if (updateError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Update error:`, updateError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to update assessment record'
				};
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Error yielded, returning from generator`);
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Assessment record updated successfully`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding FINAL complete status with URL`);
			yield {
				status: 'complete',
				progress: 100,
				message: 'Estimate generated successfully!',
				url: proxyUrl
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
					: 'An unknown error occurred while generating the estimate';

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

