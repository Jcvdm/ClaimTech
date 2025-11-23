<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import DocumentCard from './DocumentCard.svelte';
	import DocumentGenerationProgress from './DocumentGenerationProgress.svelte';
	import DocumentLoadingModal from '$lib/components/layout/DocumentLoadingModal.svelte';
	import { FileText, Image, FileArchive, Package, CircleCheck, AlertCircle } from 'lucide-svelte';
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
		frc_report_generated: false,
		additionals_letter_generated: false,
		all_generated: false,
		generated_at: null
	});

	let generating = $state({
		report: false,
		estimate: false,
		photos_pdf: false,
		photos_zip: false,
		frc_report: false,
		additionals_letter: false,
		all: false
	});

	let progress = $state({
		report: 0,
		estimate: 0,
		photos_pdf: 0,
		photos_zip: 0,
		frc_report: 0,
		additionals_letter: 0
	});

	let progressMessage = $state({
		report: '',
		estimate: '',
		photos_pdf: '',
		photos_zip: '',
		frc_report: '',
		additionals_letter: ''
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

	// Document generation progress tracking for batch generation
	let showBatchProgress = $state(false);
	let documentProgress = $state<{
		report: {
			status: 'pending' | 'processing' | 'success' | 'error';
			progress: number;
			message: string;
			url: string | null;
			error: string | null;
		};
		estimate: {
			status: 'pending' | 'processing' | 'success' | 'error';
			progress: number;
			message: string;
			url: string | null;
			error: string | null;
		};
		photosPdf: {
			status: 'pending' | 'processing' | 'success' | 'error';
			progress: number;
			message: string;
			url: string | null;
			error: string | null;
		};
		photosZip: {
			status: 'pending' | 'processing' | 'success' | 'error';
			progress: number;
			message: string;
			url: string | null;
			error: string | null;
		};
	}>({
		report: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null },
		estimate: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null },
		photosPdf: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null },
		photosZip: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null }
	});

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
		const missing: { tab: string; fields: string[] }[] = [];
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
			identification: 'Vehicle Identification',
			'360': '360° Exterior',
			interior: 'Interior & Mechanical',
			tyres: 'Tyres',
			damage: 'Damage ID',
			values: 'Vehicle Values',
			'pre-incident': 'Pre-Incident Estimate',
			estimate: 'Estimate'
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
				undefined, // options
				$page.data.supabase // Authenticated client from page context
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
	 *
	 * Includes retry logic with exponential backoff and user-friendly error messages
	 */
	async function handleForceFinalize() {
		finalizing = true;
		error = null;

		// Show progress message to user
		progressMessage.report = 'Finalizing assessment...';

		try {
			const missingFieldsInfo = allMissingFields.map(({ tab, fields }) => ({ tab, fields }));
			let attempt = 0;
			let lastErr: any = null;

			while (attempt < 3) {
				try {
					// Update progress message with attempt number
					progressMessage.report = `Finalizing assessment (attempt ${attempt + 1}/3)...`;

					await assessmentService.finalizeEstimate(
						assessment.id,
						{ forcedFinalization: true, missingFields: missingFieldsInfo },
						$page.data.supabase
					);
					lastErr = null;
					break;
				} catch (e) {
					lastErr = e;
					console.warn(`Finalization attempt ${attempt + 1} failed:`, e);

					// Exponential backoff: 500ms, 1s, 2s
					await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
					attempt++;
				}
			}

			if (lastErr) {
				// Provide user-friendly error messages for common issues
				if (
					lastErr.message?.includes('timeout') ||
					lastErr.message?.includes('TIMEOUT') ||
					lastErr.code === 'UND_ERR_CONNECT_TIMEOUT' ||
					lastErr.code === 'ETIMEDOUT'
				) {
					throw new Error(
						'Connection timeout. Please check your internet connection and try again.'
					);
				}
				if (lastErr.message?.includes('fetch failed') || lastErr.message?.includes('network')) {
					throw new Error('Network error. Please check your connection and try again.');
				}
				throw lastErr;
			}

			showValidationModal = false;
			progressMessage.report = 'Refreshing data...';

			await invalidateAll();
			goto('/work/finalized-assessments');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to finalize estimate';
			progressMessage.report = '';
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
			await documentGenerationService.generateDocument(assessment.id, 'report', (prog, msg) => {
				progress.report = prog;
				progressMessage.report = msg;
			});
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
			await documentGenerationService.generateDocument(assessment.id, 'estimate', (prog, msg) => {
				progress.estimate = prog;
				progressMessage.estimate = msg;
			});
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
			await documentGenerationService.generateDocument(assessment.id, 'photos_pdf', (prog, msg) => {
				progress.photos_pdf = prog;
				progressMessage.photos_pdf = msg;
			});
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
			await documentGenerationService.generateDocument(assessment.id, 'photos_zip', (prog, msg) => {
				progress.photos_zip = prog;
				progressMessage.photos_zip = msg;
			});
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

	async function handleGenerateFRCReport() {
		generating.frc_report = true;
		progress.frc_report = 0;
		progressMessage.frc_report = 'Starting...';
		showPrintFallback.frc = false;
		error = null;

		const fallbackTimer = setTimeout(() => {
			if (generating.frc_report) {
				showPrintFallback.frc = true;
			}
		}, 8000);

		try {
			await documentGenerationService.generateDocument(assessment.id, 'frc_report', (prog, msg) => {
				progress.frc_report = prog;
				progressMessage.frc_report = msg;
			});
			await loadGenerationStatus();
			await invalidateAll();
			showPrintFallback.frc = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate FRC report';
			showPrintFallback.frc = true;
		} finally {
			clearTimeout(fallbackTimer);
			generating.frc_report = false;
			progress.frc_report = 0;
			progressMessage.frc_report = '';
		}
	}

	async function handleGenerateAdditionalsLetter() {
		generating.additionals_letter = true;
		progress.additionals_letter = 0;
		progressMessage.additionals_letter = 'Starting...';
		error = null;
		try {
			await documentGenerationService.generateDocument(
				assessment.id,
				'additionals_letter',
				(prog, msg) => {
					progress.additionals_letter = prog;
					progressMessage.additionals_letter = msg;
				}
			);
			await loadGenerationStatus();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate Additionals Letter';
		} finally {
			generating.additionals_letter = false;
			progress.additionals_letter = 0;
			progressMessage.additionals_letter = '';
		}
	}

	async function handleGenerateAll() {
		generating.all = true;
		showBatchProgress = true;
		error = null;

		// Reset progress state
		documentProgress = {
			report: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null },
			estimate: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null },
			photosPdf: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null },
			photosZip: { status: 'pending', progress: 0, message: 'Waiting...', url: null, error: null }
		};

		try {
			// Call streaming service with progress callback
			const result = await documentGenerationService.generateAllDocuments(
				assessment.id,
				(documentType, progress, message, url, errorMsg) => {
					// Update progress for specific document
					const status = errorMsg ? 'error' : progress === 100 ? 'success' : 'processing';
					documentProgress[documentType] = {
						status,
						progress,
						message,
						url,
						error: errorMsg
					};
				}
			);

			// Show error if any documents failed
			if (!result.success && result.errors.length > 0) {
				error = `Some documents failed to generate:\n${result.errors.join('\n')}`;
			}

			await loadGenerationStatus();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate documents';
		} finally {
			generating.all = false;
		}
	}

	async function handleRetryDocument(documentType: string) {
		// Reset progress for this document
		documentProgress[documentType as keyof typeof documentProgress] = {
			status: 'processing',
			progress: 0,
			message: 'Retrying...',
			url: null,
			error: null
		};

		try {
			// Map document type to API format
			const apiType =
				documentType === 'photosPdf'
					? 'photos_pdf'
					: documentType === 'photosZip'
						? 'photos_zip'
						: documentType;

			// Call individual document generator
			const url = await documentGenerationService.generateDocument(
				assessment.id,
				apiType as any,
				(progress, message) => {
					documentProgress[documentType as keyof typeof documentProgress] = {
						status: 'processing',
						progress,
						message,
						url: null,
						error: null
					};
				}
			);

			// Update with success
			documentProgress[documentType as keyof typeof documentProgress] = {
				status: 'success',
				progress: 100,
				message: 'Generated successfully',
				url,
				error: null
			};

			await loadGenerationStatus();
			await invalidateAll();
		} catch (err) {
			documentProgress[documentType as keyof typeof documentProgress] = {
				status: 'error',
				progress: 0,
				message: 'Failed',
				url: null,
				error: err instanceof Error ? err.message : 'Unknown error'
			};
		}
	}

	onMount(() => {
		loadGenerationStatus();
	});
</script>

<div class="space-y-6">
	<!-- Validation Modal -->
	<Dialog bind:open={showValidationModal}>
		<DialogContent class="max-h-[80vh] max-w-2xl overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Required Fields Missing</DialogTitle>
				<DialogDescription>
					Please complete the following required fields before finalizing the estimate:
				</DialogDescription>
			</DialogHeader>
			<div class="mt-4 space-y-4">
				{#each allMissingFields as { tab, fields }}
					<div class="rounded-md border border-red-200 bg-red-50 p-4">
						<h4 class="mb-2 font-semibold text-red-900">{tab}</h4>
						<ul class="list-inside list-disc space-y-1">
							{#each fields as field}
								<li class="text-sm text-red-800">{field}</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>

			<!-- Warning about incomplete reports -->
			<div class="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
				<p class="text-xs text-yellow-800">
					⚠️ <strong>Warning:</strong> Finalizing with missing fields may result in incomplete reports
					and documents. It's recommended to complete all required fields before finalizing.
				</p>
			</div>

			<div class="mt-6 flex items-center justify-between">
				<Button onclick={() => (showValidationModal = false)} variant="outline">Close</Button>
				<Button onclick={handleForceFinalize} variant="destructive" disabled={finalizing}>
					{finalizing ? 'Finalizing...' : 'Sign Off Anyway'}
				</Button>
			</div>
		</DialogContent>
	</Dialog>

	<!-- Finalize Estimate Section -->
	{#if !assessment.estimate_finalized_at}
		<Card class="border-2 border-blue-200 bg-blue-50 p-6">
			<div class="space-y-4">
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Finalize Estimate</h3>
					<p class="mt-1 text-sm text-gray-600">
						Mark this estimate as finalized and sent to the client. This will enable the Additionals
						tab and move the assessment to the Finalized Assessments list.
					</p>
				</div>

				{#if hasRequiredFieldsMissing}
					<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3">
						<p class="text-sm font-medium text-yellow-800">
							⚠️ Some required fields are missing. Click "Mark Estimate Finalized & Sent" to see
							details.
						</p>
					</div>
				{/if}

				{#if error}
					<div class="rounded-md border border-red-200 bg-red-50 p-3">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				{/if}

				<div class="flex gap-3">
					<LoadingButton
						onclick={handleFinalizeEstimate}
						loading={finalizing}
						class="bg-blue-600 hover:bg-blue-700"
					>
						{finalizing ? 'Finalizing...' : 'Mark Estimate Finalized & Sent'}
					</LoadingButton>
				</div>
			</div>
		</Card>
	{:else}
		<Card class="border-2 border-green-200 bg-green-50 p-6">
			<div class="flex items-start gap-3">
				<CircleCheck class="mt-0.5 h-6 w-6 text-green-600" />
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Estimate Finalized</h3>
					<p class="mt-1 text-sm text-gray-600">
						Estimate was finalized and sent on {formatDateTime(assessment.estimate_finalized_at)}
					</p>
					<p class="mt-2 text-sm font-medium text-blue-600">
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

			<DocumentCard
				title="FRC Settlement Report"
				description="Final Repair Costing report with agreed/adjusted items and settlement total"
				icon={FileText}
				generated={!!generationStatus.frc_report_generated}
				generatedAt={assessment.documents_generated_at}
				generating={generating.frc_report}
				progress={progress.frc_report}
				progressMessage={progressMessage.frc_report}
				onGenerate={handleGenerateFRCReport}
				onDownload={() => onDownloadDocument('frc_report')}
				printUrl={documentGenerationService.getPrintUrl(assessment.id, 'frc')}
				showPrintFallback={showPrintFallback.frc}
			/>

			<DocumentCard
				title="Additionals Letter"
				description="Summary of approved and declined additionals with totals and notes"
				icon={FileText}
				generated={!!generationStatus.additionals_letter_generated}
				generatedAt={assessment.documents_generated_at}
				generating={generating.additionals_letter}
				progress={progress.additionals_letter}
				progressMessage={progressMessage.additionals_letter}
				onGenerate={handleGenerateAdditionalsLetter}
				onDownload={() => onDownloadDocument('additionals_letter')}
			/>
		</div>
	</div>

	<!-- Quick Actions -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>

		{#if showBatchProgress}
			<!-- Show progress component during batch generation -->
			<DocumentGenerationProgress
				report={documentProgress.report}
				estimate={documentProgress.estimate}
				photosPdf={documentProgress.photosPdf}
				photosZip={documentProgress.photosZip}
				onRetry={handleRetryDocument}
			/>
		{:else}
			<!-- Show generate button when not generating -->
			<div class="flex flex-col gap-3 sm:flex-row">
				<LoadingButton onclick={handleGenerateAll} loading={generating.all} class="flex-1">
					{#if !generating.all}
						<Package class="mr-2 h-4 w-4" />
					{/if}
					{generating.all ? 'Generating All...' : 'Generate All Documents'}
				</LoadingButton>

				{#if generationStatus.all_generated}
					<Button onclick={() => onDownloadDocument('complete')} variant="outline" class="flex-1">
						<FileArchive class="mr-2 h-4 w-4" />
						Download Complete Package
					</Button>
				{/if}
			</div>
		{/if}
	</Card>
</div>

<!-- Document Loading Modal -->
<DocumentLoadingModal
	isOpen={generating.all}
	title="Generating Documents"
	progress={Math.round(
		(documentProgress.report.progress +
			documentProgress.estimate.progress +
			documentProgress.photosPdf.progress +
			documentProgress.photosZip.progress) / 4
	)}
	message={(() => {
		const processing = Object.entries(documentProgress).find(([_, doc]) => doc.status === 'processing');
		if (processing) return processing[1].message;
		const pending = Object.entries(documentProgress).find(([_, doc]) => doc.status === 'pending');
		if (pending) return 'Preparing...';
		return 'Completing...';
	})()}
	isError={Object.values(documentProgress).some(doc => doc.status === 'error')}
/>
