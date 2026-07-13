export interface Tool {
	name: string;
	href: string;
	preview: string;
	description: string;
}

export const TOOLS: Tool[] = [
	{
		name: 'Dot Patterns',
		href: '/dotpattern',
		preview: 'previews/dotpattern.jpg',
		description: 'Convert an image to a dot pattern',
	},
	{
		name: 'Lorem Ipsum',
		href: '/loremipsum',
		preview: 'previews/loremipsum.jpg',
		description: 'Generate Lorem Ipsum',
	},
	{
		name: 'Gaussian Blur',
		href: '/blur',
		preview: 'previews/blur.jpg',
		description: 'Apply a blur effect',
	},
	{
		name: 'Colors & Palettes',
		href: '/colorpalette',
		preview: 'previews/colorpalette.webp',
		description: 'Pick colors and palettes',
	},
	{
		name: 'square.jpg',
		href: '/square',
		preview: 'previews/square.jpg',
		description: 'Generate a square',
	},
	{
		name: 'Counter',
		href: '/counter',
		preview: 'previews/counter.jpg',
		description: 'Count words and characters',
	},
	{
		name: 'Image Converter',
		href: '/converter',
		preview: 'previews/imageconverter.jpg',
		description: 'Change image format and size',
	},
	{
		name: 'String Sanitizer',
		href: '/sanitizer',
		preview: 'previews/sanitizer.webp',
		description: 'Escapes string for compatibility',
	},
	{
		name: 'ASCII Art',
		href: '/ascii',
		preview: 'previews/ascii.webp',
		description: 'Convert an image to ASCII',
	},
	{
		name: 'Flatpack',
		href: '/flatpack',
		preview: 'previews/flatpack.webp',
		description: 'Convert a folder into a single text file for prompting',
	},
	{
		name: 'Diff Checker',
		href: '/diff',
		preview: 'previews/diff.webp',
		description: 'Compare two texts and highlight changes',
	},
	{
		name: 'JSON Tool',
		href: '/json',
		preview: 'previews/json.svg',
		description: 'Format, minify, and view JSON in a tree',
	},
	{
		name: 'QR Code',
		href: '/qrcode',
		preview: 'previews/qrcode.webp',
		description: 'Generate QR codes with custom colors',
	},
	{
		name: 'Markdown',
		href: '/markdown',
		preview: 'previews/markdown.webp',
		description: 'Preview and export Markdown to HTML',
	},
	{
		name: 'Barcode',
		href: '/barcode',
		preview: 'previews/barcode.webp',
		description: 'Generate barcodes in multiple formats',
	},
	{
		name: 'Epoch Converter',
		href: '/epoch',
		preview: 'previews/epoch.webp',
		description: 'Convert between Unix timestamps and dates',
	},
];

export function getToolByPath(path: string): Tool | undefined {
	return TOOLS.find((tool) => tool.href === `/${path}`);
}
