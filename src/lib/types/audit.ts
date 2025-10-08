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
	| 'estimate';

export type AuditAction =
	| 'created'
	| 'updated'
	| 'status_changed'
	| 'assigned'
	| 'cancelled'
	| 'accepted'
	| 'appointed'
	| 'completed';

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

