<script lang="ts">
	import { AlertCircle } from 'lucide-svelte';
	import { Card } from '$lib/components/ui/card';

	interface Props {
		missingFields: string[];
	}

	let { missingFields = [] }: Props = $props();
</script>

{#if missingFields.length > 0}
	<Card class="p-4 bg-red-50 border-2 border-red-200 mb-6">
		<div class="flex items-start gap-3">
			<AlertCircle class="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
			<div class="flex-1">
				<h4 class="font-semibold text-red-900">Required Fields Missing</h4>
				<p class="text-sm text-red-800 mt-1">
					Please complete the following required fields:
				</p>
				<ul class="list-disc list-inside space-y-1 mt-2">
					{#each missingFields as field, i (i)}
						<li class="text-sm text-red-800">{field}</li>
					{/each}
				</ul>
			</div>
		</div>
	</Card>
{/if}

