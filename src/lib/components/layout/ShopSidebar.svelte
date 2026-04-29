<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { ComponentType } from 'svelte';
	import {
		LayoutDashboard,
		Wrench,
		FileText,
		Receipt,
		Users,
		Settings,
		LogOut,
		ArrowRight,
		CheckCircle,
		XCircle
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

	let { role = 'user' } = $props();

	type NavItem = {
		label: string;
		href: string;
		icon?: ComponentType;
	};

	type NavGroup = {
		label: string;
		items: NavItem[];
	};

	const navigation: NavGroup[] = [
		{
			label: 'General',
			items: [{ label: 'Dashboard', href: '/shop/dashboard', icon: LayoutDashboard }]
		},
		{
			label: 'Workshop',
			items: [
				{ label: 'Estimates', href: '/shop/estimates', icon: FileText },
				{ label: 'Jobs', href: '/shop/jobs', icon: Wrench },
				{ label: 'Invoices', href: '/shop/invoices', icon: Receipt },
				{ label: 'Completed', href: '/shop/completed', icon: CheckCircle },
				{ label: 'Cancelled', href: '/shop/cancelled', icon: XCircle }
			]
		},
		{
			label: 'Contacts',
			items: [{ label: 'Customers', href: '/shop/customers', icon: Users }]
		},
		{
			label: 'Admin',
			items: [{ label: 'Settings', href: '/shop/settings', icon: Settings }]
		}
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	// Badge count state
	let estimatesCount = $state(0);
	let jobsCount = $state(0);
	let invoicedCount = $state(0);
	let pollingActive = $state(true);
	let consecutiveErrors = $state(0);

	async function loadEstimatesCount() {
		try {
			const { count, error } = await $page.data.supabase
				.from('shop_jobs')
				.select('*', { count: 'exact', head: true })
				.in('status', ['quote_requested', 'quoted']);
			if (error) {
				if (error.code === 'PGRST303' || error.message?.includes('JWT')) throw error;
				console.error('Error loading estimates count:', error);
				estimatesCount = 0;
			} else {
				estimatesCount = count || 0;
			}
		} catch (error) {
			throw error;
		}
	}

	async function loadJobsCount() {
		try {
			const { count, error } = await $page.data.supabase
				.from('shop_jobs')
				.select('*', { count: 'exact', head: true })
				.in('status', ['approved', 'checked_in', 'in_progress', 'quality_check', 'ready_for_collection']);
			if (error) {
				if (error.code === 'PGRST303' || error.message?.includes('JWT')) throw error;
				console.error('Error loading jobs count:', error);
				jobsCount = 0;
			} else {
				jobsCount = count || 0;
			}
		} catch (error) {
			throw error;
		}
	}

	let invoiceAgeBands = $state<{ color: string; count: number }[]>([]);

	function daysSince(dateStr: string | null): number {
		if (!dateStr) return 0;
		return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
	}

	async function loadInvoicedCount() {
		try {
			const { data, error } = await $page.data.supabase
				.from('shop_invoices')
				.select('issue_date, status')
				.in('status', ['draft', 'sent', 'partially_paid', 'overdue']);
			if (error) {
				if (error.code === 'PGRST303' || error.message?.includes('JWT')) throw error;
				console.error('Error loading invoices count:', error);
				invoicedCount = 0;
				invoiceAgeBands = [];
			} else {
				const invoices = data || [];
				invoicedCount = invoices.length;

				let c30 = 0, c60 = 0, c90 = 0, c120 = 0;
				for (const inv of invoices) {
					const days = daysSince(inv.issue_date);
					if (days >= 120) c120++;
					else if (days > 60) c90++;
					else if (days > 30) c60++;
					else c30++;
				}

				invoiceAgeBands = [
					{ color: 'bg-success', count: c30 },
					{ color: 'bg-warning', count: c60 },
					{ color: 'bg-warning', count: c90 },
					{ color: 'bg-destructive', count: c120 },
				].filter(b => b.count > 0);
			}
		} catch (error) {
			throw error;
		}
	}

	async function loadAllCounts() {
		if (!pollingActive) return;
		try {
			await Promise.all([loadEstimatesCount(), loadJobsCount(), loadInvoicedCount()]);
			consecutiveErrors = 0;
		} catch {
			consecutiveErrors++;
			if (consecutiveErrors >= 3) {
				pollingActive = false;
			}
		}
	}

	// Badge info helper
	function getBadgeInfo(href: string): { count: number; colorClass: string } | null {
		switch (href) {
			case '/shop/estimates':
				return { count: estimatesCount, colorClass: 'bg-blue-600' };
			case '/shop/jobs':
				return { count: jobsCount, colorClass: 'bg-yellow-600' };
			case '/shop/invoices':
				return { count: invoicedCount, colorClass: 'bg-orange-600' };
			default:
				return null;
		}
	}

	// Polling via $effect — load on mount, then every 10 seconds
	$effect(() => {
		loadAllCounts();
		const interval = setInterval(loadAllCounts, 10000);
		return () => clearInterval(interval);
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
							{@const badge = getBadgeInfo(item.href)}
							<SidebarMenuItem>
								<SidebarMenuButton isActive={isActive(item.href)} tooltipContent={item.label}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											{#if item.icon}
												<item.icon />
											{/if}
											<span>{item.label}</span>
											{#if item.href === '/shop/invoices' && invoiceAgeBands.length > 0}
												<span class="ml-auto flex items-center gap-0.5">
													{#each invoiceAgeBands as band}
														<span class="flex h-5 min-w-5 items-center justify-center rounded-full {band.color} px-1 text-[10px] font-medium text-white">
															{band.count}
														</span>
													{/each}
												</span>
											{:else if badge && badge.count > 0}
												<span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full {badge.colorClass} px-1 text-xs font-medium text-white">
													{badge.count}
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

		<!-- Switch to Assessments link -->
		<SidebarGroup>
			<SidebarGroupContent>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton tooltipContent="Switch to Assessments">
							{#snippet child({ props })}
								<a href="/dashboard" {...props} class="text-slate-500 hover:text-slate-700">
									<ArrowRight />
									<span>Switch to Assessments</span>
								</a>
							{/snippet}
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	</SidebarContent>

	<SidebarFooter>
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					tooltipContent="Sign Out"
					onclick={() => {
						const submitBtn = document.getElementById('shop-sidebar-logout-submit');
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
						return async ({ update }) => {
							await invalidateAll();
							await invalidate('supabase:auth');
							await update();
						};
					}}
				>
					<button id="shop-sidebar-logout-submit" type="submit" class="hidden">Submit</button>
				</form>
			</SidebarMenuItem>
		</SidebarMenu>
	</SidebarFooter>
	<SidebarRail />
</Sidebar>
