<script lang="ts" generics="T extends Record<string, any>">
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-svelte';

	type Column<T> = {
		key: keyof T;
		label: string;
		sortable?: boolean;
		render?: (value: any, row: T) => any;
		class?: string;
	};

	type Props = {
		data: T[];
		columns: Column<T>[];
		onRowClick?: (row: T) => void;
		pageSize?: number;
		emptyMessage?: string;
		class?: string;
	};

	let {
		data = [],
		columns = [],
		onRowClick,
		pageSize = 10,
		emptyMessage = 'No items found.',
		class: className = ''
	}: Props = $props();

	let sortKey = $state<keyof T | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(0);

	const sortedData = $derived(() => {
		if (!sortKey) return data;

		return [...data].sort((a, b) => {
			const aVal = a[sortKey as keyof T];
			const bVal = b[sortKey as keyof T];

			if (aVal === bVal) return 0;

			const comparison = aVal < bVal ? -1 : 1;
			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	const paginatedData = $derived(() => {
		const sorted = sortedData();
		const start = currentPage * pageSize;
		return sorted.slice(start, start + pageSize);
	});

	const totalPages = $derived(Math.ceil(data.length / pageSize));

	function handleSort(column: Column<T>) {
		if (!column.sortable) return;

		if (sortKey === column.key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = column.key;
			sortDirection = 'asc';
		}
		currentPage = 0;
	}

	function getSortIcon(column: Column<T>) {
		if (!column.sortable) return null;
		if (sortKey !== column.key) return ChevronsUpDown;
		return sortDirection === 'asc' ? ChevronUp : ChevronDown;
	}

	function goToPage(page: number) {
		currentPage = Math.max(0, Math.min(page, totalPages - 1));
	}
</script>

<div class="space-y-4 {className}">
	<div class="rounded-lg border bg-white shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row class="hover:bg-transparent">
					{#each columns as column}
						<Table.Head class={column.class}>
							{#if column.sortable}
								{@const Icon = getSortIcon(column)}
								<button
									onclick={() => handleSort(column)}
									class="flex items-center gap-2 font-medium hover:text-gray-900"
								>
									{column.label}
									{#if Icon}
										<Icon class="h-4 w-4" />
									{/if}
								</button>
							{:else}
								<span class="font-medium">{column.label}</span>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if paginatedData().length === 0}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={columns.length} class="h-24 text-center text-gray-500">
							{emptyMessage}
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each paginatedData() as row}
						<Table.Row
							class={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
							onclick={() => onRowClick?.(row)}
						>
							{#each columns as column}
								<Table.Cell class={column.class}>
									{#if column.render}
										{@render column.render(row[column.key], row)}
									{:else}
										{row[column.key]}
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	{#if totalPages > 1}
		<div class="flex items-center justify-between px-2">
			<div class="text-sm text-gray-600">
				Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, data.length)}
				of {data.length} results
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 0}
				>
					Previous
				</Button>
				<div class="flex items-center gap-1">
					{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						if (totalPages <= 5) return i;
						if (currentPage < 3) return i;
						if (currentPage > totalPages - 3) return totalPages - 5 + i;
						return currentPage - 2 + i;
					}) as page}
						<Button
							variant={page === currentPage ? 'default' : 'outline'}
							size="sm"
							onclick={() => goToPage(page)}
							class="min-w-9"
						>
							{page + 1}
						</Button>
					{/each}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages - 1}
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>

