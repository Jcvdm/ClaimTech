import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generatePhotosHTML } from '$lib/templates/photos-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';

/**
 * Helper function to downscale image for faster PDF generation
 * Reduces image dimensions to save bandwidth and rendering time
 */
async function downscaleImage(blob: Blob, maxWidth: number = 800): Promise<Buffer> {
	try {
		// For now, we'll use a simpler approach: just limit the buffer size
		// In a production setup, you'd use a library like sharp for actual resizing
		const arrayBuffer = await blob.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		
		// If image is already small, return as-is
		if (buffer.length < 200 * 1024) { // Less than 200KB
			return buffer;
		}
		
		// For large images, we'll rely on CSS sizing in the template
		// This is a placeholder for actual image processing
		// TODO: Add sharp library for server-side image resizing
		return buffer;
	} catch (err) {
		console.error('Error downscaling image:', err);
		// Return empty buffer on error to prevent crash
		return Buffer.alloc(0);
	}
}

/**
 * Helper function to convert proxy URL to data URL for Puppeteer
 * Puppeteer running on server cannot access browser-relative URLs like /api/photo/...
 * So we fetch directly from Supabase and convert to base64 data URL
 * Images are downscaled for faster PDF generation (Hobby plan optimization)
 */
async function convertProxyUrlToDataUrl(proxyUrl: string | null, locals: any): Promise<string> {
	if (!proxyUrl) return '';

	try {
		// Extract path from proxy URL
		// "/api/photo/assessments/..." → "assessments/..."
		const path = proxyUrl.replace('/api/photo/', '');

		// Fetch from Supabase storage
		const { data: photoBlob, error: downloadError } = await locals.supabase.storage
			.from('SVA Photos')
			.download(path);

		if (downloadError || !photoBlob) {
			console.warn(`Failed to fetch photo: ${path}`, downloadError);
			return '';
		}

		// Downscale image for faster rendering
		const imageBuffer = await downscaleImage(photoBlob, 800);

		// Convert to base64
		const base64 = imageBuffer.toString('base64');

		// Determine content type from file extension
		const extension = path.split('.').pop()?.toLowerCase() || 'jpg';
		const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';

		return `data:${contentType};base64,${base64}`;
	} catch (err) {
		console.error('Error converting proxy URL to data URL:', err);
		return '';
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const assessmentId = body.assessmentId;

	if (!assessmentId) {
		throw error(400, 'Assessment ID is required');
	}

	return createStreamingResponse(async function* () {
		try {
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

			yield { status: 'processing', progress: 15, message: 'Loading photo data...' };

			// First get the estimates to get their IDs
			const [{ data: estimate }, { data: preIncidentEstimate }] = await Promise.all([
				locals.supabase.from('assessment_estimates').select('id').eq('assessment_id', assessmentId).single(),
				locals.supabase.from('pre_incident_estimates').select('id').eq('assessment_id', assessmentId).single()
			]);

			yield { status: 'processing', progress: 25, message: 'Collecting all photos...' };

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
			estimate?.id
				? locals.supabase
						.from('estimate_photos')
						.select('*')
						.eq('estimate_id', estimate.id)
						.order('created_at', { ascending: true })
				: Promise.resolve({ data: [] }),
			preIncidentEstimate?.id
				? locals.supabase
						.from('pre_incident_estimate_photos')
						.select('*')
						.eq('estimate_id', preIncidentEstimate.id)
						.order('created_at', { ascending: true })
				: Promise.resolve({ data: [] }),
			locals.supabase.from('company_settings').select('*').single(),
			locals.supabase
				.from('assessment_tyres')
				.select('*')
				.eq('assessment_id', assessmentId)
				.order('position', { ascending: true })
		]);

	// Organize photos into sections
	const sections = [];

	yield { status: 'processing', progress: 30, message: 'Converting photos to embeddable format...' };

	// Vehicle Identification Photos - PARALLEL conversion
	const identificationPhotoPromises = [];
	if (vehicleIdentification?.vin_photo_url) {
		identificationPhotoPromises.push(
			convertProxyUrlToDataUrl(vehicleIdentification.vin_photo_url, locals).then(dataUrl => 
				dataUrl ? { url: dataUrl, caption: 'VIN Number' } : null
			)
		);
	}
	if (vehicleIdentification?.registration_photo_url) {
		identificationPhotoPromises.push(
			convertProxyUrlToDataUrl(vehicleIdentification.registration_photo_url, locals).then(dataUrl =>
				dataUrl ? { url: dataUrl, caption: 'Registration Document' } : null
			)
		);
	}
	if (vehicleIdentification?.odometer_photo_url) {
		identificationPhotoPromises.push(
			convertProxyUrlToDataUrl(vehicleIdentification.odometer_photo_url, locals).then(dataUrl =>
				dataUrl ? { url: dataUrl, caption: 'Odometer Reading' } : null
			)
		);
	}
	const identificationPhotos = (await Promise.all(identificationPhotoPromises)).filter(p => p !== null);
	if (identificationPhotos.length > 0) {
		sections.push({
			title: 'Vehicle Identification',
			photos: identificationPhotos
		});
	}

	yield { status: 'processing', progress: 35, message: 'Converting exterior photos...' };

	// Exterior 360 Photos - PARALLEL conversion
	const exteriorPhotoPromises = [];
	const exteriorPhotoMap = [
		{ url: exterior360?.front_photo_url, caption: 'Front View' },
		{ url: exterior360?.rear_photo_url, caption: 'Rear View' },
		{ url: exterior360?.left_side_photo_url, caption: 'Left Side View' },
		{ url: exterior360?.right_side_photo_url, caption: 'Right Side View' },
		{ url: exterior360?.front_left_photo_url, caption: 'Front Left Corner' },
		{ url: exterior360?.front_right_photo_url, caption: 'Front Right Corner' },
		{ url: exterior360?.rear_left_photo_url, caption: 'Rear Left Corner' },
		{ url: exterior360?.rear_right_photo_url, caption: 'Rear Right Corner' }
	];

	for (const {url, caption} of exteriorPhotoMap) {
		if (url) {
			exteriorPhotoPromises.push(
				convertProxyUrlToDataUrl(url, locals).then(dataUrl =>
					dataUrl ? { url: dataUrl, caption } : null
				)
			);
		}
	}
	
	const exteriorPhotos = (await Promise.all(exteriorPhotoPromises)).filter(p => p !== null);
	if (exteriorPhotos.length > 0) {
		sections.push({
			title: '360° Exterior Views',
			photos: exteriorPhotos
		});
	}

	yield { status: 'processing', progress: 40, message: 'Converting interior photos...' };

	// Interior & Mechanical Photos - PARALLEL conversion
	const interiorPhotoPromises = [];
	const interiorPhotoMap = [
		{ url: interiorMechanical?.dashboard_photo_url, caption: 'Dashboard' },
		{ url: interiorMechanical?.front_seats_photo_url, caption: 'Front Seats' },
		{ url: interiorMechanical?.rear_seats_photo_url, caption: 'Rear Seats' },
		{ url: interiorMechanical?.gear_lever_photo_url, caption: 'Gear Lever' },
		{ url: interiorMechanical?.engine_bay_photo_url, caption: 'Engine Bay' }
	];

	for (const {url, caption} of interiorPhotoMap) {
		if (url) {
			interiorPhotoPromises.push(
				convertProxyUrlToDataUrl(url, locals).then(dataUrl =>
					dataUrl ? { url: dataUrl, caption } : null
				)
			);
		}
	}

	const interiorPhotos = (await Promise.all(interiorPhotoPromises)).filter(p => p !== null);
	if (interiorPhotos.length > 0) {
		sections.push({
			title: 'Interior & Mechanical',
			photos: interiorPhotos
		});
	}

	yield { status: 'processing', progress: 45, message: 'Converting tyre photos...' };

	// Tire & Rim Photos - PARALLEL conversion
	if (tyres && tyres.length > 0) {
		const tyrePhotoPromises = [];

		for (const tyre of tyres) {
			const positionLabel = tyre.position_label || tyre.position;
			const tyreInfo = `${tyre.tyre_make || ''} ${tyre.tyre_size || ''}`.trim();
			const condition = tyre.condition
				? tyre.condition.charAt(0).toUpperCase() + tyre.condition.slice(1)
				: 'N/A';
			const treadDepth = tyre.tread_depth_mm ? `${tyre.tread_depth_mm}mm` : '';

			if (tyre.face_photo_url) {
				tyrePhotoPromises.push(
					convertProxyUrlToDataUrl(tyre.face_photo_url, locals).then(dataUrl =>
						dataUrl ? {
							url: dataUrl,
							caption: `${positionLabel} - Face View - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
						} : null
					)
				);
			}
			if (tyre.tread_photo_url) {
				tyrePhotoPromises.push(
					convertProxyUrlToDataUrl(tyre.tread_photo_url, locals).then(dataUrl =>
						dataUrl ? {
							url: dataUrl,
							caption: `${positionLabel} - Tread View - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
						} : null
					)
				);
			}
			if (tyre.measurement_photo_url) {
				tyrePhotoPromises.push(
					convertProxyUrlToDataUrl(tyre.measurement_photo_url, locals).then(dataUrl =>
						dataUrl ? {
							url: dataUrl,
							caption: `${positionLabel} - Measurement - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
						} : null
					)
				);
			}
		}

		const tyrePhotos = (await Promise.all(tyrePhotoPromises)).filter(p => p !== null);
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

	yield { status: 'processing', progress: 50, message: 'Converting damage and pre-incident photos...' };

	// Damage Photos (from estimate) - PARALLEL conversion
	if (estimatePhotos && estimatePhotos.length > 0) {
		const damagePhotoPromises = estimatePhotos.map(photo =>
			convertProxyUrlToDataUrl(photo.photo_url, locals).then(dataUrl =>
				dataUrl ? {
					url: dataUrl,
					caption: photo.description || 'Damage Photo'
				} : null
			)
		);
		
		const damagePhotos = (await Promise.all(damagePhotoPromises)).filter(p => p !== null);
		if (damagePhotos.length > 0) {
			sections.push({
				title: 'Damage Documentation',
				photos: damagePhotos
			});
		}
	}

	// Pre-Incident Photos - PARALLEL conversion
	if (preIncidentPhotos && preIncidentPhotos.length > 0) {
		const preIncidentPhotoPromises = preIncidentPhotos.map(photo =>
			convertProxyUrlToDataUrl(photo.photo_url, locals).then(dataUrl =>
				dataUrl ? {
					url: dataUrl,
					caption: photo.description || 'Pre-Incident Photo'
				} : null
			)
		);

		const preIncidentPhotosList = (await Promise.all(preIncidentPhotoPromises)).filter(p => p !== null);
		if (preIncidentPhotosList.length > 0) {
			sections.push({
				title: 'Pre-Incident Condition',
				photos: preIncidentPhotosList
			});
		}
	}

		// Generate HTML
		const html = generatePhotosHTML({
				assessment,
				companySettings,
				sections
			});

			yield { status: 'processing', progress: 60, message: 'Rendering PDF with photos (this may take 1-2 minutes)...' };

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
			if (assessment.photos_pdf_path) {
				console.log('Deleting previous photos PDF:', assessment.photos_pdf_path);
				const { error: removeError } = await locals.supabase.storage
					.from('documents')
					.remove([assessment.photos_pdf_path]);

				if (removeError) {
					console.warn('Could not remove previous photos PDF:', removeError);
					// Non-fatal: continue to upload the new file
				} else {
					console.log('Previous photos PDF deleted successfully');
				}
			}

			// Upload to Supabase Storage with timestamp to avoid caching
			const timestamp = new Date().getTime();
			const fileName = `${assessment.assessment_number}_Photos_${timestamp}.pdf`;
			const filePath = `assessments/${assessmentId}/photos/${fileName}`;

			const { error: uploadError } = await locals.supabase.storage
				.from('documents')
				.upload(filePath, pdfBuffer, {
					contentType: 'application/pdf',
					upsert: true
				});

			if (uploadError) {
				console.error('Upload error:', uploadError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to upload PDF to storage'
				};
				return;
			}

			yield { status: 'processing', progress: 95, message: 'Finalizing...' };

			// Use proxy URL instead of signed URL to avoid CORS/ORB issues with private bucket
			const proxyUrl = `/api/document/${filePath}`;

			// Update assessment with proxy URL
			const { error: updateError } = await locals.supabase
				.from('assessments')
				.update({
					photos_pdf_url: proxyUrl, // Store proxy URL (doesn't expire)
					photos_pdf_path: filePath,
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

			yield {
				status: 'complete',
				progress: 100,
				message: 'Photos PDF generated successfully!',
				url: proxyUrl
			};

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

			// Provide more specific error message
			const errorMessage =
				err instanceof Error
					? err.message
					: 'An unknown error occurred while generating the photos PDF';

			yield {
				status: 'error',
				progress: 0,
				error: errorMessage
			};
		}
	});
};

