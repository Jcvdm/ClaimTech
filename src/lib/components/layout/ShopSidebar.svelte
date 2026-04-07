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
				{ label: 'Invoiced', href: '/shop/invoiced', icon: Receipt },
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

	async function loadEstimatesCount() {
		try {
			const { count, error } = await $page.data.supabase
				.from('shop_jobs')
				.select('*', { count: 'exact', head: true })
				.in('status', ['quote_requested', 'quoted']);
			if (error) {
				console.error('Error loading estimates count:', error);
				estimatesCount = 0;
			} else {
				estimatesCount = count || 0;
			}
		} catch (error) {
			console.error('Error loading estimates count:', error);
			estimatesCount = 0;
		}
	}

	async function loadJobsCount() {
		try {
			const { count, error } = await $page.data.supabase
				.from('shop_jobs')
				.select('*', { count: 'exact', head: true })
				.in('status', ['approved', 'checked_in', 'in_progress', 'quality_check', 'ready_for_collection']);
			if (error) {
				console.error('Error loading jobs count:', error);
				jobsCount = 0;
			} else {
				jobsCount = count || 0;
			}
		} catch (error) {
			console.error('Error loading jobs count:', error);
			jobsCount = 0;
		}
	}

	async function loadInvoicedCount() {
		try {
			const { data, error } = await $page.data.supabase
				.from('shop_jobs')
				.select('id, shop_invoices(id, status)')
				.eq('status', 'completed');
			if (error) {
				console.error('Error loading invoiced count:', error);
				invoicedCount = 0;
			} else {
				// Jobs with no invoices or with at least one unpaid invoice
				invoicedCount = (data || []).filter((job: { id: string; shop_invoices: { id: string; status: string }[] }) => {
					const invoices = job.shop_invoices || [];
					return invoices.length === 0 || invoices.some((inv) => inv.status !== 'paid');
				}).length;
			}
		} catch (error) {
			console.error('Error loading invoiced count:', error);
			invoicedCount = 0;
		}
	}

	async function loadAllCounts() {
		await Promise.all([
			loadEstimatesCount(),
			loadJobsCount(),
			loadInvoicedCount()
		]);
	}

	// Badge info helper
	function getBadgeInfo(href: string): { count: number; colorClass: string } | null {
		switch (href) {
			case '/shop/estimates':
				return { count: estimatesCount, colorClass: 'bg-blue-600' };
			case '/shop/jobs':
				return { count: jobsCount, colorClass: 'bg-yellow-600' };
			case '/shop/invoiced':
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
											{#if badge && badge.count > 0}
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
