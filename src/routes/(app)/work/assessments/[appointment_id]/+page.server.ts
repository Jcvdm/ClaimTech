import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Assessment } from '$lib/types/assessment';
import { assessmentService } from '$lib/services/assessment.service';
import { vehicleIdentificationService } from '$lib/services/vehicle-identification.service';
import { exterior360Service } from '$lib/services/exterior-360.service';
import { accessoriesService } from '$lib/services/accessories.service';
import { interiorMechanicalService } from '$lib/services/interior-mechanical.service';
import { tyresService } from '$lib/services/tyres.service';
import { damageService } from '$lib/services/damage.service';
import { estimateService } from '$lib/services/estimate.service';
import { estimatePhotosService } from '$lib/services/estimate-photos.service';
import { preIncidentEstimateService } from '$lib/services/pre-incident-estimate.service';
import { preIncidentEstimatePhotosService } from '$lib/services/pre-incident-estimate-photos.service';
import { interiorPhotosService } from '$lib/services/interior-photos.service';
import { exterior360PhotosService } from '$lib/services/exterior-360-photos.service';
import { tyrePhotosService } from '$lib/services/tyre-photos.service';
import { assessmentNotesService } from '$lib/services/assessment-notes.service';
import { appointmentService } from '$lib/services/appointment.service';
import { inspectionService } from '$lib/services/inspection.service';
import { requestService } from '$lib/services/request.service';
import { vehicleValuesService } from '$lib/services/vehicle-values.service';
import { clientService } from '$lib/services/client.service';
import { repairerService } from '$lib/services/repairer.service';
import { companySettingsService } from '$lib/services/company-settings.service';
import { EngineerService } from '$lib/services/engineer.service';
import { getVehicleDetails, getClientDetails, getInsuredDetails } from '$lib/utils/report-data-helpers';

const engineerService = new EngineerService();

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const appointmentId = params.appointment_id;

		// Get appointment
		const appointment = await appointmentService.getAppointment(appointmentId, locals.supabase);
		if (!appointment) {
			throw error(404, 'Appointment not found');
		}

		// Find existing assessment (created by admin when request was created)
		// Engineers cannot create assessments - this will throw error if assessment doesn't exist
		let assessment: Assessment;
		try {
			assessment = await assessmentService.findByRequest(
				appointment.request_id,
				locals.supabase
			);
		} catch (findError) {
			console.error('Data integrity error: Assessment not found for request', {
				request_id: appointment.request_id,
				appointment_id: appointmentId,
				error: findError
			});
			throw error(500, {
				message: 'Assessment not found for this request. Please contact support.',
			});
		}

		// CRITICAL: Link appointment to assessment FIRST (before updating stage)
		// The check constraint requires appointment_id for stage='assessment_in_progress'
		if (!assessment.appointment_id || assessment.appointment_id !== appointmentId) {
			assessment = await assessmentService.updateAssessment(
				assessment.id,
				{ appointment_id: appointmentId },
				locals.supabase
			);
			console.log('Assessment linked to appointment');
		}

		// THEN transition stage to in_progress (after appointment_id is set)
		if (['request_submitted', 'request_accepted', 'inspection_scheduled', 'appointment_scheduled'].includes(assessment.stage)) {
			const oldStage = assessment.stage;
			assessment = await assessmentService.updateStage(
				assessment.id,
				'assessment_in_progress',
				locals.supabase
			);
			console.log(`Assessment stage updated from ${oldStage} to assessment_in_progress`);
		}

		// Create default child records (idempotent - only if they don't exist)
		// These methods will check if records exist before creating
		await Promise.all([
			tyresService.createDefaultTyres(assessment.id, locals.supabase),
			damageService.createDefault(assessment.id, locals.supabase),
			vehicleValuesService.createDefault(assessment.id, locals.supabase),
			preIncidentEstimateService.createDefault(assessment.id, locals.supabase),
			estimateService.createDefault(assessment.id, locals.supabase)
		]);

		// Update appointment status to in_progress (idempotent)
		if (appointment.status !== 'in_progress') {
			await appointmentService.updateAppointmentStatus(appointmentId, 'in_progress', locals.supabase);
			console.log('Appointment status updated to in_progress');
		}

		// Load all assessment data
		const [
			vehicleIdentification,
			exterior360,
			accessories,
			interiorMechanical,
			tyres,
			damageRecord,
			vehicleValues,
			preIncidentEstimate,
			estimate,
			notes,
			inspection,
			request,
			repairers,
			companySettings,
			engineer
		] = await Promise.all([
			vehicleIdentificationService.getByAssessment(assessment.id, locals.supabase),
			exterior360Service.getByAssessment(assessment.id, locals.supabase),
			accessoriesService.listByAssessment(assessment.id),
			interiorMechanicalService.getByAssessment(assessment.id, locals.supabase),
			tyresService.listByAssessment(assessment.id, locals.supabase),
			damageService.getByAssessment(assessment.id, locals.supabase),
			vehicleValuesService.getByAssessment(assessment.id, locals.supabase),
			preIncidentEstimateService.getByAssessment(assessment.id, locals.supabase),
			estimateService.getByAssessment(assessment.id, locals.supabase),
			assessmentNotesService.getNotesByAssessment(assessment.id),
			inspectionService.getInspection(appointment.inspection_id, locals.supabase),
			requestService.getRequest(appointment.request_id, locals.supabase),
			repairerService.listRepairers(true, locals.supabase),
			companySettingsService.getSettings(locals.supabase),
			appointment.engineer_id ? engineerService.getEngineer(appointment.engineer_id, locals.supabase) : null
		]);

		// Auto-create vehicle values if it doesn't exist (for existing assessments)
		let finalVehicleValues = vehicleValues;
		if (!finalVehicleValues) {
			finalVehicleValues = await vehicleValuesService.createDefault(assessment.id, locals.supabase);
		}

		// Auto-create pre-incident estimate if it doesn't exist (for existing assessments)
		let finalPreIncidentEstimate = preIncidentEstimate;
		if (!finalPreIncidentEstimate) {
			finalPreIncidentEstimate = await preIncidentEstimateService.createDefault(assessment.id, locals.supabase);
		}

		// Load estimate photos if estimate exists
		const estimatePhotos = estimate
			? await estimatePhotosService.getPhotosByEstimate(estimate.id, locals.supabase)
			: [];

		// Load pre-incident estimate photos if pre-incident estimate exists
		const preIncidentEstimatePhotos = finalPreIncidentEstimate
			? await preIncidentEstimatePhotosService.getPhotosByEstimate(finalPreIncidentEstimate.id, locals.supabase)
			: [];

		// Load interior photos for assessment
		const interiorPhotos = await interiorPhotosService.getPhotosByAssessment(assessment.id, locals.supabase);

		// Load exterior 360 additional photos for assessment
		const exterior360Photos = await exterior360PhotosService.getPhotosByAssessment(assessment.id, locals.supabase);

		// Load tyre photos for assessment
		const tyrePhotos = await tyrePhotosService.getPhotosByAssessment(assessment.id, locals.supabase);

		// Load client for write-off percentages
		const client = request ? await clientService.getClient(request.client_id, locals.supabase) : null;

		// Get vehicle details (pass database type directly to avoid type mismatch)
		const vehicleDetails = getVehicleDetails(vehicleIdentification as any, request as any, inspection as any);
		const clientDetails = getClientDetails(client as any);
		const insuredDetails = getInsuredDetails(request as any);

		return {
			appointment,
			assessment,
			vehicleIdentification,
			exterior360,
			accessories,
			interiorMechanical,
			interiorPhotos,
			exterior360Photos,
			tyres,
			tyrePhotos,
			damageRecord,
			vehicleValues: finalVehicleValues,
			preIncidentEstimate: finalPreIncidentEstimate,
			preIncidentEstimatePhotos,
			estimate,
			estimatePhotos,
			notes,
			inspection,
			request,
			client,
			repairers,
			companySettings,
			engineer,
			vehicleDetails,
			clientDetails,
			insuredDetails
		};
	} catch (err) {
		console.error('Error loading assessment:', err);
		throw error(500, 'Failed to load assessment');
	}
};

