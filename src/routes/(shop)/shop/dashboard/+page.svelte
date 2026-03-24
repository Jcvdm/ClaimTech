<script lang="ts">
	import { Wrench, FileText, Receipt, Users } from 'lucide-svelte';

	const cards = [
		{
			title: 'Jobs',
			description: 'Track workshop jobs from intake to completion.',
			href: '/shop/jobs',
			icon: Wrench,
			color: 'bg-blue-50 text-blue-600'
		},
		{
			title: 'Estimates',
			description: 'Create and manage repair estimates for customers.',
			href: '/shop/estimates',
			icon: FileText,
			color: 'bg-green-50 text-green-600'
		},
		{
			title: 'Invoices',
			description: 'Generate and send invoices for completed work.',
			href: '/shop/invoices',
			icon: Receipt,
			color: 'bg-purple-50 text-purple-600'
		},
		{
			title: 'Customers',
			description: 'Manage customer records and contact information.',
			href: '/shop/customers',
			icon: Users,
			color: 'bg-orange-50 text-orange-600'
		}
	];
</script>

<div class="space-y-6 pt-4">
	<div>
		<h1 class="text-2xl font-semibold text-gray-900">Workshop Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">Welcome to your workshop management portal.</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each cards as card}
			<a
				href={card.href}
				class="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
			>
				<div class="flex items-center justify-between">
					<div class="rounded-lg p-2 {card.color}">
						<card.icon class="h-5 w-5" />
					</div>
				</div>
				<div>
					<h2 class="font-semibold text-gray-900 group-hover:text-slate-700">{card.title}</h2>
					<p class="mt-1 text-sm text-gray-500">{card.description}</p>
				</div>
				<span class="text-xs font-medium text-slate-600 group-hover:text-slate-900">
					Go to {card.title} &rarr;
				</span>
			</a>
		{/each}
	</div>
</div>
