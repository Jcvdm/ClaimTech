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
			const response = await fetch(`/api/generate-${documentType}`, {
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

			const { url } = await response.json();
			return url;
		} catch (error) {
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
	 */
	downloadDocument(url: string, filename: string): void {
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
	}
}

export const documentGenerationService = new DocumentGenerationService();

