import type { Database } from '$lib/types/database';
import type { GenericSchema } from '@supabase/supabase-js/dist/module/lib/types';

type Schema = Database['public'];
type Test = Schema extends GenericSchema ? true : false;
const isSchema: Test = true;

export type ClientRow = Database['public']['Tables']['clients']['Row'];
