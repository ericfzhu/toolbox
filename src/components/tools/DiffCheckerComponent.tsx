'use client';

import { IconCopy } from '@tabler/icons-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import markdown from 'highlight.js/lib/languages/markdown';
import json from 'highlight.js/lib/languages/json';
import java from 'highlight.js/lib/languages/java';

import { useClipboard } from '@/hooks';

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
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
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
	const lineData = viewMode === 'unified'
		? diffResult
		: diffResult.filter(line => line.type !== 'added'); // For split view, use original side

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
	const handleMinimapInteraction = useCallback((clientY: number) => {
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
	}, [scrollContainerRef, secondScrollContainerRef]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		setIsDragging(true);
		handleMinimapInteraction(e.clientY);
	}, [handleMinimapInteraction]);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (isDragging) {
			handleMinimapInteraction(e.clientY);
		}
	}, [isDragging, handleMinimapInteraction]);

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
	const leftLines = diffResult.filter(line => line.type !== 'added'); // removed + unchanged
	const rightLines = diffResult.filter(line => line.type !== 'removed'); // added + unchanged

	const leftLineHeightPercent = leftLines.length > 0 ? 100 / leftLines.length : 100;
	const rightLineHeightPercent = rightLines.length > 0 ? 100 / rightLines.length : 100;

	return (
		<div
			ref={minimapRef}
			className="w-20 bg-zinc-100 border-l border-zinc-300 relative cursor-pointer select-none flex-shrink-0 flex flex-col"
			onMouseDown={handleMouseDown}
		>
			{/* Header spacer to align with content area */}
			{headerHeight > 0 && (
				<div
					className="flex-shrink-0 border-b border-zinc-300 bg-zinc-100"
					style={{ height: `${headerHeight}px` }}
				/>
			)}

			{/* Diff lines preview - two columns */}
			<div ref={minimapContentRef} className="relative flex-1 overflow-hidden flex">
				{/* Left column - deletions (original side) */}
				<div className="flex-1 relative">
					{leftLines.map((line, idx) => (
						<div
							key={idx}
							className={`absolute left-0 right-0 ${
								line.type === 'removed'
									? 'bg-red-400'
									: 'bg-zinc-200'
							}`}
							style={{
								top: `${idx * leftLineHeightPercent}%`,
								height: `${Math.max(leftLineHeightPercent, 0.5)}%`,
								opacity: line.type === 'unchanged' ? 0.3 : 0.8,
							}}
						/>
					))}
				</div>

				{/* Divider */}
				<div className="w-px bg-zinc-300" />

				{/* Right column - additions (modified side) */}
				<div className="flex-1 relative">
					{rightLines.map((line, idx) => (
						<div
							key={idx}
							className={`absolute left-0 right-0 ${
								line.type === 'added'
									? 'bg-green-400'
									: 'bg-zinc-200'
							}`}
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
					className="absolute left-0 right-0 bg-zinc-500/20 border-y border-zinc-400 pointer-events-none"
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
		return diffResult.map(line => ({
			...line,
			highlightedContent: highlightCode(line.content, effectiveLanguage),
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
		<div className="flex flex-col gap-4 w-full">
			<style dangerouslySetInnerHTML={{ __html: highlightStyles }} />
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
						<select
							value={language}
							onChange={(e) => setLanguage(e.target.value as Language)}
							className="bg-zinc-200 hover:bg-zinc-300 px-4 h-10 rounded-sm transition-colors border-none cursor-pointer"
						>
							{LANGUAGES.map((lang) => (
								<option key={lang.value} value={lang.value}>
									{lang.label}
									{language === 'auto' && lang.value === 'auto' && effectiveLanguage !== 'plaintext'
										? ` (${effectiveLanguage})`
										: ''}
								</option>
							))}
						</select>
						<div className="flex-1" />
						<div className="flex border border-zinc-300 rounded-sm overflow-hidden">
							<button
								onClick={() => setViewMode('split')}
								className={`px-4 py-2 ${viewMode === 'split' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
								Split
							</button>
							<button
								onClick={() => setViewMode('unified')}
								className={`px-4 py-2 ${viewMode === 'unified' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
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
				<div className="border border-zinc-300 rounded-sm overflow-hidden flex">
					<div className="flex-1 min-w-0">
						{viewMode === 'split' ? (
							<div className="flex">
								{/* Old side */}
								<div className="flex-1 border-r border-zinc-300 min-w-0">
									<div className="bg-zinc-100 px-3 py-1 text-sm font-medium border-b border-zinc-300 text-red-700">Original</div>
									<div
										ref={leftScrollRef}
										onScroll={handleLeftScroll}
										className="font-mono text-sm overflow-auto max-h-[60vh] hljs"
									>
										{highlightedLines.map((line, idx) => {
											if (line.type === 'added') return null;
											return (
												<div
													key={idx}
													className={`flex ${
														line.type === 'removed' ? 'bg-red-100' : ''
													}`}>
													<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none flex-shrink-0">
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
								<div className="flex-1 min-w-0">
									<div className="bg-zinc-100 px-3 py-1 text-sm font-medium border-b border-zinc-300 text-green-700">Modified</div>
									<div
										ref={rightScrollRef}
										onScroll={handleRightScroll}
										className="font-mono text-sm overflow-auto max-h-[60vh] hljs"
									>
										{highlightedLines.map((line, idx) => {
											if (line.type === 'removed') return null;
											return (
												<div
													key={idx}
													className={`flex ${
														line.type === 'added' ? 'bg-green-100' : ''
													}`}>
													<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none flex-shrink-0">
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
							<div
								ref={unifiedScrollRef}
								className="font-mono text-sm overflow-auto max-h-[70vh] hljs"
							>
								{highlightedLines.map((line, idx) => (
									<div
										key={idx}
										className={`flex ${
											line.type === 'added'
												? 'bg-green-100'
												: line.type === 'removed'
													? 'bg-red-100'
													: ''
										}`}>
										<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none flex-shrink-0">
											{line.oldLineNum || ''}
										</span>
										<span className="w-12 px-2 py-0.5 text-right text-zinc-400 bg-zinc-50 border-r border-zinc-200 select-none flex-shrink-0">
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
					{/* Minimap */}
					<Minimap
						diffResult={diffResult}
						viewMode={viewMode}
						scrollContainerRef={viewMode === 'split' ? leftScrollRef : unifiedScrollRef}
						secondScrollContainerRef={viewMode === 'split' ? rightScrollRef : undefined}
						headerHeight={viewMode === 'split' ? 29 : 0}
					/>
				</div>
			)}

			{/* Empty state */}
			{showDiff && diffResult.length === 0 && (
				<div className="border border-zinc-300 rounded-sm p-8 text-center text-zinc-500">No differences found. The texts are identical.</div>
			)}
		</div>
	);
}
