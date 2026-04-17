/**
 * Visual baseline spec for Phase 2 → Phase 3 diff tracking.
 *
 * TODO: This spec is skipped because playwright.config.ts has no `storageState`
 * auth fixture — all target routes require authentication. To activate:
 * 1. Add a `storageState` fixture to playwright.config.ts (e.g. via `playwright/auth.setup.ts`).
 * 2. Replace `test.skip(...)` with a normal `test(...)` body.
 * 3. Run `npx playwright test tests/visual/pre-phase-3.spec.ts --update-snapshots`
 *    to seed the baseline screenshots under `tests/visual/pre-phase-3.spec.ts-snapshots/`.
 * 4. Commit the snapshots so Phase 3 diffs are meaningful.
 *
 * Real IDs to fill in once auth is wired:
 * - `/requests/[id]` — SELECT id FROM requests LIMIT 1
 * - `/work/assessments/[appointment_id]` — SELECT id FROM appointments LIMIT 1
 */

import { expect, test } from '@playwright/test';

const routes = [
	{ name: 'dashboard', url: '/dashboard' },
	{ name: 'requests', url: '/requests' },
	// TODO: replace with a real request ID from the database
	{ name: 'request-detail', url: '/requests/TODO_REAL_REQUEST_ID' },
	// TODO: replace with a real appointment ID from the database
	{ name: 'assessment-detail', url: '/work/assessments/TODO_REAL_APPOINTMENT_ID' },
	{ name: 'work', url: '/work' },
];

const viewports = [
	{ name: 'mobile', width: 375, height: 812 },
	{ name: 'tablet', width: 768, height: 1024 },
	{ name: 'desktop', width: 1440, height: 900 },
];

// Skipped: no auth storageState configured in playwright.config.ts.
// See TODO comment at top of file for activation instructions.
test.skip(true, 'Auth storageState not configured — see TODO at top of file');

for (const { name: vpName, width, height } of viewports) {
	test.describe(`viewport ${vpName}`, () => {
		test.use({ viewport: { width, height } });
		for (const { name, url } of routes) {
			test(`${name}`, async ({ page }) => {
				await page.goto(url);
				await page.waitForLoadState('networkidle');
				await expect(page).toHaveScreenshot(`${name}-${vpName}.png`, { fullPage: true });
			});
		}
	});
}
