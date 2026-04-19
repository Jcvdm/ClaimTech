import { createPhotoService } from './photo-service-factory';
import type {
	PreIncidentEstimatePhoto,
	CreatePreIncidentEstimatePhotoInput,
	UpdatePreIncidentEstimatePhotoInput
} from '$lib/types/assessment';

const base = createPhotoService<
	'pre_incident_estimate_photos',
	CreatePreIncidentEstimatePhotoInput,
	UpdatePreIncidentEstimatePhotoInput,
	PreIncidentEstimatePhoto
>({
	table: 'pre_incident_estimate_photos',
	parentIdField: 'estimate_id',
	label: 'pre-incident estimate photos'
});

export const preIncidentEstimatePhotosService = {
	...base,
	// Preserve historical API used by callsites
	getPhotosByEstimate: base.getPhotos
};

export type {
	PreIncidentEstimatePhoto,
	CreatePreIncidentEstimatePhotoInput,
	UpdatePreIncidentEstimatePhotoInput
};
