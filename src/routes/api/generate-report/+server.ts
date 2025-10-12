import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateReportHTML } from '$lib/templates/report-template';

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
			{ data: exterior360 },
			{ data: interiorMechanical },
			{ data: damageRecord },
			{ data: companySettings },
			{ data: appointment },
			{ data: request: requestData },
			{ data: inspection },
			{ data: client }
		] = await Promise.all([
			supabase
				.from('vehicle_identification')
				.select('*')
				.eq('assessment_id', assessmentId)
				.single(),
			supabase.from('exterior_360').select('*').eq('assessment_id', assessmentId).single(),
			supabase
				.from('interior_mechanical')
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
				: Promise.resolve({ data: null })
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
			client
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
		console.error('Error generating report:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to generate report');
	}
};

