import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Nested Folders Concept | Toolbox',
	description: 'A macOS-style nested folder concept for the JSON tool.',
};

const FOLDER = { x: 116, y: 198, width: 792, height: 588, tab: 254, radius: 48 } as const;
const FOLDER_TONES = ['outer', 'middle', 'inner', 'core'] as const;
const FOLDER_LAYERS = Array.from({ length: 22 }, (_, index) => ({
	scale: 0.78 ** index,
	tone: FOLDER_TONES[index % FOLDER_TONES.length],
}));

function folderPath(x: number, y: number, width: number, height: number, tab: number, radius: number) {
	const right = x + width;
	const bottom = y + height;
	const tabEnd = x + tab;
	return [
		`M ${x + radius} ${y}`,
		`H ${tabEnd - 28}`,
		`C ${tabEnd - 14} ${y} ${tabEnd - 8} ${y + 8} ${tabEnd} ${y + 20}`,
		`L ${tabEnd + 32} ${y + 64}`,
		`H ${right - radius}`,
		`C ${right - 16} ${y + 64} ${right} ${y + 80} ${right} ${y + 104}`,
		`V ${bottom - radius}`,
		`C ${right} ${bottom - 16} ${right - 16} ${bottom} ${right - radius} ${bottom}`,
		`H ${x + radius}`,
		`C ${x + 16} ${bottom} ${x} ${bottom - 16} ${x} ${bottom - radius}`,
		`V ${y + radius}`,
		`C ${x} ${y + 16} ${x + 16} ${y} ${x + radius} ${y}`,
		'Z',
	].join(' ');
}

export default function FolderConceptPage() {
	const folder = folderPath(FOLDER.x, FOLDER.y, FOLDER.width, FOLDER.height, FOLDER.tab, FOLDER.radius);

	return (
		<main className="min-h-screen overflow-hidden bg-[#ececef] px-5 py-5 text-zinc-950 sm:px-8 sm:py-8">
		<nav className="mx-auto flex w-full max-w-6xl items-center justify-between">
			<Link
				href="/"
				className="relative inline-flex min-h-10 items-center rounded-full bg-white/70 px-4 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-[background-color,scale] duration-200 hover:bg-white active:scale-[0.96]"
			>
				← Toolbox
			</Link>
			<p className="text-sm text-zinc-500">JSON preview study</p>
		</nav>

		<section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-6xl items-center justify-center py-8 sm:py-12">
			<div className="relative aspect-square w-full max-w-[780px] overflow-hidden rounded-[40px] bg-[radial-gradient(circle_at_50%_32%,#ffffff_0%,#f7f7f8_42%,#e4e4e8_100%)] shadow-[0_1px_1px_rgba(255,255,255,0.9)_inset,0_24px_70px_rgba(35,35,45,0.16)] outline outline-1 outline-black/10 sm:rounded-[56px]">
				<div className="absolute inset-x-[18%] bottom-[8%] h-[12%] rounded-full bg-black/20 blur-3xl" />
				<svg viewBox="0 0 1024 1024" className="relative h-full w-full" role="img" aria-labelledby="folder-title folder-description">
					<title id="folder-title">Nested macOS-style folders</title>
					<desc id="folder-description">Four glossy blue Finder folders nested inside one another.</desc>
					<defs>
						<linearGradient id="outer" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#82cfff" />
							<stop offset="0.52" stopColor="#43a8f3" />
							<stop offset="1" stopColor="#1679d2" />
						</linearGradient>
						<linearGradient id="middle" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#9ddaff" />
							<stop offset="0.55" stopColor="#56b4f6" />
							<stop offset="1" stopColor="#2589dc" />
						</linearGradient>
						<linearGradient id="inner" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#b7e4ff" />
							<stop offset="0.58" stopColor="#6fc1f7" />
							<stop offset="1" stopColor="#3294dd" />
						</linearGradient>
						<linearGradient id="core" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#cbecff" />
							<stop offset="1" stopColor="#62b8ed" />
						</linearGradient>
						<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
							<stop stopColor="#fff" stopOpacity=".48" />
							<stop offset=".45" stopColor="#fff" stopOpacity=".08" />
							<stop offset="1" stopColor="#fff" stopOpacity="0" />
						</linearGradient>
						<filter id="folder-shadow" x="-20%" y="-20%" width="140%" height="160%">
							<feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#183754" floodOpacity=".28" />
						</filter>
					</defs>

					{FOLDER_LAYERS.map((layer, index) => {
						const transform = `translate(512 512) scale(${layer.scale}) translate(-512 -512)`;
						return (
							<g key={index} transform={transform} filter={index < 8 ? 'url(#folder-shadow)' : undefined}>
								<path d={folder} fill={`url(#${layer.tone})`} stroke="#0867b4" strokeOpacity=".62" strokeWidth="5" />
								<path d={folder} fill="url(#shine)" opacity=".56" />
								<path
									d={`M ${FOLDER.x + 26} ${FOLDER.y + 106} H ${FOLDER.x + FOLDER.width - 26}`}
									fill="none"
									stroke="#fff"
									strokeOpacity=".38"
									strokeWidth="3"
								/>
							</g>
						);
					})}
				</svg>
			</div>
		</section>
		</main>
	);
}
