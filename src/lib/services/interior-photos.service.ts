import { createPhotoService } from './photo-service-factory';
import type {
	InteriorPhoto,
	CreateInteriorPhotoInput,
	UpdateInteriorPhotoInput
} from '$lib/types/assessment';

const base = createPhotoService<
	'assessment_interior_photos',
	CreateInteriorPhotoInput,
	UpdateInteriorPhotoInput,
	InteriorPhoto
>({
	table: 'assessment_interior_photos',
	parentIdField: 'assessment_id',
	label: 'interior photos'
});

export const interiorPhotosService = {
	...base,
	// Preserve historical API used by callsites
	getPhotosByAssessment: base.getPhotos
};

export type { InteriorPhoto, CreateInteriorPhotoInput, UpdateInteriorPhotoInput };
