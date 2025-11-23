import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const logoPath = join(process.cwd(), 'src/lib/assets/logo.png');
let logoBase64: string | null = null;

try {
	logoBase64 = readFileSync(logoPath).toString('base64');
} catch (err) {
	console.warn('Unable to load ClaimTech logo for documents:', err instanceof Error ? err.message : err);
}

export function getBrandLogoBase64(): string | null {
	return logoBase64;
}
