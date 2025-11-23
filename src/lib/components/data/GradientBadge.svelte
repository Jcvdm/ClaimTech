<script lang="ts">
	type Variant = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';

	type Props = {
		variant?: Variant;
		label: string;
		icon?: any;
		pulse?: boolean;
		class?: string;
	};

	let { variant = 'blue', label, icon, pulse = false, class: className = '' }: Props = $props();

	const variantClasses: Record<Variant, string> = {
		blue: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white',
		green: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
		yellow: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
		red: 'bg-gradient-to-r from-red-500 to-pink-600 text-white',
		purple: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
		indigo: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white',
		pink: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white',
		gray: 'bg-gradient-to-r from-slate-400 to-slate-600 text-white'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm {variantClasses[
		variant
	]} {pulse ? 'animate-pulse' : ''} {className}"
>
	{#if pulse}
		<span class="h-1.5 w-1.5 rounded-full bg-white"></span>
	{/if}
	{#if icon}
		{@render icon({ class: 'h-3 w-3' })}
	{/if}
	{label}
</span>

