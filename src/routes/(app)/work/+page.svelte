<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ClipboardCheck,
		Calendar,
		ClipboardList,
		FileCheck,
		Plus,
		Archive,
		ArrowRight
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const workPhases = [
		{
			title: 'Inspections',
			description: 'Accepted requests awaiting engineer appointment',
			icon: ClipboardCheck,
			count: data.inspectionCount,
			href: '/work/inspections',
			color: 'blue'
		},
		{
			title: 'Appointments',
			description: 'Scheduled appointments awaiting assessment',
			icon: Calendar,
			count: data.appointmentCount,
			href: '/work/appointments',
			color: 'purple'
		},
		{
			title: 'Open Assessments',
			description: 'Active vehicle assessments in progress',
			icon: ClipboardList,
			count: data.assessmentCount,
			href: '/work/assessments',
			color: 'indigo'
		},
		{
			title: 'Finalized Assessments',
			description: 'Estimates finalized and sent to client',
			icon: FileCheck,
			count: data.finalizedCount,
			href: '/work/finalized-assessments',
			color: 'green'
		},
		{
			title: 'FRC',
			description: 'Final repair costing in progress',
			icon: FileCheck,
			count: data.frcCount,
			href: '/work/frc',
			color: 'teal'
		},
		{
			title: 'Additionals',
			description: 'Additional line items requiring approval',
			icon: Plus,
			count: data.additionalsCount,
			href: '/work/additionals',
			color: 'orange'
		},
		{
			title: 'Archive',
			description: 'All completed work searchable in one place',
			icon: Archive,
			count: data.archiveCount,
			href: '/work/archive',
			color: 'gray'
		}
	];

	const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
		blue: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
		purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
		indigo: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
		green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
		teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
		orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
		gray: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
	};
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Work Overview"
		description="Manage all phases of vehicle damage assessments and inspections"
	/>

	<!-- Work Phase Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each workPhases as phase}
			{@const colors = colorClasses[phase.color]}
			<Card class="overflow-hidden transition-shadow hover:shadow-md">
				<div class="p-6">
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div class="rounded-lg {colors.bg} p-3">
								<phase.icon class="h-6 w-6 {colors.text}" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-slate-900">{phase.title}</h3>
								<p class="mt-1 text-sm text-slate-500">{phase.description}</p>
							</div>
						</div>
					</div>

					<div class="mt-4 flex items-center justify-between">
						<div class="flex items-baseline gap-2">
							<span class="text-3xl font-bold text-slate-900">{phase.count}</span>
							<span class="text-sm text-slate-500">
								{phase.count === 1 ? 'item' : 'items'}
							</span>
						</div>
						<Button variant="outline" size="sm" onclick={() => goto(phase.href)}>
							View
							<ArrowRight class="ml-2 h-4 w-4" />
						</Button>
					</div>
				</div>

				<!-- Progress Bar (if count > 0) -->
				{#if phase.count > 0}
					<div class="h-1 w-full {colors.bg}">
						<div class="h-full {colors.bg} {colors.border} border-t"></div>
					</div>
				{/if}
			</Card>
		{/each}
	</div>

	<!-- Quick Stats -->
	<Card class="p-6">
		<h3 class="text-lg font-semibold text-slate-900">Quick Stats</h3>
		<div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
			<div class="text-center">
				<p class="text-2xl font-bold text-rose-600">{data.inspectionCount}</p>
				<p class="text-sm text-slate-500">Pending Inspections</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold text-purple-600">{data.appointmentCount}</p>
				<p class="text-sm text-slate-500">Scheduled Appointments</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold text-slate-600">{data.assessmentCount}</p>
				<p class="text-sm text-slate-500">Active Assessments</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold text-green-600">{data.finalizedCount}</p>
				<p class="text-sm text-gray-500">Finalized Assessments</p>
			</div>
		</div>
	</Card>

	<!-- Workflow Guide -->
	<Card class="p-6">
		<h3 class="text-lg font-semibold text-slate-900">Workflow Guide</h3>
		<div class="mt-4 space-y-3">
			<div class="flex items-center gap-3 text-sm">
				<Badge variant="secondary">1</Badge>
				<span class="text-slate-600">Accept request → Creates inspection</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<Badge variant="secondary">2</Badge>
				<span class="text-slate-600">Appoint engineer → Schedule appointment</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<Badge variant="secondary">3</Badge>
				<span class="text-slate-600">Start assessment → Complete all tabs</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<Badge variant="secondary">4</Badge>
				<span class="text-gray-600">Finalize estimate → Send to client</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<Badge variant="secondary">5</Badge>
				<span class="text-gray-600">Add additionals (if needed) → Approve/Decline</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<Badge variant="secondary">6</Badge>
				<span class="text-gray-600">Complete FRC → Sign off → Archive</span>
			</div>
		</div>
	</Card>
</div>

