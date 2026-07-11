// src/app/[tool]/page.tsx
import { TOOLS, getToolByPath } from '@/data/tools';
import { notFound } from 'next/navigation';

import ToolLayout from '@/components/ToolLayout';

export const dynamic = 'force-static';

interface Props {
	params: Promise<{
		tool: string;
	}>;
}

export default async function ToolPage({ params }: Props) {
	const { tool: toolPath } = await params;
	const tool = getToolByPath(toolPath);

	if (!tool) {
		notFound();
	}

	const ToolComponent = tool.component;

	return (
		<ToolLayout title={tool.name} description={tool.description}>
			<ToolComponent />
		</ToolLayout>
	);
}

export function generateStaticParams() {
	return TOOLS.map((tool) => ({
		tool: tool.href.replace('/', ''),
	}));
}
