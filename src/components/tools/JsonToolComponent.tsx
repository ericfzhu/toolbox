'use client';

import { IconChevronDown, IconChevronRight, IconCopy, IconCheck } from '@tabler/icons-react';
import { useState, useMemo, useCallback } from 'react';

import { useClipboard, useKeyboardShortcuts } from '@/hooks';

type ViewMode = 'tree' | 'formatted' | 'minified';

interface JsonNodeProps {
	data: unknown;
	name?: string;
	depth?: number;
	isLast?: boolean;
}

function JsonNode({ data, name, depth = 0, isLast = true }: JsonNodeProps) {
	const [isExpanded, setIsExpanded] = useState(depth < 2);

	const isObject = data !== null && typeof data === 'object';
	const isArray = Array.isArray(data);
	const isEmpty = isObject && Object.keys(data as object).length === 0;

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

	const entries = Object.entries(data as object);
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
			<div
				className="flex items-center cursor-pointer hover:bg-zinc-100 rounded"
				style={{ paddingLeft: depth * 16 }}
				onClick={toggleExpand}>
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
						{entries.length} {entries.length === 1 ? 'item' : 'items'}
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
					{entries.map(([key, value], index) => (
						<JsonNode
							key={key}
							data={value}
							name={isArray ? undefined : key}
							depth={depth + 1}
							isLast={index === entries.length - 1}
						/>
					))}
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
	const [indentSize, setIndentSize] = useState(2);
	const [viewMode, setViewMode] = useState<ViewMode>('formatted');

	const { copied, copy } = useClipboard();

	const parseResult = useMemo(() => {
		if (!input.trim()) {
			return { valid: true, data: null, error: null };
		}
		try {
			const data = JSON.parse(input);
			return { valid: true, data, error: null };
		} catch (e) {
			return { valid: false, data: null, error: (e as Error).message };
		}
	}, [input]);

	const formattedJson = useMemo(() => {
		if (!parseResult.valid || parseResult.data === null) return '';
		return JSON.stringify(parseResult.data, null, indentSize);
	}, [parseResult, indentSize]);

	const minifiedJson = useMemo(() => {
		if (!parseResult.valid || parseResult.data === null) return '';
		return JSON.stringify(parseResult.data);
	}, [parseResult]);

	const handleFormat = useCallback(() => {
		if (parseResult.valid && parseResult.data !== null) {
			setInput(formattedJson);
		}
	}, [parseResult.valid, parseResult.data, formattedJson]);

	const handleMinify = useCallback(() => {
		if (parseResult.valid && parseResult.data !== null) {
			setInput(minifiedJson);
		}
	}, [parseResult.valid, parseResult.data, minifiedJson]);

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
		{ key: 'f', modifiers: ['ctrl', 'shift'], callback: handleFormat, disabled: !parseResult.valid },
		{ key: 'm', modifiers: ['ctrl', 'shift'], callback: handleMinify, disabled: !parseResult.valid },
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
		if (!parseResult.valid || parseResult.data === null) return null;

		const countItems = (obj: unknown): { objects: number; arrays: number; strings: number; numbers: number; booleans: number; nulls: number } => {
			const result = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0 };

			const traverse = (value: unknown) => {
				if (value === null) {
					result.nulls++;
				} else if (Array.isArray(value)) {
					result.arrays++;
					value.forEach(traverse);
				} else if (typeof value === 'object') {
					result.objects++;
					Object.values(value as object).forEach(traverse);
				} else if (typeof value === 'string') {
					result.strings++;
				} else if (typeof value === 'number') {
					result.numbers++;
				} else if (typeof value === 'boolean') {
					result.booleans++;
				}
			};

			traverse(obj);
			return result;
		};

		return countItems(parseResult.data);
	}, [parseResult]);

	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-wrap items-center gap-2 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<button
					onClick={handleFormat}
					disabled={!parseResult.valid || !input.trim()}
					className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow,color] duration-200 ease-out hover:bg-zinc-800 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none sm:px-4">
					Format
					<span className="hidden text-xs text-zinc-400 sm:inline">⌘⇧F</span>
				</button>
				<button
					onClick={handleMinify}
					disabled={!parseResult.valid || !input.trim()}
					className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:text-zinc-400 sm:px-4">
					Minify
					<span className="hidden text-xs text-zinc-400 sm:inline">⌘⇧M</span>
				</button>
				<button
					onClick={handleCopy}
					disabled={!parseResult.valid || !input.trim()}
					className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:text-zinc-400 sm:px-4">
					{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
					{copied ? 'Copied!' : 'Copy'}
				</button>
				<button onClick={handleClear} className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
					Clear
				</button>
				<button onClick={handleSample} className="inline-flex min-h-11 items-center rounded-2xl bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
					Sample
				</button>

				<div className="hidden flex-1 sm:block" />

				<div className="flex items-center gap-2">
					<label className="hidden text-sm text-zinc-600 sm:inline">Indent:</label>
					<div className="rounded-2xl bg-zinc-50 pr-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
						<select
							value={indentSize}
							onChange={(e) => setIndentSize(Number(e.target.value))}
							className="h-11 cursor-pointer border-none bg-transparent pl-3 pr-8 text-sm outline-none sm:pl-4">
							<option value={2}>2 spaces</option>
							<option value={4}>4 spaces</option>
							<option value={1}>1 tab</option>
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
					{parseResult.valid ? (
						<>
							<span className="flex items-center gap-1 text-green-600">
								<IconCheck size={14} /> Valid JSON
							</span>
							{stats && (
								<span className="hidden text-zinc-500 sm:inline">
									{stats.objects} objects, {stats.arrays} arrays, {stats.strings} strings, {stats.numbers} numbers
								</span>
							)}
							<span className="tabular-nums text-zinc-400">{formattedJson.length} / {minifiedJson.length} chars</span>
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
									input.trim() && !parseResult.valid
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
									{parseResult.valid && parseResult.data !== null ? (
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
