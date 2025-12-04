<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Download, X, Share } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	// Track the deferred prompt event
	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showPrompt = $state(false);
	let showIOSPrompt = $state(false);
	let dismissed = $state(false);
	let swRegistered = $state(false);

	// Check if already installed
	let isInstalled = $state(false);
	let isIOS = $state(false);

	// BeforeInstallPromptEvent type (not in standard TypeScript lib)
	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: string[];
		readonly userChoice: Promise<{
			outcome: 'accepted' | 'dismissed';
			platform: string;
		}>;
		prompt(): Promise<void>;
	}

	onMount(async () => {
		if (!browser) return;

		// Detect iOS
		isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

		// Check if app is already installed (standalone mode)
		isInstalled =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as any).standalone === true; // iOS Safari standalone

		// Check if previously dismissed this session
		dismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';

		// Check service worker status (registration handled by vite-pwa plugin)
		if ('serviceWorker' in navigator) {
			try {
				const registrations = await navigator.serviceWorker.getRegistrations();
				if (registrations.length > 0) {
					swRegistered = true;
					console.log('PWA: Service worker active', registrations[0].scope);
				} else {
					console.log('PWA: No service worker registered yet');
				}
			} catch (error) {
				console.log('PWA: Service worker check failed', error);
			}
		}

		// Listen for the beforeinstallprompt event (Chrome/Android)
		window.addEventListener('beforeinstallprompt', (e: Event) => {
			console.log('PWA: beforeinstallprompt fired');
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
			console.log('PWA: App installed');
			isInstalled = true;
			showPrompt = false;
			showIOSPrompt = false;
			deferredPrompt = null;
		});

		// For iOS, show instructions after a delay if not installed
		if (isIOS && !isInstalled && !dismissed) {
			setTimeout(() => {
				showIOSPrompt = true;
			}, 3000);
		}
	});

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
		showIOSPrompt = false;
		dismissed = true;
		// Remember dismissal for this session
		if (browser) {
			sessionStorage.setItem('pwa-prompt-dismissed', 'true');
		}
	}
</script>

<!-- Android/Chrome Install Prompt -->
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

<!-- iOS Install Instructions -->
{#if showIOSPrompt && !isInstalled && isIOS}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
	>
		<div class="flex items-start gap-3">
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"
			>
				<Share class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
					Install ClaimTech
				</h3>
				<p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
					Tap the <strong>Share</strong> button below, then select
					<strong>"Add to Home Screen"</strong> to install.
				</p>
				<div class="mt-3">
					<Button size="sm" variant="ghost" onclick={handleDismiss}>Got it</Button>
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
