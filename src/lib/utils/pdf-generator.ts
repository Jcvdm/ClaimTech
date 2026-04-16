import type { Browser } from 'puppeteer-core';

export interface PDFGeneratorOptions {
	format?: 'A4' | 'Letter';
	margin?: {
		top?: string;
		right?: string;
		bottom?: string;
		left?: string;
	};
	printBackground?: boolean;
	displayHeaderFooter?: boolean;
	headerTemplate?: string;
	footerTemplate?: string;
	timeout?: number; // Timeout in milliseconds
	retries?: number; // Number of retry attempts
}

// Configuration
// Optimized for Vercel Hobby 10s limit - aim for 8-9s total
const DEFAULT_TIMEOUT = 8000; // 8 seconds total for Hobby plan
const DEFAULT_RETRIES = 1; // Reduce retries to fail fast
const BROWSER_LAUNCH_TIMEOUT = 3000; // 3 seconds to launch browser

const CHROME_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--disable-gpu',
	'--disable-software-rasterizer',
	'--disable-extensions'
];

/**
 * Launch a browser appropriate for the current environment.
 * - Vercel/serverless: uses @sparticuz/chromium + puppeteer-core
 * - Local dev: uses puppeteer (bundles its own Chromium)
 */
async function launchBrowser(launchTimeout: number): Promise<Browser> {
	const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

	if (isServerless) {
		const chromium = (await import('@sparticuz/chromium')).default;
		const { default: puppeteer } = await import('puppeteer-core');
		return puppeteer.launch({
			args: chromium.args,
			executablePath: await chromium.executablePath(),
			headless: true
		});
	} else {
		// Local development — puppeteer bundles its own Chromium
		const { default: puppeteer } = await import('puppeteer-core');
		return puppeteer.launch({
			headless: true,
			timeout: launchTimeout,
			args: CHROME_ARGS
		});
	}
}

/**
 * Generate a PDF from HTML content using Puppeteer with retry logic
 */
export async function generatePDF(
	html: string,
	options: PDFGeneratorOptions = {}
): Promise<Buffer> {
	const timeout = options.timeout || DEFAULT_TIMEOUT;
	const retries = options.retries || DEFAULT_RETRIES;

	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			if (attempt > 0) {
				console.log(`PDF generation retry attempt ${attempt}/${retries}`);
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			}

			return await generatePDFInternal(html, options, timeout);
		} catch (error) {
			lastError = error as Error;
			console.error(`PDF generation attempt ${attempt + 1} failed:`, error);

			if (attempt >= retries) {
				break;
			}
		}
	}

	throw new Error(
		`Failed to generate PDF after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
	);
}

/**
 * Internal PDF generation function
 */
async function generatePDFInternal(
	html: string,
	options: PDFGeneratorOptions,
	timeout: number
): Promise<Buffer> {
	let browser: Browser | undefined;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	try {
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`PDF generation timed out after ${timeout}ms`));
			}, timeout);
		});

		browser = await Promise.race([launchBrowser(BROWSER_LAUNCH_TIMEOUT), timeoutPromise]);

		console.log('Browser launched successfully');

		const page = await browser.newPage();

		await page.setViewport({ width: 1200, height: 800 });
		await page.emulateMediaType('print');

		page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
		page.on('pageerror', (error) => console.error('PAGE ERROR:', error));

		await Promise.race([
			page.setContent(html, {
				waitUntil: 'domcontentloaded',
				timeout: timeout / 2
			}),
			timeoutPromise
		]);

		console.log('Waiting for styles to apply...');
		await new Promise((resolve) => setTimeout(resolve, 200));

		try {
			await page.waitForSelector('table', { timeout: 1000 });
			console.log('Table elements found');
		} catch {
			console.warn('Table elements not found within 1s, continuing anyway');
		}

		console.log('HTML content loaded successfully');

		await page.evaluate(() => {
			document.body.offsetHeight;
			window.getComputedStyle(document.body).getPropertyValue('color');
		});

		const pdfBuffer = await Promise.race([
			page.pdf({
				format: options.format || 'A4',
				margin: options.margin || {
					top: '20mm',
					right: '15mm',
					bottom: '20mm',
					left: '15mm'
				},
				printBackground: options.printBackground !== false,
				preferCSSPageSize: false,
				displayHeaderFooter: options.displayHeaderFooter || false,
				headerTemplate: options.headerTemplate || '',
				footerTemplate: options.footerTemplate || '',
				timeout: timeout / 2,
				tagged: false,
				outline: false
			}),
			timeoutPromise
		]);

		console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		return Buffer.from(pdfBuffer);
	} catch (error) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		if (error instanceof Error) {
			if (error.message.includes('timeout')) {
				throw new Error(`PDF generation timed out: ${error.message}`);
			} else if (error.message.includes('Failed to launch')) {
				throw new Error(
					'Failed to launch Chrome browser. Ensure puppeteer-core and @sparticuz/chromium are installed.'
				);
			} else if (error.message.includes('Protocol error')) {
				throw new Error('Browser crashed during PDF generation. Try again.');
			} else {
				throw new Error(`PDF generation failed: ${error.message}`);
			}
		}

		throw new Error('PDF generation failed: Unknown error');
	} finally {
		if (browser) {
			try {
				await browser.close();
				console.log('Browser closed successfully');
			} catch (closeError) {
				console.error('Error closing browser:', closeError);
			}
		}
	}
}

/**
 * Generate a PDF with custom page size
 */
export async function generatePDFWithCustomSize(
	html: string,
	width: string,
	height: string,
	options: Omit<PDFGeneratorOptions, 'format'> = {}
): Promise<Buffer> {
	let browser: Browser | undefined;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	const timeout = options.timeout || DEFAULT_TIMEOUT;

	try {
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`PDF generation timed out after ${timeout}ms`));
			}, timeout);
		});

		browser = await Promise.race([launchBrowser(BROWSER_LAUNCH_TIMEOUT), timeoutPromise]);

		const page = await browser.newPage();
		await page.setViewport({ width: 1200, height: 800 });

		await Promise.race([
			page.setContent(html, {
				waitUntil: 'domcontentloaded',
				timeout: timeout / 2
			}),
			timeoutPromise
		]);

		await new Promise((resolve) => setTimeout(resolve, 200));

		const pdfBuffer = await Promise.race([
			page.pdf({
				width,
				height,
				margin: options.margin || {
					top: '20mm',
					right: '15mm',
					bottom: '20mm',
					left: '15mm'
				},
				printBackground: options.printBackground !== false,
				displayHeaderFooter: options.displayHeaderFooter || false,
				headerTemplate: options.headerTemplate || '',
				footerTemplate: options.footerTemplate || '',
				timeout: timeout / 2
			}),
			timeoutPromise
		]);

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		return Buffer.from(pdfBuffer);
	} catch (error) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		if (error instanceof Error) {
			throw new Error(`PDF generation with custom size failed: ${error.message}`);
		}
		throw new Error('PDF generation with custom size failed: Unknown error');
	} finally {
		if (browser) {
			try {
				await browser.close();
			} catch (closeError) {
				console.error('Error closing browser:', closeError);
			}
		}
	}
}
