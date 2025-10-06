<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import { inspectionService } from '$lib/services/inspection.service';
	import { assessmentService } from '$lib/services/assessment.service';
	import type { ComponentType } from 'svelte';
	import {
		LayoutDashboard,
		Users,
		FileText,
		FilePlus,
		ClipboardCheck,
		FileCheck,
		Plus,
		Settings,
		UserPlus,
		Calendar,
		ClipboardList
	} from 'lucide-svelte';

	type NavItem = {
		label: string;
		href: string;
		icon?: ComponentType;
		badge?: number;
	};

	type NavGroup = {
		label: string;
		items: NavItem[];
	};

	let inspectionCount = $state(0);
	let assessmentCount = $state(0);

	const navigation: NavGroup[] = [
		{
			label: 'General',
			items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }]
		},
		{
			label: 'Clients',
			items: [{ label: 'All Clients', href: '/clients', icon: Users }]
		},
		{
			label: 'Requests',
			items: [
				{ label: 'All Requests', href: '/requests', icon: FileText },
				{ label: 'New Request', href: '/requests/new', icon: FilePlus }
			]
		},
		{
			label: 'Work',
			items: [
				{ label: 'Inspections', href: '/work/inspections', icon: ClipboardCheck },
				{ label: 'Appointments', href: '/work/appointments', icon: Calendar },
				{ label: 'Open Assessments', href: '/work/assessments', icon: ClipboardList },
				{ label: 'FRC', href: '/work/frc', icon: FileCheck },
				{ label: 'Additionals', href: '/work/additionals', icon: Plus }
			]
		},
		{
			label: 'Engineers',
			items: [
				{ label: 'All Engineers', href: '/engineers', icon: Users },
				{ label: 'New Engineer', href: '/engineers/new', icon: UserPlus }
			]
		},
		{
			label: 'Settings',
			items: [{ label: 'Settings', href: '/settings', icon: Settings }]
		}
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	async function loadInspectionCount() {
		try {
			inspectionCount = await inspectionService.getInspectionCount({ status: 'pending' });
		} catch (error) {
			console.error('Error loading inspection count:', error);
		}
	}

	async function loadAssessmentCount() {
		try {
			assessmentCount = await assessmentService.getInProgressCount();
		} catch (error) {
			console.error('Error loading assessment count:', error);
		}
	}

	onMount(() => {
		loadInspectionCount();
		loadAssessmentCount();
	});
</script>

<aside class="hidden lg:block w-60 border-r bg-white">
	<nav class="space-y-6 p-4">
		{#each navigation as group}
			<div class="space-y-1">
				<h3 class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
					{group.label}
				</h3>
				<div class="space-y-1">
					{#each group.items as item}
						<a
							href={item.href}
							class={cn(
								'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
								isActive(item.href)
									? 'bg-blue-50 text-blue-700'
									: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
							)}
						>
							<span class="flex items-center gap-3">
								{#if item.icon}
									<svelte:component this={item.icon} class="h-4 w-4" />
								{/if}
								{item.label}
							</span>

							<!-- Show badge for Inspections with pending count -->
							{#if item.href === '/work/inspections' && inspectionCount > 0}
								<span
									class="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white"
								>
									{inspectionCount}
								</span>
							{/if}

							<!-- Show badge for Open Assessments with in-progress count -->
							{#if item.href === '/work/assessments' && assessmentCount > 0}
								<span
									class="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white"
								>
									{assessmentCount}
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>
</aside>

