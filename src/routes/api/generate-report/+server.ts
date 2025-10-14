import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateReportHTML } from '$lib/templates/report-template';

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
			{ data: repairer }
		] = await Promise.all([
			supabase
				.from('assessment_vehicle_identification')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			supabase.from('assessment_360_exterior').select('*').eq('assessment_id', assessmentId).single(),
			supabase
				.from('assessment_interior_mechanical')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			supabase.from('assessment_damage').select('*').eq('assessment_id', assessmentId).single(),
			supabase.from('company_settings').select('*').single(),
			supabase.from('appointments').select('*').eq('id', assessment.appointment_id).single(),
			supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
			supabase.from('inspections').select('*').eq('id', assessment.inspection_id).single(),
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
			supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
			supabase.from('assessment_estimates').select('repairer_id').eq('assessment_id', assessmentId).single()
				.then(({ data }) =>
					data?.repairer_id
						? supabase.from('repairers').select('*').eq('id', data.repairer_id).single()
						: { data: null }
				)
		]);

		// Generate report number if not exists
		let reportNumber = assessment.report_number;
		if (!reportNumber) {
			const year = new Date().getFullYear();
			const { count } = await supabase
				.from('assessments')
				.select('*', { count: 'exact', head: true })
				.like('report_number', `REP-${year}-%`);

			const nextNumber = (count || 0) + 1;
			reportNumber = `REP-${year}-${nextNumber.toString().padStart(5, '0')}`;

			// Update assessment with report number
			await supabase
				.from('assessments')
				.update({ report_number: reportNumber })
				.eq('id', assessmentId);
		}

		// Generate HTML
		const html = generateReportHTML({
			assessment: { ...assessment, report_number: reportNumber },
			vehicleIdentification,
			exterior360,
			interiorMechanical,
			damageRecord,
			companySettings,
			request: requestData,
			inspection,
			client,
			estimate,
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
		const fileName = `${assessment.assessment_number}_Report.pdf`;
		const filePath = `assessments/${assessmentId}/reports/${fileName}`;

		console.log('Uploading PDF to storage...');
		console.log('File path:', filePath);
		console.log('PDF size:', pdfBuffer.length, 'bytes');

		const { data: uploadData, error: uploadError } = await supabase.storage
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
			throw error(500, `Failed to upload PDF to storage: ${uploadError.message}`);
		}

		console.log('PDF uploaded successfully:', uploadData);

		// Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from('documents').getPublicUrl(filePath);

		// Update assessment with PDF URL
		const { error: updateError } = await supabase
			.from('assessments')
			.update({
				report_pdf_url: publicUrl,
				report_pdf_path: filePath,
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
			fileName,
			reportNumber
		});
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

		// Return appropriate error
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Provide more specific error message
		const errorMessage =
			err instanceof Error ? err.message : 'An unknown error occurred while generating the report';

		throw error(500, errorMessage);
	}
};

