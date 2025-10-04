<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  export let data;
</script>

<div class="min-h-screen bg-gray-50 text-gray-900">
  <!-- Top bar -->
  <header class="sticky top-0 z-40 bg-white border-b border-gray-200">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-6 w-6 rounded bg-blue-600"></div>
        <span class="font-semibold text-gray-900">Claimtech</span>
      </div>
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <button class="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors">
          User
        </button>
      </div>
    </div>
  </header>

  <div class="flex">
    <Sidebar />

    <!-- Main content -->
    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
</div>

