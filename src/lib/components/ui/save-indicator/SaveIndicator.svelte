<script lang="ts">
	import { Loader2, CheckCircle, AlertCircle } from 'lucide-svelte';

	interface Props {
		saving?: boolean;
		saved?: boolean;
		error?: boolean;
		class?: string;
	}

	let { saving = false, saved = false, error = false, class: className = '' }: Props = $props();
</script>

<div class={`flex items-center gap-2 text-sm ${className}`}>
	{#if saving}
		<Loader2 class="h-4 w-4 animate-spin text-gray-500" />
		<span class="text-gray-500">Saving...</span>
	{:else if error}
		<AlertCircle class="h-4 w-4 text-red-600" />
		<span class="text-red-600">Save failed</span>
	{:else if saved}
		<CheckCircle class="h-4 w-4 text-green-600" />
		<span class="text-green-600">Saved</span>
	{/if}
</div>

