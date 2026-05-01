<script lang="ts">
  let {
    value = $bindable(),
    type = 'text',
    placeholder,
    mono = false,
    disabled = false,
    id,
    step,
    class: cls = '',
    oninput,
    onblur
  }: {
    value: string | number;
    type?: 'text' | 'number' | 'email' | 'tel' | 'date';
    placeholder?: string;
    mono?: boolean;
    disabled?: boolean;
    id?: string;
    step?: string | number;
    class?: string;
    oninput?: (e: Event) => void;
    onblur?: (e: FocusEvent) => void;
  } = $props();
</script>

<input
  bind:value
  {type}
  {placeholder}
  {disabled}
  {id}
  {step}
  {oninput}
  {onblur}
  class="w-full px-2.5 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 {mono ? 'font-mono' : ''} {cls}"
/>
