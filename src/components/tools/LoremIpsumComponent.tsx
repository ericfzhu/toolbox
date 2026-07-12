'use client';

import { useClipboard, useDownload } from '@/hooks';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';

type GeneratorType = 'paragraphs' | 'words';
const MAX_COUNTS: Record<GeneratorType, number> = { paragraphs: 100, words: 10000 };

const LOREM_WORDS = [
	'lorem',
	'ipsum',
	'dolor',
	'sit',
	'amet',
	'consectetur',
	'adipiscing',
	'elit',
	'sed',
	'do',
	'eiusmod',
	'tempor',
	'incididunt',
	'ut',
	'labore',
	'et',
	'dolore',
	'magna',
	'aliqua',
	'enim',
	'ad',
	'minim',
	'veniam',
	'quis',
	'nostrud',
	'exercitation',
	'ullamco',
	'laboris',
	'nisi',
	'aliquip',
	'ex',
	'ea',
	'commodo',
	'consequat',
];

function generateLoremIpsum(type: GeneratorType, count: number): string {
	if (type === 'words') {
		return Array.from({ length: count }, () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]).join(' ');
	}

	const wordsPerSentence = 12;
	const sentencesPerParagraph = 5;

	return Array.from({ length: count }, () => {
		const sentences = Array.from({ length: sentencesPerParagraph }, () => {
			const sentence = Array.from({ length: wordsPerSentence }, () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]).join(' ');
			return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
		}).join(' ');
		return sentences;
	}).join('\n\n');
}

export default function LoremIpsumComponent() {
	const [type, setType] = useState<GeneratorType>('paragraphs');
	const [count, setCount] = useState<number>(1);
	const [generatedText, setGeneratedText] = useState<string>('');

	const { copy } = useClipboard();
	const { downloadText } = useDownload();

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const text = generateLoremIpsum(type, Math.min(count, MAX_COUNTS[type]));
		setGeneratedText(text);
	}

	function handleCopy() {
		if (generatedText) {
			copy(generatedText);
		}
	}

	function handleDownload() {
		if (generatedText) {
			downloadText(generatedText, 'lorem-ipsum.txt');
		}
	}

	return (
		<div className="flex flex-col gap-6 md:flex-row md:gap-8">
			<div className="order-2 w-full max-w-sm space-y-4 md:order-1 md:w-80">
				<form
					onSubmit={handleSubmit}
					className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-5 rounded-[20px] bg-zinc-50 px-4 py-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-700">Type</label>
							<div className="grid grid-cols-2 gap-2">
								{(['paragraphs', 'words'] as const).map((typeOption) => (
									<button
										key={typeOption}
										type="button"
										onClick={() => {
											setType(typeOption);
											setCount((current) => Math.min(current, MAX_COUNTS[typeOption]));
										}}
										className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-medium capitalize transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
											type === typeOption
												? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)]'
												: 'bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-zinc-100'
										}`}>
										{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
									</button>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<label htmlFor="count" className="block text-sm font-medium text-zinc-700">
								Count
							</label>
							<input
								type="number"
								id="count"
								value={count}
								onChange={(e) => setCount(Math.min(MAX_COUNTS[type], Math.max(1, parseInt(e.target.value) || 1)))}
								min="1"
								max={MAX_COUNTS[type]}
								className="w-full rounded-2xl bg-white px-3 py-3 text-base tabular-nums shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.28)]"
							/>
						</div>

						<button
							type="submit"
							className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
							Generate
						</button>
					</div>
				</form>

				<div className="flex space-x-2 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<button
						onClick={handleCopy}
						className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[20px] p-2 text-sm font-medium transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
							generatedText
								? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] hover:bg-zinc-800'
								: 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
						}`}
						disabled={!generatedText}
						aria-label="Copy to clipboard">
						<IconCopy size={16} />
					</button>

					<button
						onClick={handleDownload}
						className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[20px] p-2 text-sm font-medium transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
							generatedText
								? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] hover:bg-zinc-800'
								: 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
						}`}
						disabled={!generatedText}
						aria-label="Download as file">
						<IconDownload size={16} />
					</button>
				</div>
			</div>

			<div className="order-1 flex-1 overflow-hidden rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] md:order-2">
				{!generatedText ? (
					<div className="flex h-[40vh] items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 text-zinc-500 md:h-[60vh]">
						<div className="px-6 text-center text-sm text-pretty sm:text-base">Generate text to see the result</div>
					</div>
				) : (
					<div className="h-[40vh] overflow-auto rounded-[24px] bg-white p-4 text-sm whitespace-pre-wrap text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] sm:p-5 sm:text-base md:h-[60vh]">
						{generatedText}
					</div>
				)}
			</div>
		</div>
	);
}
