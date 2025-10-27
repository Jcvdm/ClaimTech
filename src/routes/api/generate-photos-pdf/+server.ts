import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generatePhotosHTML } from '$lib/templates/photos-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';

/**
 * Helper function to convert proxy URL to data URL for Puppeteer
 * Puppeteer running on server cannot access browser-relative URLs like /api/photo/...
 * So we fetch directly from Supabase and convert to base64 data URL
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

		// Convert blob to data URL
		const arrayBuffer = await photoBlob.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');

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

		// Vehicle Identification Photos
		const identificationPhotos = [];
		if (vehicleIdentification?.vin_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(vehicleIdentification.vin_photo_url, locals);
			if (dataUrl) {
				identificationPhotos.push({
					url: dataUrl,
					caption: 'VIN Number'
				});
			}
		}
		if (vehicleIdentification?.registration_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(vehicleIdentification.registration_photo_url, locals);
			if (dataUrl) {
				identificationPhotos.push({
					url: dataUrl,
					caption: 'Registration Document'
				});
			}
		}
		if (vehicleIdentification?.odometer_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(vehicleIdentification.odometer_photo_url, locals);
			if (dataUrl) {
				identificationPhotos.push({
					url: dataUrl,
					caption: 'Odometer Reading'
				});
			}
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
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.front_photo_url, locals);
			if (dataUrl) exteriorPhotos.push({ url: dataUrl, caption: 'Front View' });
		}
		if (exterior360?.rear_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.rear_photo_url, locals);
			if (dataUrl) exteriorPhotos.push({ url: dataUrl, caption: 'Rear View' });
		}
		if (exterior360?.left_side_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.left_side_photo_url, locals);
			if (dataUrl) exteriorPhotos.push({ url: dataUrl, caption: 'Left Side View' });
		}
		if (exterior360?.right_side_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.right_side_photo_url, locals);
			if (dataUrl) exteriorPhotos.push({ url: dataUrl, caption: 'Right Side View' });
		}
		if (exterior360?.front_left_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.front_left_photo_url, locals);
			if (dataUrl) {
				exteriorPhotos.push({
					url: dataUrl,
					caption: 'Front Left Corner'
				});
			}
		}
		if (exterior360?.front_right_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.front_right_photo_url, locals);
			if (dataUrl) {
				exteriorPhotos.push({
					url: dataUrl,
					caption: 'Front Right Corner'
				});
			}
		}
		if (exterior360?.rear_left_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.rear_left_photo_url, locals);
			if (dataUrl) exteriorPhotos.push({ url: dataUrl, caption: 'Rear Left Corner' });
		}
		if (exterior360?.rear_right_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(exterior360.rear_right_photo_url, locals);
			if (dataUrl) {
				exteriorPhotos.push({
					url: dataUrl,
					caption: 'Rear Right Corner'
				});
			}
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
			const dataUrl = await convertProxyUrlToDataUrl(interiorMechanical.dashboard_photo_url, locals);
			if (dataUrl) {
				interiorPhotos.push({
					url: dataUrl,
					caption: 'Dashboard'
				});
			}
		}
		if (interiorMechanical?.front_seats_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(interiorMechanical.front_seats_photo_url, locals);
			if (dataUrl) {
				interiorPhotos.push({
					url: dataUrl,
					caption: 'Front Seats'
				});
			}
		}
		if (interiorMechanical?.rear_seats_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(interiorMechanical.rear_seats_photo_url, locals);
			if (dataUrl) {
				interiorPhotos.push({
					url: dataUrl,
					caption: 'Rear Seats'
				});
			}
		}
		if (interiorMechanical?.gear_lever_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(interiorMechanical.gear_lever_photo_url, locals);
			if (dataUrl) {
				interiorPhotos.push({
					url: dataUrl,
					caption: 'Gear Lever'
				});
			}
		}
		if (interiorMechanical?.engine_bay_photo_url) {
			const dataUrl = await convertProxyUrlToDataUrl(interiorMechanical.engine_bay_photo_url, locals);
			if (dataUrl) {
				interiorPhotos.push({
					url: dataUrl,
					caption: 'Engine Bay'
				});
			}
		}
		if (interiorPhotos.length > 0) {
			sections.push({
				title: 'Interior & Mechanical',
				photos: interiorPhotos
			});
		}

		// Tire & Rim Photos
		if (tyres && tyres.length > 0) {
			const tyrePhotos = [];

			for (const tyre of tyres) {
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
					const dataUrl = await convertProxyUrlToDataUrl(tyre.face_photo_url, locals);
					if (dataUrl) {
						tyrePhotos.push({
							url: dataUrl,
							caption: `${positionLabel} - Face View - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
						});
					}
				}
				if (tyre.tread_photo_url) {
					const dataUrl = await convertProxyUrlToDataUrl(tyre.tread_photo_url, locals);
					if (dataUrl) {
						tyrePhotos.push({
							url: dataUrl,
							caption: `${positionLabel} - Tread View - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
						});
					}
				}
				if (tyre.measurement_photo_url) {
					const dataUrl = await convertProxyUrlToDataUrl(tyre.measurement_photo_url, locals);
					if (dataUrl) {
						tyrePhotos.push({
							url: dataUrl,
							caption: `${positionLabel} - Measurement - ${tyreInfo} - ${condition} ${treadDepth}`.trim()
						});
					}
				}
			}

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
			const damagePhotos = [];
			for (const photo of estimatePhotos) {
				const dataUrl = await convertProxyUrlToDataUrl(photo.photo_url, locals);
				if (dataUrl) {
					damagePhotos.push({
						url: dataUrl,
						caption: photo.description || 'Damage Photo'
					});
				}
			}
			if (damagePhotos.length > 0) {
				sections.push({
					title: 'Damage Documentation',
					photos: damagePhotos
				});
			}
		}

		// Pre-Incident Photos
		if (preIncidentPhotos && preIncidentPhotos.length > 0) {
			const preIncidentPhotosList = [];
			for (const photo of preIncidentPhotos) {
				const dataUrl = await convertProxyUrlToDataUrl(photo.photo_url, locals);
				if (dataUrl) {
					preIncidentPhotosList.push({
						url: dataUrl,
						caption: photo.description || 'Pre-Incident Photo'
					});
				}
			}
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

