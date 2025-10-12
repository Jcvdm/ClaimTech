<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
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

	let currentTab = $state(data.assessment.current_tab || 'identification');
	let saving = $state(false);
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
			preIncidentEstimate: data.preIncidentEstimate,
			estimate: data.estimate
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
		if (saving) return; // Prevent concurrent saves

		saving = true;
		try {
			await invalidateAll();
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
			await invalidateAll();
		} catch (error) {
			console.error('Error updating vehicle identification:', error);
		}
	}

	async function handleCompleteVehicleIdentification() {
		await assessmentService.markTabCompleted(data.assessment.id, 'identification');
		await invalidateAll();
		currentTab = '360';
	}

	// 360 Exterior handlers
	async function handleUpdateExterior360(updateData: Partial<Exterior360>) {
		try {
			await exterior360Service.upsert(data.assessment.id, updateData);
			await invalidateAll();
		} catch (error) {
			console.error('Error updating 360 exterior:', error);
		}
	}

	async function handleAddAccessory(accessory: {
		accessory_type: AccessoryType;
		custom_name?: string;
	}) {
		try {
			await accessoriesService.create({
				assessment_id: data.assessment.id,
				...accessory
			});
			await invalidateAll();
		} catch (error) {
			console.error('Error adding accessory:', error);
		}
	}

	async function handleDeleteAccessory(id: string) {
		try {
			await accessoriesService.delete(id);
			await invalidateAll();
		} catch (error) {
			console.error('Error deleting accessory:', error);
		}
	}

	async function handleCompleteExterior360() {
		await assessmentService.markTabCompleted(data.assessment.id, '360');
		await invalidateAll();
		currentTab = 'interior';
	}

	// Interior/Mechanical handlers
	async function handleUpdateInteriorMechanical(updateData: Partial<InteriorMechanical>) {
		try {
			await interiorMechanicalService.upsert(data.assessment.id, updateData);
			await invalidateAll();
		} catch (error) {
			console.error('Error updating interior/mechanical:', error);
		}
	}

	async function handleCompleteInteriorMechanical() {
		await assessmentService.markTabCompleted(data.assessment.id, 'interior');
		await invalidateAll();
		currentTab = 'tyres';
	}

	// Tyres handlers
	async function handleUpdateTyre(id: string, updateData: Partial<Tyre>) {
		try {
			await tyresService.update(id, updateData);
			await invalidateAll();
		} catch (error) {
			console.error('Error updating tyre:', error);
		}
	}

	async function handleAddTyre() {
		try {
			const tyreCount = data.tyres.length;
			await tyresService.create({
				assessment_id: data.assessment.id,
				position: `additional_${tyreCount + 1}`,
				position_label: `Additional Tyre ${tyreCount - 4}`
			});
			await invalidateAll();
		} catch (error) {
			console.error('Error adding tyre:', error);
		}
	}

	async function handleDeleteTyre(id: string) {
		try {
			await tyresService.delete(id);
			await invalidateAll();
		} catch (error) {
			console.error('Error deleting tyre:', error);
		}
	}

	async function handleCompleteTyres() {
		await assessmentService.markTabCompleted(data.assessment.id, 'tyres');
		await invalidateAll();
		currentTab = 'damage';
	}

	// Damage handlers
	async function handleUpdateDamage(updateData: Partial<DamageRecord>) {
		try {
			if (data.damageRecord) {
				await damageService.update(data.damageRecord.id, updateData);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating damage record:', error);
		}
	}

	async function handleCompleteDamage() {
		await assessmentService.markTabCompleted(data.assessment.id, 'damage');
		await invalidateAll();
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
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating vehicle values:', error);
		}
	}

	async function handleCompleteVehicleValues() {
		await assessmentService.markTabCompleted(data.assessment.id, 'values');
		await invalidateAll();
		currentTab = 'pre-incident';
	}

	// Pre-Incident Estimate handlers
	async function handleUpdatePreIncidentEstimate(updateData: Partial<Estimate>) {
		try {
			if (data.preIncidentEstimate) {
				await preIncidentEstimateService.update(data.preIncidentEstimate.id, updateData);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating pre-incident estimate:', error);
		}
	}

	async function handleAddPreIncidentLineItem(item: EstimateLineItem) {
		try {
			if (data.preIncidentEstimate) {
				await preIncidentEstimateService.addLineItem(data.preIncidentEstimate.id, item);
				await invalidateAll();
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
			if (data.preIncidentEstimate) {
				await preIncidentEstimateService.updateLineItem(
					data.preIncidentEstimate.id,
					itemId,
					updateData
				);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating pre-incident line item:', error);
		}
	}

	async function handleDeletePreIncidentLineItem(itemId: string) {
		try {
			if (data.preIncidentEstimate) {
				await preIncidentEstimateService.deleteLineItem(data.preIncidentEstimate.id, itemId);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error deleting pre-incident line item:', error);
		}
	}

	async function handleBulkDeletePreIncidentLineItems(itemIds: string[]) {
		try {
			if (data.preIncidentEstimate) {
				await preIncidentEstimateService.bulkDeleteLineItems(
					data.preIncidentEstimate.id,
					itemIds
				);
				await invalidateAll();
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
			if (data.preIncidentEstimate) {
				await preIncidentEstimateService.update(data.preIncidentEstimate.id, {
					labour_rate: labourRate,
					paint_rate: paintRate,
					vat_percentage: vatPercentage,
					oem_markup_percentage: oemMarkup,
					alt_markup_percentage: altMarkup,
					second_hand_markup_percentage: secondHandMarkup,
					outwork_markup_percentage: outworkMarkup
				});
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating pre-incident rates:', error);
		}
	}

	async function handleCompletePreIncidentEstimate() {
		await assessmentService.markTabCompleted(data.assessment.id, 'pre-incident');
		await invalidateAll();
		currentTab = 'estimate';
	}

	// Estimate handlers
	async function handleUpdateEstimate(updateData: Partial<Estimate>) {
		try {
			if (data.estimate) {
				await estimateService.update(data.estimate.id, updateData);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating estimate:', error);
		}
	}

	async function handleAddLineItem(item: EstimateLineItem) {
		try {
			if (data.estimate) {
				await estimateService.addLineItem(data.estimate.id, item);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error adding line item:', error);
		}
	}

	async function handleUpdateLineItem(itemId: string, updateData: Partial<EstimateLineItem>) {
		try {
			if (data.estimate) {
				await estimateService.updateLineItem(data.estimate.id, itemId, updateData);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating line item:', error);
		}
	}

	async function handleDeleteLineItem(itemId: string) {
		try {
			if (data.estimate) {
				await estimateService.deleteLineItem(data.estimate.id, itemId);
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error deleting line item:', error);
		}
	}

	async function handleBulkDeleteLineItems(itemIds: string[]) {
		try {
			if (data.estimate) {
				await estimateService.bulkDeleteLineItems(data.estimate.id, itemIds);
				await invalidateAll();
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
			if (data.estimate) {
				await estimateService.update(data.estimate.id, {
					labour_rate: labourRate,
					paint_rate: paintRate,
					vat_percentage: vatPercentage,
					oem_markup_percentage: oemMarkup,
					alt_markup_percentage: altMarkup,
					second_hand_markup_percentage: secondHandMarkup,
					outwork_markup_percentage: outworkMarkup
				});
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating rates:', error);
		}
	}

	async function handleUpdateRepairer(repairerId: string | null) {
		try {
			if (data.estimate) {
				await estimateService.update(data.estimate.id, {
					repairer_id: repairerId
				});
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating repairer:', error);
		}
	}

	async function handleRepairersUpdate() {
		await invalidateAll(); // Refresh repairers list
	}

	async function handleUpdateAssessmentResult(result: AssessmentResultType | null) {
		try {
			if (data.estimate) {
				await estimateService.update(data.estimate.id, {
					assessment_result: result
				});
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error updating assessment result:', error);
		}
	}

	async function handleCompleteEstimate() {
		await assessmentService.markTabCompleted(data.assessment.id, 'estimate');
		await assessmentService.updateAssessmentStatus(data.assessment.id, 'completed');
		await invalidateAll();
		// Redirect to appointment or inspection
		goto(`/work/appointments/${data.appointment.id}`);
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
			estimate={data.estimate}
			preIncidentEstimate={data.preIncidentEstimate}
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
			estimate={data.preIncidentEstimate}
			assessmentId={data.assessment.id}
			estimatePhotos={data.preIncidentEstimatePhotos}
			onUpdateEstimate={handleUpdatePreIncidentEstimate}
			onAddLineItem={handleAddPreIncidentLineItem}
			onUpdateLineItem={handleUpdatePreIncidentLineItem}
			onDeleteLineItem={handleDeletePreIncidentLineItem}
			onBulkDeleteLineItems={handleBulkDeletePreIncidentLineItems}
			onPhotosUpdate={async () => await invalidateAll()}
			onUpdateRates={handleUpdatePreIncidentRates}
			onComplete={handleCompletePreIncidentEstimate}
		/>
	{:else if currentTab === 'estimate'}
		<EstimateTab
			estimate={data.estimate}
			assessmentId={data.assessment.id}
			estimatePhotos={data.estimatePhotos}
			vehicleValues={data.vehicleValues}
			repairers={data.repairers}
			onUpdateEstimate={handleUpdateEstimate}
			onAddLineItem={handleAddLineItem}
			onUpdateLineItem={handleUpdateLineItem}
			onDeleteLineItem={handleDeleteLineItem}
			onBulkDeleteLineItems={handleBulkDeleteLineItems}
			onPhotosUpdate={async () => await invalidateAll()}
			onUpdateRates={handleUpdateRates}
			onUpdateRepairer={handleUpdateRepairer}
			onRepairersUpdate={handleRepairersUpdate}
			onUpdateAssessmentResult={handleUpdateAssessmentResult}
			onComplete={handleCompleteEstimate}
		/>
	{/if}

	<!-- Global Assessment Notes (visible on all tabs) -->
	<div class="mt-6">
		<AssessmentNotes
			assessmentId={data.assessment.id}
			notes={data.notes}
			lastSaved={lastSaved}
			onUpdate={async () => await invalidateAll()}
		/>
	</div>
</AssessmentLayout>

