// src/app/[tool]/page.tsx
import { TOOLS, getToolByPath } from '@/data/tools';
import { notFound } from 'next/navigation';

import ToolLayout from '@/components/ToolLayout';
import { TOOL_COMPONENTS } from '@/components/tools/registry';

export const dynamic = 'force-static';

interface Props {
	params: Promise<{
		tool: string;
	}>;
}

export default async function ToolPage({ params }: Props) {
	const { tool: toolPath } = await params;
	const tool = getToolByPath(toolPath);
	const ToolComponent = TOOL_COMPONENTS[toolPath];

	if (!tool || !ToolComponent) {
		notFound();
	}

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
