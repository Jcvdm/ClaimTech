<script lang="ts">
	import { browser } from '$app/environment';
	import { Download, X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	// Track the deferred prompt event
	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showPrompt = $state(false);
	let dismissed = $state(false);

	// Check if already installed
	let isInstalled = $state(false);

	// BeforeInstallPromptEvent type (not in standard TypeScript lib)
	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: string[];
		readonly userChoice: Promise<{
			outcome: 'accepted' | 'dismissed';
			platform: string;
		}>;
		prompt(): Promise<void>;
	}

	if (browser) {
		// Check if app is already installed (standalone mode)
		isInstalled = window.matchMedia('(display-mode: standalone)').matches;

		// Listen for the beforeinstallprompt event
		window.addEventListener('beforeinstallprompt', (e: Event) => {
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();
			// Store the event for later use
			deferredPrompt = e as BeforeInstallPromptEvent;
			// Show our custom install prompt
			if (!dismissed && !isInstalled) {
				showPrompt = true;
			}
		});

		// Listen for successful installation
		window.addEventListener('appinstalled', () => {
			isInstalled = true;
			showPrompt = false;
			deferredPrompt = null;
		});
	}

	async function handleInstall() {
		if (!deferredPrompt) return;

		// Show the install prompt
		await deferredPrompt.prompt();

		// Wait for the user's choice
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			showPrompt = false;
		}

		// Clear the deferred prompt (can only be used once)
		deferredPrompt = null;
	}

	function handleDismiss() {
		showPrompt = false;
		dismissed = true;
		// Remember dismissal for this session
		if (browser) {
			sessionStorage.setItem('pwa-prompt-dismissed', 'true');
		}
	}

	// Check if previously dismissed this session
	if (browser) {
		dismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
	}
</script>

{#if showPrompt && !isInstalled}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800 md:left-auto md:right-4"
	>
		<div class="flex items-start gap-3">
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"
			>
				<Download class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
					Install ClaimTech
				</h3>
				<p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
					Install the app for quick access and offline support.
				</p>
				<div class="mt-3 flex gap-2">
					<Button size="sm" onclick={handleInstall}>Install</Button>
					<Button size="sm" variant="ghost" onclick={handleDismiss}>Not now</Button>
				</div>
			</div>
			<button
				onclick={handleDismiss}
				class="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
				aria-label="Dismiss"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
