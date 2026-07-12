import { describe, expect, it } from 'vitest';

import { countCharacters, countWords, escapeString, isSensitiveFile, parseTimestamp } from './toolAlgorithms';

describe('tool algorithms', () => {
	it('accepts integer timestamps and rejects partial or unsafe values', () => {
		expect(parseTimestamp('-123')).toBe(-123);
		expect(parseTimestamp('123abc')).toBeNull();
		expect(parseTimestamp('1.5')).toBeNull();
		expect(parseTimestamp('9007199254740993')).toBeNull();
	});

	it('escapes each string target independently', () => {
		expect(escapeString('${name} `value`', 'template')).toBe('\\${name} \\`value\\`');
		expect(escapeString('<b>&</b>', 'html')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
		expect(escapeString('line\n', 'json')).toBe('line\\n');
	});

	it('counts user-perceived characters and words', () => {
		expect(countCharacters('A👨‍👩‍👧‍👦')).toBe(2);
		expect(countWords('one two three')).toBe(3);
	});

	it('recognizes common credential files without blocking ordinary source files', () => {
		expect(isSensitiveFile('.env.production')).toBe(true);
		expect(isSensitiveFile('private.pem')).toBe(true);
		expect(isSensitiveFile('credentials.json')).toBe(true);
		expect(isSensitiveFile('config.ts')).toBe(false);
	});
});
