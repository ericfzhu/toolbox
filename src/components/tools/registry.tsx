import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
	dotpattern: dynamic(() => import('./DotPatternComponent')),
	loremipsum: dynamic(() => import('./LoremIpsumComponent')),
	blur: dynamic(() => import('./GaussianBlurComponent')),
	colorpalette: dynamic(() => import('./ColorPickerComponent')),
	square: dynamic(() => import('./SquareIconComponent')),
	counter: dynamic(() => import('./WordCounterComponent')),
	converter: dynamic(() => import('./ImageConverterComponent')),
	sanitizer: dynamic(() => import('./StringEscapeComponent')),
	ascii: dynamic(() => import('./AsciiArtComponent')),
	flatpack: dynamic(() => import('./FlatpackComponent')),
	diff: dynamic(() => import('./DiffCheckerComponent')),
	json: dynamic(() => import('./JsonToolComponent')),
	qrcode: dynamic(() => import('./QrCodeComponent')),
	markdown: dynamic(() => import('./MarkdownPreviewComponent')),
	barcode: dynamic(() => import('./BarcodeGeneratorComponent')),
	epoch: dynamic(() => import('./EpochConverterComponent')),
};
