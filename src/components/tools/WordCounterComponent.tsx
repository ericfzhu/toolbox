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
		<div className="flex items-center justify-center">
			<div className="relative w-full max-w-4xl rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<textarea
					className="z-10 mb-4 h-[50vh] w-full rounded-[24px] border border-zinc-300 bg-white/90 p-4 text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.04)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)] sm:h-[calc(100vh-30rem)]"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Type or paste your text here..."
				/>
				<div
					className={cn(
						'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none px-5 py-4 text-4xl text-[#4647F1] opacity-70 sm:text-5xl md:text-7xl',
						courier_prime.className,
					)}>
					<p className="tabular-nums">W {countWords(text)}</p>
					<p className="tabular-nums">C {countCharacters(text)}</p>
				</div>
			</div>
		</div>
	);
}
