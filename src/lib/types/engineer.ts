export interface Engineer {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	specialization?: string | null;
	is_active: boolean;
	created_at: string;
}

export interface CreateEngineerInput {
	name: string;
	email: string;
	phone?: string;
	specialization?: string;
}

export interface UpdateEngineerInput extends Partial<CreateEngineerInput> {
	is_active?: boolean;
}

