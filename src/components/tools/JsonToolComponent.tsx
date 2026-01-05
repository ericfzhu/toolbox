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
		<div className="flex flex-col gap-4 w-full">
			{/* Controls */}
			<div className="flex flex-wrap gap-2 items-center">
				<button
					onClick={handleFormat}
					disabled={!parseResult.valid || !input.trim()}
					className="bg-zinc-700 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-3 sm:px-4 py-2 rounded-sm transition-colors flex items-center gap-2 text-sm sm:text-base">
					Format
					<span className="text-xs text-zinc-400 hidden sm:inline">⌘⇧F</span>
				</button>
				<button
					onClick={handleMinify}
					disabled={!parseResult.valid || !input.trim()}
					className="bg-zinc-200 hover:bg-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 px-3 sm:px-4 py-2 rounded-sm transition-colors flex items-center gap-2 text-sm sm:text-base">
					Minify
					<span className="text-xs text-zinc-400 hidden sm:inline">⌘⇧M</span>
				</button>
				<button
					onClick={handleCopy}
					disabled={!parseResult.valid || !input.trim()}
					className="bg-zinc-200 hover:bg-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 px-3 sm:px-4 py-2 rounded-sm transition-colors flex items-center gap-2 text-sm sm:text-base">
					{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
					{copied ? 'Copied!' : 'Copy'}
				</button>
				<button onClick={handleClear} className="bg-zinc-200 hover:bg-zinc-300 px-3 sm:px-4 py-2 rounded-sm transition-colors text-sm sm:text-base">
					Clear
				</button>
				<button onClick={handleSample} className="bg-zinc-200 hover:bg-zinc-300 px-3 sm:px-4 py-2 rounded-sm transition-colors text-sm sm:text-base">
					Sample
				</button>

				<div className="hidden sm:block flex-1" />

				{/* Indent size */}
				<div className="flex items-center gap-2">
					<label className="text-sm text-zinc-600 hidden sm:inline">Indent:</label>
					<div className="border border-zinc-300 rounded-sm pr-2">
						<select
							value={indentSize}
							onChange={(e) => setIndentSize(Number(e.target.value))}
							className="pl-2 sm:pl-4 pr-2 h-10 bg-transparent border-none outline-none cursor-pointer text-sm sm:text-base">
							<option value={2}>2 spaces</option>
							<option value={4}>4 spaces</option>
							<option value={1}>1 tab</option>
						</select>
					</div>
				</div>

				{/* View mode */}
				<div className="flex border border-zinc-300 rounded-sm overflow-hidden">
					<button
						onClick={() => setViewMode('formatted')}
						className={`px-2 sm:px-4 py-2 text-sm sm:text-base ${viewMode === 'formatted' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
						<span className="hidden sm:inline">Formatted</span>
						<span className="sm:hidden">Fmt</span>
					</button>
					<button
						onClick={() => setViewMode('tree')}
						className={`px-2 sm:px-4 py-2 text-sm sm:text-base ${viewMode === 'tree' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
						Tree
					</button>
					<button
						onClick={() => setViewMode('minified')}
						className={`px-2 sm:px-4 py-2 text-sm sm:text-base ${viewMode === 'minified' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
						<span className="hidden sm:inline">Minified</span>
						<span className="sm:hidden">Min</span>
					</button>
				</div>
			</div>

			{/* Status bar */}
			{input.trim() && (
				<div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
					{parseResult.valid ? (
						<>
							<span className="text-green-600 flex items-center gap-1">
								<IconCheck size={14} /> Valid JSON
							</span>
							{stats && (
								<span className="text-zinc-500 hidden sm:inline">
									{stats.objects} objects, {stats.arrays} arrays, {stats.strings} strings, {stats.numbers} numbers
								</span>
							)}
							<span className="text-zinc-400">{formattedJson.length} / {minifiedJson.length} chars</span>
						</>
					) : (
						<span className="text-red-600">Invalid JSON: {parseResult.error}</span>
					)}
				</div>
			)}

			{/* Main content */}
			<div className="flex flex-col md:flex-row gap-4 flex-1">
				{/* Input */}
				<div className="flex-1 flex flex-col gap-2">
					<label className="text-sm font-medium text-zinc-700">Input</label>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Paste your JSON here..."
						spellCheck={false}
						className={`w-full h-[40vh] md:h-[60vh] p-3 border rounded-sm font-mono text-sm resize-none focus:outline-none focus:ring-2 ${
							input.trim() && !parseResult.valid
								? 'border-red-300 focus:ring-red-300 bg-red-50'
								: 'border-zinc-300 focus:ring-zinc-400'
						}`}
					/>
				</div>

				{/* Output */}
				<div className="flex-1 flex flex-col gap-2">
					<label className="text-sm font-medium text-zinc-700">
						Output ({viewMode === 'tree' ? 'Tree View' : viewMode === 'minified' ? 'Minified' : 'Formatted'})
					</label>
					{viewMode === 'tree' ? (
						<div className="w-full h-[40vh] md:h-[60vh] p-3 border border-zinc-300 rounded-sm font-mono text-sm overflow-auto bg-white">
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
							className="w-full h-[40vh] md:h-[60vh] p-3 border border-zinc-300 rounded-sm font-mono text-sm resize-none bg-zinc-50 focus:outline-none"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
