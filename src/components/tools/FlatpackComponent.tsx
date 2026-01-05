'use client';

import { IconCopy, IconDownload } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

import { useClipboard, useDownload } from '@/hooks';

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
	'env',
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

function isCodeFile(fileName: string): boolean {
	const lowerName = fileName.toLowerCase();
	// Handle special files without extensions
	if (lowerName === 'dockerfile' || lowerName === 'makefile' || lowerName === '.env') {
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

// Collect all file handles first (fast), then read contents in parallel batches
async function collectFileHandles(
	dirHandle: FileSystemDirectoryHandle,
	path: string = '',
	files: FileEntry[] = [],
	onProgress?: (scanned: number) => void,
): Promise<FileEntry[]> {
	try {
		for await (const [name, handle] of (dirHandle as any).entries()) {
			const fullPath = path ? `${path}/${name}` : name;

			if (handle.kind === 'file') {
				if (isCodeFile(name)) {
					files.push({ path: fullPath, handle: handle as FileSystemFileHandle });
					onProgress?.(files.length);
				}
			} else if (handle.kind === 'directory' && !shouldSkipDirectory(name)) {
				await collectFileHandles(handle as FileSystemDirectoryHandle, fullPath, files, onProgress);
			}
		}
	} catch (error) {
		console.error('Error scanning directory:', path, error);
	}
	return files;
}

// Process files in parallel batches for speed
async function processFilesInBatches(
	files: FileEntry[],
	batchSize: number = 50,
	onProgress?: (processed: number, total: number) => void,
): Promise<string[]> {
	const results: string[] = [];
	let processed = 0;

	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);

		const batchResults = await Promise.all(
			batch.map(async ({ path, handle }) => {
				try {
					const file = await handle.getFile();
					const text = await file.text();
					return `// File: ${path}\n\n${text}\n\n`;
				} catch (error) {
					console.error('Error reading file:', path, error);
					return '';
				}
			}),
		);

		results.push(...batchResults.filter(Boolean));
		processed += batch.length;
		onProgress?.(processed, files.length);
	}

	return results;
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
			setStatus({ phase: 'scanning', scannedFiles: 0, processedFiles: 0, totalFiles: 0 });

			// Phase 1: Collect file handles (fast - just directory traversal)
			const files = await collectFileHandles(directoryHandle, '', [], (scanned) => {
				setStatus((prev) => (prev ? { ...prev, scannedFiles: scanned } : null));
			});

			if (abortRef.current) return;

			if (files.length === 0) {
				setStatus(null);
				setIsProcessing(false);
				alert('No code files found in the selected directory.');
				return;
			}

			setStatus({ phase: 'reading', scannedFiles: files.length, processedFiles: 0, totalFiles: files.length });

			// Phase 2: Read file contents in parallel batches
			const results = await processFilesInBatches(files, 50, (processed, total) => {
				if (!abortRef.current) {
					setStatus((prev) => (prev ? { ...prev, processedFiles: processed, totalFiles: total } : null));
				}
			});

			if (abortRef.current) return;

			// Join all results at the end (more efficient than string concatenation)
			const content = results.join('');
			setAggregatedContent(content);
			setStatus({ phase: 'done', scannedFiles: files.length, processedFiles: files.length, totalFiles: files.length });
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
		setStatus(null);
	}, []);

	// Calculate character/line counts
	const charCount = aggregatedContent.length;
	const lineCount = aggregatedContent ? aggregatedContent.split('\n').length : 0;

	return (
		<div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
			<div className="border-2 border-dashed p-6 text-center border-zinc-300 rounded-sm">
				<button
					onClick={handleFolderSelect}
					disabled={isProcessing}
					className="bg-zinc-700 hover:bg-zinc-800 disabled:bg-zinc-400 text-white py-2 px-6 rounded-sm transition-colors">
					{isProcessing ? 'Processing...' : 'Select Folder'}
				</button>
				<p className="mt-3 text-sm text-zinc-600">Select a folder to aggregate code files</p>
				<p className="mt-1 text-xs text-zinc-400">
					Automatically skips node_modules, .git, dist, build, and other non-source directories
				</p>
			</div>

			{/* Progress indicator */}
			{isProcessing && status && (
				<div className="bg-zinc-50 border border-zinc-200 rounded-sm p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-zinc-700">
							{status.phase === 'scanning' && 'Scanning directories...'}
							{status.phase === 'reading' && 'Reading files...'}
						</span>
						<button onClick={handleCancel} className="text-sm text-zinc-500 hover:text-zinc-700">
							Cancel
						</button>
					</div>
					{status.phase === 'scanning' && (
						<div className="text-sm text-zinc-600">Found {status.scannedFiles} code files...</div>
					)}
					{status.phase === 'reading' && (
						<>
							<div className="w-full bg-zinc-200 rounded-full h-2 mb-2">
								<div
									className="bg-zinc-600 h-2 rounded-full transition-all duration-150"
									style={{ width: `${(status.processedFiles / status.totalFiles) * 100}%` }}
								/>
							</div>
							<div className="text-sm text-zinc-600">
								{status.processedFiles} / {status.totalFiles} files processed
							</div>
						</>
					)}
				</div>
			)}

			{/* Results */}
			{aggregatedContent && (
				<div className="flex flex-col gap-3">
					{/* Stats bar */}
					<div className="flex items-center gap-4 text-sm text-zinc-600">
						<span>{status?.totalFiles || 0} files</span>
						<span>{lineCount.toLocaleString()} lines</span>
						<span>{(charCount / 1024).toFixed(1)} KB</span>
						<div className="flex-1" />
						<button onClick={handleClear} className="text-zinc-500 hover:text-zinc-700">
							Clear
						</button>
					</div>

					<textarea
						value={aggregatedContent}
						readOnly
						className="w-full h-[50vh] p-3 border border-zinc-300 rounded-sm font-mono text-sm"
					/>

					<div className="flex gap-2">
						<button
							onClick={handleCopy}
							className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2 transition-colors">
							<IconCopy size={18} />
							<span>Copy</span>
						</button>
						<button
							onClick={handleDownload}
							className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2 transition-colors">
							<IconDownload size={18} />
							<span>Download</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
