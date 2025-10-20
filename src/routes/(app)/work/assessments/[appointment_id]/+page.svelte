<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import AssessmentLayout from '$lib/components/assessment/AssessmentLayout.svelte';
	import SummaryTab from '$lib/components/assessment/SummaryTab.svelte';
	import VehicleIdentificationTab from '$lib/components/assessment/VehicleIdentificationTab.svelte';
	import Exterior360Tab from '$lib/components/assessment/Exterior360Tab.svelte';
	import InteriorMechanicalTab from '$lib/components/assessment/InteriorMechanicalTab.svelte';
	import TyresTab from '$lib/components/assessment/TyresTab.svelte';
	import DamageTab from '$lib/components/assessment/DamageTab.svelte';
	import VehicleValuesTab from '$lib/components/assessment/VehicleValuesTab.svelte';
	import PreIncidentEstimateTab from '$lib/components/assessment/PreIncidentEstimateTab.svelte';
	import EstimateTab from '$lib/components/assessment/EstimateTab.svelte';
	import FinalizeTab from '$lib/components/assessment/FinalizeTab.svelte';
	import AdditionalsTab from '$lib/components/assessment/AdditionalsTab.svelte';
	import FRCTab from '$lib/components/assessment/FRCTab.svelte';
	import AssessmentNotes from '$lib/components/assessment/AssessmentNotes.svelte';
	import { assessmentService } from '$lib/services/assessment.service';
	import { vehicleIdentificationService } from '$lib/services/vehicle-identification.service';
	import { exterior360Service } from '$lib/services/exterior-360.service';
	import { accessoriesService } from '$lib/services/accessories.service';
	import { interiorMechanicalService } from '$lib/services/interior-mechanical.service';
	import { tyresService } from '$lib/services/tyres.service';
	import { damageService } from '$lib/services/damage.service';
	import { estimateService } from '$lib/services/estimate.service';
	import { preIncidentEstimateService } from '$lib/services/pre-incident-estimate.service';
	import { estimatePhotosService } from '$lib/services/estimate-photos.service';
	import { preIncidentEstimatePhotosService } from '$lib/services/pre-incident-estimate-photos.service';
	import { vehicleValuesService } from '$lib/services/vehicle-values.service';
	import { documentGenerationService } from '$lib/services/document-generation.service';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import { supabase } from '$lib/supabase';
	import type {
		VehicleIdentification,
		Exterior360,
		InteriorMechanical,
		Tyre,
		DamageRecord,
		VehicleValues,
		Estimate,
		EstimateLineItem,
		AccessoryType,
		AssessmentResultType,
		VehicleAccessory
	} from '$lib/types/assessment';

	let { data }: { data: PageData } = $props();

	// Local reactive state for estimates (Svelte 5 runes pattern)
	// Reassigning these triggers reactivity in child components
	let estimate = $state(data.estimate);
	let preIncidentEstimate = $state(data.preIncidentEstimate);

	let currentTab = $state(data.assessment.current_tab || 'identification');
	let saving = $state(false);
	let generatingDocument = $state(false); // Flag to pause auto-save during document generation
	let lastSaved = $state<string | null>(null);
	let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

	// Store reference to tab save functions for auto-save on tab change
	let estimateTabSaveFn: (() => Promise<void>) | null = null;
	let preIncidentEstimateTabSaveFn: (() => Promise<void>) | null = null;

	async function handleTabChange(tabId: string) {
		// Auto-save current tab if leaving it with unsaved changes
		if (currentTab === 'estimate' && estimateTabSaveFn) {
			await estimateTabSaveFn();
		} else if (currentTab === 'pre-incident' && preIncidentEstimateTabSaveFn) {
			await preIncidentEstimateTabSaveFn();
		}

		// Auto-save before switching tabs
		await handleSave();

		// Refresh notes from database when switching tabs
		// This ensures any notes added on other tabs (like betterment notes) are visible
		const updatedNotes = await assessmentNotesService.getNotesByAssessment(data.assessment.id);
		data.notes = updatedNotes;

		currentTab = tabId;
		await assessmentService.updateCurrentTab(data.assessment.id, tabId);
	}

	async function handleSave() {
		if (saving || generatingDocument) return; // Prevent concurrent saves and pause during document generation

		saving = true;
		try {
			const now = new Date();
			lastSaved = now.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch (error) {
			console.error('Error saving:', error);
		} finally {
			saving = false;
		}
	}

	async function handleExit() {
		// Auto-save current tab if on it with unsaved changes
		if (currentTab === 'estimate' && estimateTabSaveFn) {
			await estimateTabSaveFn();
		} else if (currentTab === 'pre-incident' && preIncidentEstimateTabSaveFn) {
			await preIncidentEstimateTabSaveFn();
		}
		goto(`/work/appointments/${data.appointment.id}`);
	}

	async function handleCancelAssessment() {
		if (!confirm('Are you sure you want to cancel this assessment? This action cannot be undone.')) {
			return;
		}

		try {
			// Update assessment status to cancelled
			await assessmentService.updateAssessmentStatus(data.assessment.id, 'cancelled');

			// Navigate to archive with cancelled tab selected
			goto('/work/archive?tab=cancelled');
		} catch (error) {
			console.error('Error cancelling assessment:', error);
			alert('Failed to cancel assessment. Please try again.');
		}
	}

	// Set up auto-save interval (every 30 seconds)
	onMount(() => {
		autoSaveInterval = setInterval(handleSave, 30000);
		// Initial save timestamp
		lastSaved = new Date().toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	});

	// Clean up interval on component destroy
	onDestroy(() => {
		if (autoSaveInterval) {
			clearInterval(autoSaveInterval);
		}
	});

	// Vehicle Identification handlers
	async function handleUpdateVehicleIdentification(updateData: Partial<VehicleIdentification>) {
		try {
			const updated = await vehicleIdentificationService.upsert(data.assessment.id, updateData as any);
			// Update local data with saved values
			data.vehicleIdentification = updated;
		} catch (error) {
			console.error('Error updating vehicle identification:', error);
		}
	}

	async function handleCompleteVehicleIdentification() {
		// Move to next tab
		currentTab = '360';
	}

	// 360 Exterior handlers
	async function handleUpdateExterior360(updateData: Partial<Exterior360>) {
		try {
			const updated = await exterior360Service.upsert(data.assessment.id, updateData as any);
			// Update local data with saved values
			data.exterior360 = updated;
		} catch (error) {
			console.error('Error updating 360 exterior:', error);
		}
	}

	async function handleAddAccessory(accessory: {
		accessory_type: AccessoryType;
		custom_name?: string;
	}): Promise<VehicleAccessory> {
		try {
			const newAccessory = await accessoriesService.create({
				assessment_id: data.assessment.id,
				...accessory
			});
			// Update local state with new accessory
			data.accessories = [...data.accessories, newAccessory];
			return newAccessory;
		} catch (error) {
			console.error('Error adding accessory:', error);
			throw error; // Propagate error for queue pattern
		}
	}

	async function handleDeleteAccessory(id: string): Promise<void> {
		try {
			// Only delete from database if it's a real UUID (not temporary)
			if (!id.startsWith('temp-')) {
				await accessoriesService.delete(id);
			}
			// Update local state by removing deleted accessory
			data.accessories = data.accessories.filter((a) => a.id !== id);
		} catch (error) {
			console.error('Error deleting accessory:', error);
			throw error; // Propagate error for queue pattern
		}
	}

	async function handleCompleteExterior360() {
		// Move to next tab
		currentTab = 'interior';
	}

	// Interior/Mechanical handlers
	async function handleUpdateInteriorMechanical(updateData: Partial<InteriorMechanical>) {
		try {
			const updated = await interiorMechanicalService.upsert(data.assessment.id, updateData as any);
			// Update local data with saved values
			data.interiorMechanical = updated;
		} catch (error) {
			console.error('Error updating interior/mechanical:', error);
		}
	}

	async function handleCompleteInteriorMechanical() {
		// Move to next tab
		currentTab = 'tyres';
	}

	// Tyres handlers
	async function handleUpdateTyre(id: string, updateData: Partial<Tyre>) {
		try {
			const updatedTyre = await tyresService.update(id, updateData);
			// Create new array instead of mutating (triggers $derived reactivity)
			const index = data.tyres.findIndex((t) => t.id === id);
			if (index !== -1) {
				data.tyres = data.tyres.map((t, i) => i === index ? updatedTyre : t);
			}
		} catch (error) {
			console.error('Error updating tyre:', error);
		}
	}

	async function handleAddTyre() {
		try {
			const tyreCount = data.tyres.length;
			const newTyre = await tyresService.create({
				assessment_id: data.assessment.id,
				position: `additional_${tyreCount + 1}`,
				position_label: `Additional Tyre ${tyreCount - 4}`
			});
			// Update local state with new tyre
			data.tyres = [...data.tyres, newTyre];
		} catch (error) {
			console.error('Error adding tyre:', error);
		}
	}

	async function handleDeleteTyre(id: string) {
		try {
			await tyresService.delete(id);
			// Update local state by removing deleted tyre
			data.tyres = data.tyres.filter((t) => t.id !== id);
		} catch (error) {
			console.error('Error deleting tyre:', error);
		}
	}

	async function handleCompleteTyres() {
		// Move to next tab
		currentTab = 'damage';
	}

	// Damage handlers
	async function handleUpdateDamage(updateData: Partial<DamageRecord>) {
		try {
			if (data.damageRecord) {
				const updated = await damageService.update(data.damageRecord.id, updateData as any);
				// Update local data with saved values
				data.damageRecord = updated;
			}
		} catch (error) {
			console.error('Error updating damage record:', error);
		}
	}

	async function handleCompleteDamage() {
		// Move to next tab
		currentTab = 'values';
	}

	// Vehicle Values handlers
	async function handleUpdateVehicleValues(updateData: Partial<VehicleValues>) {
		try {
			if (data.vehicleValues) {
				// Get write-off percentages from client
				const writeOffPercentages = data.client
					? {
							borderline: data.client.borderline_writeoff_percentage,
							totalWriteoff: data.client.total_writeoff_percentage,
							salvage: data.client.salvage_percentage
						}
					: undefined;

				const updated = await vehicleValuesService.update(data.vehicleValues.id, updateData as any, writeOffPercentages as any);
				// Update local data with saved values
				data.vehicleValues = updated;
			}
		} catch (error) {
			console.error('Error updating vehicle values:', error);
		}
	}

	async function handleCompleteVehicleValues() {
		// Move to next tab
		currentTab = 'pre-incident';
	}

	// Pre-Incident Estimate handlers
	async function handleUpdatePreIncidentEstimate(updateData: Partial<Estimate>) {
		try {
			if (preIncidentEstimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await preIncidentEstimateService.update(preIncidentEstimate.id, updateData);

				// Update local $state variable (triggers Svelte reactivity in child components)
				preIncidentEstimate = updatedEstimate;
			}
		} catch (error) {
			console.error('Error updating pre-incident estimate:', error);
		}
	}

	async function handleAddPreIncidentLineItem(item: EstimateLineItem) {
		try {
			if (preIncidentEstimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await preIncidentEstimateService.addLineItem(preIncidentEstimate.id, item);

				// Update local $state variable (triggers Svelte reactivity in child components)
				preIncidentEstimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error adding pre-incident line item:', error);
		}
	}

	async function handleUpdatePreIncidentLineItem(
		itemId: string,
		updateData: Partial<EstimateLineItem>
	) {
		try {
			if (preIncidentEstimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await preIncidentEstimateService.updateLineItem(
					preIncidentEstimate.id,
					itemId,
					updateData
				);

				// Update local $state variable (triggers Svelte reactivity in child components)
				preIncidentEstimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error updating pre-incident line item:', error);
		}
	}

	async function handleDeletePreIncidentLineItem(itemId: string) {
		try {
			if (preIncidentEstimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await preIncidentEstimateService.deleteLineItem(preIncidentEstimate.id, itemId);

				// Update local $state variable (triggers Svelte reactivity in child components)
				preIncidentEstimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error deleting pre-incident line item:', error);
		}
	}

	async function handleBulkDeletePreIncidentLineItems(itemIds: string[]) {
		try {
			if (preIncidentEstimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await preIncidentEstimateService.bulkDeleteLineItems(
					preIncidentEstimate.id,
					itemIds
				);

				// Update local $state variable (triggers Svelte reactivity in child components)
				preIncidentEstimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error bulk deleting pre-incident line items:', error);
		}
	}

	async function handleUpdatePreIncidentRates(
		labourRate: number,
		paintRate: number,
		vatPercentage: number,
		oemMarkup: number,
		altMarkup: number,
		secondHandMarkup: number,
		outworkMarkup: number
	) {
		try {
			if (preIncidentEstimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await preIncidentEstimateService.update(preIncidentEstimate.id, {
					labour_rate: labourRate,
					paint_rate: paintRate,
					vat_percentage: vatPercentage,
					oem_markup_percentage: oemMarkup,
					alt_markup_percentage: altMarkup,
					second_hand_markup_percentage: secondHandMarkup,
					outwork_markup_percentage: outworkMarkup
				});

				// Update local $state variable (triggers Svelte reactivity in child components)
				preIncidentEstimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error updating pre-incident rates:', error);
		}
	}

	async function handleCompletePreIncidentEstimate() {
		// Move to next tab
		currentTab = 'estimate';
	}

	// Estimate handlers
	async function handleUpdateEstimate(updateData: Partial<Estimate>) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.update(estimate.id, updateData);

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;
			}
		} catch (error) {
			console.error('Error updating estimate:', error);
		}
	}

	async function handleAddLineItem(item: EstimateLineItem): Promise<EstimateLineItem> {
		try {
			if (!estimate) throw new Error('Estimate not found');
			// Keep a snapshot of current IDs to identify the newly added one
			const prevIds = new Set(estimate.line_items.map((i) => i.id).filter(Boolean) as string[]);
			const updatedEstimate = await estimateService.addLineItem(estimate.id, item);
			estimate = updatedEstimate;
			// Prefer matching by provided client id (we send id from client for JSON line items)
			if (item.id) {
				const createdById = updatedEstimate.line_items.find((i) => i.id === item.id);
				if (createdById) return createdById;
			}
			// Fallback: find the first line that wasn't in the previous set
			const created = updatedEstimate.line_items.find((i) => i.id && !prevIds.has(i.id));
			if (!created) throw new Error('Failed to locate newly added line item');
			return created;
		} catch (error) {
			console.error('Error adding line item:', error);
			throw error;
		}
	}

	async function handleUpdateLineItem(itemId: string, updateData: Partial<EstimateLineItem>): Promise<EstimateLineItem> {
		try {
			if (!estimate) throw new Error('Estimate not found');
			const updatedEstimate = await estimateService.updateLineItem(estimate.id, itemId, updateData);
			estimate = updatedEstimate;
			const updatedItem = updatedEstimate.line_items.find((i) => i.id === itemId);
			if (!updatedItem) throw new Error('Failed to locate updated line item');
			return updatedItem;
		} catch (error) {
			console.error('Error updating line item:', error);
			throw error;
		}
	}

	async function handleDeleteLineItem(itemId: string): Promise<void> {
		try {
			if (!estimate) throw new Error('Estimate not found');
			// Guard temp IDs (optimistic adds)
			if (itemId.startsWith('temp-')) {
				// Remove locally; parent state will reconcile via queue
				estimate = { ...estimate, line_items: estimate.line_items.filter((i) => i.id !== itemId) };
				return;
			}
			const updatedEstimate = await estimateService.deleteLineItem(estimate.id, itemId);
			estimate = updatedEstimate;
		} catch (error) {
			console.error('Error deleting line item:', error);
			throw error;
		}
	}

	async function handleBulkDeleteLineItems(itemIds: string[]): Promise<void> {
		try {
			if (!estimate) throw new Error('Estimate not found');
			const realIds = itemIds.filter((id) => !id.startsWith('temp-'));
			const tempIds = new Set(itemIds.filter((id) => id.startsWith('temp-')));
			if (realIds.length > 0) {
				const updatedEstimate = await estimateService.bulkDeleteLineItems(estimate.id, realIds);
				estimate = updatedEstimate;
			}
			if (tempIds.size > 0) {
				estimate = { ...estimate, line_items: estimate.line_items.filter((i) => !tempIds.has(i.id!)) };
			}
		} catch (error) {
			console.error('Error bulk deleting line items:', error);
			throw error;
		}
	}

	async function handleUpdateRates(
		labourRate: number,
		paintRate: number,
		vatPercentage: number,
		oemMarkup: number,
		altMarkup: number,
		secondHandMarkup: number,
		outworkMarkup: number
	) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.update(estimate.id, {
					labour_rate: labourRate,
					paint_rate: paintRate,
					vat_percentage: vatPercentage,
					oem_markup_percentage: oemMarkup,
					alt_markup_percentage: altMarkup,
					second_hand_markup_percentage: secondHandMarkup,
					outwork_markup_percentage: outworkMarkup
				});

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error updating rates:', error);
		}
	}

	async function handleUpdateRepairer(repairerId: string | null) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.update(estimate.id, {
					repairer_id: repairerId
				});

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error updating repairer:', error);
		}
	}

	async function handleRepairersUpdate() {
		// Repairers list will be refreshed on next navigation or manual refresh
		// No need to invalidate during editing
	}

	async function handleUpdateAssessmentResult(result: AssessmentResultType | null) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.update(estimate.id, {
					assessment_result: result
				});

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;
			}
		} catch (error) {
			console.error('Error updating assessment result:', error);
		}
	}

	async function handleCompleteEstimate() {
		// Note: Status remains 'in_progress' until estimate is finalized
		// This keeps the assessment in the Open Assessments list
		// Redirect to finalize tab to complete the process
		goto(`/work/assessments/${data.appointment.id}?tab=finalize`);
	}

	// Document generation handlers
	async function handleGenerateDocument(type: string) {
		generatingDocument = true; // Pause auto-save during generation
		try {
			const url = await documentGenerationService.generateDocument(data.assessment.id, type as any);

			// Automatically open the generated PDF in a new tab
			if (url) {
				window.open(url, '_blank');

				// Refresh assessment data to get the updated PDF URL
				const { data: updatedAssessment, error } = await supabase
					.from('assessments')
					.select('*')
					.eq('id', data.assessment.id)
					.single();

				if (!error && updatedAssessment) {
					data.assessment = updatedAssessment;
				}
			}
		} catch (error) {
			console.error('Error generating document:', error);
			throw error;
		} finally {
			generatingDocument = false; // Resume auto-save
		}
	}

	function handleDownloadDocument(type: string) {
		const assessment = data.assessment;
		let url: string | null = null;
		let filename = '';

		switch (type) {
			case 'report':
				url = assessment.report_pdf_url || null;
				filename = `${assessment.assessment_number}_Report.pdf`;
				break;
			case 'estimate':
				url = assessment.estimate_pdf_url || null;
				filename = `${assessment.assessment_number}_Estimate.pdf`;
				break;
			case 'photos_pdf':
				url = assessment.photos_pdf_url || null;
				filename = `${assessment.assessment_number}_Photos.pdf`;
				break;
			case 'photos_zip':
				url = assessment.photos_zip_url || null;
				filename = `${assessment.assessment_number}_Photos.zip`;
				break;
			case 'complete':
				// TODO: Generate complete package ZIP
				break;
		}

		if (url) {
			documentGenerationService.downloadDocument(url, filename);
		}
	}

	async function handleGenerateAll() {
		generatingDocument = true; // Pause auto-save during generation
		try {
			await documentGenerationService.generateAllDocuments(data.assessment.id);

			// Refresh assessment data to get the updated PDF URLs
			const { data: updatedAssessment, error } = await supabase
				.from('assessments')
				.select('*')
				.eq('id', data.assessment.id)
				.single();

			if (!error && updatedAssessment) {
				data.assessment = updatedAssessment;
			}
		} catch (error) {
			console.error('Error generating all documents:', error);
			throw error;
		} finally {
			generatingDocument = false; // Resume auto-save
		}
	}
</script>

<AssessmentLayout
	assessment={data.assessment}
	bind:currentTab
	onTabChange={handleTabChange}
	onSave={handleSave}
	onExit={handleExit}
	onCancel={handleCancelAssessment}
	{saving}
	{lastSaved}
	vehicleIdentification={data.vehicleIdentification}
	exterior360={data.exterior360}
	interiorMechanical={data.interiorMechanical}
	tyres={data.tyres}
	damageRecord={data.damageRecord}
	vehicleValues={data.vehicleValues}
	preIncidentEstimate={preIncidentEstimate}
	{estimate}
>
	{#if currentTab === 'summary'}
		<SummaryTab
			assessment={data.assessment}
			vehicleValues={data.vehicleValues}
			estimate={estimate}
			preIncidentEstimate={preIncidentEstimate}
			inspection={data.inspection}
			request={data.request}
			client={data.client}
		/>
	{:else if currentTab === 'identification'}
		<VehicleIdentificationTab
			data={data.vehicleIdentification}
			assessmentId={data.assessment.id}
			vehicleInfo={{
				registration: data.inspection?.vehicle_registration,
				vin: data.inspection?.vehicle_vin,
				make: data.inspection?.vehicle_make,
				model: data.inspection?.vehicle_model,
				year: data.inspection?.vehicle_year
			}}
			onUpdate={handleUpdateVehicleIdentification}
			onComplete={handleCompleteVehicleIdentification}
		/>
	{:else if currentTab === '360'}
		<Exterior360Tab
			data={data.exterior360}
			assessmentId={data.assessment.id}
			accessories={data.accessories}
			onUpdate={handleUpdateExterior360}
			onAddAccessory={handleAddAccessory}
			onDeleteAccessory={handleDeleteAccessory}
			onComplete={handleCompleteExterior360}
		/>
	{:else if currentTab === 'interior'}
		<InteriorMechanicalTab
			data={data.interiorMechanical}
			assessmentId={data.assessment.id}
			onUpdate={handleUpdateInteriorMechanical}
			onComplete={handleCompleteInteriorMechanical}
		/>
	{:else if currentTab === 'tyres'}
		<TyresTab
			tyres={data.tyres}
			assessmentId={data.assessment.id}
			onUpdateTyre={handleUpdateTyre}
			onAddTyre={handleAddTyre}
			onDeleteTyre={handleDeleteTyre}
			onComplete={handleCompleteTyres}
		/>
	{:else if currentTab === 'damage'}
		<DamageTab
			damageRecord={data.damageRecord}
			assessmentId={data.assessment.id}
			onUpdateDamage={handleUpdateDamage}
			onComplete={handleCompleteDamage}
		/>
	{:else if currentTab === 'values'}
		<VehicleValuesTab
			data={data.vehicleValues}
			assessmentId={data.assessment.id}
			client={data.client}
			requestInfo={{
				request_number: data.request?.request_number,
				claim_number: data.request?.claim_number,
				date_of_loss: data.request?.date_of_loss,
				vehicle_make: data.request?.vehicle_make,
				vehicle_model: data.request?.vehicle_model,
				vehicle_year: data.request?.vehicle_year,
				vehicle_vin: data.request?.vehicle_vin,
				vehicle_mileage: data.request?.vehicle_mileage
			}}
			onUpdate={handleUpdateVehicleValues}
			onComplete={handleCompleteVehicleValues}
		/>
	{:else if currentTab === 'pre-incident'}
		<PreIncidentEstimateTab
			estimate={preIncidentEstimate}
			assessmentId={data.assessment.id}
			estimatePhotos={data.preIncidentEstimatePhotos}
			onUpdateEstimate={handleUpdatePreIncidentEstimate}
			onPhotosUpdate={async () => {
				// Reload pre-incident photos from database
				if (preIncidentEstimate) {
					const updatedPhotos = await preIncidentEstimatePhotosService.getPhotosByEstimate(
						preIncidentEstimate.id
					);
					// Update local state (triggers reactivity)
					data.preIncidentEstimatePhotos = updatedPhotos;
				}
			}}
			onUpdateRates={handleUpdatePreIncidentRates}
			onComplete={handleCompletePreIncidentEstimate}
			onRegisterSave={(saveFn) => {
				preIncidentEstimateTabSaveFn = saveFn;
			}}
		/>
	{:else if currentTab === 'estimate'}
		<EstimateTab
			estimate={estimate}
			assessmentId={data.assessment.id}
			estimatePhotos={data.estimatePhotos}
			vehicleValues={data.vehicleValues}
			repairers={data.repairers}
			onUpdateEstimate={handleUpdateEstimate}
			onAddLineItem={handleAddLineItem}
			onUpdateLineItem={handleUpdateLineItem}
			onDeleteLineItem={handleDeleteLineItem}
			onBulkDeleteLineItems={handleBulkDeleteLineItems}
			onPhotosUpdate={async () => {
				// Reload incident photos from database
				if (estimate) {
					const updatedPhotos = await estimatePhotosService.getPhotosByEstimate(estimate.id);
					// Update local state (triggers reactivity)
					data.estimatePhotos = updatedPhotos;
				}
			}}
			onUpdateRates={handleUpdateRates}
			onUpdateRepairer={handleUpdateRepairer}
			onRepairersUpdate={handleRepairersUpdate}
			onUpdateAssessmentResult={handleUpdateAssessmentResult}
			onComplete={handleCompleteEstimate}
			onRegisterSave={(saveFn) => {
				estimateTabSaveFn = saveFn;
			}}
			onNotesUpdate={async () => {
				// Reload notes from database
				const updatedNotes = await assessmentNotesService.getNotesByAssessment(data.assessment.id);
				data.notes = updatedNotes;
			}}
		/>
	{:else if currentTab === 'finalize'}
		<FinalizeTab
			assessment={data.assessment}
			onGenerateDocument={handleGenerateDocument}
			onDownloadDocument={handleDownloadDocument}
			onGenerateAll={handleGenerateAll}
			vehicleIdentification={data.vehicleIdentification}
			exterior360={data.exterior360}
			interiorMechanical={data.interiorMechanical}
			tyres={data.tyres}
			damageRecord={data.damageRecord}
			vehicleValues={data.vehicleValues}
			{preIncidentEstimate}
			{estimate}
		/>
	{:else if currentTab === 'additionals' && estimate}
		<AdditionalsTab
			assessmentId={data.assessment.id}
			estimate={estimate}
			vehicleValues={data.vehicleValues}
			repairers={data.repairers}
			onUpdate={async () => {
				// Additionals updated, no need to reload entire page
			}}
		/>
	{:else if currentTab === 'frc' && estimate}
		<FRCTab
			assessmentId={data.assessment.id}
			estimate={estimate}
			vehicleValues={data.vehicleValues}
			engineer={data.engineer}
			onUpdate={async () => {
				// FRC updated, no need to reload entire page
			}}
		/>
	{/if}

	<!-- Global Assessment Notes (visible on all tabs except finalize) -->
	{#if currentTab !== 'finalize'}
		<div class="mt-6">
			<AssessmentNotes
				assessmentId={data.assessment.id}
				notes={data.notes}
				lastSaved={lastSaved}
				onUpdate={async () => {
					// Notes updated, no need to reload entire page
				}}
			/>
		</div>
	{/if}
</AssessmentLayout>

