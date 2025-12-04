<script lang="ts" generics="T extends Record<string, any>">
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from 'lucide-svelte';
	import type { Snippet, Component } from 'svelte';
	import ListItemCard, { type CardConfig } from './ListItemCard.svelte';

	type Column<T extends Record<string, any>> = {
		key: keyof T;
		label: string;
		sortable?: boolean;
		icon?: Component | any; // Allow lucide-svelte icons which don't strictly match Component type
		class?: string;
	};

	type Props = {
		data: T[];
		columns: Column<T>[];
		onRowClick?: (row: T) => void;
		pageSize?: number;
		emptyMessage?: string;
		class?: string;
		cellContent?: Snippet<[Column<T>, T]>;
		striped?: boolean;
		animated?: boolean;
		loadingRowId?: string | null;
		loadingIndicator?: 'spinner' | 'pulse' | 'none';
		rowIdKey?: keyof T;
		/** Configuration for mobile card view - if provided, cards shown on mobile */
		mobileCardConfig?: CardConfig<T>;
		/** Custom content for mobile card fields */
		mobileCardContent?: Snippet<[keyof T, T]>;
	};

	let {
		data = [],
		columns = [],
		onRowClick,
		pageSize = 10,
		emptyMessage = 'No items found.',
		class: className = '',
		cellContent,
		striped = true,
		animated = true,
		loadingRowId = null,
		loadingIndicator = 'spinner',
		rowIdKey = 'id' as keyof T,
		mobileCardConfig,
		mobileCardContent
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
	<!-- Mobile Card View (shown below md breakpoint when mobileCardConfig is provided) -->
	{#if mobileCardConfig}
		<div class="space-y-3 md:hidden">
			{#if paginatedData().length === 0}
				<div class="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
					{emptyMessage}
				</div>
			{:else}
				{#each paginatedData() as row}
					{@const rowId = String(row[rowIdKey])}
					{@const isLoading = loadingRowId === rowId}
					<ListItemCard
						item={row}
						config={mobileCardConfig}
						onclick={onRowClick ? () => onRowClick(row) : undefined}
						loading={isLoading}
						fieldContent={mobileCardContent}
					/>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Desktop Table View (hidden below md breakpoint when mobileCardConfig is provided) -->
	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm {mobileCardConfig ? 'hidden md:block' : ''}">
		<Table.Root>
			<Table.Header>
				<Table.Row
					class="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 hover:from-slate-100 hover:via-blue-100 hover:to-indigo-100 transition-all duration-300"
				>
					{#each columns as column}
						<Table.Head class={column.class}>
							{#if column.sortable}
								{@const Icon = getSortIcon(column)}
								<button
									onclick={() => handleSort(column)}
									class="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 transition-colors"
								>
									{#if column.icon}
										<column.icon class="h-4 w-4 text-blue-600" />
									{/if}
									{column.label}
									{#if Icon}
										<Icon class="h-4 w-4" />
									{/if}
								</button>
							{:else}
								<div class="flex items-center gap-2">
									{#if column.icon}
										<column.icon class="h-4 w-4 text-blue-600" />
									{/if}
									<span class="font-semibold text-gray-700">{column.label}</span>
								</div>
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
					{#each paginatedData() as row, index}
						{@const rowId = String(row[rowIdKey])}
						{@const isLoading = loadingRowId === rowId}
						<Table.Row
							class="group border-b border-gray-100 relative {onRowClick && !loadingRowId
								? 'cursor-pointer'
								: ''} {isLoading
								? 'bg-blue-50 border-blue-200 animate-pulse'
								: striped && index % 2 === 0
									? 'bg-white'
									: striped
										? 'bg-gray-50/30'
										: 'bg-white'} {isLoading
								? 'opacity-100'
								: loadingRowId
									? 'opacity-60'
									: ''} {!isLoading && animated
								? 'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 hover:shadow-md hover:scale-[1.002] transform transition-all duration-200 ease-out'
								: 'hover:bg-gray-50'}"
							onclick={() => !loadingRowId && onRowClick?.(row)}
						>
							{#each columns as column, colIndex}
								<Table.Cell class={column.class}>
									{#if isLoading && colIndex === 0 && loadingIndicator !== 'none'}
										<div class="flex items-center gap-2">
											<div class="flex-shrink-0">
												<svg
													class="h-4 w-4 animate-spin text-blue-600"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="2"
													/>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													/>
												</svg>
											</div>
											<span class="text-sm font-medium text-blue-600">Loading...</span>
										</div>
									{:else if cellContent}
										{@render cellContent(column, row)}
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
				Showing <span class="font-semibold text-gray-900"
					>{currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, data.length)}</span
				>
				of <span class="font-semibold text-gray-900">{data.length}</span> results
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

