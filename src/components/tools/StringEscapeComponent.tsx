'use client';

import { IconCopy, IconDownload } from '@tabler/icons-react';
import React, { useState } from 'react';

import { useClipboard, useDownload } from '@/hooks';

function escapeString(str: string): string {
	return str.replace(/[\\\n\r\t"'\b\f\v\0`\$\{\}<>&\x00-\x1F\u2028\u2029]|[\ud800-\udbff][\udc00-\udfff]/g, (match) => {
		// Handle surrogate pairs (including emojis)
		if (match.length === 2) {
			const codePoint = (match.charCodeAt(0) - 0xd800) * 0x400 + (match.charCodeAt(1) - 0xdc00) + 0x10000;
			return `\\u{${codePoint.toString(16)}}`;
		}

		const escapeChars: { [key: string]: string } = {
			// Basic escapes
			'\\': '\\\\', // Backslash
			'\n': '\\n', // New line
			'\r': '\\r', // Carriage return
			'\t': '\\t', // Tab
			'"': '\\"', // Double quote
			"'": "\\'", // Single quote
			'\b': '\\b', // Backspace
			'\f': '\\f', // Form feed
			'\v': '\\v', // Vertical tab
			'\0': '\\0', // Null character

			// Template literal special characters
			'`': '\\`', // Backtick
			'${': '\\${', // Template literal interpolation

			// Line terminators
			'\u2028': '\\u2028', // Line separator
			'\u2029': '\\u2029', // Paragraph separator

			// HTML/XML special characters
			'<': '&lt;', // Less than
			'>': '&gt;', // Greater than
			'&': '&amp;', // Ampersand
		};

		if (escapeChars[match]) {
			return escapeChars[match];
		}

		// Handle control characters (0x00-0x1F)
		const code = match.charCodeAt(0);
		if (code <= 0x1f) {
			return `\\x${code.toString(16).padStart(2, '0')}`;
		}

		return match;
	});
}

export default function StringEscapeComponent() {
	const [input, setInput] = useState('');
	const [escaped, setEscaped] = useState('');

	const { copy } = useClipboard();
	const { downloadText } = useDownload();

	function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const newInput = e.target.value;
		setInput(newInput);
		setEscaped(escapeString(newInput));
	}

	function handleCopy() {
		if (escaped) {
			copy(escaped);
		}
	}

	function handleDownload() {
		if (escaped) {
			downloadText(escaped, 'escaped_string.txt');
		}
	}

	return (
		<div className="flex flex-col md:flex-row gap-4">
			<div className="flex-1">
				<label className="block text-sm font-medium text-zinc-700 mb-2">Input</label>
				<textarea
					className="w-full p-3 sm:p-4 border border-zinc-300 rounded-sm h-[40vh] md:h-[60vh] resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500"
					placeholder="Type or paste your text here..."
					value={input}
					onChange={handleInputChange}
				/>
			</div>

			<div className="flex-1">
				<div className="flex items-center justify-between mb-2">
					<label className="block text-sm font-medium text-zinc-700">Escaped Output</label>
					<div className="flex gap-2">
						<button
							onClick={handleCopy}
							className={`p-2 border rounded-sm flex items-center justify-center ${
								escaped ? 'bg-zinc-500 hover:bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
							}`}
							disabled={!escaped}
							aria-label="Copy to clipboard">
							<IconCopy size={16} />
						</button>
						<button
							onClick={handleDownload}
							className={`p-2 border rounded-sm flex items-center justify-center ${
								escaped ? 'bg-zinc-500 hover:bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
							}`}
							disabled={!escaped}
							aria-label="Download as file">
							<IconDownload size={16} />
						</button>
					</div>
				</div>
				<textarea
					className="w-full p-3 sm:p-4 border border-zinc-300 rounded-sm h-[40vh] md:h-[60vh] resize-none bg-zinc-50"
					value={escaped}
					readOnly
				/>
			</div>
		</div>
	);
}
