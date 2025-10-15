<script lang="ts">
	import { Clock, CheckCircle, XCircle, Edit, UserPlus, FileText } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import type { AuditLog } from '$lib/types/audit';
	import { formatRelativeTime } from '$lib/utils/formatters';

	let { logs = [] }: { logs: AuditLog[] } = $props();

	function getActionIcon(action: string) {
		switch (action) {
			case 'created':
				return FileText;
			case 'status_changed':
				return CheckCircle;
			case 'cancelled':
				return XCircle;
			case 'assigned':
			case 'appointed':
				return UserPlus;
			case 'updated':
				return Edit;
			default:
				return Clock;
		}
	}

	function getActionColor(action: string): string {
		switch (action) {
			case 'created':
				return 'text-blue-600';
			case 'status_changed':
				return 'text-green-600';
			case 'cancelled':
				return 'text-red-600';
			case 'assigned':
			case 'appointed':
				return 'text-purple-600';
			case 'updated':
				return 'text-yellow-600';
			default:
				return 'text-gray-600';
		}
	}

	function formatActionText(log: AuditLog): string {
		switch (log.action) {
			case 'created':
				return `Created ${log.entity_type}`;
			case 'status_changed':
				return `Status changed from ${log.old_value} to ${log.new_value}`;
			case 'cancelled':
				return `${log.entity_type} cancelled`;
			case 'assigned':
				return `Engineer assigned`;
			case 'appointed':
				return `Engineer appointed`;
			case 'updated':
				if (log.field_name === 'current_step') {
					return `Workflow step changed from ${log.old_value} to ${log.new_value}`;
				}
				return `Updated ${log.field_name || 'details'}`;
			default:
				return log.action;
		}
	}
</script>

<div class="space-y-4">
	{#if logs.length === 0}
		<div class="py-8 text-center">
			<Clock class="mx-auto h-12 w-12 text-gray-400" />
			<p class="mt-2 text-sm text-gray-500">No activity yet</p>
		</div>
	{:else}
		<div class="relative space-y-4">
			<!-- Timeline line -->
			<div class="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>

			{#each logs as log}
				{@const Icon = getActionIcon(log.action)}
				{@const colorClass = getActionColor(log.action)}

				<div class="relative flex gap-4">
					<!-- Icon -->
					<div class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
							<Icon class="h-3.5 w-3.5 {colorClass}" />
						</div>
					</div>

					<!-- Content -->
					<div class="flex-1 pb-4">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-900">
									{formatActionText(log)}
								</p>
								{#if log.changed_by}
									<p class="mt-0.5 text-xs text-gray-500">
										by {log.changed_by}
									</p>
								{/if}
								{#if log.metadata}
									<div class="mt-1 flex flex-wrap gap-1">
										{#each Object.entries(log.metadata) as [key, value]}
											{#if value && key !== 'request_id' && key !== 'client_id'}
												<Badge variant="outline" class="text-xs">
													{key}: {value}
												</Badge>
											{/if}
										{/each}
									</div>
								{/if}
							</div>
							<time class="text-xs text-gray-500">
								{formatRelativeTime(log.created_at)}
							</time>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

