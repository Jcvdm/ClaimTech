import { supabase } from '$lib/supabase';
import type { DocumentGenerationStatus, DocumentType } from '$lib/types/assessment';

class DocumentGenerationService {
	/**
	 * Get document generation status for an assessment
	 */
	async getGenerationStatus(assessmentId: string): Promise<DocumentGenerationStatus> {
		const { data, error } = await supabase
			.from('assessments')
			.select(
				'report_pdf_url, estimate_pdf_url, photos_pdf_url, photos_zip_url, documents_generated_at'
			)
			.eq('id', assessmentId)
			.single();

		if (error) {
			console.error('Error fetching generation status:', error);
			return {
				report_generated: false,
				estimate_generated: false,
				photos_pdf_generated: false,
				photos_zip_generated: false,
				all_generated: false,
				generated_at: null
			};
		}

		const report_generated = !!data.report_pdf_url;
		const estimate_generated = !!data.estimate_pdf_url;
		const photos_pdf_generated = !!data.photos_pdf_url;
		const photos_zip_generated = !!data.photos_zip_url;

		// Fetch FRC and Additionals document URLs
		const [{ data: frc }, { data: additionals }] = await Promise.all([
			supabase.from('assessment_frc').select('frc_report_url').eq('assessment_id', assessmentId).single(),
			supabase
				.from('assessment_additionals')
				.select('additionals_letter_url')
				.eq('assessment_id', assessmentId)
				.single()
		]);

		const frc_report_generated = !!frc?.frc_report_url;
		const additionals_letter_generated = !!additionals?.additionals_letter_url;

		return {
			report_generated,
			estimate_generated,
			photos_pdf_generated,
			photos_zip_generated,
			frc_report_generated,
			additionals_letter_generated,
			all_generated:
				report_generated && estimate_generated && photos_pdf_generated && photos_zip_generated && frc_report_generated && additionals_letter_generated,
			generated_at: data.documents_generated_at
		};
	}

	/**
	 * Generate a specific document with streaming progress updates
	 * @param onProgress - Optional callback to receive progress updates (0-100)
	 * @returns Document URL or throws error with timeout flag
	 */
    async generateDocument(
        assessmentId: string,
        documentType: DocumentType,
		onProgress?: (progress: number, message: string) => void
	): Promise<string> {
		try {
            // Convert underscores to hyphens for API route (e.g., photos_pdf -> photos-pdf)
            const apiPath = documentType.replace(/_/g, '-');

			console.log(`Generating ${documentType} for assessment ${assessmentId}...`);
			console.log('⏱️  Streaming progress updates enabled - timeout detection active');

			// Start timer to detect Vercel Hobby 10s timeout
			const startTime = Date.now();
			const HOBBY_TIMEOUT_WARNING = 7000; // 7 seconds - warn before 10s limit

            const response = await fetch(`/api/generate-${apiPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId })
            });

			if (!response.ok) {
				// Try to parse JSON error response
				let errorMessage = `Failed to generate ${documentType}`;
				try {
					const error = await response.json();
					errorMessage = error.message || errorMessage;
				} catch (jsonError) {
					// Response is not JSON (probably HTML error page)
					const text = await response.text();
					console.error('Non-JSON error response:', text.substring(0, 500));
					errorMessage = `Server error (${response.status}): ${response.statusText}`;
				}
				throw new Error(errorMessage);
			}

			// Handle Server-Sent Events stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error('Response body is not readable');
			}

		let finalUrl = '';
		let buffer = '';
		let lastUpdateTime = Date.now();

		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			// Decode chunk and add to buffer
			buffer += decoder.decode(value, { stream: true });
			lastUpdateTime = Date.now();

			// Check if we're approaching Hobby timeout
			const elapsed = lastUpdateTime - startTime;
			if (elapsed > HOBBY_TIMEOUT_WARNING && !finalUrl) {
				console.warn(`⚠️ Generation taking longer than ${HOBBY_TIMEOUT_WARNING}ms - may timeout on Hobby plan`);
			}

			// Process complete SSE messages (separated by \n\n)
			const messages = buffer.split('\n\n');
			buffer = messages.pop() || ''; // Keep incomplete message in buffer

			for (const message of messages) {
				if (!message.trim() || !message.startsWith('data: ')) continue;

				try {
					// Parse SSE data
					const jsonStr = message.replace(/^data: /, '');
					const data = JSON.parse(jsonStr);

					console.log(`Progress: ${data.progress}% - ${data.message || data.status}`);

					// Call progress callback if provided
					if (onProgress && typeof data.progress === 'number') {
						onProgress(data.progress, data.message || data.status);
					}

					// Handle completion
					if (data.status === 'complete' && data.url) {
						finalUrl = data.url;
						const totalTime = Date.now() - startTime;
						console.log(`${documentType} generated successfully in ${totalTime}ms:`, finalUrl);
					}

					// Handle error
					if (data.status === 'error') {
						throw new Error(data.error || 'Unknown error occurred');
					}
				} catch (parseError) {
					console.error('Error parsing SSE message:', message, parseError);
				}
			}
		}

			if (!finalUrl) {
				throw new Error('Document generation completed but no URL was returned');
			}

			return finalUrl;
		} catch (error) {
			// Handle network errors specifically
			if (error instanceof TypeError && error.message.includes('fetch')) {
				console.error(`Network error generating ${documentType}:`, error);
				throw new Error(`Network error: Unable to connect to server. Please check your connection and try again.`);
			}

			console.error(`Error generating ${documentType}:`, error);
			throw error;
		}
	}

	/**
	 * Generate all documents with streaming progress updates
	 * @param onProgress - Callback to receive progress updates for each document
	 * @returns Object with URLs for all generated documents
	 */
	async generateAllDocuments(
		assessmentId: string,
		onProgress?: (
			documentType: 'report' | 'estimate' | 'photosPdf' | 'photosZip',
			progress: number,
			message: string,
			url: string | null,
			error: string | null
		) => void
	): Promise<{
		success: boolean;
		reportUrl: string | null;
		estimateUrl: string | null;
		photosPdfUrl: string | null;
		photosZipUrl: string | null;
		errors: string[];
	}> {
		try {
			console.log(`Starting batch document generation for assessment ${assessmentId}...`);

			const response = await fetch('/api/generate-all-documents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assessmentId })
			});

			if (!response.ok) {
				let errorMessage = 'Failed to generate documents';
				try {
					const error = await response.json();
					errorMessage = error.message || errorMessage;
				} catch (jsonError) {
					const text = await response.text();
					console.error('Non-JSON error response:', text.substring(0, 500));
					errorMessage = `Server error (${response.status}): ${response.statusText}`;
				}
				throw new Error(errorMessage);
			}

			// Handle SSE streaming response
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error('Response body is not readable');
			}

			let buffer = '';
			let finalResults: any = null;

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				// Process complete SSE messages
				const messages = buffer.split('\n\n');
				buffer = messages.pop() || '';

				for (const message of messages) {
					if (!message.trim() || !message.startsWith('data: ')) continue;

					try {
						const jsonStr = message.replace(/^data: /, '');
						const data = JSON.parse(jsonStr);

						console.log(
							`Batch Progress: ${data.progress}% - ${data.message || data.status}`
						);

						// Update progress for each document if results are provided
						if (data.results && onProgress) {
							const results = data.results;

							// Report progress
							if (results.report) {
								onProgress(
									'report',
									results.report.success ? 100 : 0,
									results.report.success ? 'Complete' : results.report.error || 'Pending',
									results.report.url,
									results.report.error
								);
							}

							// Estimate progress
							if (results.estimate) {
								onProgress(
									'estimate',
									results.estimate.success ? 100 : 0,
									results.estimate.success
										? 'Complete'
										: results.estimate.error || 'Pending',
									results.estimate.url,
									results.estimate.error
								);
							}

							// Photos PDF progress
							if (results.photosPdf) {
								onProgress(
									'photosPdf',
									results.photosPdf.success ? 100 : 0,
									results.photosPdf.success
										? 'Complete'
										: results.photosPdf.error || 'Pending',
									results.photosPdf.url,
									results.photosPdf.error
								);
							}

							// Photos ZIP progress
							if (results.photosZip) {
								onProgress(
									'photosZip',
									results.photosZip.success ? 100 : 0,
									results.photosZip.success
										? 'Complete'
										: results.photosZip.error || 'Pending',
									results.photosZip.url,
									results.photosZip.error
								);
							}
						}

						// Store final results
						if (
							data.status === 'complete' ||
							data.status === 'partial' ||
							data.status === 'error'
						) {
							finalResults = data.results;
						}
					} catch (parseError) {
						console.error('Error parsing SSE message:', message, parseError);
					}
				}
			}

			if (!finalResults) {
				throw new Error('Document generation completed but no results were returned');
			}

			// Collect errors
			const errors: string[] = [];
			if (finalResults.report?.error) errors.push(`Report: ${finalResults.report.error}`);
			if (finalResults.estimate?.error)
				errors.push(`Estimate: ${finalResults.estimate.error}`);
			if (finalResults.photosPdf?.error)
				errors.push(`Photos PDF: ${finalResults.photosPdf.error}`);
			if (finalResults.photosZip?.error)
				errors.push(`Photos ZIP: ${finalResults.photosZip.error}`);

			const success =
				finalResults.report?.success &&
				finalResults.estimate?.success &&
				finalResults.photosPdf?.success &&
				finalResults.photosZip?.success;

			console.log(
				`Batch generation complete: ${success ? 'All succeeded' : `${errors.length} failed`}`
			);

			return {
				success,
				reportUrl: finalResults.report?.url || null,
				estimateUrl: finalResults.estimate?.url || null,
				photosPdfUrl: finalResults.photosPdf?.url || null,
				photosZipUrl: finalResults.photosZip?.url || null,
				errors
			};
		} catch (error) {
			console.error('Error generating all documents:', error);
			throw error;
		}
	}

	/**
	 * Download a document
	 * Opens in new tab instead of navigating current page
	 */
	downloadDocument(url: string, filename: string): void {
		// Open in new tab - this prevents navigating away from current page
		window.open(url, '_blank');
	}

	/**
	 * Get print URL for client-side fallback (Hobby plan workaround)
	 */
	getPrintUrl(assessmentId: string, documentType: 'estimate' | 'frc' | 'report'): string {
		return `/print/${documentType}/${assessmentId}`;
	}
}

export const documentGenerationService = new DocumentGenerationService();

