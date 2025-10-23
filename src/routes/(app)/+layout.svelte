<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import { LogOut, User } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: any } = $props();

  let showUserMenu = $state(false);

  // Get user email from session
  const userEmail = $derived(data.session?.user?.email || 'User');
</script>

<div class="min-h-screen bg-gray-50 text-gray-900">
  <!-- Top bar -->
  <header class="sticky top-0 z-40 bg-white border-b border-gray-200">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-6 w-6 rounded bg-blue-600"></div>
        <span class="font-semibold text-gray-900">Claimtech</span>
      </div>
      <div class="flex items-center gap-4 text-sm text-gray-600 relative">
        <button
          class="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
          onclick={() => showUserMenu = !showUserMenu}
        >
          <User class="h-4 w-4" />
          <span>{userEmail}</span>
        </button>

        {#if showUserMenu}
          <div class="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div class="py-1">
              <form method="POST" action="/auth/logout" use:enhance>
                <button
                  type="submit"
                  class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut class="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <div class="flex">
    <Sidebar />

    <!-- Main content -->
    <main class="flex-1 p-6">
      {@render children()}
    </main>
  </div>
</div>

<!-- Click outside to close menu -->
{#if showUserMenu}
  <button
    class="fixed inset-0 z-40"
    onclick={() => showUserMenu = false}
    aria-label="Close menu"
  ></button>
{/if}

