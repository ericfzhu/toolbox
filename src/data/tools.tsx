import * as tools from '@/components/tools';

export interface Tool {
	name: string;
	href: string;
	preview: string;
	description: string;
	component: React.ComponentType;
}

export const TOOLS: Tool[] = [
	{
		name: 'Dot Patterns',
		href: '/dotpattern',
		preview: 'previews/dotpattern.jpg',
		description: 'Convert an image to a dot pattern',
		component: tools.DotPatternComponent,
	},
	{
		name: 'Lorem Ipsum',
		href: '/loremipsum',
		preview: 'previews/loremipsum.jpg',
		description: 'Generate Lorem Ipsum',
		component: tools.LoremIpsumComponent,
	},
	{
		name: 'Gaussian Blur',
		href: '/blur',
		preview: 'previews/blur.jpg',
		description: 'Apply a blur effect',
		component: tools.GaussianBlurComponent,
	},
	{
		name: 'Colors & Palettes',
		href: '/colorpalette',
		preview: 'previews/colorpalette.webp',
		description: 'Pick colors and palettes',
		component: tools.ColorPickerComponent,
	},
	{
		name: 'square.jpg',
		href: '/square',
		preview: 'previews/square.jpg',
		description: 'Generate a square',
		component: tools.SquareIconComponent,
	},
	{
		name: 'Counter',
		href: '/counter',
		preview: 'previews/counter.jpg',
		description: 'Count words and characters',
		component: tools.WordCounterComponent,
	},
	{
		name: 'Image Converter',
		href: '/converter',
		preview: 'previews/imageconverter.jpg',
		description: 'Change image format and size',
		component: tools.ImageConverterComponent,
	},
	{
		name: 'String Sanitizer',
		href: '/sanitizer',
		preview: 'previews/sanitizer.webp',
		description: 'Escapes string for compatibility',
		component: tools.StringEscapeComponent,
	},
	{
		name: 'ASCII Art',
		href: '/ascii',
		preview: 'previews/ascii.webp',
		description: 'Convert an image to ASCII',
		component: tools.AsciiArtComponent,
	},
	{
		name: 'Flatpack',
		href: '/flatpack',
		preview: 'previews/flatpack.webp',
		description: 'Convert a folder into a single text file for prompting',
		component: tools.FlatpackComponent,
	},
	{
		name: 'Diff Checker',
		href: '/diff',
		preview: 'previews/diff.webp',
		description: 'Compare two texts and highlight changes',
		component: tools.DiffCheckerComponent,
	},
	{
		name: 'JSON Tool',
		href: '/json',
		preview: 'previews/json.webp',
		description: 'Format, minify, and view JSON in a tree',
		component: tools.JsonToolComponent,
	},
	{
		name: 'QR Code',
		href: '/qrcode',
		preview: 'previews/qrcode.webp',
		description: 'Generate QR codes with custom colors',
		component: tools.QrCodeComponent,
	},
	{
		name: 'Markdown',
		href: '/markdown',
		preview: 'previews/markdown.webp',
		description: 'Preview and export Markdown to HTML',
		component: tools.MarkdownPreviewComponent,
	},
];

export function getToolByPath(path: string): Tool | undefined {
	return TOOLS.find((tool) => tool.href === `/${path}`);
}
