<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'ghost',
    size = 'md',
    type = 'button',
    disabled = false,
    icon,
    onclick,
    class: cls = '',
    children
  }: {
    variant?: 'primary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    icon?: Snippet;
    onclick?: (e: MouseEvent) => void;
    class?: string;
    children: Snippet;
  } = $props();

  const sizeClasses: Record<string, string> = {
    md: 'px-3 py-1.5 text-[13px]',
    sm: 'px-2.5 py-1 text-[12px]'
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
    ghost: 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200',
    danger: 'bg-white hover:bg-red-50 text-red-600 border-red-600'
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="inline-flex items-center gap-1.5 font-semibold rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed {sizeClasses[size]} {variantClasses[variant]} {cls}"
>
  {#if icon}
    {@render icon()}
  {/if}
  {@render children()}
</button>
