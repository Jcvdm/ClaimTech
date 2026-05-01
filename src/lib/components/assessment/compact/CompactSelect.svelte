<script lang="ts">
  let {
    value = $bindable(),
    options,
    placeholder,
    disabled = false,
    id,
    class: cls = '',
    onchange
  }: {
    value: string;
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    class?: string;
    onchange?: (value: string) => void;
  } = $props();

  function handleChange(e: Event) {
    const newValue = (e.target as HTMLSelectElement).value;
    if (onchange) onchange(newValue);
  }
</script>

<select
  bind:value
  {disabled}
  {id}
  onchange={handleChange}
  class="w-full px-2.5 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 disabled:bg-slate-50 disabled:text-slate-400 {cls}"
>
  {#if placeholder}
    <option value="" disabled>{placeholder}</option>
  {/if}
  {#each options as opt (opt.value)}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>
