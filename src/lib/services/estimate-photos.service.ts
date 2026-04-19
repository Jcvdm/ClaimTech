import { createPhotoService } from './photo-service-factory';
import type {
	EstimatePhoto,
	CreateEstimatePhotoInput,
	UpdateEstimatePhotoInput
} from '$lib/types/assessment';

const base = createPhotoService<
	'estimate_photos',
	CreateEstimatePhotoInput,
	UpdateEstimatePhotoInput,
	EstimatePhoto
>({
	table: 'estimate_photos',
	parentIdField: 'estimate_id',
	label: 'estimate photos'
});

export const estimatePhotosService = {
	...base,
	// Preserve historical API used by callsites
	getPhotosByEstimate: base.getPhotos
};

export type { EstimatePhoto, CreateEstimatePhotoInput, UpdateEstimatePhotoInput };
