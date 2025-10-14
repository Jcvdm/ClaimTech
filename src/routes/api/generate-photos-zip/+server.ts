import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import JSZip from 'jszip';
import { createStreamingResponse } from '$lib/utils/streaming-response';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const assessmentId = body.assessmentId;

	return createStreamingResponse(async function* () {
		const requestId = Math.random().toString(36).substring(7);
		console.log(`[${new Date().toISOString()}] [Request ${requestId}] NEW PHOTOS ZIP GENERATION REQUEST`);
		console.log(`[${new Date().toISOString()}] [Request ${requestId}] Assessment ID: ${assessmentId}`);

		try {
			// Validate assessment ID
			if (!assessmentId) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Missing assessment ID`);
				yield {
					status: 'error',
					progress: 0,
					error: 'Assessment ID is required'
				};
				return;
			}

			yield { status: 'processing', progress: 5, message: 'Validating assessment...' };

			// Fetch assessment data
			const { data: assessment, error: assessmentError } = await supabase
				.from('assessments')
				.select('*')
				.eq('id', assessmentId)
				.single();

			if (assessmentError || !assessment) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Assessment not found:`, assessmentError);
				yield {
					status: 'error',
					progress: 0,
					error: 'Assessment not found'
				};
				return;
			}

			yield { status: 'processing', progress: 10, message: 'Fetching photo metadata...' };

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

			yield { status: 'processing', progress: 20, message: 'Preparing photo list...' };

			// Collect all photo URLs with their folder and filename
			interface PhotoTask {
				url: string;
				folder: string;
				filename: string;
			}
			const photoTasks: PhotoTask[] = [];

			// Create ZIP file
			const zip = new JSZip();

			// Helper function to download a photo with timeout
			const downloadPhoto = async (url: string, timeoutMs: number = 20000): Promise<ArrayBuffer | null> => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

				try {
					const response = await fetch(url, { signal: controller.signal });
					clearTimeout(timeoutId);

					if (!response.ok) {
						console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Failed to fetch photo (${response.status}): ${url}`);
						return null;
					}

					const blob = await response.blob();
					return await blob.arrayBuffer();
				} catch (err) {
					clearTimeout(timeoutId);
					if (err instanceof Error && err.name === 'AbortError') {
						console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Photo download timeout (${timeoutMs}ms): ${url}`);
					} else {
						console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Error downloading photo: ${url}`, err);
					}
					return null;
				}
			};

			// Collect Vehicle Identification Photos
			let photoCounter = 1;
			if (vehicleIdentification?.vin_photo_url) {
				photoTasks.push({
					url: vehicleIdentification.vin_photo_url,
					folder: '01_Vehicle_Identification',
					filename: `${photoCounter++}_VIN_Number.jpg`
				});
			}
			if (vehicleIdentification?.registration_photo_url) {
				photoTasks.push({
					url: vehicleIdentification.registration_photo_url,
					folder: '01_Vehicle_Identification',
					filename: `${photoCounter++}_Registration.jpg`
				});
			}
			if (vehicleIdentification?.odometer_photo_url) {
				photoTasks.push({
					url: vehicleIdentification.odometer_photo_url,
					folder: '01_Vehicle_Identification',
					filename: `${photoCounter++}_Odometer.jpg`
				});
			}

			// Collect Exterior 360 Photos
			photoCounter = 1;
			if (exterior360?.front_photo_url) {
				photoTasks.push({
					url: exterior360.front_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Front_View.jpg`
				});
			}
			if (exterior360?.rear_photo_url) {
				photoTasks.push({
					url: exterior360.rear_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Rear_View.jpg`
				});
			}
			if (exterior360?.left_side_photo_url) {
				photoTasks.push({
					url: exterior360.left_side_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Left_Side.jpg`
				});
			}
			if (exterior360?.right_side_photo_url) {
				photoTasks.push({
					url: exterior360.right_side_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Right_Side.jpg`
				});
			}
			if (exterior360?.front_left_photo_url) {
				photoTasks.push({
					url: exterior360.front_left_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Front_Left.jpg`
				});
			}
			if (exterior360?.front_right_photo_url) {
				photoTasks.push({
					url: exterior360.front_right_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Front_Right.jpg`
				});
			}
			if (exterior360?.rear_left_photo_url) {
				photoTasks.push({
					url: exterior360.rear_left_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Rear_Left.jpg`
				});
			}
			if (exterior360?.rear_right_photo_url) {
				photoTasks.push({
					url: exterior360.rear_right_photo_url,
					folder: '02_Exterior_360',
					filename: `${photoCounter++}_Rear_Right.jpg`
				});
			}

			// Collect Interior & Mechanical Photos
			photoCounter = 1;
			if (interiorMechanical?.dashboard_photo_url) {
				photoTasks.push({
					url: interiorMechanical.dashboard_photo_url,
					folder: '03_Interior_Mechanical',
					filename: `${photoCounter++}_Dashboard.jpg`
				});
			}
			if (interiorMechanical?.front_seats_photo_url) {
				photoTasks.push({
					url: interiorMechanical.front_seats_photo_url,
					folder: '03_Interior_Mechanical',
					filename: `${photoCounter++}_Front_Seats.jpg`
				});
			}
			if (interiorMechanical?.rear_seats_photo_url) {
				photoTasks.push({
					url: interiorMechanical.rear_seats_photo_url,
					folder: '03_Interior_Mechanical',
					filename: `${photoCounter++}_Rear_Seats.jpg`
				});
			}
			if (interiorMechanical?.gear_lever_photo_url) {
				photoTasks.push({
					url: interiorMechanical.gear_lever_photo_url,
					folder: '03_Interior_Mechanical',
					filename: `${photoCounter++}_Gear_Lever.jpg`
				});
			}
			if (interiorMechanical?.engine_bay_photo_url) {
				photoTasks.push({
					url: interiorMechanical.engine_bay_photo_url,
					folder: '03_Interior_Mechanical',
					filename: `${photoCounter++}_Engine_Bay.jpg`
				});
			}

			// Collect Tire & Rim Photos
			if (tyres && tyres.length > 0) {
				photoCounter = 1;
				for (const tyre of tyres) {
					const position = (tyre.position_label || tyre.position).replace(/\s+/g, '_');

					if (tyre.face_photo_url) {
						photoTasks.push({
							url: tyre.face_photo_url,
							folder: '04_Tires_and_Rims',
							filename: `${photoCounter++}_${position}_Face.jpg`
						});
					}
					if (tyre.tread_photo_url) {
						photoTasks.push({
							url: tyre.tread_photo_url,
							folder: '04_Tires_and_Rims',
							filename: `${photoCounter++}_${position}_Tread.jpg`
						});
					}
					if (tyre.measurement_photo_url) {
						photoTasks.push({
							url: tyre.measurement_photo_url,
							folder: '04_Tires_and_Rims',
							filename: `${photoCounter++}_${position}_Measurement.jpg`
						});
					}
				}
			}

			// Collect Damage Photos
			if (estimatePhotos && estimatePhotos.length > 0) {
				photoCounter = 1;
				for (const photo of estimatePhotos) {
					const description = photo.description
						? photo.description.replace(/[^a-zA-Z0-9]/g, '_')
						: 'Damage';
					photoTasks.push({
						url: photo.photo_url,
						folder: '05_Damage_Documentation',
						filename: `${photoCounter++}_${description}.jpg`
					});
				}
			}

			// Collect Pre-Incident Photos
			if (preIncidentPhotos && preIncidentPhotos.length > 0) {
				photoCounter = 1;
				for (const photo of preIncidentPhotos) {
					const description = photo.description
						? photo.description.replace(/[^a-zA-Z0-9]/g, '_')
						: 'PreIncident';
					photoTasks.push({
						url: photo.photo_url,
						folder: '06_Pre_Incident',
						filename: `${photoCounter++}_${description}.jpg`
					});
				}
			}

			const totalPhotos = photoTasks.length;
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Total photos to download: ${totalPhotos}`);

			if (totalPhotos === 0) {
				console.warn(`[${new Date().toISOString()}] [Request ${requestId}] No photos found for assessment`);
				yield {
					status: 'error',
					progress: 0,
					error: 'No photos found for this assessment'
				};
				return;
			}

			yield { status: 'processing', progress: 25, message: `Downloading ${totalPhotos} photos...` };

			// Download photos with limited concurrency (5 at a time)
			const CONCURRENCY = 5;
			let completedPhotos = 0;
			let successfulPhotos = 0;
			const startTime = Date.now();

			// Process photos in batches
			for (let i = 0; i < photoTasks.length; i += CONCURRENCY) {
				const batch = photoTasks.slice(i, i + CONCURRENCY);

				// Download batch concurrently
				const results = await Promise.all(
					batch.map(async (task) => {
						const arrayBuffer = await downloadPhoto(task.url);
						if (arrayBuffer) {
							zip.folder(task.folder)?.file(task.filename, arrayBuffer);
							return true;
						}
						return false;
					})
				);

				// Update counters
				completedPhotos += batch.length;
				successfulPhotos += results.filter(r => r).length;

				// Calculate progress (30-80% for photo downloads)
				const downloadProgress = Math.round(30 + (completedPhotos / totalPhotos) * 50);
				const elapsed = Math.round((Date.now() - startTime) / 1000);

				yield {
					status: 'processing',
					progress: downloadProgress,
					message: `Downloaded ${completedPhotos}/${totalPhotos} photos (${elapsed}s)`
				};
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] Downloaded ${successfulPhotos}/${totalPhotos} photos successfully`);

			if (successfulPhotos === 0) {
				yield {
					status: 'error',
					progress: 0,
					error: 'Failed to download any photos'
				};
				return;
			}

			yield { status: 'processing', progress: 80, message: 'Creating ZIP archive...' };

			// Generate ZIP buffer with keep-alive pings
			let zipBuffer: Buffer;
			try {
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Starting ZIP generation...`);

				// Start ZIP generation
				const zipPromise = zip.generateAsync({ type: 'nodebuffer' });

				// Send keep-alive pings every 2 seconds while ZIP generates
				let currentProgress = 82;
				const zipStartTime = Date.now();

				// Poll until ZIP is complete, sending keep-alive pings
				while (true) {
					const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
					const result = await Promise.race([zipPromise, timeoutPromise]);

					// If result is a Buffer, ZIP is complete
					if (result instanceof Buffer) {
						zipBuffer = result;
						break;
					}

					// Otherwise, it was a timeout - send keep-alive ping
					currentProgress = Math.min(currentProgress + 1, 88);
					const elapsed = Math.round((Date.now() - zipStartTime) / 1000);
					console.log(`[${new Date().toISOString()}] [Request ${requestId}] Keep-alive ping: ${currentProgress}% (${elapsed}s elapsed)`);
					yield {
						status: 'processing',
						progress: currentProgress,
						message: `Creating ZIP... (${elapsed}s)`
					};
				}

				console.log(`[${new Date().toISOString()}] [Request ${requestId}] ZIP generation completed. Size: ${zipBuffer.length} bytes`);
			} catch (zipError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] ZIP generation error:`, zipError);
				yield {
					status: 'error',
					progress: 0,
					error: `Failed to create ZIP: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`
				};
				return;
			}

			yield { status: 'processing', progress: 90, message: 'Uploading to storage...' };

			// Upload to Supabase Storage with timestamp to avoid caching
			const timestamp = new Date().getTime();
			const fileName = `${assessment.assessment_number}_Photos_${timestamp}.zip`;
			const filePath = `assessments/${assessmentId}/photos/${fileName}`;

			try {
				const { error: uploadError } = await supabase.storage
					.from('documents')
					.upload(filePath, zipBuffer, {
						contentType: 'application/zip',
						upsert: true
					});

				if (uploadError) {
					console.error(`[${new Date().toISOString()}] [Request ${requestId}] Upload error:`, uploadError);
					yield {
						status: 'error',
						progress: 0,
						error: 'Failed to upload ZIP to storage'
					};
					return;
				}
			} catch (uploadError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Upload exception:`, uploadError);
				yield {
					status: 'error',
					progress: 0,
					error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
				};
				return;
			}

			yield { status: 'processing', progress: 95, message: 'Updating database...' };

			// Get public URL
			const {
				data: { publicUrl }
			} = supabase.storage.from('documents').getPublicUrl(filePath);

			// Update assessment with ZIP URL
			try {
				const { error: updateError } = await supabase
					.from('assessments')
					.update({
						photos_zip_url: publicUrl,
						photos_zip_path: filePath,
						documents_generated_at: new Date().toISOString()
					})
					.eq('id', assessmentId);

				if (updateError) {
					console.error(`[${new Date().toISOString()}] [Request ${requestId}] Update error:`, updateError);
					yield {
						status: 'error',
						progress: 0,
						error: 'Failed to update assessment record'
					};
					return;
				}
			} catch (updateError) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Update exception:`, updateError);
				yield {
					status: 'error',
					progress: 0,
					error: `Database update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`
				};
				return;
			}

			console.log(`[${new Date().toISOString()}] [Request ${requestId}] ✅ Photos ZIP generated successfully`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] File: ${fileName}`);
			console.log(`[${new Date().toISOString()}] [Request ${requestId}] URL: ${publicUrl}`);

			yield {
				status: 'complete',
				progress: 100,
				message: 'Photos ZIP generated successfully!',
				url: publicUrl
			};

		} catch (err) {
			// Catch any unexpected errors
			console.error(`[${new Date().toISOString()}] [Request ${requestId}] === UNEXPECTED ERROR ===`);
			console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error:`, err);
			if (err instanceof Error) {
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error message:`, err.message);
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error stack:`, err.stack);
			}
			console.error(`[${new Date().toISOString()}] [Request ${requestId}] Assessment ID:`, assessmentId);

			yield {
				status: 'error',
				progress: 0,
				error: err instanceof Error ? err.message : 'An unknown error occurred while generating the photos ZIP'
			};
		}
	});
};

