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
	import { vehicleValuesService } from '$lib/services/vehicle-values.service';
	import { documentGenerationService } from '$lib/services/document-generation.service';
	import { getTabCompletionStatus } from '$lib/utils/validation';
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
		AssessmentResultType
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

	// Check tab completion and update
	async function updateTabCompletion() {
		const completionStatus = getTabCompletionStatus({
			vehicleIdentification: data.vehicleIdentification,
			exterior360: data.exterior360,
			interiorMechanical: data.interiorMechanical,
			tyres: data.tyres,
			damageRecord: data.damageRecord,
			vehicleValues: data.vehicleValues,
			preIncidentEstimate: preIncidentEstimate,
			estimate: estimate
		});

		const completedTabs = completionStatus
			.filter(tab => tab.isComplete)
			.map(tab => tab.tabId);

		// Update if changed
		const currentCompleted = data.assessment.tabs_completed || [];
		const hasChanged =
			completedTabs.length !== currentCompleted.length ||
			completedTabs.some(tab => !currentCompleted.includes(tab));

		if (hasChanged) {
			await assessmentService.updateAssessment(data.assessment.id, {
				tabs_completed: completedTabs
			});
		}
	}

	async function handleTabChange(tabId: string) {
		// Auto-save and check completion before switching tabs
		await handleSave();
		await updateTabCompletion();
		currentTab = tabId;
		await assessmentService.updateCurrentTab(data.assessment.id, tabId);
	}

	async function handleSave() {
		if (saving || generatingDocument) return; // Prevent concurrent saves and pause during document generation

		saving = true;
		try {
			// Update tab completion status without full page reload
			await updateTabCompletion();
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

	function handleExit() {
		goto(`/work/appointments/${data.appointment.id}`);
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
			await vehicleIdentificationService.upsert(data.assessment.id, updateData);
			// Data is already updated in the service, no need to reload
		} catch (error) {
			console.error('Error updating vehicle identification:', error);
		}
	}

	async function handleCompleteVehicleIdentification() {
		await assessmentService.markTabCompleted(data.assessment.id, 'identification');
		// Tab completion updated, move to next tab
		currentTab = '360';
	}

	// 360 Exterior handlers
	async function handleUpdateExterior360(updateData: Partial<Exterior360>) {
		try {
			await exterior360Service.upsert(data.assessment.id, updateData);
			// Data is already updated in the service
		} catch (error) {
			console.error('Error updating 360 exterior:', error);
		}
	}

	async function handleAddAccessory(accessory: {
		accessory_type: AccessoryType;
		custom_name?: string;
	}) {
		try {
			const newAccessory = await accessoriesService.create({
				assessment_id: data.assessment.id,
				...accessory
			});
			// Update local state with new accessory
			data.accessories = [...data.accessories, newAccessory];
		} catch (error) {
			console.error('Error adding accessory:', error);
		}
	}

	async function handleDeleteAccessory(id: string) {
		try {
			await accessoriesService.delete(id);
			// Update local state by removing deleted accessory
			data.accessories = data.accessories.filter((a) => a.id !== id);
		} catch (error) {
			console.error('Error deleting accessory:', error);
		}
	}

	async function handleCompleteExterior360() {
		await assessmentService.markTabCompleted(data.assessment.id, '360');
		// Tab completion updated, move to next tab
		currentTab = 'interior';
	}

	// Interior/Mechanical handlers
	async function handleUpdateInteriorMechanical(updateData: Partial<InteriorMechanical>) {
		try {
			await interiorMechanicalService.upsert(data.assessment.id, updateData);
			// Data is already updated in the service
		} catch (error) {
			console.error('Error updating interior/mechanical:', error);
		}
	}

	async function handleCompleteInteriorMechanical() {
		await assessmentService.markTabCompleted(data.assessment.id, 'interior');
		// Tab completion updated, move to next tab
		currentTab = 'tyres';
	}

	// Tyres handlers
	async function handleUpdateTyre(id: string, updateData: Partial<Tyre>) {
		try {
			const updatedTyre = await tyresService.update(id, updateData);
			// Update local state with updated tyre
			const index = data.tyres.findIndex((t) => t.id === id);
			if (index !== -1) {
				data.tyres[index] = updatedTyre;
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
		await assessmentService.markTabCompleted(data.assessment.id, 'tyres');
		// Tab completion updated, move to next tab
		currentTab = 'damage';
	}

	// Damage handlers
	async function handleUpdateDamage(updateData: Partial<DamageRecord>) {
		try {
			if (data.damageRecord) {
				await damageService.update(data.damageRecord.id, updateData);
				// Data is already updated in the service
			}
		} catch (error) {
			console.error('Error updating damage record:', error);
		}
	}

	async function handleCompleteDamage() {
		await assessmentService.markTabCompleted(data.assessment.id, 'damage');
		// Tab completion updated, move to next tab
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

				await vehicleValuesService.update(data.vehicleValues.id, updateData, writeOffPercentages);
				// Data is already updated in the service
			}
		} catch (error) {
			console.error('Error updating vehicle values:', error);
		}
	}

	async function handleCompleteVehicleValues() {
		await assessmentService.markTabCompleted(data.assessment.id, 'values');
		// Tab completion updated, move to next tab
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
		await assessmentService.markTabCompleted(data.assessment.id, 'pre-incident');
		// Tab completion updated, move to next tab
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

	async function handleAddLineItem(item: EstimateLineItem) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.addLineItem(estimate.id, item);

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error adding line item:', error);
		}
	}

	async function handleUpdateLineItem(itemId: string, updateData: Partial<EstimateLineItem>) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.updateLineItem(estimate.id, itemId, updateData);

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error updating line item:', error);
		}
	}

	async function handleDeleteLineItem(itemId: string) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.deleteLineItem(estimate.id, itemId);

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error deleting line item:', error);
		}
	}

	async function handleBulkDeleteLineItems(itemIds: string[]) {
		try {
			if (estimate) {
				// Service updates DB and returns updated estimate
				const updatedEstimate = await estimateService.bulkDeleteLineItems(estimate.id, itemIds);

				// Update local $state variable (triggers Svelte reactivity in child components)
				estimate = updatedEstimate;

				// ✅ No invalidation needed - preserves user input in other fields
			}
		} catch (error) {
			console.error('Error bulk deleting line items:', error);
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
		await assessmentService.markTabCompleted(data.assessment.id, 'estimate');
		await assessmentService.updateAssessmentStatus(data.assessment.id, 'completed');
		// Redirect to appointment (data will be fresh on next page)
		goto(`/work/appointments/${data.appointment.id}`);
	}

	// Document generation handlers
	async function handleGenerateDocument(type: string) {
		generatingDocument = true; // Pause auto-save during generation
		try {
			const url = await documentGenerationService.generateDocument(data.assessment.id, type as any);

			// Automatically open the generated PDF in a new tab
			if (url) {
				window.open(url, '_blank');
				// Document URL is stored in database, will be available on next load
				// No need to invalidate during editing
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
			// Document URLs are stored in database, will be available on next load
			// No need to invalidate during editing
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
	{saving}
	{lastSaved}
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
			onAddLineItem={handleAddPreIncidentLineItem}
			onUpdateLineItem={handleUpdatePreIncidentLineItem}
			onDeleteLineItem={handleDeletePreIncidentLineItem}
			onBulkDeleteLineItems={handleBulkDeletePreIncidentLineItems}
			onPhotosUpdate={async () => {
				// Photos updated, no need to reload entire page
			}}
			onUpdateRates={handleUpdatePreIncidentRates}
			onComplete={handleCompletePreIncidentEstimate}
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
				// Photos updated, no need to reload entire page
			}}
			onUpdateRates={handleUpdateRates}
			onUpdateRepairer={handleUpdateRepairer}
			onRepairersUpdate={handleRepairersUpdate}
			onUpdateAssessmentResult={handleUpdateAssessmentResult}
			onComplete={handleCompleteEstimate}
		/>
	{:else if currentTab === 'finalize'}
		<FinalizeTab
			assessment={data.assessment}
			onGenerateDocument={handleGenerateDocument}
			onDownloadDocument={handleDownloadDocument}
			onGenerateAll={handleGenerateAll}
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

