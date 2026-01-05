'use client';

import { IconCopy } from '@tabler/icons-react';
import { useState } from 'react';

import { useClipboard } from '@/hooks';

interface DiffLine {
	type: 'added' | 'removed' | 'unchanged' | 'header';
	content: string;
	oldLineNum?: number;
	newLineNum?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
	const oldLines = oldText.split('\n');
	const newLines = newText.split('\n');

	// Simple LCS-based diff algorithm
	const m = oldLines.length;
	const n = newLines.length;

	// Build LCS table
	const dp: number[][] = Array(m + 1)
		.fill(null)
		.map(() => Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (oldLines[i - 1] === newLines[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Backtrack to find diff
	const result: DiffLine[] = [];
	let i = m;
	let j = n;
	const tempResult: DiffLine[] = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
			tempResult.push({
				type: 'unchanged',
				content: oldLines[i - 1],
				oldLineNum: i,
				newLineNum: j,
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			tempResult.push({
				type: 'added',
				content: newLines[j - 1],
				newLineNum: j,
			});
			j--;
		} else if (i > 0) {
			tempResult.push({
				type: 'removed',
				content: oldLines[i - 1],
				oldLineNum: i,
			});
			i--;
		}
	}

	// Reverse to get correct order
	for (let k = tempResult.length - 1; k >= 0; k--) {
		result.push(tempResult[k]);
	}

	return result;
}

function generateUnifiedDiff(oldText: string, newText: string): string {
	const diff = computeDiff(oldText, newText);
	const lines: string[] = [];

	for (const line of diff) {
		switch (line.type) {
			case 'added':
				lines.push(`+ ${line.content}`);
				break;
			case 'removed':
				lines.push(`- ${line.content}`);
				break;
			case 'unchanged':
				lines.push(`  ${line.content}`);
				break;
		}
	}

	return lines.join('\n');
}

export default function DiffCheckerComponent() {
	const [oldText, setOldText] = useState('');
	const [newText, setNewText] = useState('');
	const [diffResult, setDiffResult] = useState<DiffLine[]>([]);
	const [showDiff, setShowDiff] = useState(false);
	const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

	const { copy } = useClipboard();

	function handleCompare() {
		const diff = computeDiff(oldText, newText);
		setDiffResult(diff);
		setShowDiff(true);
	}

	function handleCopyDiff() {
		const unifiedDiff = generateUnifiedDiff(oldText, newText);
		copy(unifiedDiff);
	}

	function handleClear() {
		setOldText('');
		setNewText('');
		setDiffResult([]);
		setShowDiff(false);
	}

	// Count changes
	const additions = diffResult.filter((d) => d.type === 'added').length;
	const deletions = diffResult.filter((d) => d.type === 'removed').length;

	return (
		<div className="flex flex-col gap-4 w-full">
			{/* Input Section */}
			{!showDiff && (
				<div className="flex gap-4 w-full">
					<div className="flex-1 flex flex-col gap-2">
						<label className="text-sm font-medium text-zinc-700">Original Text</label>
						<textarea
							value={oldText}
							onChange={(e) => setOldText(e.target.value)}
							placeholder="Paste original text here..."
							className="w-full h-80 p-3 border border-zinc-300 rounded-sm font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
						/>
					</div>
					<div className="flex-1 flex flex-col gap-2">
						<label className="text-sm font-medium text-zinc-700">Modified Text</label>
						<textarea
							value={newText}
							onChange={(e) => setNewText(e.target.value)}
							placeholder="Paste modified text here..."
							className="w-full h-80 p-3 border border-zinc-300 rounded-sm font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
						/>
					</div>
				</div>
			)}

			{/* Controls */}
			<div className="flex gap-2 items-center">
				{!showDiff ? (
					<button
						onClick={handleCompare}
						disabled={!oldText && !newText}
						className="bg-zinc-700 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-sm transition-colors">
						Compare
					</button>
				) : (
					<>
						<button onClick={() => setShowDiff(false)} className="bg-zinc-200 hover:bg-zinc-300 px-4 py-2 rounded-sm transition-colors">
							Edit
						</button>
						<button onClick={handleCopyDiff} className="bg-zinc-200 hover:bg-zinc-300 px-4 py-2 rounded-sm transition-colors flex items-center gap-2">
							<IconCopy size={16} />
							Copy Diff
						</button>
						<button onClick={handleClear} className="bg-zinc-200 hover:bg-zinc-300 px-4 py-2 rounded-sm transition-colors">
							Clear
						</button>
						<div className="flex-1" />
						<div className="flex border border-zinc-300 rounded-sm overflow-hidden">
							<button
								onClick={() => setViewMode('split')}
								className={`px-3 py-1 text-sm ${viewMode === 'split' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
								Split
							</button>
							<button
								onClick={() => setViewMode('unified')}
								className={`px-3 py-1 text-sm ${viewMode === 'unified' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
								Unified
							</button>
						</div>
						<div className="text-sm text-zinc-600">
							<span className="text-green-600">+{additions}</span> <span className="text-red-600">-{deletions}</span>
						</div>
					</>
				)}
			</div>

			{/* Diff Result */}
			{showDiff && diffResult.length > 0 && (
				<div className="border border-zinc-300 rounded-sm overflow-hidden">
					{viewMode === 'split' ? (
						<div className="flex">
							{/* Old side */}
							<div className="flex-1 border-r border-zinc-300">
								<div className="bg-zinc-100 px-3 py-1 text-sm font-medium border-b border-zinc-300 text-red-700">Original</div>
								<div className="font-mono text-sm overflow-auto max-h-[60vh]">
									{diffResult.map((line, idx) => {
										if (line.type === 'added') return null;
										return (
											<div
												key={idx}
												className={`flex ${
													line.type === 'removed' ? 'bg-red-100' : ''
												}`}>
												<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none">
													{line.oldLineNum || ''}
												</span>
												<span className="w-6 px-1 py-0.5 text-center text-zinc-400 select-none">
													{line.type === 'removed' ? '-' : ''}
												</span>
												<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
													{line.content || ' '}
												</pre>
											</div>
										);
									})}
								</div>
							</div>
							{/* New side */}
							<div className="flex-1">
								<div className="bg-zinc-100 px-3 py-1 text-sm font-medium border-b border-zinc-300 text-green-700">Modified</div>
								<div className="font-mono text-sm overflow-auto max-h-[60vh]">
									{diffResult.map((line, idx) => {
										if (line.type === 'removed') return null;
										return (
											<div
												key={idx}
												className={`flex ${
													line.type === 'added' ? 'bg-green-100' : ''
												}`}>
												<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none">
													{line.newLineNum || ''}
												</span>
												<span className="w-6 px-1 py-0.5 text-center text-zinc-400 select-none">
													{line.type === 'added' ? '+' : ''}
												</span>
												<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
													{line.content || ' '}
												</pre>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					) : (
						<div className="font-mono text-sm overflow-auto max-h-[70vh]">
							{diffResult.map((line, idx) => (
								<div
									key={idx}
									className={`flex ${
										line.type === 'added'
											? 'bg-green-100'
											: line.type === 'removed'
												? 'bg-red-100'
												: ''
									}`}>
									<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none">
										{line.oldLineNum || ''}
									</span>
									<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none">
										{line.newLineNum || ''}
									</span>
									<span
										className={`w-6 px-1 py-0.5 text-center select-none ${
											line.type === 'added'
												? 'text-green-600 bg-green-200'
												: line.type === 'removed'
													? 'text-red-600 bg-red-200'
													: 'text-zinc-400'
										}`}>
										{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
									</span>
									<pre className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">{line.content || ' '}</pre>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Empty state */}
			{showDiff && diffResult.length === 0 && (
				<div className="border border-zinc-300 rounded-sm p-8 text-center text-zinc-500">No differences found. The texts are identical.</div>
			)}
		</div>
	);
}
