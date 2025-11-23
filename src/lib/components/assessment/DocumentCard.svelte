<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, Circle, Loader2, Download, FileText, Printer } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import { formatDateTime as formatDate } from '$lib/utils/formatters';

	interface Props {
		title: string;
		description: string;
		icon: ComponentType;
		generated: boolean;
		generatedAt?: string | null;
		generating: boolean;
		progress?: number; // 0-100
		progressMessage?: string;
		onGenerate: () => void;
		onDownload: () => void;
		printUrl?: string; // Optional: URL for client-side print fallback
		showPrintFallback?: boolean; // Show print button instead of generate
	}

	let {
		title,
		description,
		icon,
		generated,
		generatedAt = null,
		generating,
		progress = 0,
		progressMessage = '',
		onGenerate,
		onDownload,
		printUrl = '',
		showPrintFallback = false
	}: Props = $props();

	function handlePrint() {
		if (printUrl) {
			window.open(printUrl, '_blank');
		}
	}
</script>

<Card class="p-6">
	<div class="flex items-start justify-between">
		<div class="flex items-start gap-4">
			<div class="rounded-lg bg-blue-50 p-3">
				{#if icon}
					{@const Icon = icon}
					<Icon class="h-6 w-6 text-blue-600" />
				{/if}
			</div>
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
				<p class="mt-1 text-sm text-gray-600">{description}</p>

				<div class="mt-3 flex items-center gap-2">
					{#if generated}
						<Badge variant="default" class="bg-green-100 text-green-800">
							<CheckCircle class="mr-1 h-3 w-3" />
							Generated
						</Badge>
						{#if generatedAt}
							<span class="text-xs text-gray-500">
								{formatDate(generatedAt)}
							</span>
						{/if}
					{:else}
						<Badge variant="secondary">
							<Circle class="mr-1 h-3 w-3" />
							Not Generated
						</Badge>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if generating}
		<div class="mt-4 rounded-md bg-blue-50 p-3">
			<div class="flex items-center gap-2">
				<Loader2 class="h-4 w-4 animate-spin text-blue-600" />
				<p class="text-sm font-medium text-blue-900">Generating document...</p>
			</div>

			<!-- Progress Bar -->
			<div class="mt-3">
				<div class="flex items-center justify-between mb-1">
					<span class="text-xs text-blue-700">{progressMessage || 'Processing...'}</span>
					<span class="text-xs font-medium text-blue-900">{progress}%</span>
				</div>
				<div class="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
					<div
						class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
						style="width: {progress}%"
					></div>
				</div>
			</div>

			<p class="mt-2 text-xs text-blue-700">
				This may take 1-3 minutes depending on server speed and document complexity.
			</p>
			<p class="mt-1 text-xs text-blue-600 font-medium">
				💡 Tip: Auto-save is paused during generation to prevent interruptions.
			</p>
		</div>
	{/if}

	<div class="mt-4 flex gap-2">
		<Button
			onclick={onGenerate}
			disabled={generating}
			variant={generated ? 'outline' : 'default'}
			class="flex-1"
		>
			{#if generating}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Generating...
			{:else}
				<FileText class="mr-2 h-4 w-4" />
				{generated ? 'Regenerate' : 'Generate'}
			{/if}
		</Button>

		{#if generated}
			<Button onclick={onDownload} variant="outline">
				<Download class="mr-2 h-4 w-4" />
				Download
			</Button>
		{/if}

		{#if showPrintFallback && printUrl}
			<Button onclick={handlePrint} variant="secondary" class="border-orange-300 bg-orange-50 hover:bg-orange-100">
				<Printer class="mr-2 h-4 w-4" />
				Print Instead
			</Button>
		{/if}
	</div>

	{#if showPrintFallback}
		<div class="mt-3 rounded-md bg-orange-50 p-3 border border-orange-200">
			<p class="text-xs text-orange-900">
				<strong>⚡ Quick Print:</strong> Server generation is taking longer than expected. Use "Print Instead" to open a print-friendly view in your browser, then save as PDF (Ctrl+P or Cmd+P).
			</p>
		</div>
	{/if}
</Card>

