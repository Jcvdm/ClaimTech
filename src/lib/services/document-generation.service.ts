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
	 * Generate a specific document
	 */
	async generateDocument(assessmentId: string, documentType: DocumentType): Promise<string> {
		try {
			// Convert underscores to hyphens for API route (e.g., photos_pdf -> photos-pdf)
			const apiPath = documentType.replace(/_/g, '-');

			console.log(`Generating ${documentType} for assessment ${assessmentId}...`);

			// Create abort controller with 2 minute timeout for PDF generation
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

			const response = await fetch(`/api/generate-${apiPath}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assessmentId }),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

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

			const { url } = await response.json();
			console.log(`${documentType} generated successfully:`, url);
			return url;
		} catch (error) {
			// Handle abort/timeout errors
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.error(`Timeout generating ${documentType}:`, error);
				throw new Error(`Generation timeout: PDF generation is taking longer than expected. Please try again or contact support if the issue persists.`);
			}

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

