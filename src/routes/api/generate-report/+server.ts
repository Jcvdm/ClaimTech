import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateReportHTML } from '$lib/templates/report-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';
import { formatDateNumeric } from '$lib/utils/formatters';
import { getVehicleDetails, getClientDetails, getInsuredDetails } from '$lib/utils/report-data-helpers';
import { normalizeAssessment, normalizeCompanySettings, normalizeVehicleIdentification } from '$lib/utils/type-normalizers';
import { getBrandLogoBase64 } from '$lib/utils/branding';

// Helper function to format assessment notes grouped by section
function formatAssessmentNotesBySection(notes: any[]): string {
	if (!notes || notes.length === 0) return '';

	// Filter out notes that belong on other documents (estimate, additionals, frc)
	const reportNotes = notes.filter(note =>
		!['estimate', 'additionals', 'frc'].includes(note.source_tab)
	);

	if (reportNotes.length === 0) return '';

	// Map source_tab to display headers
	const sectionHeaders: Record<string, string> = {
		identification: 'VEHICLE IDENTIFICATION NOTES',
		exterior_360: 'EXTERIOR 360 NOTES',
		interior: 'INTERIOR & MECHANICAL NOTES',
		tyres: 'TYRES NOTES',
		damage: 'DAMAGE ASSESSMENT NOTES',
		vehicle_values: 'VEHICLE VALUES NOTES',
		pre_incident_estimate: 'PRE-INCIDENT ESTIMATE NOTES',
		summary: 'SUMMARY NOTES',
		finalize: 'FINALIZATION NOTES'
	};

	// Group notes by source_tab
	const groupedNotes: Record<string, string[]> = {};
	reportNotes.forEach(note => {
		const tab = note.source_tab || 'summary';
		if (!groupedNotes[tab]) {
			groupedNotes[tab] = [];
		}
		groupedNotes[tab].push(note.note_text);
	});

	// Build formatted output with sections
	const sections: string[] = [];

	// Maintain consistent section order
	const sectionOrder = [
		'identification',
		'exterior_360',
		'interior',
		'tyres',
		'damage',
		'vehicle_values',
		'pre_incident_estimate',
		'summary',
		'finalize'
	];

	sectionOrder.forEach(tab => {
		if (groupedNotes[tab] && groupedNotes[tab].length > 0) {
			const header = sectionHeaders[tab] || tab.toUpperCase();
			const notesText = groupedNotes[tab].join('\n\n');
			sections.push(`${header}\n${notesText}`);
		}
	});

	return sections.join('\n\n');
}

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
			{ data: tyres },
			{ data: vehicleValues },
			{ data: assessmentNotes }
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
			assessment.appointment_id ? locals.supabase.from('appointments').select('*').eq('id', assessment.appointment_id).single() : Promise.resolve({ data: null, error: null }),
			locals.supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
			assessment.inspection_id ? locals.supabase.from('inspections').select('*').eq('id', assessment.inspection_id).single() : Promise.resolve({ data: null, error: null }),
			assessment.request_id
				? locals.supabase
						.from('requests')
						.select('client_id')
						.eq('id', assessment.request_id)
						.single()
						.then(async ({ data }) =>
							data
								? await locals.supabase.from('clients').select('*').eq('id', data.client_id).single()
								: { data: null, error: null }
						)
				: Promise.resolve({ data: null, error: null }),
			locals.supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
			locals.supabase.from('assessment_estimates').select('repairer_id').eq('assessment_id', assessmentId).single()
				.then(async ({ data }) =>
					data?.repairer_id
						? await locals.supabase.from('repairers').select('*').eq('id', data.repairer_id).single()
						: { data: null }
				),
			locals.supabase
				.from('assessment_tyres')
				.select('*')
				.eq('assessment_id', assessmentId)
				.order('position', { ascending: true }),
			// NEW: Fetch vehicle values
			locals.supabase
				.from('assessment_vehicle_values')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			// NEW: Fetch assessment notes (multiple notes per assessment)
			locals.supabase
				.from('assessment_notes')
				.select('*')
				.eq('assessment_id', assessmentId)
				.order('created_at', { ascending: true })
			]);

			yield { status: 'processing', progress: 35, message: 'Preparing report data...' };

			// NEW: Fetch engineer/assessor info if appointment exists
			let engineer = null;
			if (appointment?.engineer_id) {
				const { data: engineerData } = await locals.supabase
					.from('engineers')
					.select('*, users!inner(email, full_name, phone)')
					.eq('id', appointment.engineer_id)
					.single();
				engineer = engineerData;
			}

			// NEW: Format assessment notes grouped by section
			const formattedNotes = formatAssessmentNotesBySection(assessmentNotes || []);

			// Normalize data using centralized helpers
			const normalizedAssessment = normalizeAssessment(assessment);
			const normalizedVehicleIdentification = normalizeVehicleIdentification(vehicleIdentification);
			const normalizedCompanySettings = normalizeCompanySettings(companySettings);
			const vehicleDetails = getVehicleDetails(normalizedVehicleIdentification as any, requestData as any, inspection as any);
			const clientDetails = getClientDetails(client as any);
			const insuredDetails = getInsuredDetails(requestData as any);

			// Generate HTML with normalized data
			const html = generateReportHTML({
				assessment: (normalizedAssessment || {}) as any,
				vehicleIdentification: (normalizedVehicleIdentification || {}) as any,
				exterior360: (exterior360 || {}) as any,
				interiorMechanical: (interiorMechanical || {}) as any,
				damageRecord: (damageRecord || {}) as any,
				companySettings: (normalizedCompanySettings || {}) as any,
				request: (requestData || {}) as any,
				inspection: (inspection || {}) as any,
				client: (client || {}) as any,
				estimate: (estimate || {}) as any,
				repairer: (repairer || {}) as any,
				tyres: (tyres || []) as any,
				vehicleValues: (vehicleValues || {}) as any,
				logoBase64: getBrandLogoBase64(),
				assessmentNotes: formattedNotes,
				engineer: (engineer || {}) as any,
				vehicleDetails,
				clientDetails,
				insuredDetails
			});

			yield { status: 'processing', progress: 40, message: 'Generating PDF...' };

			// Generate report number if not exists
			let reportNumber = assessment.report_number;
			let pdfBuffer: Buffer;
			try {
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

            let uploadOk = false;
            let lastUploadErr: any = null;
            for (let i = 0; i < 3; i++) {
                const { error: uploadError } = await locals.supabase.storage
                    .from('documents')
                    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
                if (!uploadError) { uploadOk = true; break; }
                lastUploadErr = uploadError;
                await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
            }
            if (!uploadOk) {
                yield { status: 'error', progress: 0, error: `Failed to upload PDF to storage: ${lastUploadErr?.message || 'Unknown error'}` };
                return;
            }

            console.log('PDF uploaded successfully');

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

