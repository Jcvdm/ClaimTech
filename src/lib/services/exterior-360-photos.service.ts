import { createPhotoService } from './photo-service-factory';
import type {
	Exterior360Photo,
	CreateExterior360PhotoInput,
	UpdateExterior360PhotoInput
} from '$lib/types/assessment';

const base = createPhotoService<
	'assessment_exterior_360_photos',
	CreateExterior360PhotoInput,
	UpdateExterior360PhotoInput,
	Exterior360Photo
>({
	table: 'assessment_exterior_360_photos',
	parentIdField: 'assessment_id',
	label: 'exterior 360 photos'
});

export const exterior360PhotosService = {
	...base,
	// Preserve historical API used by callsites
	getPhotosByAssessment: base.getPhotos
};

export type { Exterior360Photo, CreateExterior360PhotoInput, UpdateExterior360PhotoInput };
