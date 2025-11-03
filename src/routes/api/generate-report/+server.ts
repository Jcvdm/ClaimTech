import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateReportHTML } from '$lib/templates/report-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const assessmentId = body.assessmentId;

	if (!assessmentId) {
		throw error(400, 'Assessment ID is required');
	}

	// Return streaming response
	return createStreamingResponse(async function* () {
		// Create keep-alive mechanism - removed because we're yielding progress frequently enough
		// const keepAlive = createKeepAlive((progress) => {}, 3000);

		try {
			// keepAlive.start();

			yield { status: 'processing', progress: 5, message: 'Fetching assessment data...' };

			// Fetch assessment data
			const { data: assessment, error: assessmentError } = await locals.supabase
				.from('assessments')
				.select('*')
				.eq('id', assessmentId)
				.single();

			if (assessmentError || !assessment) {
				yield {
					status: 'error',
					progress: 0,
					error: 'Assessment not found'
				};
				return;
			}

			yield { status: 'processing', progress: 15, message: 'Loading vehicle and damage data...' };

			// Fetch related data
			const [
			{ data: vehicleIdentification },
			{ data: exterior360 },
			{ data: interiorMechanical },
			{ data: damageRecord },
			{ data: companySettings },
			{ data: appointment },
			{ data: requestData },
			{ data: inspection },
			{ data: client },
			{ data: estimate },
			{ data: repairer },
			{ data: tyres }
		] = await Promise.all([
			locals.supabase
				.from('assessment_vehicle_identification')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			locals.supabase.from('assessment_360_exterior').select('*').eq('assessment_id', assessmentId).single(),
			locals.supabase
				.from('assessment_interior_mechanical')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			locals.supabase.from('assessment_damage').select('*').eq('assessment_id', assessmentId).single(),
			locals.supabase.from('company_settings').select('*').single(),
			locals.supabase.from('appointments').select('*').eq('id', assessment.appointment_id).single(),
			locals.supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
			locals.supabase.from('inspections').select('*').eq('id', assessment.inspection_id).single(),
			assessment.request_id
				? locals.supabase
						.from('requests')
						.select('client_id')
						.eq('id', assessment.request_id)
						.single()
						.then(({ data }) =>
							data
								? locals.supabase.from('clients').select('*').eq('id', data.client_id).single()
								: { data: null, error: null }
						)
				: Promise.resolve({ data: null, error: null }),
			locals.supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
			locals.supabase.from('assessment_estimates').select('repairer_id').eq('assessment_id', assessmentId).single()
				.then(({ data }) =>
					data?.repairer_id
						? locals.supabase.from('repairers').select('*').eq('id', data.repairer_id).single()
						: { data: null }
				),
			locals.supabase
				.from('assessment_tyres')
				.select('*')
				.eq('assessment_id', assessmentId)
				.order('position', { ascending: true })
			]);

			yield { status: 'processing', progress: 35, message: 'Preparing report data...' };

			// Generate report number if not exists
			let reportNumber = assessment.report_number;
			if (!reportNumber) {
				const year = new Date().getFullYear();
				const { count } = await locals.supabase
					.from('assessments')
					.select('*', { count: 'exact', head: true })
					.like('report_number', `REP-${year}-%`);

				const nextNumber = (count || 0) + 1;
				reportNumber = `REP-${year}-${nextNumber.toString().padStart(5, '0')}`;

				// Update assessment with report number
				await locals.supabase
					.from('assessments')
					.update({ report_number: reportNumber })
					.eq('id', assessmentId);
			}

			yield { status: 'processing', progress: 45, message: 'Generating HTML template...' };

			// Determine T&Cs to use (client-specific or company defaults)
			// Fallback pattern: client T&Cs → company T&Cs → empty
			const termsAndConditions = client?.assessment_terms_and_conditions || companySettings?.assessment_terms_and_conditions || null;

			// Generate HTML
			const html = generateReportHTML({
				assessment: { ...assessment, report_number: reportNumber },
				vehicleIdentification,
				exterior360,
				interiorMechanical,
				damageRecord,
				companySettings: companySettings ? {
					...companySettings,
					assessment_terms_and_conditions: termsAndConditions
				} : companySettings,
				request: requestData,
				inspection,
				client,
				estimate,
				repairer,
				tyres
			});

			yield { status: 'processing', progress: 60, message: 'Rendering PDF (this may take 1-2 minutes)...' };

			// Generate PDF - wrap in try-catch to handle Puppeteer errors
			let pdfBuffer: Buffer;
			try {
				pdfBuffer = await generatePDF(html, {
					format: 'A4',
					margin: {
						top: '15mm',
						right: '15mm',
						bottom: '15mm',
						left: '15mm'
					}
				});
			} catch (pdfError) {
				console.error('PDF generation error:', pdfError);
				yield {
					status: 'error',
					progress: 0,
					error: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
				};
				return;
			}

			yield { status: 'processing', progress: 85, message: 'Uploading PDF to storage...' };

			// Delete previous file if it exists to avoid orphaned files
			if (assessment.report_pdf_path) {
				console.log('Deleting previous report PDF:', assessment.report_pdf_path);
				const { error: removeError } = await locals.supabase.storage
					.from('documents')
					.remove([assessment.report_pdf_path]);

				if (removeError) {
					console.warn('Could not remove previous report PDF:', removeError);
					// Non-fatal: continue to upload the new file
				} else {
					console.log('Previous report PDF deleted successfully');
				}
			}

			// Upload to Supabase Storage with timestamp to avoid caching
			const timestamp = new Date().getTime();
			const fileName = `${assessment.assessment_number}_Report_${timestamp}.pdf`;
			const filePath = `assessments/${assessmentId}/reports/${fileName}`;

			console.log('Uploading PDF to storage...');
			console.log('File path:', filePath);
			console.log('PDF size:', pdfBuffer.length, 'bytes');

			const { data: uploadData, error: uploadError } = await locals.supabase.storage
				.from('documents')
				.upload(filePath, pdfBuffer, {
					contentType: 'application/pdf',
					upsert: true
				});

			if (uploadError) {
				console.error('=== Storage Upload Error ===');
				console.error('Error:', uploadError);
				console.error('Error message:', uploadError.message);
				console.error('Error details:', JSON.stringify(uploadError, null, 2));
				console.error('File path:', filePath);
				console.error('PDF size:', pdfBuffer.length);
				console.error('===========================');
				yield {
					status: 'error',
					progress: 0,
					error: `Failed to upload PDF to storage: ${uploadError.message}`
				};
				return;
			}

			console.log('PDF uploaded successfully:', uploadData);

			yield { status: 'processing', progress: 95, message: 'Finalizing...' };

			// Use proxy URL instead of signed URL to avoid CORS/ORB issues with private bucket
			const proxyUrl = `/api/document/${filePath}`;

			// Update assessment with proxy URL
			const { error: updateError } = await locals.supabase
				.from('assessments')
				.update({
					report_pdf_url: proxyUrl, // Store proxy URL (doesn't expire)
					report_pdf_path: filePath,
					documents_generated_at: new Date().toISOString()
				})
				.eq('id', assessmentId);

			if (updateError) {
				console.error('Update error:', updateError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to update assessment record'
				};
				return;
			}

			// Send completion with proxy URL
			yield {
				status: 'complete',
				progress: 100,
				message: 'Report generated successfully!',
				url: proxyUrl
			};

		} catch (err) {

			// Detailed error logging
			console.error('=== Error generating report ===');
			console.error('Error:', err);
			if (err instanceof Error) {
				console.error('Error message:', err.message);
				console.error('Error stack:', err.stack);
			}
			console.error('Assessment ID:', assessmentId);
			console.error('================================');

			// Provide more specific error message
			const errorMessage =
				err instanceof Error ? err.message : 'An unknown error occurred while generating the report';

			// Yield error status
			yield {
				status: 'error',
				progress: 0,
				error: errorMessage
			};
		}
	});
};

