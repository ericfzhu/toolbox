'use client';

import { useClipboard } from '@/hooks';
import { IconCopy } from '@tabler/icons-react';
import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('json', json);
hljs.registerLanguage('java', java);

type Language = 'auto' | 'javascript' | 'python' | 'markdown' | 'json' | 'java' | 'plaintext';

const LANGUAGES: { value: Language; label: string }[] = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'java', label: 'Java' },
	{ value: 'json', label: 'JSON' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'plaintext', label: 'Plain Text' },
];

function detectLanguage(code: string): string {
	if (!code.trim()) return 'plaintext';
	try {
		const result = hljs.highlightAuto(code, ['javascript', 'python', 'markdown', 'json', 'java']);
		// Only use detection if confidence is reasonable (relevance > 5)
		if (result.relevance > 5 && result.language) {
			return result.language;
		}
		return 'plaintext';
	} catch {
		return 'plaintext';
	}
}

function highlightCode(code: string, language: string): string {
	if (language === 'plaintext' || !code) {
		return escapeHtml(code);
	}
	try {
		const result = hljs.highlight(code, { language, ignoreIllegals: true });
		return result.value;
	} catch {
		return escapeHtml(code);
	}
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Minimal syntax highlighting styles (GitHub-inspired)
const highlightStyles = `
.hljs {
	color: #24292e;
}
.hljs-comment,
.hljs-quote {
	color: #6a737d;
	font-style: italic;
}
.hljs-keyword,
.hljs-selector-tag {
	color: #d73a49;
}
.hljs-string,
.hljs-attr,
.hljs-addition {
	color: #22863a;
}
.hljs-number,
.hljs-literal {
	color: #005cc5;
}
.hljs-built_in,
.hljs-builtin-name,
.hljs-type,
.hljs-class .hljs-title {
	color: #6f42c1;
}
.hljs-function .hljs-title,
.hljs-title.function_ {
	color: #6f42c1;
}
.hljs-variable,
.hljs-template-variable {
	color: #e36209;
}
.hljs-attribute {
	color: #005cc5;
}
.hljs-deletion {
	color: #b31d28;
}
.hljs-meta {
	color: #032f62;
}
.hljs-section {
	color: #005cc5;
	font-weight: bold;
}
.hljs-bullet {
	color: #735c0f;
}
.hljs-link {
	color: #032f62;
	text-decoration: underline;
}
`;

interface DiffLine {
	type: 'added' | 'removed' | 'unchanged' | 'header';
	content: string;
	oldLineNum?: number;
	newLineNum?: number;
}

const MAX_EXACT_EDIT_DISTANCE = 2000;
const MAX_HIGHLIGHTED_LINES = 5000;
const MAX_MINIMAP_LINES = 300;
const diffRowStyle = { contentVisibility: 'auto', containIntrinsicSize: '22px' } as const;

function buildPrefixSuffixDiff(oldLines: string[], newLines: string[]): DiffLine[] {
	const result: DiffLine[] = [];
	let prefixLength = 0;

	while (prefixLength < oldLines.length && prefixLength < newLines.length && oldLines[prefixLength] === newLines[prefixLength]) {
		result.push({
			type: 'unchanged',
			content: oldLines[prefixLength],
			oldLineNum: prefixLength + 1,
			newLineNum: prefixLength + 1,
		});
		prefixLength++;
	}

	let suffixLength = 0;
	while (
		suffixLength < oldLines.length - prefixLength &&
		suffixLength < newLines.length - prefixLength &&
		oldLines[oldLines.length - 1 - suffixLength] === newLines[newLines.length - 1 - suffixLength]
	) {
		suffixLength++;
	}

	const oldMiddleEnd = oldLines.length - suffixLength;
	const newMiddleEnd = newLines.length - suffixLength;

	for (let i = prefixLength; i < oldMiddleEnd; i++) {
		result.push({
			type: 'removed',
			content: oldLines[i],
			oldLineNum: i + 1,
		});
	}

	for (let i = prefixLength; i < newMiddleEnd; i++) {
		result.push({
			type: 'added',
			content: newLines[i],
			newLineNum: i + 1,
		});
	}

	for (let i = 0; i < suffixLength; i++) {
		const oldIndex = oldMiddleEnd + i;
		const newIndex = newMiddleEnd + i;
		result.push({
			type: 'unchanged',
			content: oldLines[oldIndex],
			oldLineNum: oldIndex + 1,
			newLineNum: newIndex + 1,
		});
	}

	return result;
}

function backtrackMyersDiff(trace: Int32Array[], oldLines: string[], newLines: string[], editDistance: number, offset: number): DiffLine[] {
	let x = oldLines.length;
	let y = newLines.length;
	const result: DiffLine[] = [];

	for (let d = editDistance; d >= 0; d--) {
		const v = trace[d];
		const k = x - y;
		const prevK = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1;
		const prevX = v[offset + prevK];
		const prevY = prevX - prevK;

		while (x > prevX && y > prevY) {
			result.push({
				type: 'unchanged',
				content: oldLines[x - 1],
				oldLineNum: x,
				newLineNum: y,
			});
			x--;
			y--;
		}

		if (d > 0) {
			if (x === prevX) {
				result.push({
					type: 'added',
					content: newLines[prevY],
					newLineNum: prevY + 1,
				});
			} else {
				result.push({
					type: 'removed',
					content: oldLines[prevX],
					oldLineNum: prevX + 1,
				});
			}
		}

		x = prevX;
		y = prevY;
	}

	return result.reverse();
}

function sampleLines(lines: DiffLine[], limit: number = MAX_MINIMAP_LINES): DiffLine[] {
	if (lines.length <= limit) return lines;

	return Array.from({ length: limit }, (_, index) => lines[Math.floor((index * lines.length) / limit)]);
}

function computeExactDiff(oldLines: string[], newLines: string[]): DiffLine[] | null {
	const max = oldLines.length + newLines.length;
	const maxDistance = Math.min(max, MAX_EXACT_EDIT_DISTANCE);
	const offset = maxDistance + 1;
	const vectorWidth = maxDistance * 2 + 3;
	const trace: Int32Array[] = [];
	let v = new Int32Array(vectorWidth);

	v.fill(-1);
	v[offset + 1] = 0;

	for (let d = 0; d <= maxDistance; d++) {
		trace.push(new Int32Array(v));

		for (let k = -d; k <= d; k += 2) {
			const goDown = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]);
			let x = goDown ? v[offset + k + 1] : v[offset + k - 1] + 1;
			let y = x - k;

			while (x < oldLines.length && y < newLines.length && oldLines[x] === newLines[y]) {
				x++;
				y++;
			}

			v[offset + k] = x;

			if (x >= oldLines.length && y >= newLines.length) {
				return backtrackMyersDiff(trace, oldLines, newLines, d, offset);
			}
		}
	}

	return null;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
	const oldLines = oldText.split('\n');
	const newLines = newText.split('\n');

	return computeExactDiff(oldLines, newLines) ?? buildPrefixSuffixDiff(oldLines, newLines);
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

interface MinimapProps {
	diffResult: DiffLine[];
	viewMode: 'split' | 'unified';
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	secondScrollContainerRef?: React.RefObject<HTMLDivElement | null>;
	headerHeight?: number;
}

function Minimap({ diffResult, viewMode, scrollContainerRef, secondScrollContainerRef, headerHeight = 0 }: MinimapProps) {
	const minimapRef = useRef<HTMLDivElement>(null);
	const minimapContentRef = useRef<HTMLDivElement>(null);
	const [viewportTop, setViewportTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(100);
	const [isDragging, setIsDragging] = useState(false);

	// Calculate line data for minimap - must match what's rendered in the scroll container
	const lineData = viewMode === 'unified' ? diffResult : diffResult.filter((line) => line.type !== 'added'); // For split view, use original side

	const totalLines = lineData.length;

	// Update viewport indicator based on scroll position
	const updateViewport = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;

		if (scrollHeight <= clientHeight) {
			setViewportTop(0);
			setViewportHeight(100);
		} else {
			// Use percentages for consistent positioning
			setViewportTop((scrollTop / scrollHeight) * 100);
			setViewportHeight((clientHeight / scrollHeight) * 100);
		}
	}, [scrollContainerRef]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		updateViewport();
		container.addEventListener('scroll', updateViewport);
		window.addEventListener('resize', updateViewport);

		return () => {
			container.removeEventListener('scroll', updateViewport);
			window.removeEventListener('resize', updateViewport);
		};
	}, [scrollContainerRef, updateViewport, diffResult]);

	// Handle click/drag on minimap
	const handleMinimapInteraction = useCallback(
		(clientY: number) => {
			const minimapContent = minimapContentRef.current;
			const container = scrollContainerRef.current;
			if (!minimapContent || !container) return;

			const rect = minimapContent.getBoundingClientRect();
			const clickY = clientY - rect.top;
			const ratio = Math.max(0, Math.min(1, clickY / rect.height));

			const targetScroll = ratio * container.scrollHeight - container.clientHeight / 2;
			container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - container.clientHeight));

			// Sync second scroll container in split view
			if (secondScrollContainerRef?.current) {
				secondScrollContainerRef.current.scrollTop = container.scrollTop;
			}
		},
		[scrollContainerRef, secondScrollContainerRef],
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			setIsDragging(true);
			handleMinimapInteraction(e.clientY);
		},
		[handleMinimapInteraction],
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (isDragging) {
				handleMinimapInteraction(e.clientY);
			}
		},
		[isDragging, handleMinimapInteraction],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	useEffect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	if (totalLines === 0) return null;

	// Split lines into left (original) and right (modified) columns
	const leftLines = sampleLines(diffResult.filter((line) => line.type !== 'added')); // removed + unchanged
	const rightLines = sampleLines(diffResult.filter((line) => line.type !== 'removed')); // added + unchanged

	const leftLineHeightPercent = leftLines.length > 0 ? 100 / leftLines.length : 100;
	const rightLineHeightPercent = rightLines.length > 0 ? 100 / rightLines.length : 100;

	return (
		<div
			ref={minimapRef}
			className="relative flex w-20 flex-shrink-0 cursor-pointer select-none flex-col bg-zinc-50 shadow-[inset_1px_0px_0px_rgba(0,0,0,0.08)]"
			onMouseDown={handleMouseDown}>
			{/* Header spacer to align with content area */}
			{headerHeight > 0 && (
				<div className="flex-shrink-0 bg-zinc-50 shadow-[inset_0px_-1px_0px_rgba(0,0,0,0.08)]" style={{ height: `${headerHeight}px` }} />
			)}

			{/* Diff lines preview - two columns */}
			<div ref={minimapContentRef} className="relative flex-1 overflow-hidden flex">
				{/* Left column - deletions (original side) */}
				<div className="flex-1 relative">
					{leftLines.map((line, idx) => (
						<div
							key={idx}
							className={`absolute left-0 right-0 ${line.type === 'removed' ? 'bg-red-400' : 'bg-zinc-200'}`}
							style={{
								top: `${idx * leftLineHeightPercent}%`,
								height: `${Math.max(leftLineHeightPercent, 0.5)}%`,
								opacity: line.type === 'unchanged' ? 0.3 : 0.8,
							}}
						/>
					))}
				</div>

				{/* Divider */}
				<div className="w-px bg-zinc-300/80" />

				{/* Right column - additions (modified side) */}
				<div className="flex-1 relative">
					{rightLines.map((line, idx) => (
						<div
							key={idx}
							className={`absolute left-0 right-0 ${line.type === 'added' ? 'bg-green-400' : 'bg-zinc-200'}`}
							style={{
								top: `${idx * rightLineHeightPercent}%`,
								height: `${Math.max(rightLineHeightPercent, 0.5)}%`,
								opacity: line.type === 'unchanged' ? 0.3 : 0.8,
							}}
						/>
					))}
				</div>

				{/* Viewport indicator - spans both columns */}
				<div
					className="pointer-events-none absolute left-0 right-0 bg-zinc-900/15 shadow-[inset_0px_1px_0px_rgba(24,24,27,0.35),inset_0px_-1px_0px_rgba(24,24,27,0.35)]"
					style={{
						top: `${viewportTop}%`,
						height: `${Math.max(viewportHeight, 2)}%`,
					}}
				/>
			</div>
		</div>
	);
}

export default function DiffCheckerComponent() {
	const [oldText, setOldText] = useState('');
	const [newText, setNewText] = useState('');
	const [diffResult, setDiffResult] = useState<DiffLine[]>([]);
	const [showDiff, setShowDiff] = useState(false);
	const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
	const [language, setLanguage] = useState<Language>('auto');

	const { copy } = useClipboard();

	// Detect or use selected language
	const effectiveLanguage = useMemo(() => {
		if (language !== 'auto') return language;
		// Use combined text for better detection
		const combinedText = oldText + '\n' + newText;
		return detectLanguage(combinedText);
	}, [language, oldText, newText]);

	// Pre-highlight all lines for performance
	const highlightedLines = useMemo(() => {
		return diffResult.map((line) => ({
			...line,
			highlightedContent:
				diffResult.length <= MAX_HIGHLIGHTED_LINES ? highlightCode(line.content, effectiveLanguage) : escapeHtml(line.content),
		}));
	}, [diffResult, effectiveLanguage]);

	// Refs for scroll containers
	const leftScrollRef = useRef<HTMLDivElement>(null);
	const rightScrollRef = useRef<HTMLDivElement>(null);
	const unifiedScrollRef = useRef<HTMLDivElement>(null);

	// Sync scroll between split view panels
	const handleLeftScroll = useCallback(() => {
		if (leftScrollRef.current && rightScrollRef.current) {
			rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
		}
	}, []);

	const handleRightScroll = useCallback(() => {
		if (leftScrollRef.current && rightScrollRef.current) {
			leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
		}
	}, []);

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
		setLanguage('auto');
	}

	// Count changes
	const additions = diffResult.filter((d) => d.type === 'added').length;
	const deletions = diffResult.filter((d) => d.type === 'removed').length;

	return (
		<div className="flex w-full flex-col gap-5">
			<style dangerouslySetInnerHTML={{ __html: highlightStyles }} />
			{/* Input Section */}
			{!showDiff && (
				<div className="flex w-full flex-col gap-6 md:flex-row md:gap-8">
					<div className="flex-1">
						<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
							<div className="rounded-[20px] bg-zinc-50 p-4">
								<label className="mb-2 block text-sm font-medium text-zinc-700">Original Text</label>
								<textarea
									value={oldText}
									onChange={(e) => setOldText(e.target.value)}
									placeholder="Paste original text here..."
									className="h-48 w-full resize-none rounded-[20px] bg-white p-3 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)] md:h-80"
								/>
							</div>
						</div>
					</div>
					<div className="flex-1">
						<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
							<div className="rounded-[20px] bg-zinc-50 p-4">
								<label className="mb-2 block text-sm font-medium text-zinc-700">Modified Text</label>
								<textarea
									value={newText}
									onChange={(e) => setNewText(e.target.value)}
									placeholder="Paste modified text here..."
									className="h-48 w-full resize-none rounded-[20px] bg-white p-3 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)] md:h-80"
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Controls */}
			<div className="flex flex-wrap items-center gap-2 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				{!showDiff ? (
					<button
						onClick={handleCompare}
						disabled={!oldText && !newText}
						className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow,color] duration-200 ease-out hover:bg-zinc-800 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none">
						Compare
					</button>
				) : (
					<>
						<button
							onClick={() => setShowDiff(false)}
							className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
							Edit
						</button>
						<button
							onClick={handleCopyDiff}
							className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
							<IconCopy size={16} />
							<span className="hidden sm:inline">Copy Diff</span>
							<span className="sm:hidden">Copy</span>
						</button>
						<button
							onClick={handleClear}
							className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
							Clear
						</button>
						<select
							value={language}
							onChange={(e) => setLanguage(e.target.value as Language)}
							className="min-h-11 cursor-pointer rounded-2xl border-none bg-zinc-50 px-3 py-2 pr-10 text-sm text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow,background-color] duration-200 ease-out hover:bg-zinc-100 focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)] sm:px-4">
							{LANGUAGES.map((lang) => (
								<option key={lang.value} value={lang.value}>
									{lang.label}
									{language === 'auto' && lang.value === 'auto' && effectiveLanguage !== 'plaintext'
										? ` (${effectiveLanguage})`
										: ''}
								</option>
							))}
						</select>
						<div className="hidden sm:block flex-1" />
						<div className="flex rounded-2xl bg-zinc-50 p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
							<button
								onClick={() => setViewMode('split')}
								className={`min-h-9 rounded-xl px-3 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-4 ${viewMode === 'split' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
								Split
							</button>
							<button
								onClick={() => setViewMode('unified')}
								className={`min-h-9 rounded-xl px-3 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-4 ${viewMode === 'unified' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
								Unified
							</button>
						</div>
						<div className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm tabular-nums text-zinc-600 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
							<span className="text-green-600">+{additions}</span> <span className="text-red-600">-{deletions}</span>
						</div>
					</>
				)}
			</div>

			{/* Diff Result */}
			{showDiff && diffResult.length > 0 && (
				<div className="flex overflow-hidden rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="flex-1 min-w-0 overflow-x-auto">
						{viewMode === 'split' ? (
							<div className="flex min-w-[600px] overflow-hidden rounded-[20px] bg-white md:min-w-0">
								{/* Old side */}
								<div className="min-w-0 flex-1 shadow-[inset_-1px_0px_0px_rgba(0,0,0,0.08)]">
									<div className="bg-zinc-50 px-3 py-2 text-sm font-medium text-red-700 shadow-[inset_0px_-1px_0px_rgba(0,0,0,0.08)]">
										Original
									</div>
									<div
										ref={leftScrollRef}
										onScroll={handleLeftScroll}
										className="hljs max-h-[60vh] overflow-auto font-mono text-sm">
										{highlightedLines.map((line, idx) => {
											if (line.type === 'added') return null;
											return (
												<div key={idx} style={diffRowStyle} className={`flex ${line.type === 'removed' ? 'bg-red-100' : ''}`}>
													<span className="w-12 flex-shrink-0 select-none bg-zinc-50 px-2 py-0.5 text-right text-zinc-400 shadow-[inset_-1px_0px_0px_rgba(0,0,0,0.08)]">
														{line.oldLineNum || ''}
													</span>
													<span className="w-6 px-1 py-0.5 text-center text-zinc-400 select-none flex-shrink-0">
														{line.type === 'removed' ? '-' : ''}
													</span>
													<pre
														className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all min-w-0"
														dangerouslySetInnerHTML={{ __html: line.highlightedContent || '&nbsp;' }}
													/>
												</div>
											);
										})}
									</div>
								</div>
								{/* New side */}
								<div className="min-w-0 flex-1">
									<div className="bg-zinc-50 px-3 py-2 text-sm font-medium text-green-700 shadow-[inset_0px_-1px_0px_rgba(0,0,0,0.08)]">
										Modified
									</div>
									<div
										ref={rightScrollRef}
										onScroll={handleRightScroll}
										className="hljs max-h-[60vh] overflow-auto font-mono text-sm">
										{highlightedLines.map((line, idx) => {
											if (line.type === 'removed') return null;
											return (
												<div key={idx} style={diffRowStyle} className={`flex ${line.type === 'added' ? 'bg-green-100' : ''}`}>
													<span className="w-12 flex-shrink-0 select-none bg-zinc-50 px-2 py-0.5 text-right text-zinc-400 shadow-[inset_-1px_0px_0px_rgba(0,0,0,0.08)]">
														{line.newLineNum || ''}
													</span>
													<span className="w-6 px-1 py-0.5 text-center text-zinc-400 select-none flex-shrink-0">
														{line.type === 'added' ? '+' : ''}
													</span>
													<pre
														className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all min-w-0"
														dangerouslySetInnerHTML={{ __html: line.highlightedContent || '&nbsp;' }}
													/>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						) : (
							<div ref={unifiedScrollRef} className="hljs max-h-[70vh] overflow-auto rounded-[20px] bg-white font-mono text-sm">
								{highlightedLines.map((line, idx) => (
									<div
										key={idx}
										style={diffRowStyle}
										className={`flex ${line.type === 'added' ? 'bg-green-100' : line.type === 'removed' ? 'bg-red-100' : ''}`}>
										<span className="w-12 flex-shrink-0 select-none bg-zinc-50 px-2 py-0.5 text-right text-zinc-400 shadow-[inset_-1px_0px_0px_rgba(0,0,0,0.08)]">
											{line.oldLineNum || ''}
										</span>
										<span className="w-12 flex-shrink-0 select-none bg-zinc-50 px-2 py-0.5 text-right text-zinc-400 shadow-[inset_-1px_0px_0px_rgba(0,0,0,0.08)]">
											{line.newLineNum || ''}
										</span>
										<span
											className={`w-6 px-1 py-0.5 text-center select-none flex-shrink-0 ${
												line.type === 'added'
													? 'text-green-600 bg-green-200'
													: line.type === 'removed'
														? 'text-red-600 bg-red-200'
														: 'text-zinc-400'
											}`}>
											{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
										</span>
										<pre
											className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all min-w-0"
											dangerouslySetInnerHTML={{ __html: line.highlightedContent || '&nbsp;' }}
										/>
									</div>
								))}
							</div>
						)}
					</div>
					{/* Minimap - hidden on mobile */}
					<div className="hidden md:block">
						<Minimap
							diffResult={diffResult}
							viewMode={viewMode}
							scrollContainerRef={viewMode === 'split' ? leftScrollRef : unifiedScrollRef}
							secondScrollContainerRef={viewMode === 'split' ? rightScrollRef : undefined}
							headerHeight={viewMode === 'split' ? 29 : 0}
						/>
					</div>
				</div>
			)}

			{/* Empty state */}
			{showDiff && diffResult.length === 0 && (
				<div className="rounded-[28px] bg-white p-2 text-center text-zinc-500 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="rounded-[20px] bg-zinc-50 px-6 py-8">No differences found. The texts are identical.</div>
				</div>
			)}
		</div>
	);
}
