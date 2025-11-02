<script lang="ts">
	import ActivityTimeline from '$lib/components/data/ActivityTimeline.svelte';
	import { auditService } from '$lib/services/audit.service';
	import type { AuditLog } from '$lib/types/audit';
	import type { ServiceClient } from '$lib/types/service';

	let { assessmentId, supabase }: { assessmentId: string; supabase: ServiceClient } = $props();

	let logs = $state<AuditLog[]>([]);
	let loading = $state(true);

	async function loadAuditLogs() {
		loading = true;
		try {
			logs = await auditService.getAssessmentHistory(assessmentId, supabase);
		} catch (error) {
			console.error('Error loading audit logs:', error);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadAuditLogs();
	});
</script>

<div class="space-y-4">
	<div class="rounded-lg border bg-white p-6">
		<h3 class="text-lg font-semibold mb-4">Assessment Audit Trail</h3>
		<p class="text-sm text-gray-600 mb-6">
			Complete history of all changes made to this assessment
		</p>

		{#if loading}
			<div class="py-8 text-center">
				<p class="text-sm text-gray-500">Loading audit trail...</p>
			</div>
		{:else}
			<ActivityTimeline {logs} />
		{/if}
	</div>
</div>

