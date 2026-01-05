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
		<div className="flex flex-col gap-4 w-full h-full">
			{/* Controls */}
			<div className="flex flex-wrap gap-2 items-center">
				<button
					onClick={handleCopyHtml}
					disabled={!htmlContent}
					className="bg-zinc-200 hover:bg-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 px-4 py-2 rounded-sm transition-colors flex items-center gap-2">
					<IconCopy size={16} />
					Copy HTML
					<span className="text-xs text-zinc-400 ml-1">⌘S</span>
				</button>
				<button
					onClick={handleDownloadHtml}
					disabled={!htmlContent}
					className="bg-zinc-200 hover:bg-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 px-4 py-2 rounded-sm transition-colors flex items-center gap-2">
					<IconDownload size={16} />
					Download HTML
					<span className="text-xs text-zinc-400 ml-1">⌘D</span>
				</button>
				<button onClick={handleLoadSample} className="bg-zinc-200 hover:bg-zinc-300 px-4 py-2 rounded-sm transition-colors">
					Load Sample
				</button>
				<button onClick={handleClear} className="bg-zinc-200 hover:bg-zinc-300 px-4 py-2 rounded-sm transition-colors">
					Clear
				</button>

				<div className="flex-1" />

				<span className="text-sm text-zinc-500">
					{wordCount} words, {charCount} chars
				</span>

				<div className="flex border border-zinc-300 rounded-sm overflow-hidden">
					<button
						onClick={() => setViewMode('split')}
						className={`px-3 py-1 text-sm ${viewMode === 'split' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
						Split
					</button>
					<button
						onClick={() => setViewMode('preview')}
						className={`px-3 py-1 text-sm ${viewMode === 'preview' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
						Preview
					</button>
					<button
						onClick={() => setViewMode('html')}
						className={`px-3 py-1 text-sm ${viewMode === 'html' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}>
						HTML
					</button>
				</div>
			</div>

			{/* Editor and Preview */}
			<div className={`flex-1 flex gap-4 min-h-0 ${viewMode === 'split' ? '' : ''}`}>
				{/* Editor */}
				{(viewMode === 'split' || viewMode === 'html') && (
					<div className={`flex flex-col gap-2 ${viewMode === 'split' ? 'flex-1' : 'flex-1'}`}>
						{viewMode === 'split' && <label className="text-sm font-medium text-zinc-700">Markdown</label>}
						<textarea
							value={markdown}
							onChange={(e) => setMarkdown(e.target.value)}
							placeholder="Write your markdown here..."
							spellCheck={false}
							className="flex-1 w-full p-4 border border-zinc-300 rounded-sm font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 min-h-[60vh]"
						/>
					</div>
				)}

				{/* Preview */}
				{(viewMode === 'split' || viewMode === 'preview') && (
					<div className={`flex flex-col gap-2 ${viewMode === 'split' ? 'flex-1' : 'flex-1'}`}>
						{viewMode === 'split' && <label className="text-sm font-medium text-zinc-700">Preview</label>}
						<div
							className="flex-1 w-full p-4 border border-zinc-300 rounded-sm overflow-auto bg-white min-h-[60vh] prose prose-zinc max-w-none
								prose-headings:mt-4 prose-headings:mb-2
								prose-p:my-2
								prose-pre:bg-zinc-100 prose-pre:text-zinc-800
								prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-zinc-800 prose-code:before:content-none prose-code:after:content-none
								prose-blockquote:border-zinc-300 prose-blockquote:text-zinc-600
								prose-table:text-sm
								prose-th:bg-zinc-100
								prose-td:border-zinc-200
								prose-th:border-zinc-200
								prose-hr:border-zinc-200"
							dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-zinc-400">Preview will appear here...</p>' }}
						/>
					</div>
				)}

				{/* HTML Output */}
				{viewMode === 'html' && (
					<div className="flex-1 flex flex-col gap-2">
						<label className="text-sm font-medium text-zinc-700">HTML Output</label>
						<textarea
							value={htmlContent}
							readOnly
							className="flex-1 w-full p-4 border border-zinc-300 rounded-sm font-mono text-sm resize-none bg-zinc-50 min-h-[60vh]"
						/>
					</div>
				)}
			</div>
		</div>
	);
}
