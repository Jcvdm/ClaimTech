<script lang="ts">
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';
	import * as ResponsiveTabs from '$lib/components/ui/responsive-tabs';
	import { FieldGrid } from '$lib/components/ui/field-grid';
	import { ActionBar } from '$lib/components/ui/action-bar';
	import type { Action } from '$lib/components/ui/action-bar';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Save,
		Pencil,
		Share2,
		Archive,
		Trash2,
	} from 'lucide-svelte';

	// ResponsiveDialog state
	let dialogOpen = $state(false);

	// ResponsiveTabs state
	let activeTab = $state('tab-a');

	// ActionBar actions
	const actions: Action[] = [
		{ label: 'Save', icon: Save, onclick: () => alert('Save'), variant: 'default' },
		{ label: 'Edit', icon: Pencil, onclick: () => alert('Edit'), variant: 'outline' },
		{ label: 'Share', icon: Share2, onclick: () => alert('Share'), variant: 'outline' },
		{ label: 'Archive', icon: Archive, onclick: () => alert('Archive'), variant: 'outline' },
		{ label: 'Delete', icon: Trash2, onclick: () => alert('Delete'), variant: 'destructive' },
	];
</script>

<svelte:head>
	<title>Primitives Demo — Dev</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-12 p-6">
	<div>
		<h1 class="mb-2 text-2xl font-bold">Phase 2 Primitives Demo</h1>
		<p class="text-muted-foreground text-sm">
			Resize the browser across 768px to see ResponsiveDialog swap between dialog and bottom sheet.
		</p>
	</div>

	<!-- 1. ResponsiveDialog -->
	<section>
		<h2 class="mb-4 text-lg font-semibold">ResponsiveDialog</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			At md+ (≥768px): modal dialog. Below md: bottom sheet. Resize to see the swap.
		</p>
		<Button onclick={() => (dialogOpen = true)}>Open Dialog</Button>

		<ResponsiveDialog.Root bind:open={dialogOpen}>
			<ResponsiveDialog.Content class="sm:max-w-md">
				<ResponsiveDialog.Header>
					<ResponsiveDialog.Title>Confirm Action</ResponsiveDialog.Title>
					<ResponsiveDialog.Description>
						This demonstrates the responsive dialog primitive.
					</ResponsiveDialog.Description>
				</ResponsiveDialog.Header>
				<div class="py-4">
					<p class="text-sm">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
						incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
						exercitation ullamco laboris.
					</p>
				</div>
				<ResponsiveDialog.Footer>
					<Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button onclick={() => (dialogOpen = false)}>Confirm</Button>
				</ResponsiveDialog.Footer>
			</ResponsiveDialog.Content>
		</ResponsiveDialog.Root>
	</section>

	<!-- 2. ResponsiveTabs -->
	<section>
		<h2 class="mb-4 text-lg font-semibold">ResponsiveTabs</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Mobile: horizontal snap-scroll. Desktop (sm+): 6-column grid.
		</p>
		<ResponsiveTabs.Root bind:value={activeTab}>
			<ResponsiveTabs.List cols={6}>
				<ResponsiveTabs.Trigger value="tab-a">Tab A</ResponsiveTabs.Trigger>
				<ResponsiveTabs.Trigger value="tab-b">Tab B</ResponsiveTabs.Trigger>
				<ResponsiveTabs.Trigger value="tab-c">Tab C</ResponsiveTabs.Trigger>
				<ResponsiveTabs.Trigger value="tab-d">Tab D</ResponsiveTabs.Trigger>
				<ResponsiveTabs.Trigger value="tab-e">Tab E</ResponsiveTabs.Trigger>
				<ResponsiveTabs.Trigger value="tab-f">Tab F</ResponsiveTabs.Trigger>
			</ResponsiveTabs.List>
			<ResponsiveTabs.Content value="tab-a">
				<div class="rounded-md border p-4">Content for Tab A</div>
			</ResponsiveTabs.Content>
			<ResponsiveTabs.Content value="tab-b">
				<div class="rounded-md border p-4">Content for Tab B</div>
			</ResponsiveTabs.Content>
			<ResponsiveTabs.Content value="tab-c">
				<div class="rounded-md border p-4">Content for Tab C</div>
			</ResponsiveTabs.Content>
			<ResponsiveTabs.Content value="tab-d">
				<div class="rounded-md border p-4">Content for Tab D</div>
			</ResponsiveTabs.Content>
			<ResponsiveTabs.Content value="tab-e">
				<div class="rounded-md border p-4">Content for Tab E</div>
			</ResponsiveTabs.Content>
			<ResponsiveTabs.Content value="tab-f">
				<div class="rounded-md border p-4">Content for Tab F</div>
			</ResponsiveTabs.Content>
		</ResponsiveTabs.Root>
	</section>

	<!-- 3. FieldGrid -->
	<section>
		<h2 class="mb-4 text-lg font-semibold">FieldGrid</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			cols=3: 1 column on mobile → 2 on md → 3 on lg.
		</p>
		<FieldGrid cols={3}>
			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input id="name" placeholder="Full name" />
			</div>
			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" placeholder="email@example.com" />
			</div>
			<div class="space-y-2">
				<Label for="phone">Phone</Label>
				<Input id="phone" type="tel" placeholder="+27 12 345 6789" />
			</div>
			<div class="space-y-2">
				<Label for="address">Address</Label>
				<Input id="address" placeholder="Street address" />
			</div>
			<div class="space-y-2">
				<Label for="city">City</Label>
				<Input id="city" placeholder="City" />
			</div>
			<div class="space-y-2">
				<Label for="state">Province</Label>
				<Input id="state" placeholder="Province" />
			</div>
			<div class="space-y-2">
				<Label for="zip">Postal Code</Label>
				<Input id="zip" placeholder="0001" />
			</div>
			<div class="space-y-2">
				<Label for="country">Country</Label>
				<Input id="country" placeholder="South Africa" />
			</div>
		</FieldGrid>
	</section>

	<!-- 4. ActionBar -->
	<section>
		<h2 class="mb-4 text-lg font-semibold">ActionBar</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Desktop (md+): all 5 actions inline. Mobile: first 2 inline + 3 in "More" dropdown.
		</p>
		<ActionBar {actions} inlineCount={2} />
	</section>
</div>
