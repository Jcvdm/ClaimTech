import { createPhotoService } from './photo-service-factory';
import type {
	AdditionalsPhoto,
	CreateAdditionalsPhotoInput,
	UpdateAdditionalsPhotoInput
} from '$lib/types/assessment';

const base = createPhotoService<
	'assessment_additionals_photos',
	CreateAdditionalsPhotoInput,
	UpdateAdditionalsPhotoInput,
	AdditionalsPhoto
>({
	table: 'assessment_additionals_photos',
	parentIdField: 'additionals_id',
	label: 'additionals photos'
});

export const additionalsPhotosService = {
	...base,
	// Preserve historical API used by callsites
	getPhotosByAdditionals: base.getPhotos
};

export type { AdditionalsPhoto, CreateAdditionalsPhotoInput, UpdateAdditionalsPhotoInput };
