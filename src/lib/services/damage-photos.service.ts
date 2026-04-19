import { createPhotoService } from './photo-service-factory';
import type { ServiceClient } from '$lib/types';
import type {
	DamagePhoto,
	CreateDamagePhotoInput,
	UpdateDamagePhotoInput
} from '$lib/types/assessment';

const base = createPhotoService<
	'assessment_damage_photos',
	CreateDamagePhotoInput,
	UpdateDamagePhotoInput,
	DamagePhoto
>({
	table: 'assessment_damage_photos',
	parentIdField: 'assessment_id',
	extraUpdateFields: ['panel'] as const,
	label: 'damage photos'
});

export const damagePhotosService = {
	...base,
	// Preserve historical API used by callsites
	getPhotosByAssessment: base.getPhotos,
	// Preserve updatePhotoPanel convenience method
	updatePhotoPanel: (photoId: string, panel: string, client?: ServiceClient) =>
		base.updatePhoto(photoId, { panel } as UpdateDamagePhotoInput, client)
};

export type { DamagePhoto, CreateDamagePhotoInput, UpdateDamagePhotoInput };
