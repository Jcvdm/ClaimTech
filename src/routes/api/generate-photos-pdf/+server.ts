import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generatePhotosHTML } from '$lib/templates/photos-template';

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

		// First get the estimates to get their IDs
		const [{ data: estimate }, { data: preIncidentEstimate }] = await Promise.all([
			supabase.from('assessment_estimates').select('id').eq('assessment_id', assessmentId).single(),
			supabase.from('pre_incident_estimates').select('id').eq('assessment_id', assessmentId).single()
		]);

		// Fetch related data with photos
		const [
			{ data: vehicleIdentification },
			{ data: exterior360 },
			{ data: interiorMechanical },
			{ data: estimatePhotos },
			{ data: preIncidentPhotos },
			{ data: companySettings },
			{ data: tyres }
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
			estimate?.id
				? supabase
						.from('estimate_photos')
						.select('*')
						.eq('estimate_id', estimate.id)
						.order('created_at', { ascending: true })
				: Promise.resolve({ data: [] }),
			preIncidentEstimate?.id
				? supabase
						.from('pre_incident_estimate_photos')
						.select('*')
						.eq('estimate_id', preIncidentEstimate.id)
						.order('created_at', { ascending: true })
				: Promise.resolve({ data: [] }),
			supabase.from('company_settings').select('*').single(),
			supabase
				.from('assessment_tyres')
				.select('*')
				.eq('assessment_id', assessmentId)
				.order('position', { ascending: true })
		]);

		// Organize photos into sections
		const sections = [];

		// Vehicle Identification Photos
		const identificationPhotos = [];
		if (vehicleIdentification?.vin_photo_url) {
			identificationPhotos.push({
				url: vehicleIdentification.vin_photo_url,
				caption: 'VIN Number'
			});
		}
		if (vehicleIdentification?.registration_photo_url) {
			identificationPhotos.push({
				url: vehicleIdentification.registration_photo_url,
				caption: 'Registration Document'
			});
		}
		if (vehicleIdentification?.odometer_photo_url) {
			identificationPhotos.push({
				url: vehicleIdentification.odometer_photo_url,
				caption: 'Odometer Reading'
			});
		}
		if (identificationPhotos.length > 0) {
			sections.push({
				title: 'Vehicle Identification',
				photos: identificationPhotos
			});
		}

		// Exterior 360 Photos
		const exteriorPhotos = [];
		if (exterior360?.front_photo_url) {
			exteriorPhotos.push({ url: exterior360.front_photo_url, caption: 'Front View' });
		}
		if (exterior360?.rear_photo_url) {
			exteriorPhotos.push({ url: exterior360.rear_photo_url, caption: 'Rear View' });
		}
		if (exterior360?.left_side_photo_url) {
			exteriorPhotos.push({ url: exterior360.left_side_photo_url, caption: 'Left Side View' });
		}
		if (exterior360?.right_side_photo_url) {
			exteriorPhotos.push({ url: exterior360.right_side_photo_url, caption: 'Right Side View' });
		}
		if (exterior360?.front_left_photo_url) {
			exteriorPhotos.push({
				url: exterior360.front_left_photo_url,
				caption: 'Front Left Corner'
			});
		}
		if (exterior360?.front_right_photo_url) {
			exteriorPhotos.push({
				url: exterior360.front_right_photo_url,
				caption: 'Front Right Corner'
			});
		}
		if (exterior360?.rear_left_photo_url) {
			exteriorPhotos.push({ url: exterior360.rear_left_photo_url, caption: 'Rear Left Corner' });
		}
		if (exterior360?.rear_right_photo_url) {
			exteriorPhotos.push({
				url: exterior360.rear_right_photo_url,
				caption: 'Rear Right Corner'
			});
		}
		if (exteriorPhotos.length > 0) {
			sections.push({
				title: '360° Exterior Views',
				photos: exteriorPhotos
			});
		}

		// Interior & Mechanical Photos
		const interiorPhotos = [];
		if (interiorMechanical?.dashboard_photo_url) {
			interiorPhotos.push({
				url: interiorMechanical.dashboard_photo_url,
				caption: 'Dashboard'
			});
		}
		if (interiorMechanical?.front_seats_photo_url) {
			interiorPhotos.push({
				url: interiorMechanical.front_seats_photo_url,
				caption: 'Front Seats'
			});
		}
		if (interiorMechanical?.rear_seats_photo_url) {
			interiorPhotos.push({
				url: interiorMechanical.rear_seats_photo_url,
				caption: 'Rear Seats'
			});
		}
		if (interiorMechanical?.gear_lever_photo_url) {
			interiorPhotos.push({
				url: interiorMechanical.gear_lever_photo_url,
				caption: 'Gear Lever'
			});
		}
		if (interiorMechanical?.engine_bay_photo_url) {
			interiorPhotos.push({
				url: interiorMechanical.engine_bay_photo_url,
				caption: 'Engine Bay'
			});
		}
		if (interiorPhotos.length > 0) {
			sections.push({
				title: 'Interior & Mechanical',
				photos: interiorPhotos
			});
		}

		// Tire & Rim Photos
		console.log('=== Tire Photos Debug ===');
		console.log('Tyres data:', tyres);
		console.log('Tyres count:', tyres?.length || 0);

		if (tyres && tyres.length > 0) {
			const tyrePhotos = [];
			tyres.forEach((tyre: any) => {
				console.log('Processing tyre:', {
					position: tyre.position,
					position_label: tyre.position_label,
					face_photo_url: tyre.face_photo_url,
					tread_photo_url: tyre.tread_photo_url,
					measurement_photo_url: tyre.measurement_photo_url
				});

				const positionLabel = tyre.position_label || tyre.position;
				const tyreInfo = `${tyre.tyre_make || ''} ${tyre.tyre_size || ''}`.trim();
				const condition = tyre.condition
					? tyre.condition.charAt(0).toUpperCase() + tyre.condition.slice(1)
					: 'N/A';
				const treadDepth = tyre.tread_depth_mm ? `${tyre.tread_depth_mm}mm` : '';

				if (tyre.face_photo_url) {
					tyrePhotos.push({
						url: tyre.face_photo_url,
						caption: `${positionLabel} - Face View - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
					});
				}
				if (tyre.tread_photo_url) {
					tyrePhotos.push({
						url: tyre.tread_photo_url,
						caption: `${positionLabel} - Tread View - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
					});
				}
				if (tyre.measurement_photo_url) {
					tyrePhotos.push({
						url: tyre.measurement_photo_url,
						caption: `${positionLabel} - Measurement - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
					});
				}
			});

			console.log('Total tyre photos collected:', tyrePhotos.length);

			if (tyrePhotos.length > 0) {
				sections.push({
					title: 'Tires & Rims',
					photos: tyrePhotos
				});
				console.log('Tires & Rims section added to PDF');
			} else {
				console.log('No tyre photos found (all photo URLs are null)');
			}
		} else {
			console.log('No tyre data found in database');
		}
		console.log('========================');

		// Damage Photos (from estimate)
		if (estimatePhotos && estimatePhotos.length > 0) {
			sections.push({
				title: 'Damage Documentation',
				photos: estimatePhotos.map((photo: any) => ({
					url: photo.photo_url,
					caption: photo.description || 'Damage Photo'
				}))
			});
		}

		// Pre-Incident Photos
		if (preIncidentPhotos && preIncidentPhotos.length > 0) {
			sections.push({
				title: 'Pre-Incident Condition',
				photos: preIncidentPhotos.map((photo: any) => ({
					url: photo.photo_url,
					caption: photo.description || 'Pre-Incident Photo'
				}))
			});
		}

		// Generate HTML
		const html = generatePhotosHTML({
			assessment,
			companySettings,
			sections
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

		// Upload to Supabase Storage with timestamp to avoid caching
		const timestamp = new Date().getTime();
		const fileName = `${assessment.assessment_number}_Photos_${timestamp}.pdf`;
		const filePath = `assessments/${assessmentId}/photos/${fileName}`;

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
				photos_pdf_url: publicUrl,
				photos_pdf_path: filePath,
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
		console.error('=== Error generating photos PDF ===');
		console.error('Error:', err);
		if (err instanceof Error) {
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
		}
		console.error('Assessment ID:', assessmentId);
		console.error('===================================');

		// Return appropriate error
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Provide more specific error message
		const errorMessage =
			err instanceof Error
				? err.message
				: 'An unknown error occurred while generating the photos PDF';

		throw error(500, errorMessage);
	}
};

