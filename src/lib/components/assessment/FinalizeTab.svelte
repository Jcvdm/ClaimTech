<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import DocumentCard from './DocumentCard.svelte';
	import {
		FileText,
		Image,
		FileArchive,
		Package,
		CheckCircle,
		AlertCircle
	} from 'lucide-svelte';
	import type { Assessment, DocumentGenerationStatus } from '$lib/types/assessment';
	import { documentGenerationService } from '$lib/services/document-generation.service';
	import { onMount } from 'svelte';

	interface Props {
		assessment: Assessment;
		onGenerateDocument: (type: string) => Promise<void>;
		onDownloadDocument: (type: string) => void;
		onGenerateAll: () => Promise<void>;
	}

	let { assessment, onGenerateDocument, onDownloadDocument, onGenerateAll }: Props = $props();

	let generationStatus = $state<DocumentGenerationStatus>({
		report_generated: false,
		estimate_generated: false,
		photos_pdf_generated: false,
		photos_zip_generated: false,
		all_generated: false,
		generated_at: null
	});

	let generating = $state({
		report: false,
		estimate: false,
		photos_pdf: false,
		photos_zip: false,
		all: false
	});

	let error = $state<string | null>(null);

	// Calculate completion status
	const completedTabs = $derived(assessment.tabs_completed?.length || 0);
	const totalTabs = 9; // Total tabs excluding finalize
	const progressPercentage = $derived(Math.round((completedTabs / totalTabs) * 100));
	const isComplete = $derived(completedTabs === totalTabs);

	async function loadGenerationStatus() {
		generationStatus = await documentGenerationService.getGenerationStatus(assessment.id);
	}

	async function handleGenerateReport() {
		generating.report = true;
		error = null;
		try {
			await onGenerateDocument('report');
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate report';
		} finally {
			generating.report = false;
		}
	}

	async function handleGenerateEstimate() {
		generating.estimate = true;
		error = null;
		try {
			await onGenerateDocument('estimate');
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate estimate';
		} finally {
			generating.estimate = false;
		}
	}

	async function handleGeneratePhotosPDF() {
		generating.photos_pdf = true;
		error = null;
		try {
			await onGenerateDocument('photos_pdf');
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate photos PDF';
		} finally {
			generating.photos_pdf = false;
		}
	}

	async function handleGeneratePhotosZIP() {
		generating.photos_zip = true;
		error = null;
		try {
			await onGenerateDocument('photos_zip');
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate photos ZIP';
		} finally {
			generating.photos_zip = false;
		}
	}

	async function handleGenerateAll() {
		generating.all = true;
		error = null;
		try {
			await onGenerateAll();
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate documents';
		} finally {
			generating.all = false;
		}
	}

	onMount(() => {
		loadGenerationStatus();
	});
</script>

<div class="space-y-6">
	<!-- Completion Status -->
	<Card class="p-6">
		<div class="flex items-start justify-between">
			<div>
				<h2 class="text-xl font-bold text-gray-900">Assessment Completion Status</h2>
				<p class="mt-1 text-sm text-gray-600">
					Complete all sections before generating documents
				</p>
			</div>
			{#if isComplete}
				<Badge variant="default" class="bg-green-100 text-green-800">
					<CheckCircle class="mr-1 h-4 w-4" />
					Complete
				</Badge>
			{:else}
				<Badge variant="secondary">
					<AlertCircle class="mr-1 h-4 w-4" />
					In Progress
				</Badge>
			{/if}
		</div>

		<div class="mt-4">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium text-gray-700">Progress</span>
				<span class="text-gray-600">
					{completedTabs} of {totalTabs} sections complete ({progressPercentage}%)
				</span>
			</div>
			<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
				<div
					class="h-full transition-all duration-300 {isComplete ? 'bg-green-600' : 'bg-blue-600'}"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>

		{#if !isComplete}
			<div class="mt-4 rounded-md bg-yellow-50 p-4">
				<p class="text-sm text-yellow-800">
					Please complete all assessment sections before generating documents.
				</p>
			</div>
		{/if}
	</Card>

	<!-- Error Message -->
	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<!-- Document Generation -->
	<div>
		<h2 class="mb-4 text-xl font-bold text-gray-900">Document Generation</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<DocumentCard
				title="Damage Inspection Report"
				description="Complete assessment report with vehicle details, damage assessment, and notes"
				icon={FileText}
				generated={generationStatus.report_generated}
				generatedAt={assessment.documents_generated_at}
				generating={generating.report}
				onGenerate={handleGenerateReport}
				onDownload={() => onDownloadDocument('report')}
			/>

			<DocumentCard
				title="Repair Estimate"
				description="Detailed repair estimate with line items, rates, and totals"
				icon={FileText}
				generated={generationStatus.estimate_generated}
				generatedAt={assessment.documents_generated_at}
				generating={generating.estimate}
				onGenerate={handleGenerateEstimate}
				onDownload={() => onDownloadDocument('estimate')}
			/>

			<DocumentCard
				title="Photographs PDF"
				description="All assessment photos organized by category in PDF format"
				icon={Image}
				generated={generationStatus.photos_pdf_generated}
				generatedAt={assessment.documents_generated_at}
				generating={generating.photos_pdf}
				onGenerate={handleGeneratePhotosPDF}
				onDownload={() => onDownloadDocument('photos_pdf')}
			/>

			<DocumentCard
				title="Photographs ZIP"
				description="All photos in organized folders, downloadable as ZIP file"
				icon={FileArchive}
				generated={generationStatus.photos_zip_generated}
				generatedAt={assessment.documents_generated_at}
				generating={generating.photos_zip}
				onGenerate={handleGeneratePhotosZIP}
				onDownload={() => onDownloadDocument('photos_zip')}
			/>
		</div>
	</div>

	<!-- Quick Actions -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
		<div class="flex flex-col gap-3 sm:flex-row">
			<Button onclick={handleGenerateAll} disabled={generating.all || !isComplete} class="flex-1">
				<Package class="mr-2 h-4 w-4" />
				{generating.all ? 'Generating All...' : 'Generate All Documents'}
			</Button>

			{#if generationStatus.all_generated}
				<Button onclick={() => onDownloadDocument('complete')} variant="outline" class="flex-1">
					<FileArchive class="mr-2 h-4 w-4" />
					Download Complete Package
				</Button>
			{/if}
		</div>
	</Card>
</div>

