export type EscapeTarget = 'json' | 'javascript' | 'template' | 'html';

export function parseTimestamp(input: string): number | null {
	const trimmed = input.trim();
	if (!/^[+-]?\d+$/.test(trimmed)) return null;

	const value = Number(trimmed);
	return Number.isSafeInteger(value) ? value : null;
}

function escapeJsonString(value: string): string {
	return JSON.stringify(value).slice(1, -1);
}

export function escapeString(value: string, target: EscapeTarget): string {
	switch (target) {
		case 'json':
			return escapeJsonString(value);
		case 'javascript':
			return escapeJsonString(value)
				.replace(/\u2028/g, '\\u2028')
				.replace(/\u2029/g, '\\u2029');
		case 'template':
			return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
		case 'html':
			return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

export function countWords(text: string): number {
	if (!text.trim()) return 0;
	if (typeof Intl.Segmenter === 'function') {
		const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
		return Array.from(segmenter.segment(text)).filter((segment) => segment.isWordLike).length;
	}
	return text.trim().split(/\s+/).length;
}

export function countCharacters(text: string): number {
	if (typeof Intl.Segmenter === 'function') {
		return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;
	}
	return Array.from(text).length;
}

const SENSITIVE_FILE_NAMES = new Set(['.env', '.npmrc', '.pypirc', '.netrc', 'credentials.json', 'service-account.json', 'id_rsa', 'id_ed25519']);
const SENSITIVE_FILE_EXTENSIONS = new Set(['pem', 'key', 'p12', 'pfx', 'jks', 'keystore']);

export function isSensitiveFile(fileName: string): boolean {
	const lowerName = fileName.toLowerCase();
	if (SENSITIVE_FILE_NAMES.has(lowerName) || lowerName.startsWith('.env.')) return true;

	const extension = lowerName.split('.').pop();
	return extension ? SENSITIVE_FILE_EXTENSIONS.has(extension) : false;
}
