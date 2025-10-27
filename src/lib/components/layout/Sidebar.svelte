<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { requestService } from '$lib/services/request.service';
	import { inspectionService } from '$lib/services/inspection.service';
	import { appointmentService } from '$lib/services/appointment.service';
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
		Archive,
		LogOut
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidate, invalidateAll } from '$app/navigation';

	// Props
	let { role = 'engineer', engineer_id = null }: { role?: string; engineer_id?: string | null } = $props();

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
	let appointmentCount = $state(0);
	let assessmentCount = $state(0);
	let finalizedAssessmentCount = $state(0);
	let frcCount = $state(0);
	let additionalsCount = $state(0);
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	// All navigation items
	const allNavigation = [
		{
			label: 'General',
			items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
			adminOnly: false
		},
		{
			label: 'Clients',
			items: [{ label: 'All Clients', href: '/clients', icon: Users }],
			adminOnly: true
		},
		{
			label: 'Requests',
			items: [
				{ label: 'New Requests', href: '/requests', icon: FileText }
			],
			adminOnly: true
		},
		{
			label: 'Work',
			items: [
				// Note: Badge counts are rendered directly in the template using state variables
				// The reactive state refs are used in conditional rendering below (lines 257-290)
				{ label: role === 'engineer' ? 'Assigned Work' : 'Inspections', href: '/work/inspections', icon: ClipboardCheck },
				{ label: 'Appointments', href: '/work/appointments', icon: Calendar },
				{ label: 'Open Assessments', href: '/work/assessments', icon: ClipboardList },
				{ label: 'Finalized Assessments', href: '/work/finalized-assessments', icon: FileCheck },
				{ label: 'FRC', href: '/work/frc', icon: FileCheck },
				{ label: 'Additionals', href: '/work/additionals', icon: Plus },
				{ label: 'Archive', href: '/work/archive', icon: Archive }
			],
			adminOnly: false
		},
		{
			label: 'Engineers',
			items: [
				{ label: 'All Engineers', href: '/engineers', icon: Users },
				{ label: 'New Engineer', href: '/engineers/new', icon: UserPlus }
			],
			adminOnly: true
		},
		{
			label: 'Repairers',
			items: [{ label: 'All Repairers', href: '/repairers', icon: Wrench }],
			adminOnly: true
		},
		{
			label: 'Settings',
			items: [{ label: 'Company Settings', href: '/settings', icon: Settings }],
			adminOnly: true
		}
	];

	// Filter navigation based on role
	const navigation = $derived(
		role === 'admin'
			? allNavigation
			: allNavigation.filter(group => !group.adminOnly)
	);

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	async function loadNewRequestCount() {
		try {
			newRequestCount = await requestService.getRequestCount({ status: 'submitted' }, $page.data.supabase);
		} catch (error) {
			console.error('Error loading new request count:', error);
		}
	}

	async function loadInspectionCount() {
		try {
			const filters: any = { status: 'pending' };
			if (role === 'engineer' && engineer_id) {
				filters.engineer_id = engineer_id;
			}
			inspectionCount = await inspectionService.getInspectionCount(filters, $page.data.supabase);
		} catch (error) {
			console.error('Error loading inspection count:', error);
		}
	}

	async function loadAppointmentCount() {
		try {
			const filters: any = { status: 'scheduled' };
			if (role === 'engineer' && engineer_id) {
				filters.engineer_id = engineer_id;
			}
			appointmentCount = await appointmentService.getAppointmentCount(filters, $page.data.supabase);
		} catch (error) {
			console.error('Error loading appointment count:', error);
		}
	}

	async function loadAssessmentCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			assessmentCount = await assessmentService.getInProgressCount($page.data.supabase, engineerIdFilter);
		} catch (error) {
			console.error('Error loading assessment count:', error);
		}
	}

	async function loadFinalizedAssessmentCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			finalizedAssessmentCount = await assessmentService.getFinalizedCount($page.data.supabase, engineerIdFilter);
		} catch (error) {
			console.error('Error loading finalized assessment count:', error);
		}
	}

	async function loadFRCCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			frcCount = await frcService.getCountByStatus('in_progress', $page.data.supabase, engineerIdFilter);
		} catch (error) {
			console.error('Error loading FRC count:', error);
		}
	}

	async function loadAdditionalsCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			additionalsCount = await additionalsService.getPendingCount($page.data.supabase, engineerIdFilter);
		} catch (error) {
			console.error('Error loading additionals count:', error);
		}
	}

	async function loadAllCounts() {
		await Promise.all([
			loadNewRequestCount(),
			loadInspectionCount(),
			loadAppointmentCount(),
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

		// Start polling interval (10 seconds for faster badge updates)
		pollingInterval = setInterval(loadAllCounts, 10000);

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
				// Resume polling if not already running (10 seconds for faster badge updates)
				if (!pollingInterval) {
					pollingInterval = setInterval(loadAllCounts, 10000);
				}

				// Refresh counts when navigating to work-related pages
				if (url.includes('/work/')) {
					loadAllCounts();
				}
			}
		}
	});
</script>

<aside class="hidden lg:block w-60 border-r bg-white flex flex-col">
	<nav class="space-y-6 p-4 flex-1">
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
									<item.icon class="h-4 w-4" />
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

							<!-- Show badge for Appointments with scheduled count -->
							{#if item.href === '/work/appointments' && appointmentCount > 0}
								<span
									class="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white"
								>
									{appointmentCount}
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

	<!-- Logout Button at Bottom -->
	<div class="border-t border-gray-200 p-4">
		<form
			method="POST"
			action="/auth/logout"
			use:enhance={() => {
				// Clear polling interval before logout
				if (pollingInterval) {
					clearInterval(pollingInterval);
					pollingInterval = null;
				}
				return async ({ update }) => {
					// Invalidate all auth-dependent data across the app
					// This ensures session state is cleared from client memory
					await invalidateAll();
					await invalidate('supabase:auth');

					// Apply form action result (redirect to login)
					await update();
				};
			}}
		>
			<button
				type="submit"
				class="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
			>
				<LogOut class="h-4 w-4" />
				Sign Out
			</button>
		</form>
	</div>
</aside>

