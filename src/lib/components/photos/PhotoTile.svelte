<script lang="ts">
	import { Camera, Check, X } from 'lucide-svelte';
	import { storageService } from '$lib/services/storage.service';
	import { cn } from '$lib/utils';

	interface Props {
		photo?: { id: string; photo_url: string; label?: string | null };
		index: number;
		uploading?: boolean;
		uploadProgress?: number;
		onCapture: () => void;
		onDelete: (id: string) => void;
		onView: (index: number) => void;
	}

	let {
		photo,
		index,
		uploading = false,
		uploadProgress = 0,
		onCapture,
		onDelete,
		onView
	}: Props = $props();
</script>

{#if photo}
	<!-- Filled tile -->
	<div
		class={cn(
			'relative aspect-square rounded-md border border-border overflow-hidden'
		)}
	>
		<img
			src={storageService.toPhotoProxyUrl(photo.photo_url)}
			alt={photo.label ?? `Photo ${index + 1}`}
			class="h-full w-full object-cover"
		/>
		<!-- Green check overlay (top-right) -->
		<div class="absolute top-1 right-1 text-success drop-shadow">
			<Check class="size-5" />
		</div>
		<!-- Delete button (top-left) -->
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onDelete(photo!.id);
			}}
			class="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow transition-opacity hover:bg-background"
			aria-label="Delete photo"
		>
			<X class="size-3.5" />
		</button>
		<!-- Tap to view (full overlay) -->
		<button
			type="button"
			onclick={() => onView(index)}
			class="absolute inset-0 opacity-0"
			aria-label="View photo {index + 1}"
		></button>
	</div>
{:else if uploading}
	<!-- Uploading state -->
	<div
		class="relative aspect-square rounded-md border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground"
	>
		<div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
		<span class="text-xs">{uploadProgress}%</span>
	</div>
{:else}
	<!-- Empty capture tile -->
	<button
		type="button"
		onclick={onCapture}
		class="relative aspect-square rounded-md border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
		aria-label="Capture photo"
	>
		<Camera class="size-6" />
		<span class="text-xs font-medium">Capture</span>
	</button>
{/if}
