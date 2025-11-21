export type UserRole = 'admin' | 'engineer';

export interface UserProfile {
	id: string;
	email: string;
	full_name?: string | null;
	role: UserRole;
	province?: string | null;
	company?: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}
