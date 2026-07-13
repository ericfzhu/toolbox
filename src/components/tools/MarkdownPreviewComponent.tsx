'use client';

import { IconCopy, IconDownload } from '@tabler/icons-react';
import { marked } from 'marked';
import { useCallback, useMemo, useState } from 'react';

import { useClipboard, useDownload, useKeyboardShortcuts } from '@/hooks';

const SAMPLE_MARKDOWN = `# Welcome to Markdown Preview

This is a **live preview** of your markdown content.

## Features

- Real-time preview
- GitHub-flavored markdown
- Copy HTML output
- Download as HTML file

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Tables

| Feature | Supported |
|---------|-----------|
| Headers | Yes |
| Lists | Yes |
| Code | Yes |
| Tables | Yes |

### Links & Images

[Visit GitHub](https://github.com)

> This is a blockquote. It can span multiple lines and contain **formatting**.

---

*Italic*, **bold**, and \`inline code\` are all supported.
`;

export default function MarkdownPreviewComponent() {
	const [markdown, setMarkdown] = useState('');
	const [viewMode, setViewMode] = useState<'split' | 'preview' | 'html'>('split');

	const { copy } = useClipboard();
	const { downloadText } = useDownload();

	const htmlContent = useMemo(() => {
		if (!markdown.trim()) return '';
		try {
			return marked(markdown, {
				gfm: true,
				breaks: true,
			}) as string;
		} catch {
			return '<p>Error parsing markdown</p>';
		}
	}, [markdown]);

	const handleCopyHtml = useCallback(() => {
		if (htmlContent) {
			copy(htmlContent);
		}
	}, [htmlContent, copy]);

	const handleDownloadHtml = useCallback(() => {
		if (!htmlContent) return;

		const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
    pre { background: #f4f4f4; padding: 16px; overflow-x: auto; border-radius: 4px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; }
    img { max-width: 100%; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

		downloadText(fullHtml, 'markdown-export.html');
	}, [htmlContent, downloadText]);

	const handleLoadSample = useCallback(() => {
		setMarkdown(SAMPLE_MARKDOWN);
	}, []);

	const handleClear = useCallback(() => {
		setMarkdown('');
	}, []);

	// Keyboard shortcuts
	useKeyboardShortcuts([
		{ key: 's', modifiers: ['ctrl'], callback: handleCopyHtml, disabled: !htmlContent },
		{ key: 'd', modifiers: ['ctrl'], callback: handleDownloadHtml, disabled: !htmlContent },
	]);

	// Word/character count
	const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
	const charCount = markdown.length;

	return (
		<div className="flex h-full w-full flex-col gap-5">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-2 rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<button
					onClick={handleCopyHtml}
					disabled={!htmlContent}
					className="inline-flex min-h-11 items-center gap-2 rounded-none bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:text-zinc-400 sm:px-4">
					<IconCopy size={16} />
					<span className="hidden sm:inline">Copy HTML</span>
					<span className="sm:hidden">Copy</span>
					<span className="ml-1 hidden text-xs text-zinc-400 sm:inline">⌘S</span>
				</button>
				<button
					onClick={handleDownloadHtml}
					disabled={!htmlContent}
					className="inline-flex min-h-11 items-center gap-2 rounded-none bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:text-zinc-400 sm:px-4">
					<IconDownload size={16} />
					<span className="hidden sm:inline">Download HTML</span>
					<span className="sm:hidden">Download</span>
					<span className="ml-1 hidden text-xs text-zinc-400 sm:inline">⌘D</span>
				</button>
				<button onClick={handleLoadSample} className="inline-flex min-h-11 items-center rounded-none bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
					Sample
				</button>
				<button onClick={handleClear} className="inline-flex min-h-11 items-center rounded-none bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96] sm:px-4">
					Clear
				</button>

				<div className="hidden flex-1 sm:block" />

				<span className="tabular-nums text-xs text-zinc-500 sm:text-sm">
					{wordCount} words, {charCount} chars
				</span>

				<div className="flex rounded-none bg-zinc-50 p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
					<button
						onClick={() => setViewMode('split')}
						className={`min-h-9 rounded-none px-2 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-3 ${viewMode === 'split' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
						Split
					</button>
					<button
						onClick={() => setViewMode('preview')}
						className={`min-h-9 rounded-none px-2 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-3 ${viewMode === 'preview' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
						Preview
					</button>
					<button
						onClick={() => setViewMode('html')}
						className={`min-h-9 rounded-none px-2 text-sm transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] sm:px-3 ${viewMode === 'html' ? 'bg-white text-zinc-900 shadow-[0px_1px_2px_rgba(0,0,0,0.08)]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
						HTML
					</button>
				</div>
			</div>

			{/* Editor and Preview */}
			<div className="flex flex-col gap-6 md:flex-row md:gap-8">
				{/* Editor */}
				{(viewMode === 'split' || viewMode === 'html') && (
					<div className="flex-1">
						<div className="rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
							<div className="rounded-none bg-zinc-50 p-4">
								{viewMode === 'split' && <label className="mb-2 block text-sm font-medium text-zinc-700">Markdown</label>}
								<textarea
									value={markdown}
									onChange={(e) => setMarkdown(e.target.value)}
									placeholder="Write your markdown here..."
									spellCheck={false}
									className="h-[40vh] w-full resize-none rounded-none bg-white p-3 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)] sm:p-4 md:h-[60vh]"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Preview */}
				{(viewMode === 'split' || viewMode === 'preview') && (
					<div className="flex-1">
						<div className="rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
							<div className="rounded-none bg-zinc-50 p-4">
								{viewMode === 'split' && <label className="mb-2 block text-sm font-medium text-zinc-700">Preview</label>}
								<div
									className="prose prose-zinc h-[40vh] w-full max-w-none overflow-auto rounded-none bg-white p-3 text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] prose-sm sm:p-4 sm:prose-base md:h-[60vh]
								prose-headings:mt-4 prose-headings:mb-2
								prose-p:my-2
								prose-pre:bg-zinc-100 prose-pre:text-zinc-800
								prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-none prose-code:text-zinc-800 prose-code:before:content-none prose-code:after:content-none
								prose-blockquote:border-zinc-300 prose-blockquote:text-zinc-600
								prose-table:text-sm
								prose-th:bg-zinc-100
								prose-td:border-zinc-200
								prose-th:border-zinc-200
								prose-hr:border-zinc-200"
									dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-zinc-400">Preview will appear here...</p>' }}
								/>
							</div>
						</div>
					</div>
				)}

				{/* HTML Output */}
				{viewMode === 'html' && (
					<div className="flex-1">
						<div className="rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
							<div className="rounded-none bg-zinc-50 p-4">
								<label className="mb-2 block text-sm font-medium text-zinc-700">HTML Output</label>
								<textarea
									value={htmlContent}
									readOnly
									className="h-[40vh] w-full resize-none rounded-none bg-white p-3 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] sm:p-4 md:h-[60vh]"
								/>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
