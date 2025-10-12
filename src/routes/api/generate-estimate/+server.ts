import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateEstimateHTML } from '$lib/templates/estimate-template';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { assessmentId } = await request.json();

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

		// Fetch related data
		const [
			{ data: vehicleIdentification },
			{ data: estimate },
			{ data: companySettings },
			{ data: requestData },
			{ data: client },
			{ data: repairer }
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
				: Promise.resolve({ data: null }),
			estimate?.repairer_id
				? supabase.from('repairers').select('*').eq('id', estimate.repairer_id).single()
				: Promise.resolve({ data: null })
		]);

		// Line items are stored in the estimate JSONB column
		const lineItems = estimate?.line_items || [];

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

		// Upload to Supabase Storage
		const fileName = `${assessment.assessment_number}_Estimate.pdf`;
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
		console.error('Error generating estimate:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to generate estimate');
	}
};

