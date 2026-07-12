import { expect, test } from '@playwright/test';
import { access, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { TOOLS } from '../../src/data/tools';

const OUT_DIRECTORY = resolve(process.cwd(), 'out');
const MIME_TYPES: Record<string, string> = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.woff2': 'font/woff2',
};

async function resolveExportPath(pathname: string): Promise<string | null> {
	const normalizedPath = decodeURIComponent(pathname).replace(/^\/+/, '');
	const candidates = normalizedPath
		? [join(OUT_DIRECTORY, normalizedPath), join(OUT_DIRECTORY, `${normalizedPath}.html`), join(OUT_DIRECTORY, normalizedPath, 'index.html')]
		: [join(OUT_DIRECTORY, 'index.html')];

	for (const candidate of candidates) {
		try {
			await access(candidate);
			return candidate;
		} catch {
			// Try the next static-export path form.
		}
	}

	return null;
}

test.beforeEach(async ({ page }) => {
	await page.route('http://127.0.0.1:4173/**', async (route) => {
		const filePath = await resolveExportPath(new URL(route.request().url()).pathname);
		if (!filePath) {
			await route.fulfill({ status: 404, body: 'Not found' });
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: MIME_TYPES[extname(filePath)] || 'application/octet-stream',
			body: await readFile(filePath),
		});
	});
});

test('homepage lists every tool', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /toolbox/i })).toBeVisible();

	for (const tool of TOOLS) {
		await expect(page.getByRole('link', { name: new RegExp(tool.name, 'i') })).toBeVisible();
	}
});

for (const tool of TOOLS) {
	test(`${tool.name} loads without runtime errors`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error' && !message.text().includes('Service Worker registration failed')) errors.push(message.text());
		});

		await page.goto(tool.href);
		await expect(page.getByRole('heading', { level: 1, name: tool.name })).toBeVisible();
		expect(errors).toEqual([]);
	});
}
