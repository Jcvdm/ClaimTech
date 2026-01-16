/**
 * Smart Device Detection Hook
 *
 * Provides comprehensive device detection beyond simple mobile/desktop.
 * Properly identifies tablets (including iPad) and handles orientation.
 *
 * Usage:
 *   import { device } from '$lib/hooks/use-device.svelte';
 *
 *   // In component:
 *   {#if device.isTablet}
 *     <TabletLayout />
 *   {/if}
 *
 *   // Or use deviceType:
 *   {device.deviceType} // 'mobile' | 'tablet' | 'desktop'
 */

import { MediaQuery } from 'svelte/reactivity';

/**
 * Breakpoint values matching Tailwind defaults
 */
export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Smart device detection with reactive state
 */
class DeviceDetector {
	// Breakpoint media queries (min-width - "up" queries)
	#smUp = new MediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
	#mdUp = new MediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
	#lgUp = new MediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
	#xlUp = new MediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);

	// Orientation
	#landscape = new MediaQuery('(orientation: landscape)');

	// Touch/pointer detection
	#coarsePointer = new MediaQuery('(pointer: coarse)');
	#hoverNone = new MediaQuery('(hover: none)');
	#touchScreen = new MediaQuery('(hover: none) and (pointer: coarse)');

	// ═══════════════════════════════════════════════════════════
	// BREAKPOINT GETTERS
	// ═══════════════════════════════════════════════════════════

	/** Screen width >= 640px (sm breakpoint) */
	get isSmUp(): boolean {
		return this.#smUp.current;
	}

	/** Screen width >= 768px (md breakpoint) */
	get isMdUp(): boolean {
		return this.#mdUp.current;
	}

	/** Screen width >= 1024px (lg breakpoint) */
	get isLgUp(): boolean {
		return this.#lgUp.current;
	}

	/** Screen width >= 1280px (xl breakpoint) */
	get isXlUp(): boolean {
		return this.#xlUp.current;
	}

	// ═══════════════════════════════════════════════════════════
	// DEVICE TYPE DETECTION
	// ═══════════════════════════════════════════════════════════

	/**
	 * Determines device type based on screen size AND input capabilities.
	 *
	 * - mobile: < 768px width
	 * - tablet: >= 768px width AND touch input (covers iPad landscape at 1024px)
	 * - desktop: >= 768px width AND mouse/trackpad input
	 */
	get deviceType(): DeviceType {
		// Mobile: anything below md breakpoint (768px)
		if (!this.#mdUp.current) {
			return 'mobile';
		}

		// Tablet: >= 768px AND has touch as primary input
		// This correctly identifies iPad in both portrait (768px) and landscape (1024px)
		if (this.#touchScreen.current) {
			return 'tablet';
		}

		// Desktop: >= 768px with mouse/trackpad
		return 'desktop';
	}

	/** True for mobile devices (< 768px) */
	get isMobile(): boolean {
		return this.deviceType === 'mobile';
	}

	/** True for tablet devices (>= 768px with touch) */
	get isTablet(): boolean {
		return this.deviceType === 'tablet';
	}

	/** True for desktop devices (>= 768px with mouse) */
	get isDesktop(): boolean {
		return this.deviceType === 'desktop';
	}

	/** True for mobile OR tablet (any touch device) */
	get isMobileOrTablet(): boolean {
		return this.isMobile || this.isTablet;
	}

	/** True for tablet OR desktop (>= 768px, any input) */
	get isTabletOrDesktop(): boolean {
		return this.#mdUp.current;
	}

	// ═══════════════════════════════════════════════════════════
	// ORIENTATION
	// ═══════════════════════════════════════════════════════════

	/** True when in landscape orientation */
	get isLandscape(): boolean {
		return this.#landscape.current;
	}

	/** True when in portrait orientation */
	get isPortrait(): boolean {
		return !this.#landscape.current;
	}

	// ═══════════════════════════════════════════════════════════
	// INPUT CAPABILITIES
	// ═══════════════════════════════════════════════════════════

	/** True if primary input is touch (coarse pointer) */
	get isTouch(): boolean {
		return this.#coarsePointer.current;
	}

	/** True if device supports hover (has mouse/trackpad) */
	get hasHover(): boolean {
		return !this.#hoverNone.current;
	}

	/** True if device has fine pointer (mouse/trackpad) */
	get hasFinePointer(): boolean {
		return !this.#coarsePointer.current;
	}

	// ═══════════════════════════════════════════════════════════
	// SPECIFIC PATTERNS
	// ═══════════════════════════════════════════════════════════

	/** True for iPad in landscape mode (1024px+ touch device) */
	get isTabletLandscape(): boolean {
		return this.isTablet && this.isLandscape;
	}

	/** True for iPad in portrait mode (768-1023px touch device) */
	get isTabletPortrait(): boolean {
		return this.isTablet && this.isPortrait;
	}

	/**
	 * Should show mobile-style sidebar (offcanvas sheet)?
	 * True for mobile and tablet portrait.
	 * Tablet landscape and desktop get persistent sidebar.
	 */
	get shouldUseMobileSidebar(): boolean {
		if (this.isMobile) return true;
		if (this.isTablet && this.isPortrait) return true;
		return false;
	}

	/**
	 * Should abbreviate labels/text for space?
	 * Only on mobile, tablets have enough space.
	 */
	get shouldAbbreviate(): boolean {
		return this.isMobile;
	}
}

/**
 * Singleton device detector instance.
 * Import this in components for reactive device detection.
 *
 * @example
 * import { device } from '$lib/hooks/use-device.svelte';
 *
 * // Reactive in templates:
 * {#if device.isTablet}
 *   <TabletView />
 * {:else if device.isMobile}
 *   <MobileView />
 * {:else}
 *   <DesktopView />
 * {/if}
 */
export const device = new DeviceDetector();

/**
 * Legacy compatibility: Check if screen is "mobile" width.
 * For new code, prefer using `device.deviceType` or `device.isMobile`.
 *
 * NOTE: This uses 768px breakpoint (md), not the old 1024px.
 * iPad landscape (1024px) is now correctly identified as "tablet".
 */
export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = BREAKPOINTS.md) {
		super(`(max-width: ${breakpoint - 1}px)`);
	}
}
