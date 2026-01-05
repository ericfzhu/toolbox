'use client';

import { IconCopy, IconDownload } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';

import { useClipboard, useDownload } from '@/hooks';

type GeneratorType = 'paragraphs' | 'words';

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
			const sentence = Array.from(
				{ length: wordsPerSentence },
				() => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)],
			).join(' ');
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
		const text = generateLoremIpsum(type, count);
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
		<div className="flex gap-4 p-6">
			<div className="w-64 space-y-4">
				<h1 className="text-xl font-bold text-gray-900">Lorem Ipsum Generator</h1>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						{/* <label className="block text-sm font-medium text-gray-700">Type</label> */}
						<div className="grid grid-cols-2 gap-2">
							{(['paragraphs', 'words'] as const).map((typeOption) => (
								<button
									key={typeOption}
									type="button"
									onClick={() => setType(typeOption)}
									className={`p-2 border rounded-sm ${
										type === typeOption ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300' : 'border-zinc-300 hover:bg-zinc-100'
									}`}>
									{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						{/* <label htmlFor="count" className="block text-sm font-medium text-gray-700">
							Count
						</label> */}
						<input
							type="number"
							id="count"
							value={count}
							onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
							min="1"
							className="w-full rounded-sm border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
						/>
					</div>

					<button type="submit" className="w-full bg-zinc-500 hover:bg-zinc-700 text-white font-bold p-2 rounded-sm">
						Generate
					</button>
				</form>

				<div className="flex space-x-2 border-t pt-4">
					<button
						onClick={handleCopy}
						className={`flex-1 border rounded-sm p-2 flex items-center justify-center gap-2 ${
							generatedText ? 'bg-zinc-500 hover:bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
						}`}
						disabled={!generatedText}>
						<IconCopy size={16} />
					</button>

					<button
						onClick={handleDownload}
						className={`flex-1 border rounded-sm p-2 flex items-center justify-center gap-2 ${
							generatedText ? 'bg-zinc-500 hover:bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
						}`}
						disabled={!generatedText}>
						<IconDownload size={16} />
					</button>
				</div>
			</div>

			<div className="flex-1 border border-zinc-300 rounded-sm overflow-auto h-[calc(100vh-30rem)]">
				{!generatedText ? (
					<div className="h-full flex items-center justify-center text-zinc-500">Generate text to see the result</div>
				) : (
					<div className="p-4 whitespace-pre-wrap">{generatedText}</div>
				)}
			</div>
		</div>
	);
}
