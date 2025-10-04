import type { Client } from './client';
import type { Request, RequestTask } from './request';
import type { Engineer } from './engineer';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			clients: {
				Row: Client;
				Insert: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
					is_active?: boolean;
				};
				Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>;
			};
			requests: {
				Row: Request;
				Insert: Omit<
					Request,
					'id' | 'request_number' | 'created_at' | 'updated_at' | 'status' | 'current_step'
				> & {
					request_number?: string;
					status?: Request['status'];
					current_step?: Request['current_step'];
				};
				Update: Partial<Omit<Request, 'id' | 'created_at' | 'updated_at'>>;
			};
			request_tasks: {
				Row: RequestTask;
				Insert: Omit<RequestTask, 'id' | 'created_at' | 'updated_at' | 'status'> & {
					status?: RequestTask['status'];
				};
				Update: Partial<Omit<RequestTask, 'id' | 'created_at' | 'updated_at'>>;
			};
			engineers: {
				Row: Engineer;
				Insert: Omit<Engineer, 'id' | 'created_at' | 'is_active'> & {
					is_active?: boolean;
				};
				Update: Partial<Omit<Engineer, 'id' | 'created_at'>>;
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
}

