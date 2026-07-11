'use client';

import { useClipboard, useKeyboardShortcuts } from '@/hooks';
import { IconCheck, IconChevronDown, IconChevronRight, IconCopy } from '@tabler/icons-react';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';

type ViewMode = 'tree' | 'formatted' | 'minified';
type Indentation = 2 | 4 | '\t';

const MAX_TREE_DEPTH = 80;
const MAX_TREE_CHILDREN = 500;
const MAX_STATS_NODES = 100000;

interface ParseResult {
	valid: boolean;
	data: unknown;
	error: string | null;
	empty: boolean;
}

interface JsonStats {
	objects: number;
	arrays: number;
	strings: number;
	numbers: number;
	booleans: number;
	nulls: number;
	totalNodes: number;
	maxDepth: number;
	truncated: boolean;
}

interface JsonNodeProps {
	data: unknown;
	name?: string;
	depth?: number;
	isLast?: boolean;
}

function getEntryCount(data: unknown): number {
	if (Array.isArray(data)) return data.length;
	if (data !== null && typeof data === 'object') return Object.keys(data).length;
	return 0;
}

function getPreviewEntries(data: unknown, maxChildren: number): [string, unknown][] {
	if (Array.isArray(data)) {
		const count = Math.min(data.length, maxChildren);
		const entries: [string, unknown][] = [];

		for (let i = 0; i < count; i++) {
			entries.push([String(i), data[i]]);
		}

		return entries;
	}

	if (data !== null && typeof data === 'object') {
		const keys = Object.keys(data);
		const source = data as Record<string, unknown>;
		const count = Math.min(keys.length, maxChildren);
		const entries: [string, unknown][] = [];

		for (let i = 0; i < count; i++) {
			const key = keys[i];
			entries.push([key, source[key]]);
		}

		return entries;
	}

	return [];
}

function stringifyJson(data: unknown, spacing?: number | string): string {
	try {
		return JSON.stringify(data, null, spacing);
	} catch {
		return '';
	}
}

function getJsonStats(root: unknown): JsonStats {
	const result: JsonStats = {
		objects: 0,
		arrays: 0,
		strings: 0,
		numbers: 0,
		booleans: 0,
		nulls: 0,
		totalNodes: 0,
		maxDepth: 0,
		truncated: false,
	};
	const stack: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) break;

		const { value, depth } = current;
		result.totalNodes++;
		result.maxDepth = Math.max(result.maxDepth, depth);

		if (result.totalNodes >= MAX_STATS_NODES) {
			result.truncated = result.truncated || stack.length > 0;
			break;
		}

		if (value === null) {
			result.nulls++;
		} else if (Array.isArray(value)) {
			result.arrays++;
			for (let i = value.length - 1; i >= 0 && result.totalNodes + stack.length < MAX_STATS_NODES; i--) {
				stack.push({ value: value[i], depth: depth + 1 });
			}
			if (value.length > 0 && result.totalNodes + stack.length >= MAX_STATS_NODES) {
				result.truncated = true;
			}
		} else if (typeof value === 'object') {
			result.objects++;
			const source = value as Record<string, unknown>;
			const keys = Object.keys(source);

			for (let i = keys.length - 1; i >= 0 && result.totalNodes + stack.length < MAX_STATS_NODES; i--) {
				stack.push({ value: source[keys[i]], depth: depth + 1 });
			}
			if (keys.length > 0 && result.totalNodes + stack.length >= MAX_STATS_NODES) {
				result.truncated = true;
			}
		} else if (typeof value === 'string') {
			result.strings++;
		} else if (typeof value === 'number') {
			result.numbers++;
		} else if (typeof value === 'boolean') {
			result.booleans++;
		}
	}

	return result;
}

function JsonNode({ data, name, depth = 0, isLast = true }: JsonNodeProps) {
	const [isExpanded, setIsExpanded] = useState(depth < 2);

	const isObject = data !== null && typeof data === 'object';
	const isArray = Array.isArray(data);
	const entryCount = isObject ? getEntryCount(data) : 0;
	const isEmpty = isObject && entryCount === 0;
	const isDepthLimited = isObject && depth >= MAX_TREE_DEPTH;
	const visibleEntries = isObject && !isDepthLimited ? getPreviewEntries(data, MAX_TREE_CHILDREN) : [];
	const hiddenCount = Math.max(0, entryCount - visibleEntries.length);

	const toggleExpand = useCallback(() => {
		setIsExpanded((prev) => !prev);
	}, []);

	const renderValue = () => {
		if (data === null) return <span className="text-zinc-400">null</span>;
		if (typeof data === 'boolean') return <span className="text-purple-600">{data.toString()}</span>;
		if (typeof data === 'number') return <span className="text-blue-600">{data}</span>;
		if (typeof data === 'string') return <span className="text-green-600">&quot;{data}&quot;</span>;
		return null;
	};

	const comma = !isLast ? ',' : '';

	if (!isObject) {
		return (
			<div className="flex" style={{ paddingLeft: depth * 16 }}>
				{name !== undefined && (
					<>
						<span className="text-red-600">&quot;{name}&quot;</span>
						<span className="text-zinc-600">: </span>
					</>
				)}
				{renderValue()}
				<span className="text-zinc-600">{comma}</span>
			</div>
		);
	}

	const bracketOpen = isArray ? '[' : '{';
	const bracketClose = isArray ? ']' : '}';

	if (isEmpty) {
		return (
			<div className="flex" style={{ paddingLeft: depth * 16 }}>
				{name !== undefined && (
					<>
						<span className="text-red-600">&quot;{name}&quot;</span>
						<span className="text-zinc-600">: </span>
					</>
				)}
				<span className="text-zinc-600">
					{bracketOpen}
					{bracketClose}
					{comma}
				</span>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center cursor-pointer hover:bg-zinc-100 rounded" style={{ paddingLeft: depth * 16 }} onClick={toggleExpand}>
				<span className="w-4 h-4 flex items-center justify-center text-zinc-400">
					{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
				</span>
				{name !== undefined && (
					<>
						<span className="text-red-600">&quot;{name}&quot;</span>
						<span className="text-zinc-600">: </span>
					</>
				)}
				<span className="text-zinc-600">{bracketOpen}</span>
				{!isExpanded && (
					<span className="text-zinc-400 ml-1">
						{entryCount} {entryCount === 1 ? 'item' : 'items'}
					</span>
				)}
				{!isExpanded && (
					<span className="text-zinc-600">
						{bracketClose}
						{comma}
					</span>
				)}
			</div>
			{isExpanded && (
				<>
					{isDepthLimited ? (
						<div className="text-zinc-400" style={{ paddingLeft: depth * 16 + 16 }}>
							Depth limit reached
						</div>
					) : (
						visibleEntries.map(([key, value], index) => (
							<JsonNode
								key={key}
								data={value}
								name={isArray ? undefined : key}
								depth={depth + 1}
								isLast={hiddenCount === 0 && index === visibleEntries.length - 1}
							/>
						))
					)}
					{hiddenCount > 0 && (
						<div className="text-zinc-400" style={{ paddingLeft: depth * 16 + 16 }}>
							... {hiddenCount} more {hiddenCount === 1 ? 'item' : 'items'}
						</div>
					)}
					<div style={{ paddingLeft: depth * 16 + 16 }}>
						<span className="text-zinc-600">
							{bracketClose}
							{comma}
						</span>
					</div>
				</>
			)}
		</div>
	);
}

export default function JsonToolComponent() {
	const [input, setInput] = useState('');
	const [indentation, setIndentation] = useState<Indentation>(2);
	const [viewMode, setViewMode] = useState<ViewMode>('formatted');
	const deferredInput = useDeferredValue(input);
	const isInputPending = input !== deferredInput;

	const { copied, copy } = useClipboard();

	const parseResult = useMemo<ParseResult>(() => {
		if (!deferredInput.trim()) {
			return { valid: true, data: null, error: null, empty: true };
		}
		try {
			const data = JSON.parse(deferredInput);
			return { valid: true, data, error: null, empty: false };
		} catch (e) {
			return { valid: false, data: null, error: (e as Error).message, empty: false };
		}
	}, [deferredInput]);

	const formattedJson = useMemo(() => {
		if (!parseResult.valid || parseResult.empty) return '';
		return stringifyJson(parseResult.data, indentation);
	}, [parseResult, indentation]);

	const minifiedJson = useMemo(() => {
		if (!parseResult.valid || parseResult.empty) return '';
		return stringifyJson(parseResult.data);
	}, [parseResult]);

	const handleFormat = useCallback(() => {
		if (!isInputPending && parseResult.valid && !parseResult.empty) {
			setInput(formattedJson);
		}
	}, [isInputPending, parseResult.valid, parseResult.empty, formattedJson]);

	const handleMinify = useCallback(() => {
		if (!isInputPending && parseResult.valid && !parseResult.empty) {
			setInput(minifiedJson);
		}
	}, [isInputPending, parseResult.valid, parseResult.empty, minifiedJson]);

	const handleCopy = useCallback(() => {
		if (viewMode === 'minified') {
			copy(minifiedJson);
		} else {
			copy(formattedJson);
		}
	}, [viewMode, minifiedJson, formattedJson, copy]);

	const handleClear = useCallback(() => {
		setInput('');
	}, []);

	// Keyboard shortcuts
	useKeyboardShortcuts([
		{ key: 'f', modifiers: ['ctrl', 'shift'], callback: handleFormat, disabled: isInputPending || !parseResult.valid },
		{ key: 'm', modifiers: ['ctrl', 'shift'], callback: handleMinify, disabled: isInputPending || !parseResult.valid },
	]);

	function handleSample() {
		const sample = {
			name: 'John Doe',
			age: 30,
			email: 'john@example.com',
			isActive: true,
			address: {
				street: '123 Main St',
				city: 'New York',
				country: 'USA',
			},
			hobbies: ['reading', 'coding', 'gaming'],
			metadata: null,
		};
		setInput(JSON.stringify(sample, null, 2));
	}

	// Calculate stats
	const stats = useMemo(() => {
		if (!parseResult.valid || parseResult.empty) return null;
		return getJsonStats(parseResult.data);
	}, [parseResult]);

	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-wrap items-center gap-2 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<button
					onClick={handleFormat}
					disabled={isInputPending || !parseResult.valid || !input.trim()}
					className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow,color] duration-200 ease-out hover:bg-zinc-800 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none sm:px-4">
					Format
					<span className="hidden text-xs text-zinc-400 sm:inline">⌘⇧F</span>
				</button>
				<button
					onClick={handleMinify}
					disabled={isInputPending || !parseResult.valid || !input.trim()}
					className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:text-zinc-400 sm:px-4">
					Minify
					<span className="hidden text-xs text-zinc-400 sm:inline">⌘⇧M</span>
				</button>
				<button
					onClick={handleCopy}
					disabled={isInputPending || !parseResult.valid || !input.trim()}
					className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:text-zinc-400 sm:px-4">
					{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
					{copied ? 'Copied!' : 'Copy'}
				</button>
				<button
					onClick={handleClear}
					className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
					Clear
				</button>
				<button
					onClick={handleSample}
					className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
					Sample
				</button>

				<div className="hidden flex-1 sm:block" />

				<div className="flex items-center gap-2">
					<label className="hidden text-sm text-zinc-600 sm:inline">Indent:</label>
					<div className="rounded-2xl bg-zinc-50 pr-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
						<select
							value={indentation === '\t' ? 'tab' : indentation}
							onChange={(e) => setIndentation(e.target.value === 'tab' ? '\t' : (Number(e.target.value) as 2 | 4))}
							className="h-11 cursor-pointer border-none bg-transparent pl-3 pr-8 text-sm outline-none sm:pl-4">
							<option value={2}>2 spaces</option>
							<option value={4}>4 spaces</option>
							<option value="tab">1 tab</option>
						</select>
					</div>
				</div>

				<div className="flex rounded-2xl bg-zinc-50 p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
					<button
						onClick={() => setViewMode('formatted')}
						className={`min-h-9 rounded-xl px-2 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-4 ${viewMode === 'formatted' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
						<span className="hidden sm:inline">Formatted</span>
						<span className="sm:hidden">Fmt</span>
					</button>
					<button
						onClick={() => setViewMode('tree')}
						className={`min-h-9 rounded-xl px-2 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-4 ${viewMode === 'tree' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
						Tree
					</button>
					<button
						onClick={() => setViewMode('minified')}
						className={`min-h-9 rounded-xl px-2 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-4 ${viewMode === 'minified' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
						<span className="hidden sm:inline">Minified</span>
						<span className="sm:hidden">Min</span>
					</button>
				</div>
			</div>

			{input.trim() && (
				<div className="flex flex-wrap items-center gap-2 rounded-[20px] bg-zinc-50 px-4 py-3 text-xs shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.06)] sm:gap-4 sm:text-sm">
					{isInputPending ? (
						<span className="text-zinc-500">Parsing JSON...</span>
					) : parseResult.valid ? (
						<>
							<span className="flex items-center gap-1 text-green-600">
								<IconCheck size={14} /> Valid JSON
							</span>
							{stats && (
								<span className="hidden text-zinc-500 sm:inline">
									{stats.objects} objects, {stats.arrays} arrays, {stats.strings} strings, {stats.numbers} numbers
									{stats.truncated ? ', stats limited' : ''}
								</span>
							)}
							<span className="tabular-nums text-zinc-400">
								{formattedJson.length} / {minifiedJson.length} chars
							</span>
						</>
					) : (
						<span className="text-red-600">Invalid JSON: {parseResult.error}</span>
					)}
				</div>
			)}

			<div className="flex flex-1 flex-col gap-6 md:flex-row md:gap-8">
				<div className="flex-1">
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-[20px] bg-zinc-50 p-4">
							<label className="mb-2 block text-sm font-medium text-zinc-700">Input</label>
							<textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="Paste your JSON here..."
								spellCheck={false}
								className={`h-[40vh] w-full resize-none rounded-[20px] p-3 font-mono text-sm text-zinc-700 transition-[box-shadow] duration-200 ease-out focus:outline-none md:h-[60vh] ${
									input.trim() && !isInputPending && !parseResult.valid
										? 'bg-red-50 shadow-[0px_0px_0px_1px_rgba(248,113,113,0.45),0px_0px_0px_4px_rgba(254,226,226,0.8)]'
										: 'bg-white shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]'
								}`}
							/>
						</div>
					</div>
				</div>

				<div className="flex-1">
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-[20px] bg-zinc-50 p-4">
							<label className="mb-2 block text-sm font-medium text-zinc-700">
								Output ({viewMode === 'tree' ? 'Tree View' : viewMode === 'minified' ? 'Minified' : 'Formatted'})
							</label>
							{viewMode === 'tree' ? (
								<div className="h-[40vh] w-full overflow-auto rounded-[20px] bg-white p-3 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] md:h-[60vh]">
									{isInputPending ? (
										<span className="text-zinc-400">Parsing JSON...</span>
									) : parseResult.valid && !parseResult.empty ? (
										<JsonNode data={parseResult.data} />
									) : (
										<span className="text-zinc-400">Enter valid JSON to see tree view</span>
									)}
								</div>
							) : (
								<textarea
									value={viewMode === 'minified' ? minifiedJson : formattedJson}
									readOnly
									placeholder="Output will appear here..."
									spellCheck={false}
									className="h-[40vh] w-full resize-none rounded-[20px] bg-white p-3 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] focus:outline-none md:h-[60vh]"
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
