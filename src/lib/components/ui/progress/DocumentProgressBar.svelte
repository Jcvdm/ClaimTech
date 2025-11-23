<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-svelte';

	interface Props {
		/**
		 * Progress value (0-100)
		 */
		value?: number;
		/**
		 * Status of the progress
		 */
		status?: 'pending' | 'processing' | 'success' | 'error';
		/**
		 * Label text
		 */
		label?: string;
		/**
		 * Show percentage text
		 */
		showPercentage?: boolean;
		/**
		 * Additional CSS classes
		 */
		class?: string;
	}

	let {
		value = 0,
		status = 'pending',
		label = '',
		showPercentage = true,
		class: className = ''
	}: Props = $props();

	const statusIcons = {
		pending: Clock,
		processing: Loader2,
		success: CheckCircle,
		error: AlertCircle
	};

	const statusColors = {
		pending: 'text-slate-400',
		processing: 'text-rose-500',
		success: 'text-emerald-500',
		error: 'text-red-500'
	};

	const progressBackgrounds = {
		pending: 'bg-slate-100',
		processing: 'bg-rose-50',
		success: 'bg-emerald-50',
		error: 'bg-red-50'
	};
</script>

<div class="space-y-2 {className}">
	<div class="flex items-center gap-2">
		{#if statusIcons[status]}
			{@const Icon = statusIcons[status]}
			<Icon
				class="size-4 {statusColors[status]} {status === 'processing' ? 'animate-spin' : ''}"
			/>
		{/if}
		<span class="text-sm font-medium text-slate-900">{label}</span>
		{#if showPercentage}
			<span class="ml-auto text-xs text-slate-500">{value}%</span>
		{/if}
	</div>
	<Progress value={value} class={progressBackgrounds[status]} />
</div>
