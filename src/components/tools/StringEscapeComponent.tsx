'use client';

import { useClipboard, useDownload } from '@/hooks';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import { EscapeTarget, escapeString } from '@/lib/toolAlgorithms';

const ESCAPE_TARGETS: { value: EscapeTarget; label: string }[] = [
	{ value: 'json', label: 'JSON string' },
	{ value: 'javascript', label: 'JavaScript string' },
	{ value: 'template', label: 'Template literal' },
	{ value: 'html', label: 'HTML text' },
];

export default function StringEscapeComponent() {
	const [input, setInput] = useState('');
	const [target, setTarget] = useState<EscapeTarget>('json');
	const escaped = useMemo(() => escapeString(input, target), [input, target]);

	const { copy } = useClipboard();
	const { downloadText } = useDownload();

	function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setInput(e.target.value);
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
						<div className="mb-4 space-y-2">
							<label htmlFor="escape-target" className="block text-sm font-medium text-zinc-700">
								Output format
							</label>
							<select
								id="escape-target"
								value={target}
								onChange={(event) => setTarget(event.target.value as EscapeTarget)}
								className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 pr-10 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
								{ESCAPE_TARGETS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
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
