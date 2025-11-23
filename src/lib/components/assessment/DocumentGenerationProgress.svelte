<script lang="ts">
	import { FileText, FileSpreadsheet, Image, Archive, CheckCircle, XCircle, Loader2, Clock } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Card } from '$lib/components/ui/card';

	interface DocumentProgress {
		status: 'pending' | 'processing' | 'success' | 'error';
		progress: number;
		message: string;
		url: string | null;
		error: string | null;
	}

	interface Props {
		report: DocumentProgress;
		estimate: DocumentProgress;
		photosPdf: DocumentProgress;
		photosZip: DocumentProgress;
		onRetry?: (documentType: string) => void;
	}

	let { report, estimate, photosPdf, photosZip, onRetry }: Props = $props();

	const documents = $derived([
		{ key: 'report', label: 'Assessment Report', icon: FileText, data: report },
		{ key: 'estimate', label: 'Estimate', icon: FileSpreadsheet, data: estimate },
		{ key: 'photosPdf', label: 'Photos PDF', icon: Image, data: photosPdf },
		{ key: 'photosZip', label: 'Photos ZIP', icon: Archive, data: photosZip }
	]);

	const completedCount = $derived(
		documents.filter(d => d.data.status === 'success').length
	);

	function getStatusIcon(status: string) {
		switch (status) {
			case 'pending': return Clock;
			case 'processing': return Loader2;
			case 'success': return CheckCircle;
			case 'error': return XCircle;
			default: return Clock;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending': return 'text-gray-400';
			case 'processing': return 'text-rose-500';
			case 'success': return 'text-green-500';
			case 'error': return 'text-red-500';
			default: return 'text-gray-400';
		}
	}

	function getProgressBackground(status: string) {
		switch (status) {
			case 'success': return 'bg-green-100';
			case 'error': return 'bg-red-100';
			case 'processing': return 'bg-rose-100';
			default: return 'bg-rose-100';
		}
	}
</script>

<Card class="p-6">
	<h3 class="text-lg font-semibold mb-4">Generating Documents</h3>
	
	<div class="space-y-4">
		{#each documents as doc}
			<div class="space-y-2">
				<!-- Document Header -->
				<div class="flex items-center gap-3">
					{#if getStatusIcon(doc.data.status)}
						{@const StatusIcon = getStatusIcon(doc.data.status)}
						<StatusIcon
							class="w-5 h-5 {getStatusColor(doc.data.status)} {doc.data.status === 'processing' ? 'animate-spin' : ''}"
						/>
					{/if}
					{#if doc.icon}
						{@const DocIcon = doc.icon}
						<DocIcon class="w-4 h-4 text-gray-500" />
					{/if}
					<span class="font-medium">{doc.label}</span>
					<span class="ml-auto text-sm text-gray-500">{doc.data.progress}%</span>
				</div>

				<!-- Progress Bar -->
				<Progress value={doc.data.progress} class={getProgressBackground(doc.data.status)} />

				<!-- Status Message -->
				<p class="text-sm text-gray-600">{doc.data.message}</p>

				<!-- Error Message & Retry Button -->
				{#if doc.data.status === 'error'}
					<div class="flex items-center gap-2 flex-wrap">
						<p class="text-sm text-red-600">{doc.data.error}</p>
						{#if onRetry}
							<Button 
								size="sm" 
								variant="outline"
								onclick={() => onRetry?.(doc.key)}
							>
								Retry
							</Button>
						{/if}
					</div>
				{/if}

				<!-- Success - View Document Link -->
				{#if doc.data.status === 'success' && doc.data.url}
					<a 
						href={doc.data.url} 
						target="_blank"
						class="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
					>
						View Document →
					</a>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Overall Progress -->
	<div class="mt-6 pt-4 border-t">
		<p class="text-sm font-medium text-gray-700">
			Overall Progress: {completedCount}/4 documents completed
		</p>
	</div>
</Card>

