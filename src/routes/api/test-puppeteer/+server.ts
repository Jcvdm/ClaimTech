import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';

/**
 * Diagnostic endpoint to verify browser launch and report runtime details.
 * GET /api/test-puppeteer
 *
 * Returns JSON: { ok, env, browserVersion, executablePath, durationMs }
 * Branches on VERCEL_ENV — Sparticuz on Vercel, local puppeteer dev dep otherwise.
 */
export const GET: RequestHandler = async () => {
	const start = Date.now();
	const isVercel = !!process.env.VERCEL_ENV;

	const executablePath = isVercel ? await chromium.executablePath() : 'local';

	const browser = isVercel
		? await puppeteerCore.launch({
				args: chromium.args,
				executablePath: await chromium.executablePath(),
				headless: true
			})
		: await (await import('puppeteer')).default.launch({ headless: true });

	try {
		const version = await browser.version();
		return json({
			ok: true,
			env: process.env.VERCEL_ENV ?? 'local',
			browserVersion: version,
			executablePath,
			durationMs: Date.now() - start
		});
	} finally {
		await browser.close();
	}
};
