<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';

	const sidebar = useSidebar();

	// Auto-close mobile sidebar on navigation
	afterNavigate(() => {
		if (sidebar?.isMobile && sidebar?.openMobile) {
			sidebar.setOpenMobile(false);
		}
	});

	// Touch gesture state for swipe-to-open
	let touchStartX = 0;
	let touchStartY = 0;

	const EDGE_THRESHOLD = 30; // px from left edge to start swipe
	const SWIPE_THRESHOLD = 50; // min px to trigger open
	const MAX_VERTICAL_OFFSET = 75; // max vertical movement allowed

	function handleTouchStart(e: TouchEvent) {
		if (!sidebar?.isMobile || sidebar?.openMobile) return;

		const touch = e.touches[0];
		if (touch.clientX <= EDGE_THRESHOLD) {
			touchStartX = touch.clientX;
			touchStartY = touch.clientY;
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!touchStartX) return;

		const touch = e.changedTouches[0];
		const deltaX = touch.clientX - touchStartX;
		const deltaY = Math.abs(touch.clientY - touchStartY);

		// Check: rightward swipe, minimal vertical movement
		if (deltaX > SWIPE_THRESHOLD && deltaY < MAX_VERTICAL_OFFSET) {
			sidebar?.setOpenMobile(true);
		}

		// Reset
		touchStartX = 0;
	}

	onMount(() => {
		document.addEventListener('touchstart', handleTouchStart, { passive: true });
		document.addEventListener('touchend', handleTouchEnd, { passive: true });

		return () => {
			document.removeEventListener('touchstart', handleTouchStart);
			document.removeEventListener('touchend', handleTouchEnd);
		};
	});
</script>

<!-- This is a behavior-only component with no visual output -->
