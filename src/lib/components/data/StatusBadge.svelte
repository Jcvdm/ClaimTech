<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	type Status =
		| 'draft'
		| 'pending'
		| 'sent'
		| 'approved'
		| 'rejected'
		| 'completed'
		| 'cancelled'
		| 'overdue';

	type Props = {
		status: Status | string;
		class?: string;
	};

	let { status, class: className = '' }: Props = $props();

	const statusConfig: Record<
		Status,
		{ label: string; class: string }
	> = {
		draft: {
			label: 'Draft',
			class: 'bg-gray-100 text-gray-700 hover:bg-gray-100'
		},
		pending: {
			label: 'Pending',
			class: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
		},
		sent: {
			label: 'Sent',
			class: 'bg-blue-100 text-blue-700 hover:bg-blue-100'
		},
		approved: {
			label: 'Approved',
			class: 'bg-green-100 text-green-700 hover:bg-green-100'
		},
		rejected: {
			label: 'Rejected',
			class: 'bg-red-100 text-red-700 hover:bg-red-100'
		},
		completed: {
			label: 'Completed',
			class: 'bg-green-100 text-green-700 hover:bg-green-100'
		},
		cancelled: {
			label: 'Cancelled',
			class: 'bg-gray-100 text-gray-700 hover:bg-gray-100'
		},
		overdue: {
			label: 'Overdue',
			class: 'bg-red-100 text-red-700 hover:bg-red-100'
		}
	};

	const config = $derived(
		statusConfig[status as Status] || {
			label: status,
			class: 'bg-gray-100 text-gray-700 hover:bg-gray-100'
		}
	);
</script>

<Badge variant="secondary" class={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', config.class, className)}>
	{config.label}
</Badge>

