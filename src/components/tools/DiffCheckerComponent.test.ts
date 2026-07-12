import { describe, expect, it } from 'vitest';

import { computeDiff } from './DiffCheckerComponent';

describe('computeDiff', () => {
	it('preserves line numbers across insertions and deletions', () => {
		const result = computeDiff('alpha\nbeta\ngamma', 'alpha\ninserted\ngamma');

		expect(result.map(({ type, content }) => [type, content])).toEqual([
			['unchanged', 'alpha'],
			['removed', 'beta'],
			['added', 'inserted'],
			['unchanged', 'gamma'],
		]);
		expect(result.at(-1)).toMatchObject({ oldLineNum: 3, newLineNum: 3 });
	});

	it('handles large identical inputs without quadratic prepending', () => {
		const input = Array.from({ length: 20000 }, (_, index) => `line ${index}`).join('\n');
		const result = computeDiff(input, input);

		expect(result).toHaveLength(20000);
		expect(result[0]).toMatchObject({ type: 'unchanged', oldLineNum: 1, newLineNum: 1 });
		expect(result.at(-1)).toMatchObject({ oldLineNum: 20000, newLineNum: 20000 });
	});
});
