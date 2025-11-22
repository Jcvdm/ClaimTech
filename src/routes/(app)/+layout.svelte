<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import { SidebarProvider, SidebarTrigger, SidebarInset } from '$lib/components/ui/sidebar';
	import { Separator } from '$lib/components/ui/separator';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { LogOut, User } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { invalidateAll, invalidate, goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Get user info from layout data
	const userEmail = $derived(
		(data.user as any)?.email || (data.session?.user as any)?.email || 'User'
	);
	const userName = $derived((data.user as any)?.full_name || userEmail);
	const userRole = $derived(data.role || 'user');

	// Generate breadcrumbs from current path
	const breadcrumbs = $derived(
		$page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, index, array) => {
				const href = '/' + array.slice(0, index + 1).join('/');
				return {
					label: segment.charAt(0).toUpperCase() + segment.slice(1),
					href
				};
			})
	);
</script>

<SidebarProvider>
	<Sidebar role={userRole} engineer_id={data.engineer_id} />

	<SidebarInset>
		<!-- Top bar -->
		<header
			class="flex h-16 shrink-0 items-center gap-2 border-b border-transparent bg-gradient-to-r from-rose-500/85 via-rose-400/75 to-rose-600/85 px-4 text-white shadow-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2">
				<SidebarTrigger
					class="-ml-1 text-white hover:bg-white/10 focus-visible:bg-white/20 focus-visible:text-white"
				/>
				<Separator orientation="vertical" class="mr-2 h-4 border-white/40" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link class="text-white/80 hover:text-white" href="/dashboard">
								Home
							</Breadcrumb.Link>
						</Breadcrumb.Item>
						{#each breadcrumbs as crumb}
							<Breadcrumb.Separator class="hidden md:block text-white/40" />
							<Breadcrumb.Item>
								{#if crumb.href === $page.url.pathname}
									<Breadcrumb.Page class="text-white">{crumb.label}</Breadcrumb.Page>
								{:else}
									<Breadcrumb.Link class="text-white/80 hover:text-white" href={crumb.href}>
										{crumb.label}
									</Breadcrumb.Link>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>

			<div class="ml-auto flex items-center gap-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<div
							class="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-3 text-white transition-colors hover:bg-white/10"
						>
							<Avatar.Root class="h-8 w-8">
								<Avatar.Fallback class="bg-white/20 text-white">
									{userName.charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="hidden text-sm font-medium sm:inline-block">{userName}</span>
						</div>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item
							onclick={() => goto('/company/settings')}
							class="cursor-pointer"
						>
							Company Settings
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							class="cursor-pointer"
							onclick={() => {
								// Trigger the hidden submit button
								const submitBtn = document.getElementById('topbar-logout-submit');
								if (submitBtn) submitBtn.click();
							}}
						>
							<LogOut class="mr-2 h-4 w-4" />
							<span>Sign out</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<!-- Hidden logout form -->
				<form
					method="POST"
					action="/auth/logout"
					class="hidden"
					use:enhance={() => {
						return async ({ update }) => {
							// Invalidate all auth-dependent data across the app
							// This ensures session state is cleared from client memory
							await invalidateAll();
							await invalidate('supabase:auth');
							await update();
						};
					}}
				>
					<button id="topbar-logout-submit" type="submit" class="hidden">Submit</button>
				</form>
			</div>
		</header>

		<!-- Main content -->
		<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
			{@render children()}
		</div>
	</SidebarInset>
</SidebarProvider>
