import { supabase } from '$lib/supabaseClient';
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
		const response = await fetch(`/api/generate-${documentType}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ assessmentId })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to generate document');
		}

		const { url } = await response.json();
		return url;
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
		const response = await fetch('/api/generate-all-documents', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ assessmentId })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to generate documents');
		}

		return await response.json();
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

