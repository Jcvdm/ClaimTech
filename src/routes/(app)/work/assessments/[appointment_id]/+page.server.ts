import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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
import { assessmentNotesService } from '$lib/services/assessment-notes.service';
import { appointmentService } from '$lib/services/appointment.service';
import { inspectionService } from '$lib/services/inspection.service';
import { requestService } from '$lib/services/request.service';
import { vehicleValuesService } from '$lib/services/vehicle-values.service';
import { clientService } from '$lib/services/client.service';
import { repairerService } from '$lib/services/repairer.service';
import { companySettingsService } from '$lib/services/company-settings.service';
import { EngineerService } from '$lib/services/engineer.service';

const engineerService = new EngineerService();

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const appointmentId = params.appointment_id;

		// Get appointment
		const appointment = await appointmentService.getAppointment(appointmentId, locals.supabase);
		if (!appointment) {
			throw error(404, 'Appointment not found');
		}

		// Get or create assessment
		let assessment = await assessmentService.getAssessmentByAppointment(appointmentId, locals.supabase);
		let assessmentWasCreated = false; // Track if we created a new assessment

		if (!assessment) {
			try {
				// Create new assessment
				assessment = await assessmentService.createAssessment({
					appointment_id: appointmentId,
					inspection_id: appointment.inspection_id,
					request_id: appointment.request_id
				}, locals.supabase);
				assessmentWasCreated = true;

				// Create default tyres (5 standard positions)
				await tyresService.createDefaultTyres(assessment.id, locals.supabase);

				// Create default damage record (one per assessment)
				await damageService.createDefault(assessment.id, locals.supabase);

				// Create default vehicle values (one per assessment)
				await vehicleValuesService.createDefault(assessment.id, locals.supabase);

				// Create default pre-incident estimate (one per assessment)
				await preIncidentEstimateService.createDefault(assessment.id, locals.supabase);

				// Create default estimate (one per assessment)
				await estimateService.createDefault(assessment.id, locals.supabase);

				// ✅ FIX: Update appointment status AFTER successful assessment creation
				// This prevents appointments from disappearing if assessment creation fails
				await appointmentService.updateAppointmentStatus(appointmentId, 'in_progress', locals.supabase);
				console.log('Assessment created successfully, appointment status updated to in_progress');

			} catch (createError: any) {
				// Handle race condition: duplicate key error when user double-clicks or multiple requests run simultaneously
				if (createError.message && createError.message.includes('duplicate key')) {
					console.log('Race condition detected: assessment already exists, fetching existing assessment...');

					// Wait longer for the other request to complete (increased from 500ms to 1000ms)
					await new Promise(resolve => setTimeout(resolve, 1000));

					// Fetch the existing assessment created by the other request
					assessment = await assessmentService.getAssessmentByAppointment(appointmentId, locals.supabase);

					if (!assessment) {
						// Retry fetch with polling (3 attempts, 500ms apart)
						console.log('Assessment not found on first fetch, retrying with polling...');
						for (let i = 0; i < 3; i++) {
							await new Promise(resolve => setTimeout(resolve, 500));
							assessment = await assessmentService.getAssessmentByAppointment(appointmentId, locals.supabase);
							if (assessment) {
								console.log(`Assessment found on retry attempt ${i + 1}`);
								break;
							}
						}
					}

					if (!assessment) {
						console.error('Failed to fetch assessment after duplicate key error and retries');
						throw error(500, 'Failed to create or fetch assessment. Please try again.');
					}

					console.log('Successfully recovered from race condition, using existing assessment:', assessment.id);
				} else {
					// Re-throw other errors
					console.error('Error creating assessment:', createError);
					throw error(500, `Failed to create assessment: ${createError.message}`);
				}
			}
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
			accessoriesService.listByAssessment(assessment.id, locals.supabase),
			interiorMechanicalService.getByAssessment(assessment.id, locals.supabase),
			tyresService.listByAssessment(assessment.id, locals.supabase),
			damageService.getByAssessment(assessment.id, locals.supabase),
			vehicleValuesService.getByAssessment(assessment.id, locals.supabase),
			preIncidentEstimateService.getByAssessment(assessment.id, locals.supabase),
			estimateService.getByAssessment(assessment.id, locals.supabase),
			assessmentNotesService.getNotesByAssessment(assessment.id, locals.supabase),
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

		// Load client for write-off percentages
		const client = request ? await clientService.getClient(request.client_id, locals.supabase) : null;

		return {
			appointment,
			assessment,
			vehicleIdentification,
			exterior360,
			accessories,
			interiorMechanical,
			tyres,
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
			engineer
		};
	} catch (err) {
		console.error('Error loading assessment:', err);
		throw error(500, 'Failed to load assessment');
	}
};

