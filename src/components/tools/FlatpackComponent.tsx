'use client';

import { useClipboard, useDownload } from '@/hooks';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

const CODE_FILE_EXTENSIONS = new Set([
	'js',
	'jsx',
	'ts',
	'tsx',
	'json',
	'py',
	'java',
	'c',
	'cpp',
	'h',
	'hpp',
	'html',
	'css',
	'scss',
	'less',
	'md',
	'txt',
	'sh',
	'bash',
	'zsh',
	'yml',
	'yaml',
	'xml',
	'go',
	'rs',
	'rb',
	'php',
	'kt',
	'swift',
	'vue',
	'svelte',
	'sql',
	'graphql',
	'proto',
	'toml',
	'ini',
	'dockerfile',
	'makefile',
]);

// Directories to skip - these typically contain generated/dependency code
const SKIP_DIRECTORIES = new Set([
	'node_modules',
	'.git',
	'.svn',
	'.hg',
	'dist',
	'build',
	'out',
	'.next',
	'.nuxt',
	'__pycache__',
	'.pytest_cache',
	'venv',
	'.venv',
	'env',
	'.env',
	'vendor',
	'target',
	'bin',
	'obj',
	'.idea',
	'.vscode',
	'coverage',
	'.nyc_output',
	'.cache',
	'.parcel-cache',
	'.turbo',
	'tmp',
	'temp',
	'logs',
]);

const SCAN_PROGRESS_INTERVAL = 50;
const READ_BATCH_SIZE = 100;
const MAX_FILE_COUNT = 5000;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_TOTAL_CHARACTERS = 20_000_000;

const SENSITIVE_FILE_NAMES = new Set(['.env', '.npmrc', '.pypirc', '.netrc', 'credentials.json', 'service-account.json', 'id_rsa', 'id_ed25519']);
const SENSITIVE_FILE_EXTENSIONS = new Set(['pem', 'key', 'p12', 'pfx', 'jks', 'keystore']);

function isSensitiveFile(fileName: string): boolean {
	const lowerName = fileName.toLowerCase();
	if (SENSITIVE_FILE_NAMES.has(lowerName) || lowerName.startsWith('.env.')) return true;

	const extension = lowerName.split('.').pop();
	return extension ? SENSITIVE_FILE_EXTENSIONS.has(extension) : false;
}

function isCodeFile(fileName: string): boolean {
	const lowerName = fileName.toLowerCase();
	if (isSensitiveFile(lowerName)) return false;
	// Handle special files without extensions
	if (lowerName === 'dockerfile' || lowerName === 'makefile') {
		return true;
	}
	const parts = fileName.split('.');
	if (parts.length < 2) return false;
	const extension = parts.pop()?.toLowerCase();
	return extension ? CODE_FILE_EXTENSIONS.has(extension) : false;
}

function shouldSkipDirectory(name: string): boolean {
	return SKIP_DIRECTORIES.has(name.toLowerCase()) || name.startsWith('.');
}

interface FileEntry {
	path: string;
	handle: FileSystemFileHandle;
}

interface CollectFileOptions {
	onProgress?: (scanned: number) => void;
	shouldAbort?: () => boolean;
}

interface ProcessFileOptions {
	batchSize?: number;
	onBatch?: (content: string, processed: number, total: number) => void;
	shouldAbort?: () => boolean;
}

interface ProcessResult {
	completed: boolean;
	limitReached: boolean;
	skippedLargeFiles: number;
}

function countNewlines(text: string): number {
	let count = 0;
	for (let i = 0; i < text.length; i += 1) {
		if (text.charCodeAt(i) === 10) count += 1;
	}
	return count;
}

// Collect all file handles first (fast), then read contents in parallel batches
async function collectFileHandles(
	dirHandle: FileSystemDirectoryHandle,
	path: string = '',
	files: FileEntry[] = [],
	options: CollectFileOptions = {},
): Promise<FileEntry[]> {
	if (options.shouldAbort?.()) return files;

	try {
		for await (const [name, handle] of (dirHandle as any).entries()) {
			if (options.shouldAbort?.() || files.length >= MAX_FILE_COUNT) break;

			const fullPath = path ? `${path}/${name}` : name;

			if (handle.kind === 'file') {
				if (isCodeFile(name)) {
					files.push({ path: fullPath, handle: handle as FileSystemFileHandle });
					options.onProgress?.(files.length);
				}
			} else if (handle.kind === 'directory' && !shouldSkipDirectory(name)) {
				await collectFileHandles(handle as FileSystemDirectoryHandle, fullPath, files, options);
			}
		}
	} catch (error) {
		console.error('Error scanning directory:', path, error);
	}
	return files;
}

// Process files in parallel batches for speed
async function processFilesInBatches(files: FileEntry[], options: ProcessFileOptions = {}): Promise<ProcessResult> {
	const batchSize = options.batchSize ?? READ_BATCH_SIZE;
	let processed = 0;
	let totalCharacters = 0;
	let skippedLargeFiles = 0;
	let limitReached = false;

	for (let i = 0; i < files.length; i += batchSize) {
		if (options.shouldAbort?.()) return { completed: false, limitReached, skippedLargeFiles };

		const batch = files.slice(i, i + batchSize);

		const batchResults = await Promise.all(
			batch.map(async ({ path, handle }) => {
				if (options.shouldAbort?.()) return { content: '', skippedLarge: false };

				try {
					const file = await handle.getFile();
					if (file.size > MAX_FILE_SIZE) return { content: '', skippedLarge: true };
					const text = await file.text();
					return { content: `// File: ${path}\n\n${text}\n\n`, skippedLarge: false };
				} catch (error) {
					console.error('Error reading file:', path, error);
					return { content: '', skippedLarge: false };
				}
			}),
		);

		if (options.shouldAbort?.()) return { completed: false, limitReached, skippedLargeFiles };

		let batchContent = '';
		for (const result of batchResults) {
			if (result.skippedLarge) skippedLargeFiles++;
			if (!result.content) continue;

			const remainingCharacters = MAX_TOTAL_CHARACTERS - totalCharacters;
			if (result.content.length > remainingCharacters) {
				batchContent += result.content.slice(0, Math.max(0, remainingCharacters));
				totalCharacters = MAX_TOTAL_CHARACTERS;
				limitReached = true;
				break;
			}

			batchContent += result.content;
			totalCharacters += result.content.length;
		}

		processed += batch.length;
		options.onBatch?.(batchContent, processed, files.length);
		if (limitReached) break;
	}

	return { completed: true, limitReached, skippedLargeFiles };
}

interface ProcessingStatus {
	phase: 'scanning' | 'reading' | 'done';
	scannedFiles: number;
	processedFiles: number;
	totalFiles: number;
}

export default function CodeAggregatorComponent() {
	const [isProcessing, setIsProcessing] = useState(false);
	const [status, setStatus] = useState<ProcessingStatus | null>(null);
	const [aggregatedContent, setAggregatedContent] = useState('');
	const [resultStats, setResultStats] = useState({ charCount: 0, newlineCount: 0 });
	const abortRef = useRef(false);

	const { copy } = useClipboard();
	const { downloadText } = useDownload();

	const handleFolderSelect = useCallback(async () => {
		if (!(window as any).showDirectoryPicker) {
			alert('Your browser does not support the File System Access API. Please use a compatible browser like Chrome or Edge.');
			return;
		}

		abortRef.current = false;

		try {
			const directoryHandle = await (window as any).showDirectoryPicker();
			setIsProcessing(true);
			setAggregatedContent('');
			setResultStats({ charCount: 0, newlineCount: 0 });
			setStatus({ phase: 'scanning', scannedFiles: 0, processedFiles: 0, totalFiles: 0 });

			let lastScanProgress = 0;

			// Phase 1: Collect file handles (fast - just directory traversal)
			const files = await collectFileHandles(directoryHandle, '', [], {
				shouldAbort: () => abortRef.current,
				onProgress: (scanned) => {
					if (scanned - lastScanProgress < SCAN_PROGRESS_INTERVAL) return;
					lastScanProgress = scanned;
					setStatus((prev) => (prev ? { ...prev, scannedFiles: scanned } : null));
				},
			});
			const fileLimitReached = files.length >= MAX_FILE_COUNT;

			if (abortRef.current) return;

			if (files.length === 0) {
				setStatus(null);
				setIsProcessing(false);
				alert('No code files found in the selected directory.');
				return;
			}

			setStatus({ phase: 'reading', scannedFiles: files.length, processedFiles: 0, totalFiles: files.length });

			// Phase 2: Read file contents in parallel batches and append each batch as it finishes.
			const result = await processFilesInBatches(files, {
				batchSize: READ_BATCH_SIZE,
				shouldAbort: () => abortRef.current,
				onBatch: (batchContent, processed, total) => {
					if (abortRef.current) return;

					setAggregatedContent((prev) => prev + batchContent);
					setResultStats((prev) => ({
						charCount: prev.charCount + batchContent.length,
						newlineCount: prev.newlineCount + countNewlines(batchContent),
					}));
					setStatus((prev) => (prev ? { ...prev, processedFiles: processed, totalFiles: total } : null));
				},
			});

			if (abortRef.current || !result.completed) return;

			setStatus({ phase: 'done', scannedFiles: files.length, processedFiles: files.length, totalFiles: files.length });
			if (fileLimitReached || result.limitReached || result.skippedLargeFiles > 0) {
				const messages = [
					fileLimitReached ? `Only the first ${MAX_FILE_COUNT.toLocaleString()} code files were included.` : '',
					result.limitReached ? 'Output was capped at 20 million characters.' : '',
					result.skippedLargeFiles > 0 ? `${result.skippedLargeFiles} files larger than 2 MB were skipped.` : '',
				].filter(Boolean);
				alert(messages.join('\n'));
			}
		} catch (error: any) {
			if (error.name !== 'AbortError') {
				console.error('Error accessing files:', error);
				alert('An error occurred while accessing the files.');
			}
		} finally {
			setIsProcessing(false);
		}
	}, []);

	const handleCancel = useCallback(() => {
		abortRef.current = true;
		setIsProcessing(false);
		setStatus(null);
		setAggregatedContent('');
		setResultStats({ charCount: 0, newlineCount: 0 });
	}, []);

	const handleCopy = useCallback(() => {
		if (aggregatedContent) {
			copy(aggregatedContent);
		}
	}, [aggregatedContent, copy]);

	const handleDownload = useCallback(() => {
		if (aggregatedContent) {
			downloadText(aggregatedContent, 'aggregated-code.txt');
		}
	}, [aggregatedContent, downloadText]);

	const handleClear = useCallback(() => {
		setAggregatedContent('');
		setResultStats({ charCount: 0, newlineCount: 0 });
		setStatus(null);
	}, []);

	const charCount = resultStats.charCount;
	const lineCount = charCount > 0 ? resultStats.newlineCount + 1 : 0;

	return (
		<div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
			<div className="space-y-4">
				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="rounded-[20px] border border-dashed border-zinc-300 bg-zinc-50/60 px-5 py-6 text-center">
						<button
							onClick={handleFolderSelect}
							disabled={isProcessing}
							className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow,color] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:active:scale-100">
							{isProcessing ? 'Processing...' : 'Select Folder'}
						</button>
						<p className="mt-3 text-sm text-zinc-600">Select a folder to aggregate code files</p>
						<p className="mx-auto mt-1 max-w-[18rem] text-xs leading-5 text-zinc-400">
							Automatically skips dependencies, generated output, environment files, and common credential formats
						</p>
					</div>
				</div>

				{isProcessing && status && (
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-[20px] bg-zinc-50 p-4">
							<div className="mb-3 flex items-center justify-between gap-4">
								<span className="text-sm font-medium text-zinc-800">
									{status.phase === 'scanning' && 'Scanning directories...'}
									{status.phase === 'reading' && 'Reading files...'}
								</span>
								<button
									onClick={handleCancel}
									className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm text-zinc-500 transition-[transform,background-color,color] duration-200 ease-out hover:bg-white hover:text-zinc-900 active:scale-[0.96]">
									Cancel
								</button>
							</div>
							{status.phase === 'scanning' && (
								<div className="text-sm text-zinc-600">
									Found <span className="tabular-nums">{status.scannedFiles}</span> code files...
								</div>
							)}
							{status.phase === 'reading' && (
								<>
									<div className="mb-2 h-2 w-full rounded-full bg-zinc-200 p-px">
										<div
											className="h-full rounded-full bg-zinc-900 transition-[width] duration-150 ease-out"
											style={{ width: `${(status.processedFiles / status.totalFiles) * 100}%` }}
										/>
									</div>
									<div className="text-sm text-zinc-600">
										<span className="tabular-nums">{status.processedFiles}</span> /{' '}
										<span className="tabular-nums">{status.totalFiles}</span> files processed
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>

			{aggregatedContent && (
				<div className="min-w-0">
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-[20px] bg-zinc-50 p-4">
							<div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
								<span className="tabular-nums">{status?.totalFiles || 0} files</span>
								<span className="tabular-nums">{lineCount.toLocaleString()} lines</span>
								<span className="tabular-nums">{(charCount / 1024).toFixed(1)} KB</span>
								<div className="flex-1" />
								<button
									onClick={handleClear}
									className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm text-zinc-500 transition-[transform,background-color,color] duration-200 ease-out hover:bg-white hover:text-zinc-900 active:scale-[0.96]">
									Clear
								</button>
							</div>

							<textarea
								value={aggregatedContent}
								readOnly
								className="h-[50vh] w-full resize-none rounded-[20px] bg-white p-4 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] outline-none"
							/>

							<div className="mt-3 grid gap-2 sm:grid-cols-2">
								<button
									onClick={handleCopy}
									className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
									<IconCopy size={18} />
									<span>Copy</span>
								</button>
								<button
									onClick={handleDownload}
									className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
									<IconDownload size={18} />
									<span>Download</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
