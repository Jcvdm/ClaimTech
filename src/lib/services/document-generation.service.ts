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

		return {
			report_generated,
			estimate_generated,
			photos_pdf_generated,
			photos_zip_generated,
			all_generated:
				report_generated && estimate_generated && photos_pdf_generated && photos_zip_generated,
			generated_at: data.documents_generated_at
		};
	}

	/**
	 * Generate a specific document with streaming progress updates
	 * @param onProgress - Optional callback to receive progress updates (0-100)
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
			console.log('⏱️  Streaming progress updates enabled - no timeout needed!');

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

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				// Decode chunk and add to buffer
				buffer += decoder.decode(value, { stream: true });

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
							console.log(`${documentType} generated successfully:`, finalUrl);
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
	 * Generate all documents
	 */
	async generateAllDocuments(assessmentId: string): Promise<{
		reportUrl: string;
		estimateUrl: string;
		photosPdfUrl: string;
		photosZipUrl: string;
	}> {
		try {
			const response = await fetch('/api/generate-all-documents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assessmentId })
			});

			if (!response.ok) {
				// Try to parse JSON error response
				let errorMessage = 'Failed to generate documents';
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

			return await response.json();
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
}

export const documentGenerationService = new DocumentGenerationService();

