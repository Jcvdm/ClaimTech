import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateEstimateHTML } from '$lib/templates/estimate-template';

export const POST: RequestHandler = async ({ request }) => {
	let assessmentId: string | undefined;
	try {
		const body = await request.json();
		assessmentId = body.assessmentId;

		if (!assessmentId) {
			throw error(400, 'Assessment ID is required');
		}

		// Fetch assessment data
		const { data: assessment, error: assessmentError } = await supabase
			.from('assessments')
			.select('*')
			.eq('id', assessmentId)
			.single();

		if (assessmentError || !assessment) {
			throw error(404, 'Assessment not found');
		}

		// Fetch related data (Step 1: fetch everything except repairer)
		const [
			{ data: vehicleIdentification, error: vehicleError },
			{ data: estimate, error: estimateError },
			{ data: companySettings, error: settingsError },
			{ data: requestData, error: requestError },
			{ data: client, error: clientError }
		] = await Promise.all([
			supabase
				.from('assessment_vehicle_identification')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
			supabase.from('company_settings').select('*').single(),
			supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
			assessment.request_id
				? supabase
						.from('requests')
						.select('client_id')
						.eq('id', assessment.request_id)
						.single()
						.then(({ data }) =>
							data
								? supabase.from('clients').select('*').eq('id', data.client_id).single()
								: { data: null }
						)
				: Promise.resolve({ data: null })
		]);

		// Check for errors
		if (estimateError) {
			console.error('Estimate fetch error:', estimateError);
		}

		// Step 2: Fetch repairer using estimate data (now that estimate is available)
		const { data: repairer } = estimate?.repairer_id
			? await supabase.from('repairers').select('*').eq('id', estimate.repairer_id).single()
			: { data: null };

		// Line items are stored in the estimate JSONB column
		const lineItems = estimate?.line_items || [];

		// Debug logging
		console.log('=== Estimate Data Debug ===');
		console.log('Assessment ID:', assessmentId);
		console.log('Estimate exists:', !!estimate);
		console.log('Estimate object keys:', estimate ? Object.keys(estimate) : 'null');
		console.log('Estimate subtotal:', estimate?.subtotal, 'Type:', typeof estimate?.subtotal);
		console.log('Estimate vat_amount:', estimate?.vat_amount, 'Type:', typeof estimate?.vat_amount);
		console.log('Estimate total:', estimate?.total, 'Type:', typeof estimate?.total);
		console.log('Line items count:', lineItems.length);
		if (lineItems.length > 0) {
			console.log('First line item:', JSON.stringify(lineItems[0], null, 2));
		}
		console.log('Full estimate object:', JSON.stringify(estimate, null, 2));
		console.log('===========================');

		// Generate HTML
		const html = generateEstimateHTML({
			assessment,
			vehicleIdentification,
			estimate,
			lineItems,
			companySettings,
			request: requestData,
			client,
			repairer
		});

		// Debug: Check if HTML contains the values
		console.log('=== HTML Debug ===');
		console.log('HTML contains "R 34 448":', html.includes('R 34 448'));
		console.log('HTML contains "R 39 615":', html.includes('R 39 615'));
		console.log('HTML contains "No line items":', html.includes('No line items'));
		// Extract the totals section
		const totalsMatch = html.match(/<!-- Totals Section -->([\s\S]*?)<\/div>/);
		if (totalsMatch) {
			console.log('Totals section HTML:', totalsMatch[0].substring(0, 500));
		}
		console.log('==================');

		// Save HTML to file for debugging
		const fs = await import('fs');
		const path = await import('path');
		const debugPath = path.join(process.cwd(), 'debug-estimate.html');
		fs.writeFileSync(debugPath, html, 'utf-8');
		console.log('HTML saved to:', debugPath);

		// Generate PDF
		const pdfBuffer = await generatePDF(html, {
			format: 'A4',
			margin: {
				top: '15mm',
				right: '15mm',
				bottom: '15mm',
				left: '15mm'
			}
		});

		// Upload to Supabase Storage with timestamp to avoid caching
		const timestamp = new Date().getTime();
		const fileName = `${assessment.assessment_number}_Estimate_${timestamp}.pdf`;
		const filePath = `assessments/${assessmentId}/estimates/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('documents')
			.upload(filePath, pdfBuffer, {
				contentType: 'application/pdf',
				upsert: true
			});

		if (uploadError) {
			console.error('Upload error:', uploadError);
			throw error(500, 'Failed to upload PDF to storage');
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from('documents').getPublicUrl(filePath);

		// Update assessment with PDF URL
		const { error: updateError } = await supabase
			.from('assessments')
			.update({
				estimate_pdf_url: publicUrl,
				estimate_pdf_path: filePath,
				documents_generated_at: new Date().toISOString()
			})
			.eq('id', assessmentId);

		if (updateError) {
			console.error('Update error:', updateError);
			throw error(500, 'Failed to update assessment record');
		}

		return json({
			success: true,
			url: publicUrl,
			fileName
		});
	} catch (err) {
		// Detailed error logging
		console.error('=== Error generating estimate ===');
		console.error('Error:', err);
		if (err instanceof Error) {
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
		}
		console.error('Assessment ID:', assessmentId);
		console.error('=================================');

		// Return appropriate error
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Provide more specific error message
		const errorMessage =
			err instanceof Error
				? err.message
				: 'An unknown error occurred while generating the estimate';

		throw error(500, errorMessage);
	}
};

