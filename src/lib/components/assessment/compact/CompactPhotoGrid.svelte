<script lang="ts">
  import { X } from 'lucide-svelte';

  let {
    photos,
    onAdd,
    onRemove,
    addLabel = 'Add Photos',
    class: cls = ''
  }: {
    photos: { id: string; url: string; name?: string }[];
    onAdd?: () => void;
    onRemove?: (id: string) => void;
    addLabel?: string;
    class?: string;
  } = $props();
</script>

<div class="grid grid-cols-3 gap-2.5 {cls}">
  <button
    type="button"
    onclick={onAdd}
    class="aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-slate-900"
  >
    <span class="text-xl">↑</span>
    <span class="text-[12px] font-semibold">{addLabel}</span>
  </button>
  {#each photos as photo (photo.id)}
    <div class="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 group">
      <img src={photo.url} alt={photo.name ?? ''} class="w-full h-full object-cover" />
      {#if photo.name}
        <span class="absolute bottom-1.5 left-2 text-[10px] font-mono text-white/85 bg-black/40 px-1 rounded">
          {photo.name}
        </span>
      {/if}
      {#if onRemove}
        <button
          type="button"
          onclick={() => onRemove(photo.id)}
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-white rounded p-1 text-slate-700"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      {/if}
    </div>
  {/each}
</div>
