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

export const load: PageServerLoad = async ({ params }) => {
	try {
		const appointmentId = params.appointment_id;

		// Get appointment
		const appointment = await appointmentService.getAppointment(appointmentId);
		if (!appointment) {
			throw error(404, 'Appointment not found');
		}

		// Get or create assessment
		let assessment = await assessmentService.getAssessmentByAppointment(appointmentId);

		if (!assessment) {
			// Create new assessment
			assessment = await assessmentService.createAssessment({
				appointment_id: appointmentId,
				inspection_id: appointment.inspection_id,
				request_id: appointment.request_id
			});

			// Create default tyres (5 standard positions)
			await tyresService.createDefaultTyres(assessment.id);

			// Create default damage record (one per assessment)
			await damageService.createDefault(assessment.id);

			// Create default vehicle values (one per assessment)
			await vehicleValuesService.createDefault(assessment.id);

			// Create default pre-incident estimate (one per assessment)
			await preIncidentEstimateService.createDefault(assessment.id);

			// Create default estimate (one per assessment)
			await estimateService.createDefault(assessment.id);
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
			repairers
		] = await Promise.all([
			vehicleIdentificationService.getByAssessment(assessment.id),
			exterior360Service.getByAssessment(assessment.id),
			accessoriesService.listByAssessment(assessment.id),
			interiorMechanicalService.getByAssessment(assessment.id),
			tyresService.listByAssessment(assessment.id),
			damageService.getByAssessment(assessment.id),
			vehicleValuesService.getByAssessment(assessment.id),
			preIncidentEstimateService.getByAssessment(assessment.id),
			estimateService.getByAssessment(assessment.id),
			assessmentNotesService.getNotesByAssessment(assessment.id),
			inspectionService.getInspection(appointment.inspection_id),
			requestService.getRequest(appointment.request_id),
			repairerService.listRepairers(true)
		]);

		// Auto-create vehicle values if it doesn't exist (for existing assessments)
		let finalVehicleValues = vehicleValues;
		if (!finalVehicleValues) {
			finalVehicleValues = await vehicleValuesService.createDefault(assessment.id);
		}

		// Auto-create pre-incident estimate if it doesn't exist (for existing assessments)
		let finalPreIncidentEstimate = preIncidentEstimate;
		if (!finalPreIncidentEstimate) {
			finalPreIncidentEstimate = await preIncidentEstimateService.createDefault(assessment.id);
		}

		// Load estimate photos if estimate exists
		const estimatePhotos = estimate
			? await estimatePhotosService.getPhotosByEstimate(estimate.id)
			: [];

		// Load pre-incident estimate photos if pre-incident estimate exists
		const preIncidentEstimatePhotos = finalPreIncidentEstimate
			? await preIncidentEstimatePhotosService.getPhotosByEstimate(finalPreIncidentEstimate.id)
			: [];

		// Load client for write-off percentages
		const client = request ? await clientService.getClient(request.client_id) : null;

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
			repairers
		};
	} catch (err) {
		console.error('Error loading assessment:', err);
		throw error(500, 'Failed to load assessment');
	}
};

