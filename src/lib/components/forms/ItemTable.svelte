<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Plus, X } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	export type LineItem = {
		id: string;
		description: string;
		quantity: number;
		rate: number;
		amount: number;
	};

	type Props = {
		items?: LineItem[];
		currency?: string;
		class?: string;
		onItemsChange?: (items: LineItem[]) => void;
	};

	let { items = $bindable([]), currency = 'R', class: className = '', onItemsChange }: Props = $props();

	function generateId() {
		return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	function addRow() {
		const newItem: LineItem = {
			id: generateId(),
			description: '',
			quantity: 1,
			rate: 0,
			amount: 0
		};
		items = [...items, newItem];
		onItemsChange?.(items);
	}

	function removeRow(id: string) {
		items = items.filter((item) => item.id !== id);
		onItemsChange?.(items);
	}

	function updateItem(id: string, field: keyof LineItem, value: string | number) {
		items = items.map((item) => {
			if (item.id !== id) return item;

			const updated = { ...item, [field]: value };

			// Auto-calculate amount when quantity or rate changes
			if (field === 'quantity' || field === 'rate') {
				updated.amount = updated.quantity * updated.rate;
			}

			return updated;
		});
		onItemsChange?.(items);
	}

	const subtotal = $derived(items.reduce((sum, item) => sum + item.amount, 0));
</script>

<div class={cn('space-y-4', className)}>
	<div class="rounded-lg border bg-white">
		<Table.Root>
			<Table.Header>
				<Table.Row class="hover:bg-transparent">
					<Table.Head class="w-[40%]">Item Details</Table.Head>
					<Table.Head class="w-[15%] text-right">Quantity</Table.Head>
					<Table.Head class="w-[15%] text-right">Rate</Table.Head>
					<Table.Head class="w-[20%] text-right">Amount</Table.Head>
					<Table.Head class="w-[10%]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if items.length === 0}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={5} class="h-24 text-center text-gray-500">
							No items added. Click "Add New Row" to get started.
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each items as item (item.id)}
						<Table.Row class="hover:bg-gray-50">
							<Table.Cell>
								<Input
									type="text"
									placeholder="Type or click to select an item"
									value={item.description}
									oninput={(e) => updateItem(item.id, 'description', e.currentTarget.value)}
									class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
								/>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Input
									type="number"
									min="0"
									step="1"
									value={item.quantity}
									oninput={(e) => updateItem(item.id, 'quantity', parseFloat(e.currentTarget.value) || 0)}
									class="border-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0"
								/>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={item.rate}
									oninput={(e) => updateItem(item.id, 'rate', parseFloat(e.currentTarget.value) || 0)}
									class="border-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0"
								/>
							</Table.Cell>
							<Table.Cell class="text-right font-medium">
								{currency} {item.amount.toFixed(2)}
							</Table.Cell>
							<Table.Cell class="text-center">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeRow(item.id)}
									class="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
								>
									<X class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex items-center justify-between">
		<Button variant="outline" size="sm" onclick={addRow} class="gap-2">
			<Plus class="h-4 w-4" />
			Add New Row
		</Button>

		<div class="flex items-center gap-4 text-sm">
			<span class="text-gray-600">Sub Total</span>
			<span class="text-lg font-semibold">
				{currency} {subtotal.toFixed(2)}
			</span>
		</div>
	</div>
</div>

