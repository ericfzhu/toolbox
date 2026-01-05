import { TOOLS } from '@/data/tools';
import Image from 'next/image';
import Link from 'next/link';

import Header from '@/components/Header';

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col px-4 sm:px-8 md:px-12 lg:px-20 py-6 sm:py-8 md:py-12 gap-6 sm:gap-8 md:gap-12">
			<Header />

			<div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-6 sm:gap-y-8 md:gap-y-10">
				{TOOLS.map((tool) => (
					<Link key={tool.name} className="group grid grid-rows-subgrid row-span-2 gap-3 sm:gap-4" href={tool.href}>
						<div className="w-full self-end">
							<Image src={tool.preview} alt={tool.name} width={400} height={400} className="w-full h-auto object-contain" />
						</div>
						<div className="self-start">
							<p className="text-base sm:text-lg md:text-2xl font-semibold">{tool.name}</p>
							<p className="text-zinc-500 text-sm sm:text-base md:text-2xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
								{tool.description}
							</p>
						</div>
					</Link>
				))}
			</div>
		</main>
	);
}
