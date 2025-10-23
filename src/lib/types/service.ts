import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Type alias for Supabase client with Database schema
 * Used across all services to accept authenticated client instances
 * 
 * Usage in services:
 * - Server-side: Pass `locals.supabase` from +page.server.ts
 * - Client-side: Pass `$page.data.supabase` from Svelte components
 * 
 * @example
 * ```ts
 * // In service
 * async listItems(client: ServiceClient): Promise<Item[]> {
 *   const { data } = await client.from('items').select('*');
 *   return data || [];
 * }
 * 
 * // In +page.server.ts
 * export const load: PageServerLoad = async ({ locals }) => {
 *   const items = await itemService.listItems(locals.supabase);
 *   return { items };
 * };
 * ```
 */
export type ServiceClient = SupabaseClient<Database>;

