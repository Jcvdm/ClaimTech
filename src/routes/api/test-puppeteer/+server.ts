import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';

/**
 * Test endpoint to verify Puppeteer is working correctly
 * GET /api/test-puppeteer
 */
export const GET: RequestHandler = async () => {
	try {
		console.log('=== Testing Puppeteer Installation ===');

		// Simple HTML for testing
		const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Puppeteer Test</title>
	<style>
		body {
			font-family: Arial, sans-serif;
			padding: 40px;
			text-align: center;
		}
		h1 {
			color: #1e40af;
		}
		.success {
			background-color: #10b981;
			color: white;
			padding: 20px;
			border-radius: 8px;
			margin: 20px 0;
		}
		.info {
			background-color: #f3f4f6;
			padding: 15px;
			border-radius: 8px;
			margin: 10px 0;
		}
	</style>
</head>
<body>
	<h1>✅ Puppeteer Test Successful</h1>
	<div class="success">
		<h2>PDF Generation Working!</h2>
		<p>If you can see this PDF, Puppeteer is installed and working correctly.</p>
	</div>
	<div class="info">
		<p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
		<p><strong>System:</strong> Claimtech PDF Generation System</p>
	</div>
</body>
</html>
		`;

		console.log('Attempting to generate test PDF...');

		// Try to generate PDF with a shorter timeout for testing
		const pdfBuffer = await generatePDF(testHTML, {
			format: 'A4',
			margin: {
				top: '20mm',
				right: '20mm',
				bottom: '20mm',
				left: '20mm'
			},
			timeout: 15000, // 15 second timeout for test
			retries: 1 // Only 1 retry for test
		});

		console.log('✅ Test PDF generated successfully!');
		console.log('PDF size:', pdfBuffer.length, 'bytes');

		return json({
			success: true,
			message: 'Puppeteer is working correctly!',
			details: {
				pdfSize: pdfBuffer.length,
				timestamp: new Date().toISOString(),
				status: 'Chrome browser launched and PDF generated successfully'
			}
		});
	} catch (err) {
		console.error('=== Puppeteer Test Failed ===');
		console.error('Error:', err);
		if (err instanceof Error) {
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
		}
		console.error('============================');

		// Provide detailed error information
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		const errorDetails: Record<string, any> = {
			error: errorMessage,
			timestamp: new Date().toISOString()
		};

		// Add specific troubleshooting hints based on error
		if (errorMessage.includes('Failed to launch')) {
			errorDetails.hint =
				'Chrome browser failed to launch. Run: npm install puppeteer --force';
			errorDetails.possibleCauses = [
				'Puppeteer not installed correctly',
				'Chrome binary missing',
				'Insufficient permissions',
				'Antivirus blocking Chrome execution'
			];
		} else if (errorMessage.includes('timeout')) {
			errorDetails.hint = 'PDF generation timed out. System may be slow or overloaded.';
			errorDetails.possibleCauses = [
				'Slow system performance',
				'Insufficient memory',
				'Chrome taking too long to start'
			];
		} else if (errorMessage.includes('Protocol error')) {
			errorDetails.hint = 'Chrome crashed during PDF generation.';
			errorDetails.possibleCauses = [
				'Insufficient memory',
				'Chrome process killed',
				'System resource limits'
			];
		}

		throw error(500, {
			message: 'Puppeteer test failed',
			details: errorDetails
		});
	}
};

