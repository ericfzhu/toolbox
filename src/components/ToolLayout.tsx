import Header from '@/components/Header';

interface ToolLayoutProps {
	title: string;
	description: string;
	children: React.ReactNode;
}

export default function ToolLayout({ title, description, children }: ToolLayoutProps) {
	return (
		<main className="flex min-h-screen flex-col px-4 sm:px-8 md:px-12 lg:px-20 py-6 sm:py-8 md:py-12 gap-6 sm:gap-8 md:gap-12">
			<Header />
			<div className="mb-2 sm:mb-4">
				<h1 className="font-semibold text-xl sm:text-2xl">{title}</h1>
				<h2 className="text-zinc-500 text-base sm:text-xl">{description}</h2>
			</div>
			{children}
		</main>
	);
}
