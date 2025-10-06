export type Province =
	| 'Eastern Cape'
	| 'Free State'
	| 'Gauteng'
	| 'KwaZulu-Natal'
	| 'Limpopo'
	| 'Mpumalanga'
	| 'Northern Cape'
	| 'North West'
	| 'Western Cape';

export type CompanyType = 'internal' | 'external';

export interface Engineer {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	specialization?: string | null;
	province?: Province | null;
	company_name?: string | null;
	company_type?: CompanyType | null;
	is_active: boolean;
	created_at: string;
	updated_at?: string;
}

export interface CreateEngineerInput {
	name: string;
	email: string;
	phone?: string;
	specialization?: string;
	province?: Province;
	company_name?: string;
	company_type?: CompanyType;
}

export interface UpdateEngineerInput extends Partial<CreateEngineerInput> {
	is_active?: boolean;
}

// Helper constant for province options
export const PROVINCES: Province[] = [
	'Eastern Cape',
	'Free State',
	'Gauteng',
	'KwaZulu-Natal',
	'Limpopo',
	'Mpumalanga',
	'Northern Cape',
	'North West',
	'Western Cape'
];

// Helper function to get province options for forms
export function getProvinceOptions() {
	return [
		{ value: '', label: 'Select province...' },
		...PROVINCES.map((province) => ({ value: province, label: province }))
	];
}

