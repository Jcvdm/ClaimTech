import puppeteer from 'puppeteer';

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
}

/**
 * Generate a PDF from HTML content using Puppeteer
 */
export async function generatePDF(
	html: string,
	options: PDFGeneratorOptions = {}
): Promise<Buffer> {
	let browser;

	try {
		// Launch browser
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu'
			]
		});

		// Create new page
		const page = await browser.newPage();

		// Set content
		await page.setContent(html, {
			waitUntil: 'networkidle0'
		});

		// Generate PDF
		const pdfBuffer = await page.pdf({
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
			footerTemplate: options.footerTemplate || ''
		});

		return Buffer.from(pdfBuffer);
	} catch (error) {
		console.error('Error generating PDF:', error);
		throw new Error('Failed to generate PDF');
	} finally {
		if (browser) {
			await browser.close();
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
	let browser;

	try {
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu'
			]
		});

		const page = await browser.newPage();
		await page.setContent(html, {
			waitUntil: 'networkidle0'
		});

		const pdfBuffer = await page.pdf({
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
			footerTemplate: options.footerTemplate || ''
		});

		return Buffer.from(pdfBuffer);
	} catch (error) {
		console.error('Error generating PDF with custom size:', error);
		throw new Error('Failed to generate PDF');
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

