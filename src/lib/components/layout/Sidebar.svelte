<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto, invalidateAll, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { ComponentType } from 'svelte';
	import {
		LayoutDashboard,
		Users,
		FileText,
		ClipboardCheck,
		Calendar,
		ClipboardList,
		FileCheck,
		Plus,
		Archive,
		UserPlus,
		Wrench,
		Settings,
		LogOut
	} from 'lucide-svelte';

	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupContent,
		SidebarGroupLabel,
		SidebarHeader,
		SidebarMenu,
		SidebarMenuButton,
		SidebarMenuItem,
		SidebarRail
	} from '$lib/components/ui/sidebar';
	import logo from '$lib/assets/logo.png';
	import { assessmentService } from '$lib/services/assessment.service';
	import { frcService } from '$lib/services/frc.service';
	import { additionalsService } from '$lib/services/additionals.service';

	let { role = 'user', engineer_id = null } = $props();

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
			items: [{ label: 'New Requests', href: '/requests', icon: FileText }],
			adminOnly: true
		},
		{
			label: 'Work',
			items: [
				// Note: Badge counts are rendered directly in the template using state variables
				// The reactive state refs are used in conditional rendering below (lines 257-290)
				{
					label: role === 'engineer' ? 'Assigned Work' : 'Inspections',
					href: '/work/inspections',
					icon: ClipboardCheck
				},
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
		role === 'admin' ? allNavigation : allNavigation.filter((group) => !group.adminOnly)
	);

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	async function loadNewRequestCount() {
		try {
			let query = $page.data.supabase
				.from('assessments')
				.select('*, requests!inner(assigned_engineer_id, status)', { count: 'exact', head: true })
				.eq('stage', 'request_submitted')
				.in('requests.status', ['submitted', 'draft']); // Only count active requests (match /requests page filter)

			if (role === 'engineer' && engineer_id) {
				query = query.eq('requests.assigned_engineer_id', engineer_id);
			}

			const { count, error } = await query;

			if (error) {
				console.error('Error loading new request count:', error);
				newRequestCount = 0;
			} else {
				newRequestCount = count || 0;
			}
		} catch (error) {
			console.error('Error loading new request count:', error);
			newRequestCount = 0;
		}
	}

	async function loadInspectionCount() {
		try {
			let query = $page.data.supabase
				.from('assessments')
				.select('*, inspections!inner(assigned_engineer_id)', { count: 'exact', head: true })
				.eq('stage', 'inspection_scheduled');

			if (role === 'engineer' && engineer_id) {
				query = query.eq('inspections.assigned_engineer_id', engineer_id);
			}

			const { count, error } = await query;

			if (error) {
				console.error('Error loading inspection count:', error);
				inspectionCount = 0;
			} else {
				inspectionCount = count || 0;
			}
		} catch (error) {
			console.error('Error loading inspection count:', error);
			inspectionCount = 0;
		}
	}

	async function loadAppointmentCount() {
		try {
			let query = $page.data.supabase
				.from('assessments')
				.select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
				.eq('stage', 'appointment_scheduled');

			if (role === 'engineer' && engineer_id) {
				query = query.eq('appointments.engineer_id', engineer_id);
			}

			const { count, error } = await query;

			if (error) {
				console.error('Error loading appointment count:', error);
				appointmentCount = 0;
			} else {
				appointmentCount = count || 0;
			}
		} catch (error) {
			console.error('Error loading appointment count:', error);
			appointmentCount = 0;
		}
	}

	async function loadAssessmentCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			assessmentCount = await assessmentService.getInProgressCount(
				$page.data.supabase,
				engineerIdFilter
			);
		} catch (error) {
			console.error('Error loading assessment count:', error);
		}
	}

	async function loadFinalizedAssessmentCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			finalizedAssessmentCount = await assessmentService.getFinalizedCount(
				$page.data.supabase,
				engineerIdFilter
			);
		} catch (error) {
			console.error('Error loading finalized assessment count:', error);
		}
	}

	async function loadFRCCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			frcCount = await frcService.getCountByStatus(
				'in_progress',
				$page.data.supabase,
				engineerIdFilter
			);
		} catch (error) {
			console.error('Error loading FRC count:', error);
		}
	}

	async function loadAdditionalsCount() {
		try {
			const engineerIdFilter = role === 'engineer' ? engineer_id : undefined;
			// Count only assessments with pending additionals items (actionable work)
			additionalsCount = await additionalsService.getPendingCount(
				$page.data.supabase,
				engineerIdFilter
			);
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
			pathname.includes('/edit') || pathname.includes('/new') || pathname.includes('/assessments/') // Assessment detail page with heavy editing
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

<Sidebar collapsible="icon">
	<SidebarHeader>
		<div class="flex items-center justify-center px-2 py-4">
			<img
				src={logo}
				alt="ClaimTech"
				class="h-20 w-auto cursor-pointer transition-all duration-200 ease-linear
					   group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:opacity-90
					   hover:scale-105 hover:brightness-110"
			/>
		</div>
	</SidebarHeader>
	<SidebarContent>
		{#each navigation as group}
			<SidebarGroup>
				<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						{#each group.items as item}
							<SidebarMenuItem>
								<SidebarMenuButton isActive={isActive(item.href)} tooltipContent={item.label}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											{#if item.icon}
												<item.icon />
											{/if}
											<span>{item.label}</span>

											<!-- Badges -->
											{#if item.href === '/requests' && newRequestCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white"
												>
													{newRequestCount}
												</span>
											{/if}
											{#if item.href === '/work/inspections' && inspectionCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-medium text-white"
												>
													{inspectionCount}
												</span>
											{/if}
											{#if item.href === '/work/appointments' && appointmentCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-medium text-white"
												>
													{appointmentCount}
												</span>
											{/if}
											{#if item.href === '/work/assessments' && assessmentCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-medium text-white"
												>
													{assessmentCount}
												</span>
											{/if}
											{#if item.href === '/work/finalized-assessments' && finalizedAssessmentCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-xs font-medium text-white"
												>
													{finalizedAssessmentCount}
												</span>
											{/if}
											{#if item.href === '/work/frc' && frcCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1 text-xs font-medium text-white"
												>
													{frcCount}
												</span>
											{/if}
											{#if item.href === '/work/additionals' && additionalsCount > 0}
												<span
													class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-xs font-medium text-white"
												>
													{additionalsCount}
												</span>
											{/if}
										</a>
									{/snippet}
								</SidebarMenuButton>
							</SidebarMenuItem>
						{/each}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		{/each}
	</SidebarContent>

	<SidebarFooter>
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					tooltipContent="Sign Out"
					onclick={() => {
						const submitBtn = document.getElementById('sidebar-logout-submit');
						if (submitBtn) submitBtn.click();
					}}
				>
					{#snippet child({ props })}
						<button
							class="text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:outline-none"
							{...props}
						>
							<LogOut />
							<span>Sign Out</span>
						</button>
					{/snippet}
				</SidebarMenuButton>

				<form
					method="POST"
					action="/auth/logout"
					class="hidden"
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
					<button id="sidebar-logout-submit" type="submit" class="hidden">Submit</button>
				</form>
			</SidebarMenuItem>
		</SidebarMenu>
	</SidebarFooter>
	<SidebarRail />
</Sidebar>
