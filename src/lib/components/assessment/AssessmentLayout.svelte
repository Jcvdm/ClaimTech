<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import {
		Save,
		X,
		CheckCircle,
		Circle,
		FileText,
		Camera,
		Car,
		Gauge,
		AlertTriangle,
		DollarSign
	} from 'lucide-svelte';
	import type { Assessment } from '$lib/types/assessment';

	interface Tab {
		id: string;
		label: string;
		icon: any;
	}

	interface Props {
		assessment: Assessment;
		currentTab: string;
		onTabChange: (tabId: string) => void;
		onSave: () => void;
		onExit: () => void;
		saving?: boolean;
		lastSaved?: string | null;
	}

	let {
		assessment,
		currentTab = $bindable(),
		onTabChange,
		onSave,
		onExit,
		saving = false,
		lastSaved = null
	}: Props = $props();

	const tabs: Tab[] = [
		{ id: 'identification', label: 'Vehicle ID', icon: FileText },
		{ id: '360', label: '360° Exterior', icon: Camera },
		{ id: 'interior', label: 'Interior & Mechanical', icon: Car },
		{ id: 'tyres', label: 'Tyres', icon: Gauge },
		{ id: 'damage', label: 'Damage ID', icon: AlertTriangle },
		{ id: 'estimate', label: 'Estimate', icon: DollarSign }
	];

	const totalTabs = tabs.length;
	const completedCount = $derived(assessment.tabs_completed?.length || 0);
	const progressPercentage = $derived(Math.round((completedCount / totalTabs) * 100));

	function isTabCompleted(tabId: string): boolean {
		return assessment.tabs_completed?.includes(tabId) || false;
	}

	function handleTabClick(tabId: string) {
		if (currentTab !== tabId) {
			onTabChange(tabId);
		}
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	<!-- Header -->
	<div class="border-b bg-white px-8 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">
					Assessment {assessment.assessment_number}
				</h1>
				<p class="mt-1 text-sm text-gray-500">
					Complete the vehicle assessment by filling in all required sections
				</p>
			</div>
			<div class="flex items-center gap-3">
				{#if lastSaved}
					<span class="text-sm text-gray-500">
						Last saved: {new Date(lastSaved).toLocaleTimeString()}
					</span>
				{/if}
				<Button variant="outline" onclick={onSave} disabled={saving}>
					<Save class="mr-2 h-4 w-4" />
					{saving ? 'Saving...' : 'Save'}
				</Button>
				<Button variant="outline" onclick={onExit}>
					<X class="mr-2 h-4 w-4" />
					Exit
				</Button>
			</div>
		</div>

		<!-- Progress Bar -->
		<div class="mt-4">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium text-gray-700">Progress</span>
				<span class="text-gray-600">
					{completedCount} of {totalTabs} sections complete ({progressPercentage}%)
				</span>
			</div>
			<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
				<div
					class="h-full bg-blue-600 transition-all duration-300"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b bg-white px-8">
		<div class="flex gap-1">
			{#each tabs as tab}
				{@const isActive = currentTab === tab.id}
				{@const isCompleted = isTabCompleted(tab.id)}
				<button
					onclick={() => handleTabClick(tab.id)}
					class="relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors {isActive
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'}"
				>
					<svelte:component this={tab.icon} class="h-4 w-4" />
					<span>{tab.label}</span>
					{#if isCompleted}
						<CheckCircle class="h-4 w-4 text-green-600" />
					{:else}
						<Circle class="h-4 w-4 text-gray-300" />
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-8">
		<div class="mx-auto max-w-5xl">
			<slot />
		</div>
	</div>
</div>

