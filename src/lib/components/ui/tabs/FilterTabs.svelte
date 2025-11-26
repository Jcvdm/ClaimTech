<script lang="ts" generics="T extends string">
	import { Tabs, TabsList, TabsTrigger } from './index';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	type FilterItem = {
		value: T;
		label: string;
	};

	interface Props {
		items: FilterItem[] | readonly FilterItem[];
		value?: T;
		counts: Record<T, number> | Record<string, number>;
		onValueChange?: (value: T) => void;
		class?: string;
		disabled?: boolean;
	}

	let {
		items,
		value = $bindable(),
		counts,
		onValueChange,
		class: className,
		disabled = false
	}: Props = $props();

	const handleValueChange = (newValue: string) => {
		value = newValue as T;
		onValueChange?.(newValue as T);
	};
</script>

<Tabs {value} onValueChange={handleValueChange} class={cn('w-full', className)}>
	<TabsList class="flex w-full items-center justify-start gap-2 rounded-none border-b border-border bg-transparent p-0">
		{#each items as item}
			<TabsTrigger
				value={item.value}
				{disabled}
				class={cn(
					'relative flex h-9 items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
					'data-[state=active]:border-rose-500 data-[state=active]:text-rose-600'
				)}
			>
				<span>{item.label}</span>
				<Badge
					variant="secondary"
					class="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700"
				>
					{counts[item.value]}
				</Badge>
			</TabsTrigger>
		{/each}
	</TabsList>
</Tabs>

