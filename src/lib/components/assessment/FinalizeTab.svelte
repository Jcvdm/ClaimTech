<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '$lib/components/ui/dialog';
	import DocumentCard from './DocumentCard.svelte';
	import {
		FileText,
		Image,
		FileArchive,
		Package,
		CircleCheck,
		AlertCircle
	} from 'lucide-svelte';
	import type { Assessment, DocumentGenerationStatus } from '$lib/types/assessment';
	import { documentGenerationService } from '$lib/services/document-generation.service';
	import { assessmentService } from '$lib/services/assessment.service';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { formatDateTime } from '$lib/utils/formatters';
	import { getTabCompletionStatus, type TabValidation } from '$lib/utils/validation';

	interface Props {
		assessment: Assessment;
		onGenerateDocument: (type: string) => Promise<void>;
		onDownloadDocument: (type: string) => void;
		onGenerateAll: () => Promise<void>;
		// Assessment data for validation
		vehicleIdentification?: any;
		exterior360?: any;
		interiorMechanical?: any;
		tyres?: any[];
		damageRecord?: any;
		vehicleValues?: any;
		preIncidentEstimate?: any;
		estimate?: any;
		interiorPhotos?: any[];
		exterior360Photos?: any[];
		tyrePhotos?: any[];
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const assessment = $derived(props.assessment);
	const onGenerateDocument = $derived(props.onGenerateDocument);
	const onDownloadDocument = $derived(props.onDownloadDocument);
	const onGenerateAll = $derived(props.onGenerateAll);
	const vehicleIdentification = $derived(props.vehicleIdentification ?? null);
	const exterior360 = $derived(props.exterior360 ?? null);
	const interiorMechanical = $derived(props.interiorMechanical ?? null);
	const tyres = $derived(props.tyres ?? []);
	const damageRecord = $derived(props.damageRecord ?? null);
	const vehicleValues = $derived(props.vehicleValues ?? null);
	const preIncidentEstimate = $derived(props.preIncidentEstimate ?? null);
	const estimate = $derived(props.estimate ?? null);
	const interiorPhotos = $derived(props.interiorPhotos ?? []);
	const exterior360Photos = $derived(props.exterior360Photos ?? []);
	const tyrePhotos = $derived(props.tyrePhotos ?? []);

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

	// Track if generation is slow/timeout for print fallback
	let showPrintFallback = $state({
		report: false,
		estimate: false,
		frc: false
	});

	let error = $state<string | null>(null);
	let finalizing = $state(false);
	let showValidationModal = $state(false);

	// Validate all tabs
	const tabValidations = $derived.by(() => {
		return getTabCompletionStatus({
			vehicleIdentification,
			exterior360,
			interiorMechanical,
			interiorPhotos,
			exterior360Photos,
			tyres,
			tyrePhotos,
			damageRecord,
			vehicleValues,
			preIncidentEstimate,
			estimate
		});
	});

	// Get all missing fields across all tabs
	const allMissingFields = $derived.by(() => {
		const missing: { tab: string, fields: string[] }[] = [];
		tabValidations.forEach((validation: TabValidation) => {
			if (!validation.isComplete && validation.missingFields.length > 0) {
				missing.push({
					tab: getTabLabel(validation.tabId),
					fields: validation.missingFields
				});
			}
		});
		return missing;
	});

	const hasRequiredFieldsMissing = $derived(allMissingFields.length > 0);

	function getTabLabel(tabId: string): string {
		const labels: Record<string, string> = {
			'identification': 'Vehicle Identification',
			'360': '360° Exterior',
			'interior': 'Interior & Mechanical',
			'tyres': 'Tyres',
			'damage': 'Damage ID',
			'values': 'Vehicle Values',
			'pre-incident': 'Pre-Incident Estimate',
			'estimate': 'Estimate'
		};
		return labels[tabId] || tabId;
	}

	async function loadGenerationStatus() {
		generationStatus = await documentGenerationService.getGenerationStatus(assessment.id);
	}

	async function handleFinalizeEstimate() {
		// Check for missing required fields
		if (hasRequiredFieldsMissing) {
			showValidationModal = true;
			return;
		}

		finalizing = true;
		error = null;
		try {
			await assessmentService.finalizeEstimate(
				assessment.id,
				undefined,  // options
				$page.data.supabase  // Authenticated client from page context
			);
			// Force reload of all page data to ensure database changes are visible
			await invalidateAll();
			// Navigate to Finalized Assessments list to show the finalized assessment
			// This triggers sidebar badge refresh with fresh data
			goto('/work/finalized-assessments');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to finalize estimate';
		} finally {
			finalizing = false;
		}
	}

	/**
	 * Force finalize estimate despite missing required fields
	 * User has acknowledged the missing fields and wants to proceed anyway
	 */
async function handleForceFinalize() {
    finalizing = true;
    error = null;
    try {
        const missingFieldsInfo = allMissingFields.map(({ tab, fields }) => ({ tab, fields }));
        let attempt = 0;
        let lastErr: any = null;
        while (attempt < 3) {
            try {
                await assessmentService.finalizeEstimate(
                    assessment.id,
                    { forcedFinalization: true, missingFields: missingFieldsInfo },
                    $page.data.supabase
                );
                lastErr = null;
                break;
            } catch (e) {
                lastErr = e;
                await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
                attempt++;
            }
        }
        if (lastErr) throw lastErr;
        showValidationModal = false;
        await invalidateAll();
        goto('/work/finalized-assessments');
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
		showPrintFallback.report = false;
		error = null;

		// Show print fallback after 8 seconds if still generating
		const fallbackTimer = setTimeout(() => {
			if (generating.report) {
				showPrintFallback.report = true;
				console.log('⚡ Showing print fallback for report (>8s)');
			}
		}, 8000);

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
			// Refresh parent data to update assessment with new document URLs
			await invalidateAll();
			showPrintFallback.report = false; // Success, hide fallback
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate report';
			showPrintFallback.report = true; // Error, show fallback
		} finally {
			clearTimeout(fallbackTimer);
			generating.report = false;
			progress.report = 0;
			progressMessage.report = '';
		}
	}

	async function handleGenerateEstimate() {
		generating.estimate = true;
		progress.estimate = 0;
		progressMessage.estimate = 'Starting...';
		showPrintFallback.estimate = false;
		error = null;

		// Show print fallback after 8 seconds if still generating
		const fallbackTimer = setTimeout(() => {
			if (generating.estimate) {
				showPrintFallback.estimate = true;
				console.log('⚡ Showing print fallback for estimate (>8s)');
			}
		}, 8000);

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
			// Refresh parent data to update assessment with new document URLs
			await invalidateAll();
			showPrintFallback.estimate = false; // Success, hide fallback
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate estimate';
			showPrintFallback.estimate = true; // Error, show fallback
		} finally {
			clearTimeout(fallbackTimer);
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
			// Refresh parent data to update assessment with new document URLs
			await invalidateAll();
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
			// Refresh parent data to update assessment with new document URLs
			await invalidateAll();
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
			// Refresh parent data to update assessment with new document URLs
			await invalidateAll();
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
	<!-- Validation Modal -->
	<Dialog bind:open={showValidationModal}>
		<DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Required Fields Missing</DialogTitle>
				<DialogDescription>
					Please complete the following required fields before finalizing the estimate:
				</DialogDescription>
			</DialogHeader>
			<div class="space-y-4 mt-4">
				{#each allMissingFields as { tab, fields }}
					<div class="rounded-md border border-red-200 bg-red-50 p-4">
						<h4 class="font-semibold text-red-900 mb-2">{tab}</h4>
						<ul class="list-disc list-inside space-y-1">
							{#each fields as field}
								<li class="text-sm text-red-800">{field}</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>

			<!-- Warning about incomplete reports -->
			<div class="mt-4 rounded-md bg-yellow-50 border border-yellow-200 p-3">
				<p class="text-xs text-yellow-800">
					⚠️ <strong>Warning:</strong> Finalizing with missing fields may result in incomplete reports and documents.
					It's recommended to complete all required fields before finalizing.
				</p>
			</div>

			<div class="mt-6 flex justify-between items-center">
				<Button onclick={() => showValidationModal = false} variant="outline">
					Close
				</Button>
				<Button onclick={handleForceFinalize} variant="destructive" disabled={finalizing}>
					{finalizing ? 'Finalizing...' : 'Sign Off Anyway'}
				</Button>
			</div>
		</DialogContent>
	</Dialog>

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

				{#if hasRequiredFieldsMissing}
					<div class="rounded-md bg-yellow-50 border border-yellow-200 p-3">
						<p class="text-sm text-yellow-800 font-medium">
							⚠️ Some required fields are missing. Click "Mark Estimate Finalized & Sent" to see details.
						</p>
					</div>
				{/if}

				{#if error}
					<div class="rounded-md bg-red-50 border border-red-200 p-3">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				{/if}

				<div class="flex gap-3">
					<Button
						onclick={handleFinalizeEstimate}
						disabled={finalizing}
						class="bg-blue-600 hover:bg-blue-700"
					>
						{finalizing ? 'Finalizing...' : 'Mark Estimate Finalized & Sent'}
					</Button>
				</div>
			</div>
		</Card>
	{:else}
		<Card class="p-6 border-2 border-green-200 bg-green-50">
			<div class="flex items-start gap-3">
				<CircleCheck class="h-6 w-6 text-green-600 mt-0.5" />
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
			printUrl={documentGenerationService.getPrintUrl(assessment.id, 'report')}
			showPrintFallback={showPrintFallback.report}
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
			printUrl={documentGenerationService.getPrintUrl(assessment.id, 'estimate')}
			showPrintFallback={showPrintFallback.estimate}
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
			<Button onclick={handleGenerateAll} disabled={generating.all} class="flex-1">
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

