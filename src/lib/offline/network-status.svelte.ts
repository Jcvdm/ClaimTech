/**
 * Network Status Store
 * Reactive store for tracking online/offline status using Svelte 5 runes
 */

import { browser } from '$app/environment';

/**
 * Network connection quality levels
 */
export type ConnectionQuality = 'offline' | 'slow' | 'good' | 'unknown';

/**
 * Network Status Class
 * Provides reactive network status tracking
 */
class NetworkStatus {
	// Core state
	isOnline = $state(browser ? navigator.onLine : true);
	lastOnline = $state<Date | null>(null);
	lastOffline = $state<Date | null>(null);

	// Connection quality tracking
	connectionQuality = $state<ConnectionQuality>('unknown');
	effectiveType = $state<string | null>(null);

	// Derived state
	readonly offlineDuration = $derived(() => {
		if (this.isOnline || !this.lastOffline) return 0;
		return Date.now() - this.lastOffline.getTime();
	});

	constructor() {
		if (browser) {
			this.initializeListeners();
			this.checkConnectionQuality();
		}
	}

	private initializeListeners(): void {
		// Online event
		window.addEventListener('online', () => {
			this.isOnline = true;
			this.lastOnline = new Date();
			this.checkConnectionQuality();
			console.log('PWA: Network online');
		});

		// Offline event
		window.addEventListener('offline', () => {
			this.isOnline = false;
			this.lastOffline = new Date();
			this.connectionQuality = 'offline';
			console.log('PWA: Network offline');
		});

		// Check connection quality periodically when online
		if (this.isOnline) {
			setInterval(() => {
				if (this.isOnline) {
					this.checkConnectionQuality();
				}
			}, 30000); // Every 30 seconds
		}
	}

	/**
	 * Check connection quality using Network Information API
	 */
	private checkConnectionQuality(): void {
		if (!browser) return;

		// Network Information API (Chrome/Android)
		const connection = (navigator as NavigatorWithConnection).connection;

		if (connection) {
			this.effectiveType = connection.effectiveType || null;

			// Map effective type to quality
			switch (connection.effectiveType) {
				case 'slow-2g':
				case '2g':
					this.connectionQuality = 'slow';
					break;
				case '3g':
					this.connectionQuality = 'slow';
					break;
				case '4g':
					this.connectionQuality = 'good';
					break;
				default:
					this.connectionQuality = 'unknown';
			}
		} else {
			// Fallback: assume good if online
			this.connectionQuality = this.isOnline ? 'good' : 'offline';
		}
	}

	/**
	 * Manually trigger a connection check
	 */
	async checkConnection(): Promise<boolean> {
		if (!browser) return true;

		try {
			// Try to fetch a small resource to verify actual connectivity
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5000);

			await fetch('/manifest.webmanifest', {
				method: 'HEAD',
				cache: 'no-store',
				signal: controller.signal
			});

			clearTimeout(timeout);
			this.isOnline = true;
			this.lastOnline = new Date();
			return true;
		} catch {
			// Network request failed, but navigator might still say online
			// This catches cases where there's a connection but no internet
			return navigator.onLine;
		}
	}

	/**
	 * Format offline duration for display
	 */
	getOfflineDurationText(): string {
		const ms = this.offlineDuration();
		if (ms === 0) return '';

		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m`;

		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	}
}

// Type for Network Information API
interface NavigatorWithConnection extends Navigator {
	connection?: {
		effectiveType?: string;
		downlink?: number;
		rtt?: number;
		saveData?: boolean;
	};
}

// Singleton instance
export const networkStatus = new NetworkStatus();
