import type { SupabaseClient } from '@supabase/supabase-js';

export function createShopJobPhotosService(supabase: SupabaseClient) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = supabase as any;

	return {
		async getPhotos(jobId: string, category?: string) {
			let query = db
				.from('shop_job_photos')
				.select('*')
				.eq('job_id', jobId)
				.order('sort_order')
				.order('created_at');
			if (category) query = query.eq('category', category);
			return query;
		},

		async getPhotosByLabelPrefix(jobId: string, prefix: string) {
			return db
				.from('shop_job_photos')
				.select('*')
				.eq('job_id', jobId)
				.ilike('label', `${prefix}%`)
				.order('sort_order');
		},

		async createPhoto(data: {
			job_id: string;
			storage_path: string;
			label: string;
			category: string;
			sort_order?: number;
		}) {
			return db.from('shop_job_photos').insert(data).select().single();
		},

		async updateLabel(photoId: string, label: string) {
			return db
				.from('shop_job_photos')
				.update({ label })
				.eq('id', photoId)
				.select()
				.single();
		},

		async deletePhoto(photoId: string) {
			return db.from('shop_job_photos').delete().eq('id', photoId);
		}
	};
}
