import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStreamingResponse } from '$lib/utils/streaming-response';

interface DocumentResult {
	success: boolean;
	url: string | null;
	error: string | null;
}

interface AllDocumentsResults {
	report: DocumentResult;
	estimate: DocumentResult;
	photosPdf: DocumentResult;
	photosZip: DocumentResult;
}

/**
 * Generate a single document by calling its endpoint and parsing SSE stream
 */
async function generateDocument(
	type: 'report' | 'estimate' | 'photos-pdf' | 'photos-zip',
	assessmentId: string,
	fetch: typeof globalThis.fetch,
	onProgress?: (progress: number, message: string) => void
): Promise<string> {
	const startTime = Date.now();
	console.log(`[${new Date().toISOString()}] Starting ${type} generation for assessment ${assessmentId}`);

	const response = await fetch(`/api/generate-${type}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ assessmentId })
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const errorMsg = errorData.message || `Failed to generate ${type}`;
		console.error(`[${new Date().toISOString()}] ${type} generation failed:`, errorMsg);
		throw new Error(errorMsg);
	}

	// Handle SSE streaming response
	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('No response body');
	}

	const decoder = new TextDecoder();
	let buffer = '';
	let finalUrl = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const messages = buffer.split('\n\n');
			buffer = messages.pop() || '';

			for (const message of messages) {
				if (!message.trim() || !message.startsWith('data: ')) continue;

				const data = JSON.parse(message.replace(/^data: /, ''));

				if (onProgress && typeof data.progress === 'number') {
					onProgress(data.progress, data.message || data.status);
				}

				if (data.status === 'complete' && data.url) {
					finalUrl = data.url;
				}

				if (data.status === 'error') {
					throw new Error(data.error || 'Unknown error');
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	if (!finalUrl) {
		throw new Error('Document generation completed but no URL returned');
	}

	const duration = Date.now() - startTime;
	console.log(`[${new Date().toISOString()}] ${type} generation completed in ${duration}ms`);

	return finalUrl;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = await request.json();
	const assessmentId = body.assessmentId;

	if (!assessmentId) {
		throw error(400, 'Assessment ID is required');
	}

	console.log(`[${new Date().toISOString()}] Starting batch document generation for assessment ${assessmentId}`);

	return createStreamingResponse(async function* () {
		const results: AllDocumentsResults = {
			report: { success: false, url: null, error: null },
			estimate: { success: false, url: null, error: null },
			photosPdf: { success: false, url: null, error: null },
			photosZip: { success: false, url: null, error: null }
		};

		// 1. Generate Report (0-25%)
		yield {
			status: 'processing' as const,
			progress: 0,
			message: 'Generating assessment report...',
			results
		};

		try {
			const reportUrl = await generateDocument('report', assessmentId, fetch, (progress, msg) => {
				// Scale progress to 0-25% range
				const scaledProgress = Math.floor(progress * 0.25);
				// Note: Can't yield inside callback, progress tracked internally
			});
			results.report = { success: true, url: reportUrl, error: null };
			yield {
				status: 'processing' as const,
				progress: 25,
				message: 'Report complete ✓',
				results
			};
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to generate report';
			results.report.error = errorMsg;
			console.error(`[${new Date().toISOString()}] Report generation failed:`, errorMsg);
			yield {
				status: 'processing' as const,
				progress: 25,
				message: 'Report failed ✗',
				results
			};
		}

		// 2. Generate Estimate (25-50%)
		yield {
			status: 'processing' as const,
			progress: 25,
			message: 'Generating estimate document...',
			results
		};

		try {
			const estimateUrl = await generateDocument('estimate', assessmentId, fetch);
			results.estimate = { success: true, url: estimateUrl, error: null };
			yield {
				status: 'processing' as const,
				progress: 50,
				message: 'Estimate complete ✓',
				results
			};
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to generate estimate';
			results.estimate.error = errorMsg;
			console.error(`[${new Date().toISOString()}] Estimate generation failed:`, errorMsg);
			yield {
				status: 'processing' as const,
				progress: 50,
				message: 'Estimate failed ✗',
				results
			};
		}

		// 3. Generate Photos PDF (50-75%)
		yield {
			status: 'processing' as const,
			progress: 50,
			message: 'Generating photos PDF...',
			results
		};

		try {
			const photosPdfUrl = await generateDocument('photos-pdf', assessmentId, fetch);
			results.photosPdf = { success: true, url: photosPdfUrl, error: null };
			yield {
				status: 'processing' as const,
				progress: 75,
				message: 'Photos PDF complete ✓',
				results
			};
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to generate photos PDF';
			results.photosPdf.error = errorMsg;
			console.error(`[${new Date().toISOString()}] Photos PDF generation failed:`, errorMsg);
			yield {
				status: 'processing' as const,
				progress: 75,
				message: 'Photos PDF failed ✗',
				results
			};
		}

		// 4. Generate Photos ZIP (75-100%)
		yield {
			status: 'processing' as const,
			progress: 75,
			message: 'Generating photos ZIP archive...',
			results
		};

		try {
			const photosZipUrl = await generateDocument('photos-zip', assessmentId, fetch);
			results.photosZip = { success: true, url: photosZipUrl, error: null };
			yield {
				status: 'processing' as const,
				progress: 100,
				message: 'Photos ZIP complete ✓',
				results
			};
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to generate photos ZIP';
			results.photosZip.error = errorMsg;
			console.error(`[${new Date().toISOString()}] Photos ZIP generation failed:`, errorMsg);
			yield {
				status: 'processing' as const,
				progress: 100,
				message: 'Photos ZIP failed ✗',
				results
			};
		}

		// Final result
		const successCount = Object.values(results).filter((r) => r.success).length;
		const allSucceeded = successCount === 4;

		console.log(
			`[${new Date().toISOString()}] Batch generation complete: ${successCount}/4 documents succeeded`
		);

		yield {
			status: allSucceeded ? ('complete' as const) : ('partial' as const),
			progress: 100,
			message: allSucceeded
				? 'All documents generated successfully!'
				: `${successCount}/4 documents generated. Some failed.`,
			results
		};
	});
};

