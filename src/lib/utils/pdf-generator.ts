import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;
const BROWSER_LAUNCH_TIMEOUT = 10000; // 10 seconds to launch browser

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
				// Wait a bit before retrying
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			}

			return await generatePDFInternal(html, options, timeout);
		} catch (error) {
			lastError = error as Error;
			console.error(`PDF generation attempt ${attempt + 1} failed:`, error);

			// Don't retry if it's a timeout or if we're out of retries
			if (attempt >= retries) {
				break;
			}
		}
	}

	// All retries failed
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
	let browser;
	let timeoutId: NodeJS.Timeout | null = null;

	try {
		// Create timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`PDF generation timed out after ${timeout}ms`));
			}, timeout);
		});

		// Launch browser with timeout
		const launchPromise = puppeteer.launch({
			headless: true,
			timeout: BROWSER_LAUNCH_TIMEOUT,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-software-rasterizer',
				'--disable-extensions'
			]
		});

		browser = await Promise.race([launchPromise, timeoutPromise]);

		if (!browser) {
			throw new Error('Failed to launch browser: browser is null');
		}

		console.log('Browser launched successfully');

		// Create new page
		const page = await browser.newPage();

		// Set viewport for consistent rendering
		await page.setViewport({ width: 1200, height: 800 });

		// Enable console logging from the page
		page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
		page.on('pageerror', (error) => console.error('PAGE ERROR:', error));

		// Set content with timeout
		await Promise.race([
			page.setContent(html, {
				waitUntil: 'networkidle0',
				timeout: timeout / 2
			}),
			timeoutPromise
		]);

		// Wait a bit for any dynamic content to render
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log('HTML content loaded successfully');

		// Debug: Take a screenshot to see what Puppeteer is rendering
		try {
			const screenshotPath = path.join(process.cwd(), 'debug-puppeteer-screenshot.png');
			await page.screenshot({ path: screenshotPath, fullPage: true });
			console.log('Screenshot saved to:', screenshotPath);
		} catch (screenshotError) {
			console.error('Failed to save screenshot:', screenshotError);
		}

		// Debug: Extract the actual HTML content that Puppeteer is rendering
		try {
			const renderedHTML = await page.content();
			const htmlPath = path.join(process.cwd(), 'debug-puppeteer-rendered.html');
			fs.writeFileSync(htmlPath, renderedHTML, 'utf-8');
			console.log('Rendered HTML saved to:', htmlPath);

			// Check if the rendered HTML contains the expected values
			console.log('=== Puppeteer Rendered Content Check ===');
			console.log('Contains "R 34 448":', renderedHTML.includes('R 34 448'));
			console.log('Contains "R 39 615":', renderedHTML.includes('R 39 615'));
			console.log('Contains "R 5 167":', renderedHTML.includes('R 5 167'));

			// Extract totals section from rendered HTML
			const totalsMatch = renderedHTML.match(/<!-- Totals Section -->([\s\S]*?)<\/div>/);
			if (totalsMatch) {
				console.log('Rendered totals section:', totalsMatch[0].substring(0, 500));
			}
			console.log('========================================');
		} catch (htmlError) {
			console.error('Failed to extract rendered HTML:', htmlError);
		}

		// Generate PDF with timeout
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
				displayHeaderFooter: options.displayHeaderFooter || false,
				headerTemplate: options.headerTemplate || '',
				footerTemplate: options.footerTemplate || '',
				timeout: timeout / 2
			}),
			timeoutPromise
		]);

		console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

		// Clear timeout
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		return Buffer.from(pdfBuffer);
	} catch (error) {
		// Clear timeout on error
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		// Provide more specific error messages
		if (error instanceof Error) {
			if (error.message.includes('timeout')) {
				throw new Error(`PDF generation timed out: ${error.message}`);
			} else if (error.message.includes('Failed to launch')) {
				throw new Error(
					'Failed to launch Chrome browser. Ensure Puppeteer is installed correctly: npm install puppeteer'
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
	// Use the main generatePDF function with custom size
	// by temporarily modifying the options
	const fullOptions: PDFGeneratorOptions = {
		...options,
		format: undefined // Remove format to use custom size
	};

	let browser;
	let timeoutId: NodeJS.Timeout | null = null;
	const timeout = options.timeout || DEFAULT_TIMEOUT;

	try {
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`PDF generation timed out after ${timeout}ms`));
			}, timeout);
		});

		browser = await Promise.race([
			puppeteer.launch({
				headless: true,
				timeout: BROWSER_LAUNCH_TIMEOUT,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--disable-software-rasterizer',
					'--disable-extensions'
				]
			}),
			timeoutPromise
		]);

		const page = await browser.newPage();
		await page.setViewport({ width: 1200, height: 800 });

		await Promise.race([
			page.setContent(html, {
				waitUntil: 'networkidle0',
				timeout: timeout / 2
			}),
			timeoutPromise
		]);

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

