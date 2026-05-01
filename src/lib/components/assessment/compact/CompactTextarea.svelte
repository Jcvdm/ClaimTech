<script lang="ts">
  let {
    value = $bindable(),
    rows = 3,
    placeholder,
    disabled = false,
    id,
    class: cls = '',
    oninput,
    onblur
  }: {
    value: string;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    class?: string;
    oninput?: (e: Event) => void;
    onblur?: (e: FocusEvent) => void;
  } = $props();
</script>

<textarea
  bind:value
  {rows}
  {placeholder}
  {disabled}
  {id}
  {oninput}
  {onblur}
  class="w-full px-2.5 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-red-600 disabled:bg-slate-50 disabled:text-slate-400 {cls}"
></textarea>
