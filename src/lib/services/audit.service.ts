import { supabase } from '$lib/supabase';
import type { AuditLog, CreateAuditLogInput, EntityType } from '$lib/types/audit';

export class AuditService {
	/**
	 * Log a change to an entity
	 */
	async logChange(input: CreateAuditLogInput): Promise<AuditLog | null> {
		try {
			const { data, error } = await supabase
				.from('audit_logs')
				.insert({
					entity_type: input.entity_type,
					entity_id: input.entity_id,
					action: input.action,
					field_name: input.field_name || null,
					old_value: input.old_value || null,
					new_value: input.new_value || null,
					changed_by: input.changed_by || 'System',
					metadata: input.metadata || null
				})
				.select()
				.single();

			if (error) {
				console.error('Error logging audit change:', error);
				// Don't throw - audit logging should not break the main flow
				return null;
			}

			return data;
		} catch (err) {
			console.error('Error in audit logging:', err);
			return null;
		}
	}

	/**
	 * Get audit history for a specific entity
	 */
	async getEntityHistory(entityType: EntityType, entityId: string): Promise<AuditLog[]> {
		try {
			const { data, error } = await supabase
				.from('audit_logs')
				.select('*')
				.eq('entity_type', entityType)
				.eq('entity_id', entityId)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Error fetching audit history:', error);
				throw new Error(`Failed to fetch audit history: ${error.message}`);
			}

			return data || [];
		} catch (err) {
			console.error('Error fetching audit history:', err);
			return [];
		}
	}

	/**
	 * Get recent audit logs across all entities
	 */
	async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
		try {
			const { data, error } = await supabase
				.from('audit_logs')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(limit);

			if (error) {
				console.error('Error fetching recent logs:', error);
				throw new Error(`Failed to fetch recent logs: ${error.message}`);
			}

			return data || [];
		} catch (err) {
			console.error('Error fetching recent logs:', err);
			return [];
		}
	}

	/**
	 * Get audit logs by action type
	 */
	async getLogsByAction(action: string, limit: number = 50): Promise<AuditLog[]> {
		try {
			const { data, error } = await supabase
				.from('audit_logs')
				.select('*')
				.eq('action', action)
				.order('created_at', { ascending: false })
				.limit(limit);

			if (error) {
				console.error('Error fetching logs by action:', error);
				throw new Error(`Failed to fetch logs by action: ${error.message}`);
			}

			return data || [];
		} catch (err) {
			console.error('Error fetching logs by action:', err);
			return [];
		}
	}
}

export const auditService = new AuditService();

