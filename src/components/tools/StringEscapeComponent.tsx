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
		<div className="flex flex-col gap-6 md:flex-row md:gap-8">
			<div className="flex-1">
				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="rounded-[20px] bg-zinc-50 p-4">
						<label className="mb-2 block text-sm font-medium text-zinc-700">Input</label>
						<textarea
							className="h-[40vh] w-full resize-none rounded-[20px] bg-white p-3 text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)] sm:p-4 md:h-[60vh]"
							placeholder="Type or paste your text here..."
							value={input}
							onChange={handleInputChange}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1">
				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="rounded-[20px] bg-zinc-50 p-4">
						<div className="mb-2 flex items-center justify-between">
							<label className="block text-sm font-medium text-zinc-700">Escaped Output</label>
							<div className="flex gap-2">
								<button
									onClick={handleCopy}
									className={`flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
										escaped
											? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] hover:bg-zinc-800'
											: 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
									}`}
									disabled={!escaped}
									aria-label="Copy to clipboard">
									<IconCopy size={16} />
								</button>
								<button
									onClick={handleDownload}
									className={`flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
										escaped
											? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] hover:bg-zinc-800'
											: 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
									}`}
									disabled={!escaped}
									aria-label="Download as file">
									<IconDownload size={16} />
								</button>
							</div>
						</div>
						<textarea
							className="h-[40vh] w-full resize-none rounded-[20px] bg-white p-3 font-mono text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] sm:p-4 md:h-[60vh]"
							value={escaped}
							readOnly
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
