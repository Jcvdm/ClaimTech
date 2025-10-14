import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import JSZip from 'jszip';

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
			supabase
				.from('assessment_tyres')
				.select('*')
				.eq('assessment_id', assessmentId)
				.order('position', { ascending: true })
		]);

		// Create ZIP file
		const zip = new JSZip();

		// Helper function to download and add photo to ZIP
		const addPhotoToZip = async (url: string, folder: string, filename: string) => {
			try {
				const response = await fetch(url);
				if (!response.ok) {
					console.warn(`Failed to fetch photo: ${url}`);
					return;
				}
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				zip.folder(folder)?.file(filename, arrayBuffer);
			} catch (err) {
				console.warn(`Error adding photo to ZIP: ${url}`, err);
			}
		};

		// Add Vehicle Identification Photos
		let photoCounter = 1;
		if (vehicleIdentification?.vin_photo_url) {
			await addPhotoToZip(
				vehicleIdentification.vin_photo_url,
				'01_Vehicle_Identification',
				`${photoCounter++}_VIN_Number.jpg`
			);
		}
		if (vehicleIdentification?.registration_photo_url) {
			await addPhotoToZip(
				vehicleIdentification.registration_photo_url,
				'01_Vehicle_Identification',
				`${photoCounter++}_Registration.jpg`
			);
		}
		if (vehicleIdentification?.odometer_photo_url) {
			await addPhotoToZip(
				vehicleIdentification.odometer_photo_url,
				'01_Vehicle_Identification',
				`${photoCounter++}_Odometer.jpg`
			);
		}

		// Add Exterior 360 Photos
		photoCounter = 1;
		if (exterior360?.front_photo_url) {
			await addPhotoToZip(
				exterior360.front_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Front_View.jpg`
			);
		}
		if (exterior360?.rear_photo_url) {
			await addPhotoToZip(
				exterior360.rear_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Rear_View.jpg`
			);
		}
		if (exterior360?.left_side_photo_url) {
			await addPhotoToZip(
				exterior360.left_side_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Left_Side.jpg`
			);
		}
		if (exterior360?.right_side_photo_url) {
			await addPhotoToZip(
				exterior360.right_side_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Right_Side.jpg`
			);
		}
		if (exterior360?.front_left_photo_url) {
			await addPhotoToZip(
				exterior360.front_left_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Front_Left.jpg`
			);
		}
		if (exterior360?.front_right_photo_url) {
			await addPhotoToZip(
				exterior360.front_right_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Front_Right.jpg`
			);
		}
		if (exterior360?.rear_left_photo_url) {
			await addPhotoToZip(
				exterior360.rear_left_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Rear_Left.jpg`
			);
		}
		if (exterior360?.rear_right_photo_url) {
			await addPhotoToZip(
				exterior360.rear_right_photo_url,
				'02_Exterior_360',
				`${photoCounter++}_Rear_Right.jpg`
			);
		}

		// Add Interior & Mechanical Photos
		photoCounter = 1;
		if (interiorMechanical?.dashboard_photo_url) {
			await addPhotoToZip(
				interiorMechanical.dashboard_photo_url,
				'03_Interior_Mechanical',
				`${photoCounter++}_Dashboard.jpg`
			);
		}
		if (interiorMechanical?.front_seats_photo_url) {
			await addPhotoToZip(
				interiorMechanical.front_seats_photo_url,
				'03_Interior_Mechanical',
				`${photoCounter++}_Front_Seats.jpg`
			);
		}
		if (interiorMechanical?.rear_seats_photo_url) {
			await addPhotoToZip(
				interiorMechanical.rear_seats_photo_url,
				'03_Interior_Mechanical',
				`${photoCounter++}_Rear_Seats.jpg`
			);
		}
		if (interiorMechanical?.gear_lever_photo_url) {
			await addPhotoToZip(
				interiorMechanical.gear_lever_photo_url,
				'03_Interior_Mechanical',
				`${photoCounter++}_Gear_Lever.jpg`
			);
		}
		if (interiorMechanical?.engine_bay_photo_url) {
			await addPhotoToZip(
				interiorMechanical.engine_bay_photo_url,
				'03_Interior_Mechanical',
				`${photoCounter++}_Engine_Bay.jpg`
			);
		}

		// Add Tire & Rim Photos
		if (tyres && tyres.length > 0) {
			photoCounter = 1;
			for (const tyre of tyres) {
				const position = (tyre.position_label || tyre.position).replace(/\s+/g, '_');

				if (tyre.face_photo_url) {
					await addPhotoToZip(
						tyre.face_photo_url,
						'04_Tires_and_Rims',
						`${photoCounter++}_${position}_Face.jpg`
					);
				}
				if (tyre.tread_photo_url) {
					await addPhotoToZip(
						tyre.tread_photo_url,
						'04_Tires_and_Rims',
						`${photoCounter++}_${position}_Tread.jpg`
					);
				}
				if (tyre.measurement_photo_url) {
					await addPhotoToZip(
						tyre.measurement_photo_url,
						'04_Tires_and_Rims',
						`${photoCounter++}_${position}_Measurement.jpg`
					);
				}
			}
		}

		// Add Damage Photos
		if (estimatePhotos && estimatePhotos.length > 0) {
			photoCounter = 1;
			for (const photo of estimatePhotos) {
				const description = photo.description
					? photo.description.replace(/[^a-zA-Z0-9]/g, '_')
					: 'Damage';
				await addPhotoToZip(
					photo.photo_url,
					'05_Damage_Documentation',
					`${photoCounter++}_${description}.jpg`
				);
			}
		}

		// Add Pre-Incident Photos
		if (preIncidentPhotos && preIncidentPhotos.length > 0) {
			photoCounter = 1;
			for (const photo of preIncidentPhotos) {
				const description = photo.description
					? photo.description.replace(/[^a-zA-Z0-9]/g, '_')
					: 'PreIncident';
				await addPhotoToZip(
					photo.photo_url,
					'06_Pre_Incident',
					`${photoCounter++}_${description}.jpg`
				);
			}
		}

		// Generate ZIP buffer
		const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

		// Upload to Supabase Storage with timestamp to avoid caching
		const timestamp = new Date().getTime();
		const fileName = `${assessment.assessment_number}_Photos_${timestamp}.zip`;
		const filePath = `assessments/${assessmentId}/photos/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('documents')
			.upload(filePath, zipBuffer, {
				contentType: 'application/zip',
				upsert: true
			});

		if (uploadError) {
			console.error('Upload error:', uploadError);
			throw error(500, 'Failed to upload ZIP to storage');
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from('documents').getPublicUrl(filePath);

		// Update assessment with ZIP URL
		const { error: updateError } = await supabase
			.from('assessments')
			.update({
				photos_zip_url: publicUrl,
				photos_zip_path: filePath,
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
		console.error('=== Error generating photos ZIP ===');
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
				: 'An unknown error occurred while generating the photos ZIP';

		throw error(500, errorMessage);
	}
};

