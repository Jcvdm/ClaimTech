import { supabase } from '$lib/supabase';
import type {
	RequestTask,
	CreateTaskInput,
	UpdateTaskInput,
	TaskStatus
} from '$lib/types/request';
import type { ServiceClient } from '$lib/types/service';

export class TaskService {
	/**
	 * List all tasks for a request
	 */
	async listTasksForRequest(requestId: string, client?: ServiceClient): Promise<RequestTask[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('request_tasks')
			.select('*')
			.eq('request_id', requestId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching tasks:', error);
			throw new Error(`Failed to fetch tasks: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get a single task by ID
	 */
	async getTask(id: string, client?: ServiceClient): Promise<RequestTask | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('request_tasks')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching task:', error);
			throw new Error(`Failed to fetch task: ${error.message}`);
		}

		return data;
	}

	/**
	 * Create a new task
	 */
	async createTask(input: CreateTaskInput, client?: ServiceClient): Promise<RequestTask> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('request_tasks')
			.insert({
				...input,
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating task:', error);
			throw new Error(`Failed to create task: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update an existing task
	 */
	async updateTask(id: string, input: UpdateTaskInput, client?: ServiceClient): Promise<RequestTask | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('request_tasks')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error updating task:', error);
			throw new Error(`Failed to update task: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update task status
	 */
	async updateTaskStatus(id: string, status: TaskStatus, client?: ServiceClient): Promise<RequestTask | null> {
		const updateData: UpdateTaskInput = { status };

		// If marking as completed, set completed_at timestamp
		if (status === 'completed') {
			updateData.completed_at = new Date().toISOString();
		}

		return this.updateTask(id, updateData, client);
	}

	/**
	 * Delete a task
	 */
	async deleteTask(id: string, client?: ServiceClient): Promise<boolean> {
		const db = client ?? supabase;

		const { error } = await db.from('request_tasks').delete().eq('id', id);

		if (error) {
			console.error('Error deleting task:', error);
			throw new Error(`Failed to delete task: ${error.message}`);
		}

		return true;
	}

	/**
	 * Get tasks assigned to an engineer
	 */
	async getTasksByEngineer(engineerId: string, client?: ServiceClient): Promise<RequestTask[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('request_tasks')
			.select('*')
			.eq('assigned_to', engineerId)
			.order('due_date', { ascending: true, nullsFirst: false });

		if (error) {
			console.error('Error fetching tasks by engineer:', error);
			throw new Error(`Failed to fetch tasks by engineer: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get tasks by status
	 */
	async getTasksByStatus(status: TaskStatus, client?: ServiceClient): Promise<RequestTask[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('request_tasks')
			.select('*')
			.eq('status', status)
			.order('due_date', { ascending: true, nullsFirst: false });

		if (error) {
			console.error('Error fetching tasks by status:', error);
			throw new Error(`Failed to fetch tasks by status: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get overdue tasks
	 */
	async getOverdueTasks(client?: ServiceClient): Promise<RequestTask[]> {
		const db = client ?? supabase;

		const today = new Date().toISOString().split('T')[0];

		const { data, error } = await db
			.from('request_tasks')
			.select('*')
			.lt('due_date', today)
			.neq('status', 'completed')
			.order('due_date', { ascending: true });

		if (error) {
			console.error('Error fetching overdue tasks:', error);
			throw new Error(`Failed to fetch overdue tasks: ${error.message}`);
		}

		return data || [];
	}
}

export const taskService = new TaskService();

