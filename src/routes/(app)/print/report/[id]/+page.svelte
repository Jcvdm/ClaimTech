<script lang="ts">
	import { onMount } from 'svelte';
	import { generateReportHTML } from '$lib/templates/report-template';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		// Wait for all images to load before triggering print
		const images = document.querySelectorAll('img');
		if (images.length === 0) {
			// No images, print immediately
			setTimeout(() => window.print(), 500);
			return;
		}

		let loadedCount = 0;
		const totalImages = images.length;

		const checkAllLoaded = () => {
			loadedCount++;
			console.log(`Images loaded: ${loadedCount}/${totalImages}`);
			
			if (loadedCount === totalImages) {
				console.log('All images loaded, triggering print dialog');
				setTimeout(() => window.print(), 500);
			}
		};

		images.forEach((img) => {
			if (img.complete) {
				checkAllLoaded();
			} else {
				img.addEventListener('load', checkAllLoaded);
				img.addEventListener('error', checkAllLoaded);
			}
		});

		// Fallback: print after 3 seconds even if images haven't loaded
		setTimeout(() => {
			if (loadedCount < totalImages) {
				console.warn(`Timeout: Only ${loadedCount}/${totalImages} images loaded, printing anyway`);
				window.print();
			}
		}, 3000);
	});

	// Generate HTML from template
	const htmlContent = generateReportHTML(data as any);
</script>

<svelte:head>
	<title>Print Report - {data.assessment.assessment_number}</title>
	<style>
		@media print {
			@page {
				size: A4;
				margin: 15mm 15mm 15mm 15mm;
			}
			
			body {
				margin: 0;
				padding: 0;
			}
			
			.print-notice {
				display: none;
			}
		}
		
		@media screen {
			.print-notice {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				background: #3b82f6;
				color: white;
				padding: 1rem;
				text-align: center;
				font-family: system-ui, -apple-system, sans-serif;
				z-index: 9999;
			}
			
			.print-content {
				margin-top: 60px;
			}
		}
	</style>
</svelte:head>

<div class="print-notice">
	<p><strong>Print View Ready</strong> - The print dialog will open automatically. If not, press Ctrl+P (Windows/Linux) or Cmd+P (Mac).</p>
</div>

<div class="print-content">
	{@html htmlContent}
</div>

