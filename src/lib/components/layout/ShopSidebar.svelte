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
		ArrowRight
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
				{ label: 'Jobs', href: '/shop/jobs', icon: Wrench },
				{ label: 'Estimates', href: '/shop/estimates', icon: FileText },
				{ label: 'Invoices', href: '/shop/invoices', icon: Receipt }
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

	let pollingInterval: ReturnType<typeof setInterval> | null = null;
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
