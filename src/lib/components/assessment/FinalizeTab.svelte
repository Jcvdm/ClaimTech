<script lang="ts">
	// TODO: BEFORE PRODUCTION - Set ENABLE_FORCE_FINALIZE to false (line 70)
	// This allows testing the Additionals feature without completing all 9 sections
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
	import { assessmentService } from '$lib/services/assessment.service';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { formatDateTime } from '$lib/utils/formatters';

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

	let progress = $state({
		report: 0,
		estimate: 0,
		photos_pdf: 0,
		photos_zip: 0
	});

	let progressMessage = $state({
		report: '',
		estimate: '',
		photos_pdf: '',
		photos_zip: ''
	});

	let error = $state<string | null>(null);
	let finalizing = $state(false);

	// Calculate completion status
	const completedTabs = $derived(assessment.tabs_completed?.length || 0);
	const totalTabs = 9; // Total tabs excluding finalize
	const progressPercentage = $derived(Math.round((completedTabs / totalTabs) * 100));
	const isComplete = $derived(completedTabs === totalTabs);

	// TODO: REMOVE THIS BEFORE PRODUCTION - Testing override
	const ENABLE_FORCE_FINALIZE = true; // Set to false to enforce completion check

	async function loadGenerationStatus() {
		generationStatus = await documentGenerationService.getGenerationStatus(assessment.id);
	}

	async function handleFinalizeEstimate() {
		finalizing = true;
		error = null;
		try {
			await assessmentService.finalizeEstimate(assessment.id);
			await invalidateAll(); // Refresh data to show finalized state
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to finalize estimate';
		} finally {
			finalizing = false;
		}
	}

	async function handleGenerateReport() {
		generating.report = true;
		progress.report = 0;
		progressMessage.report = 'Starting...';
		error = null;
		try {
			// Call service directly with progress callback
			await documentGenerationService.generateDocument(
				assessment.id,
				'report',
				(prog, msg) => {
					progress.report = prog;
					progressMessage.report = msg;
				}
			);
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate report';
		} finally {
			generating.report = false;
			progress.report = 0;
			progressMessage.report = '';
		}
	}

	async function handleGenerateEstimate() {
		generating.estimate = true;
		progress.estimate = 0;
		progressMessage.estimate = 'Starting...';
		error = null;
		try {
			// Call service directly with progress callback
			await documentGenerationService.generateDocument(
				assessment.id,
				'estimate',
				(prog, msg) => {
					progress.estimate = prog;
					progressMessage.estimate = msg;
				}
			);
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate estimate';
		} finally {
			generating.estimate = false;
			progress.estimate = 0;
			progressMessage.estimate = '';
		}
	}

	async function handleGeneratePhotosPDF() {
		generating.photos_pdf = true;
		progress.photos_pdf = 0;
		progressMessage.photos_pdf = 'Starting...';
		error = null;
		try {
			// Call service directly with progress callback
			await documentGenerationService.generateDocument(
				assessment.id,
				'photos_pdf',
				(prog, msg) => {
					progress.photos_pdf = prog;
					progressMessage.photos_pdf = msg;
				}
			);
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate photos PDF';
		} finally {
			generating.photos_pdf = false;
			progress.photos_pdf = 0;
			progressMessage.photos_pdf = '';
		}
	}

	async function handleGeneratePhotosZIP() {
		generating.photos_zip = true;
		progress.photos_zip = 0;
		progressMessage.photos_zip = 'Starting...';
		error = null;
		try {
			// Call service directly with progress callback
			await documentGenerationService.generateDocument(
				assessment.id,
				'photos_zip',
				(prog, msg) => {
					progress.photos_zip = prog;
					progressMessage.photos_zip = msg;
				}
			);
			await loadGenerationStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate photos ZIP';
		} finally {
			generating.photos_zip = false;
			progress.photos_zip = 0;
			progressMessage.photos_zip = '';
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

	<!-- Finalize Estimate Section -->
	{#if !assessment.estimate_finalized_at}
		<Card class="p-6 border-2 border-blue-200 bg-blue-50">
			<div class="space-y-4">
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Finalize Estimate</h3>
					<p class="mt-1 text-sm text-gray-600">
						Mark this estimate as finalized and sent to the client. This will enable the Additionals
						tab and move the assessment to the Finalized Assessments list.
					</p>
				</div>

				{#if !isComplete && ENABLE_FORCE_FINALIZE}
					<div class="rounded-md bg-yellow-50 border border-yellow-200 p-3">
						<p class="text-xs text-yellow-800 font-medium">
							⚠️ TESTING MODE: Force finalize is enabled. Complete all sections before using in
							production.
						</p>
					</div>
				{/if}

				<div class="flex gap-3">
					<Button
						onclick={handleFinalizeEstimate}
						disabled={!isComplete || finalizing}
						class="bg-blue-600 hover:bg-blue-700"
					>
						{finalizing ? 'Finalizing...' : 'Mark Estimate Finalized & Sent'}
					</Button>

					{#if !isComplete && ENABLE_FORCE_FINALIZE}
						<Button
							onclick={handleFinalizeEstimate}
							disabled={finalizing}
							variant="outline"
							class="border-orange-500 text-orange-700 hover:bg-orange-50"
						>
							{finalizing ? 'Finalizing...' : '🚧 Force Finalize (Testing)'}
						</Button>
					{/if}
				</div>
			</div>
		</Card>
	{:else}
		<Card class="p-6 border-2 border-green-200 bg-green-50">
			<div class="flex items-start gap-3">
				<CheckCircle class="h-6 w-6 text-green-600 mt-0.5" />
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Estimate Finalized</h3>
					<p class="mt-1 text-sm text-gray-600">
						Estimate was finalized and sent on {formatDateTime(assessment.estimate_finalized_at)}
					</p>
					<p class="mt-2 text-sm text-blue-600 font-medium">
						You can now add additionals in the Additionals tab.
					</p>
				</div>
			</div>
		</Card>
	{/if}

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
				progress={progress.report}
				progressMessage={progressMessage.report}
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
				progress={progress.estimate}
				progressMessage={progressMessage.estimate}
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
				progress={progress.photos_pdf}
				progressMessage={progressMessage.photos_pdf}
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
				progress={progress.photos_zip}
				progressMessage={progressMessage.photos_zip}
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

