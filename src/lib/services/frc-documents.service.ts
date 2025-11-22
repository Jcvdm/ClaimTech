import { supabase } from '$lib/supabase';
import type { FRCDocument, CreateFRCDocumentInput } from '$lib/types/assessment';
import { storageService } from './storage.service';
import { auditService } from './audit.service';
import type { ServiceClient } from '$lib/types/service';

class FRCDocumentsService {
	/**
	 * Get all documents for an FRC
	 */
	async getDocumentsByFRC(frcId: string, client?: ServiceClient): Promise<FRCDocument[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_frc_documents')
			.select('*')
			.eq('frc_id', frcId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching FRC documents:', error);
			throw error;
		}

		return (data as unknown as FRCDocument[]) || [];
	}

	/**
	 * Create a document record
	 */
	async createDocument(input: CreateFRCDocumentInput, client?: ServiceClient): Promise<FRCDocument> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_frc_documents')
			.insert({
				frc_id: input.frc_id,
				document_url: input.document_url,
				document_path: input.document_path,
				label: input.label || null,
				document_type: input.document_type || 'invoice',
				file_size_bytes: input.file_size_bytes || null
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating FRC document:', error);
			throw new Error(`Failed to create document: ${error.message}`);
		}

		// Log audit
		await auditService.logChange({
			entity_type: 'frc_document',
			entity_id: data.id,
			action: 'created',
			new_value: input.label || 'Document uploaded',
			metadata: {
				frc_id: input.frc_id,
				document_type: input.document_type || 'invoice'
			}
		});

		return data as unknown as FRCDocument;
	}

	/**
	 * Upload a document file and create record
	 */
	async uploadDocument(
		file: File,
		frcId: string,
		assessmentId: string,
		label?: string,
		documentType: 'invoice' | 'attachment' = 'invoice',
		client?: ServiceClient
	): Promise<FRCDocument> {
		// Upload to storage
		const folder = `assessments/${assessmentId}/documents/frc`;
		const result = await storageService.uploadPdf(file, { folder });

		// Create document record
		return this.createDocument({
			frc_id: frcId,
			document_url: result.url,
			document_path: result.path,
			label: label || file.name,
			document_type: documentType,
			file_size_bytes: file.size
		}, client);
	}

	/**
	 * Delete a document (removes from storage and database)
	 */
	async deleteDocument(documentId: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;

		// Get document to retrieve path
		const { data: document, error: fetchError } = await db
			.from('assessment_frc_documents')
			.select('*')
			.eq('id', documentId)
			.single();

		if (fetchError) {
			console.error('Error fetching document for deletion:', fetchError);
			throw new Error(`Failed to fetch document: ${fetchError.message}`);
		}

		// Delete from storage
		try {
			await storageService.deletePhoto(document.document_path, 'documents');
		} catch (err) {
			console.warn('Failed to delete file from storage:', err);
			// Continue with database deletion even if storage deletion fails
		}

		// Delete from database
		const { error: deleteError } = await db
			.from('assessment_frc_documents')
			.delete()
			.eq('id', documentId);

		if (deleteError) {
			console.error('Error deleting FRC document:', deleteError);
			throw new Error(`Failed to delete document: ${deleteError.message}`);
		}

		// Log audit
		await auditService.logChange({
			entity_type: 'frc_document',
			entity_id: documentId,
			action: 'updated',
			field_name: 'deleted',
			old_value: document.label || 'Document',
			new_value: 'deleted',
			metadata: {
				frc_id: document.frc_id
			}
		});
	}

	/**
	 * Update document label
	 */
	async updateDocumentLabel(documentId: string, label: string, client?: ServiceClient): Promise<FRCDocument> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_frc_documents')
			.update({
				label,
				updated_at: new Date().toISOString()
			})
			.eq('id', documentId)
			.select()
			.single();

		if (error) {
			console.error('Error updating document label:', error);
			throw new Error(`Failed to update document label: ${error.message}`);
		}

		return data as unknown as FRCDocument;
	}
}

export const frcDocumentsService = new FRCDocumentsService();

