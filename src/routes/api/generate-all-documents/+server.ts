import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { assessmentId } = await request.json();

		if (!assessmentId) {
			throw error(400, 'Assessment ID is required');
		}

		// Generate all documents in parallel
		const [reportResponse, estimateResponse, photosPdfResponse, photosZipResponse] =
			await Promise.allSettled([
				fetch('/api/generate-report', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ assessmentId })
				}),
				fetch('/api/generate-estimate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ assessmentId })
				}),
				fetch('/api/generate-photos-pdf', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ assessmentId })
				}),
				fetch('/api/generate-photos-zip', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ assessmentId })
				})
			]);

		// Process results
		const results = {
			report: { success: false, url: null, error: null },
			estimate: { success: false, url: null, error: null },
			photosPdf: { success: false, url: null, error: null },
			photosZip: { success: false, url: null, error: null }
		};

		// Report
		if (reportResponse.status === 'fulfilled' && reportResponse.value.ok) {
			const data = await reportResponse.value.json();
			results.report = { success: true, url: data.url, error: null };
		} else if (reportResponse.status === 'rejected') {
			results.report.error = reportResponse.reason?.message || 'Failed to generate report';
		} else if (reportResponse.status === 'fulfilled') {
			const errorData = await reportResponse.value.json().catch(() => ({}));
			results.report.error = errorData.message || 'Failed to generate report';
		}

		// Estimate
		if (estimateResponse.status === 'fulfilled' && estimateResponse.value.ok) {
			const data = await estimateResponse.value.json();
			results.estimate = { success: true, url: data.url, error: null };
		} else if (estimateResponse.status === 'rejected') {
			results.estimate.error = estimateResponse.reason?.message || 'Failed to generate estimate';
		} else if (estimateResponse.status === 'fulfilled') {
			const errorData = await estimateResponse.value.json().catch(() => ({}));
			results.estimate.error = errorData.message || 'Failed to generate estimate';
		}

		// Photos PDF
		if (photosPdfResponse.status === 'fulfilled' && photosPdfResponse.value.ok) {
			const data = await photosPdfResponse.value.json();
			results.photosPdf = { success: true, url: data.url, error: null };
		} else if (photosPdfResponse.status === 'rejected') {
			results.photosPdf.error = photosPdfResponse.reason?.message || 'Failed to generate photos PDF';
		} else if (photosPdfResponse.status === 'fulfilled') {
			const errorData = await photosPdfResponse.value.json().catch(() => ({}));
			results.photosPdf.error = errorData.message || 'Failed to generate photos PDF';
		}

		// Photos ZIP
		if (photosZipResponse.status === 'fulfilled' && photosZipResponse.value.ok) {
			const data = await photosZipResponse.value.json();
			results.photosZip = { success: true, url: data.url, error: null };
		} else if (photosZipResponse.status === 'rejected') {
			results.photosZip.error = photosZipResponse.reason?.message || 'Failed to generate photos ZIP';
		} else if (photosZipResponse.status === 'fulfilled') {
			const errorData = await photosZipResponse.value.json().catch(() => ({}));
			results.photosZip.error = errorData.message || 'Failed to generate photos ZIP';
		}

		// Check if all succeeded
		const allSucceeded =
			results.report.success &&
			results.estimate.success &&
			results.photosPdf.success &&
			results.photosZip.success;

		return json({
			success: allSucceeded,
			results
		});
	} catch (err) {
		console.error('Error generating all documents:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to generate all documents');
	}
};

