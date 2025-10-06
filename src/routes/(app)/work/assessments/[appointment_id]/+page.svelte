<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import AssessmentLayout from '$lib/components/assessment/AssessmentLayout.svelte';
	import VehicleIdentificationTab from '$lib/components/assessment/VehicleIdentificationTab.svelte';
	import Exterior360Tab from '$lib/components/assessment/Exterior360Tab.svelte';
	import InteriorMechanicalTab from '$lib/components/assessment/InteriorMechanicalTab.svelte';
	import TyresTab from '$lib/components/assessment/TyresTab.svelte';
	import DamageTab from '$lib/components/assessment/DamageTab.svelte';
	import { assessmentService } from '$lib/services/assessment.service';
	import { vehicleIdentificationService } from '$lib/services/vehicle-identification.service';
	import { exterior360Service } from '$lib/services/exterior-360.service';
	import { accessoriesService } from '$lib/services/accessories.service';
	import { interiorMechanicalService } from '$lib/services/interior-mechanical.service';
	import { tyresService } from '$lib/services/tyres.service';
	import { damageService } from '$lib/services/damage.service';
	import { getTabCompletionStatus } from '$lib/utils/validation';
	import type {
		VehicleIdentification,
		Exterior360,
		InteriorMechanical,
		Tyre,
		DamageRecord,
		AccessoryType
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
			damageRecords: data.damageRecords
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
	async function handleUpdateDamageMatch(matches: boolean, notes?: string) {
		// Store in first damage record or create placeholder
		// This is a simplified approach - you might want a separate table for this
		try {
			if (data.damageRecords.length > 0) {
				await damageService.update(data.damageRecords[0].id, {
					matches_description: matches,
					mismatch_notes: notes
				});
			}
			await invalidateAll();
		} catch (error) {
			console.error('Error updating damage match:', error);
		}
	}

	async function handleAddDamage() {
		try {
			await damageService.create({
				assessment_id: data.assessment.id,
				damage_area: 'non_structural',
				damage_type: 'collision',
				affected_panels: [],
				photos: []
			});
			await invalidateAll();
		} catch (error) {
			console.error('Error adding damage record:', error);
		}
	}

	async function handleUpdateDamage(id: string, updateData: Partial<DamageRecord>) {
		try {
			await damageService.update(id, updateData);
			await invalidateAll();
		} catch (error) {
			console.error('Error updating damage record:', error);
		}
	}

	async function handleDeleteDamage(id: string) {
		try {
			await damageService.delete(id);
			await invalidateAll();
		} catch (error) {
			console.error('Error deleting damage record:', error);
		}
	}

	async function handleCompleteDamage() {
		await assessmentService.markTabCompleted(data.assessment.id, 'damage');
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
	{#if currentTab === 'identification'}
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
			damageRecords={data.damageRecords}
			assessmentId={data.assessment.id}
			matchesDescription={data.damageRecords[0]?.matches_description}
			mismatchNotes={data.damageRecords[0]?.mismatch_notes}
			onUpdateMatch={handleUpdateDamageMatch}
			onAddDamage={handleAddDamage}
			onUpdateDamage={handleUpdateDamage}
			onDeleteDamage={handleDeleteDamage}
			onComplete={handleCompleteDamage}
		/>
	{/if}
</AssessmentLayout>

