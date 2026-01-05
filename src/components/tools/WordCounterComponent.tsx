'use client';

import { Courier_Prime } from 'next/font/google';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const courier_prime = Courier_Prime({ subsets: ['latin'], weight: '400' });

export default function WordCounterComponent() {
	const [text, setText] = useState('');

	function countWords(str: string) {
		return str
			.trim()
			.split(/\s+/)
			.filter((word) => word !== '').length;
	}

	function countCharacters(str: string) {
		return str.length;
	}

	return (
		<div className="flex justify-center items-center">
			<div className="w-full max-w-4xl bg-white relative">
				<textarea
					className="w-full p-2 border border-zinc-300 mb-4 bg-transparent z-10 h-[50vh] sm:h-[calc(100vh-30rem)]"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Type or paste your text here..."
				/>
				<div
					className={cn(
						'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-opacity-80 p-2 sm:p-4 text-4xl sm:text-5xl md:text-7xl opacity-70 text-[#4647F1] select-none pointer-events-none',
						courier_prime.className,
					)}>
					<p>W {countWords(text)}</p>
					<p>C {countCharacters(text)}</p>
				</div>
			</div>
		</div>
	);
}
