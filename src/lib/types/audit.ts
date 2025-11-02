export type EntityType =
	| 'request'
	| 'inspection'
	| 'task'
	| 'client'
	| 'engineer'
	| 'appointment'
	| 'assessment'
	| 'vehicle_identification'
	| 'exterior_360'
	| 'accessory'
	| 'interior_mechanical'
	| 'tyre'
	| 'damage_record'
	| 'vehicle_values'
	| 'estimate'
	| 'pre_incident_estimate'
	| 'frc'
	| 'frc_document'
	| 'estimate_line_item'
	| 'assessment_notes';

export type AuditAction =
	| 'created'
	| 'updated'
	| 'status_changed'
	| 'assigned'
	| 'cancelled'
	| 'accepted'
	| 'appointed'
	| 'completed'
	| 'line_item_added'
	| 'line_item_updated'
	| 'line_item_deleted'
	| 'line_item_approved'
	| 'line_item_declined'
	| 'line_item_reversed'
	| 'line_item_reinstated'
	| 'original_line_removed'
	| 'rates_updated'
	| 'frc_completed'
	| 'frc_merged'
	| 'stage_transition'
	| 'assessment_created';

export interface AuditLog {
	id: string;
	entity_type: EntityType;
	entity_id: string;
	action: AuditAction;
	field_name?: string | null;
	old_value?: string | null;
	new_value?: string | null;
	changed_by?: string | null;
	metadata?: Record<string, any> | null;
	created_at: string;
}

export interface CreateAuditLogInput {
	entity_type: EntityType;
	entity_id: string;
	action: AuditAction;
	field_name?: string;
	old_value?: string;
	new_value?: string;
	changed_by?: string;
	metadata?: Record<string, any>;
}

