<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { requestService } from '$lib/services/request.service';
	import { inspectionService } from '$lib/services/inspection.service';
	import { assessmentService } from '$lib/services/assessment.service';
	import { frcService } from '$lib/services/frc.service';
	import { additionalsService } from '$lib/services/additionals.service';
	import type { ComponentType } from 'svelte';
	import {
		LayoutDashboard,
		Users,
		FileText,
		ClipboardCheck,
		FileCheck,
		Plus,
		Settings,
		UserPlus,
		Calendar,
		ClipboardList,
		Wrench,
		Archive
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

	let newRequestCount = $state(0);
	let inspectionCount = $state(0);
	let assessmentCount = $state(0);
	let finalizedAssessmentCount = $state(0);
	let frcCount = $state(0);
	let additionalsCount = $state(0);
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	// Reactive navigation with badge counts
	const navigation = $derived([
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
				{ label: 'New Requests', href: '/requests', icon: FileText, badge: newRequestCount }
			]
		},
		{
			label: 'Work',
			items: [
				{ label: 'Inspections', href: '/work/inspections', icon: ClipboardCheck, badge: inspectionCount },
				{ label: 'Appointments', href: '/work/appointments', icon: Calendar },
				{ label: 'Open Assessments', href: '/work/assessments', icon: ClipboardList, badge: assessmentCount },
				{ label: 'Finalized Assessments', href: '/work/finalized-assessments', icon: FileCheck, badge: finalizedAssessmentCount },
				{ label: 'FRC', href: '/work/frc', icon: FileCheck, badge: frcCount },
				{ label: 'Additionals', href: '/work/additionals', icon: Plus, badge: additionalsCount },
				{ label: 'Archive', href: '/work/archive', icon: Archive }
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
			label: 'Repairers',
			items: [{ label: 'All Repairers', href: '/repairers', icon: Wrench }]
		},
		{
			label: 'Settings',
			items: [{ label: 'Company Settings', href: '/settings', icon: Settings }]
		}
	]);

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	async function loadNewRequestCount() {
		try {
			newRequestCount = await requestService.getRequestCount({ status: 'submitted' });
		} catch (error) {
			console.error('Error loading new request count:', error);
		}
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

	async function loadFinalizedAssessmentCount() {
		try {
			finalizedAssessmentCount = await assessmentService.getFinalizedCount();
		} catch (error) {
			console.error('Error loading finalized assessment count:', error);
		}
	}

	async function loadFRCCount() {
		try {
			frcCount = await frcService.getCountByStatus('in_progress');
		} catch (error) {
			console.error('Error loading FRC count:', error);
		}
	}

	async function loadAdditionalsCount() {
		try {
			additionalsCount = await additionalsService.getPendingCount();
		} catch (error) {
			console.error('Error loading additionals count:', error);
		}
	}

	async function loadAllCounts() {
		await Promise.all([
			loadNewRequestCount(),
			loadInspectionCount(),
			loadAssessmentCount(),
			loadFinalizedAssessmentCount(),
			loadFRCCount(),
			loadAdditionalsCount()
		]);
	}

	// Helper to check if current route is an edit/heavy-input page
	function isEditRoute(pathname: string): boolean {
		return (
			pathname.includes('/edit') ||
			pathname.includes('/new') ||
			pathname.includes('/assessments/') // Assessment detail page with heavy editing
		);
	}

	onMount(() => {
		loadAllCounts();

		// Start polling interval
		pollingInterval = setInterval(loadAllCounts, 30000);

		return () => {
			if (pollingInterval) clearInterval(pollingInterval);
		};
	});

	// Watch for page navigation and manage polling based on route
	$effect(() => {
		if (browser) {
			const url = $page.url.pathname;

			// Pause polling on edit routes to reduce network noise during editing
			if (isEditRoute(url)) {
				if (pollingInterval) {
					clearInterval(pollingInterval);
					pollingInterval = null;
				}
			} else {
				// Resume polling if not already running
				if (!pollingInterval) {
					pollingInterval = setInterval(loadAllCounts, 30000);
				}

				// Refresh counts when navigating to work-related pages
				if (url.includes('/work/')) {
					loadAllCounts();
				}
			}
		}
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

							<!-- Show badge for Finalized Assessments with submitted count -->
							{#if item.href === '/work/finalized-assessments' && finalizedAssessmentCount > 0}
								<span
									class="inline-flex items-center justify-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white"
								>
									{finalizedAssessmentCount}
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>
</aside>

