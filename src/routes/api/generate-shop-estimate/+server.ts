import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateShopEstimateHTML } from '$lib/templates/shop-estimate-template';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const { estimateId } = body;
	const requestId = Math.random().toString(36).substring(7);

	console.log(`\n${'='.repeat(80)}`);
	console.log(`[${new Date().toISOString()}] [Request ${requestId}] NEW SHOP ESTIMATE PDF GENERATION REQUEST`);
	console.log(`[${new Date().toISOString()}] [Request ${requestId}] Estimate ID: ${estimateId}`);
	console.log(`${'='.repeat(80)}\n`);

	if (!estimateId) {
		return new Response(JSON.stringify({ error: 'Missing estimateId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Use untyped client because shop tables are not yet in database.types.ts
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const supabase = locals.supabase as any;

	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: Record<string, unknown>) => {
				controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			try {
				// Step 1: Fetch estimate with job
				send({ status: 'processing', progress: 5, message: 'Fetching estimate data...' });
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Fetching estimate from database...`);

				const { data: estimate, error: estError } = await supabase
					.from('shop_estimates')
					.select('*, shop_jobs(*)')
					.eq('id', estimateId)
					.single();

				if (estError || !estimate) {
					console.error(`[${new Date().toISOString()}] [Request ${requestId}] Estimate not found:`, estError);
					send({ status: 'error', progress: 0, error: 'Estimate not found' });
					controller.close();
					return;
				}

				const job = estimate.shop_jobs as Record<string, unknown>;
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Estimate found: ${estimate.estimate_number}`);

				send({ status: 'processing', progress: 20, message: 'Loading company settings...' });

				// Step 2: Fetch shop settings for company info
				const { data: settings } = await supabase
					.from('shop_settings')
					.select('company_name, company_phone, company_email, company_address')
					.limit(1)
					.maybeSingle();

				// Step 3: Get logo as base64 if available
				send({ status: 'processing', progress: 35, message: 'Preparing template...' });
				let logoBase64: string | null = null;

				const { data: companySettings } = await supabase
					.from('company_settings')
					.select('logo_url')
					.limit(1)
					.maybeSingle();

				if (companySettings?.logo_url) {
					try {
						const logoResponse = await fetch(companySettings.logo_url);
						if (logoResponse.ok) {
							const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
							const contentType = logoResponse.headers.get('content-type') || 'image/png';
							logoBase64 = `data:${contentType};base64,${logoBuffer.toString('base64')}`;
						}
					} catch (e) {
						console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Failed to fetch logo:`, e);
					}
				}

				// Step 4: Generate HTML
				send({ status: 'processing', progress: 50, message: 'Generating document...' });
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Generating HTML template...`);

				const html = generateShopEstimateHTML({
					estimate: {
						...estimate,
						line_items: estimate.line_items || []
					} as Parameters<typeof generateShopEstimateHTML>[0]['estimate'],
					job: {
						job_number: job.job_number as string,
						job_type: job.job_type as string,
						customer_name: job.customer_name as string,
						customer_phone: (job.customer_phone as string) ?? null,
						customer_email: (job.customer_email as string) ?? null,
						vehicle_make: job.vehicle_make as string,
						vehicle_model: job.vehicle_model as string,
						vehicle_year: (job.vehicle_year as number) ?? null,
						vehicle_reg: (job.vehicle_reg as string) ?? null,
						vehicle_vin: (job.vehicle_vin as string) ?? null,
						vehicle_color: (job.vehicle_color as string) ?? null,
						vehicle_mileage: (job.vehicle_mileage as number) ?? null,
						damage_description: (job.damage_description as string) ?? null,
						complaint: (job.complaint as string) ?? null
					},
					companyName: (settings as Record<string, string> | null)?.company_name ?? 'Workshop',
					companyPhone: (settings as Record<string, string> | null)?.company_phone ?? null,
					companyEmail: (settings as Record<string, string> | null)?.company_email ?? null,
					companyAddress: (settings as Record<string, string> | null)?.company_address ?? null,
					logoBase64
				});

				// Step 5: Generate PDF with Puppeteer
				send({ status: 'processing', progress: 60, message: 'Rendering PDF (this may take a moment)...' });
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Starting PDF generation with Puppeteer...`);

				let pdfBuffer: Buffer;
				try {
					const pdfPromise = generatePDF(html, {
						format: 'A4',
						margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' },
						printBackground: true
					});

					let currentProgress = 62;
					const startTime = Date.now();

					while (true) {
						const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
						const result = await Promise.race([pdfPromise, timeoutPromise]);

						if (result instanceof Buffer) {
							pdfBuffer = result;
							break;
						}

						currentProgress = Math.min(currentProgress + 2, 80);
						const elapsed = Math.round((Date.now() - startTime) / 1000);
						console.log(`[${new Date().toISOString()}] [Request ${requestId}] Keep-alive ping: ${currentProgress}% (${elapsed}s elapsed)`);
						send({
							status: 'processing',
							progress: currentProgress,
							message: `Rendering PDF... (${elapsed}s)`
						});
					}

					console.log(`[${new Date().toISOString()}] [Request ${requestId}] PDF generated. Size: ${pdfBuffer.length} bytes`);
				} catch (pdfError) {
					console.error(`[${new Date().toISOString()}] [Request ${requestId}] PDF generation error:`, pdfError);
					send({
						status: 'error',
						progress: 0,
						error: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
					});
					controller.close();
					return;
				}

				// Step 6: Upload to storage
				send({ status: 'processing', progress: 85, message: 'Uploading document...' });
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Uploading PDF to Supabase storage...`);

				const timestamp = Date.now();
				const safeNumber = (estimate.estimate_number as string).replace(/[^a-zA-Z0-9-]/g, '_');
				const fileName = `${safeNumber}_${timestamp}.pdf`;
				const jobId = estimate.job_id as string;
				const filePath = `shop-jobs/${jobId}/estimates/${fileName}`;

				// Delete previous PDF if exists
				if (estimate.pdf_path) {
					const { error: removeError } = await supabase.storage
						.from('documents')
						.remove([estimate.pdf_path]);
					if (removeError) {
						console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Could not remove previous PDF:`, removeError);
					}
				}

				// Upload with retry
				let uploadOk = false;
				for (let i = 0; i < 3; i++) {
					const { error: uploadError } = await supabase.storage
						.from('documents')
						.upload(filePath, pdfBuffer!, { contentType: 'application/pdf', upsert: true });
					if (!uploadError) {
						uploadOk = true;
						break;
					}
					console.warn(`[${new Date().toISOString()}] [Request ${requestId}] Upload attempt ${i + 1} failed:`, uploadError);
					await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
				}

				if (!uploadOk) {
					send({ status: 'error', progress: 0, error: 'Failed to upload PDF to storage' });
					controller.close();
					return;
				}

				console.log(`[${new Date().toISOString()}] [Request ${requestId}] PDF uploaded successfully to: ${filePath}`);

				// Step 7: Save URL to database
				send({ status: 'processing', progress: 95, message: 'Finalizing...' });

				const proxyUrl = `/api/document/${filePath}`;

				const { error: updateError } = await supabase
					.from('shop_estimates')
					.update({
						pdf_url: proxyUrl,
						pdf_path: filePath,
						updated_at: new Date().toISOString()
					})
					.eq('id', estimateId);

				if (updateError) {
					console.error(`[${new Date().toISOString()}] [Request ${requestId}] Update error:`, updateError);
					send({ status: 'error', progress: 0, error: 'Failed to update estimate record' });
					controller.close();
					return;
				}

				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Estimate record updated with PDF URL.`);
				console.log(`[${new Date().toISOString()}] [Request ${requestId}] Yielding FINAL complete status`);

				send({
					status: 'complete',
					progress: 100,
					message: 'Estimate PDF generated successfully!',
					url: proxyUrl
				});
			} catch (err) {
				console.error(`\n${'='.repeat(80)}`);
				console.error(`[${new Date().toISOString()}] [Request ${requestId}] ERROR IN GENERATOR`);
				console.error(`[${new Date().toISOString()}] [Request ${requestId}]`, err);
				console.error(`${'='.repeat(80)}\n`);

				send({
					status: 'error',
					progress: 0,
					error: err instanceof Error ? err.message : 'An unknown error occurred'
				});
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};
