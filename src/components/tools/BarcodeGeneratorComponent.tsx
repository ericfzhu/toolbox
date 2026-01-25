'use client';

import { IconDownload } from '@tabler/icons-react';
import JsBarcode from 'jsbarcode';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDownload, useKeyboardShortcut } from '@/hooks';

type BarcodeFormat =
	| 'CODE128'
	| 'CODE39'
	| 'EAN13'
	| 'EAN8'
	| 'UPC'
	| 'ITF14'
	| 'ITF'
	| 'MSI'
	| 'pharmacode'
	| 'codabar';

interface FormatInfo {
	name: string;
	description: string;
	placeholder: string;
	validator?: (value: string) => boolean;
}

const FORMAT_INFO: Record<BarcodeFormat, FormatInfo> = {
	CODE128: {
		name: 'Code 128',
		description: 'General purpose, supports all ASCII characters',
		placeholder: 'Hello World 123',
	},
	CODE39: {
		name: 'Code 39',
		description: 'Alphanumeric (A-Z, 0-9, some symbols)',
		placeholder: 'HELLO-123',
	},
	EAN13: {
		name: 'EAN-13',
		description: 'European Article Number (12-13 digits)',
		placeholder: '590123412345',
		validator: (v) => /^\d{12,13}$/.test(v),
	},
	EAN8: {
		name: 'EAN-8',
		description: 'Short EAN (7-8 digits)',
		placeholder: '9638507',
		validator: (v) => /^\d{7,8}$/.test(v),
	},
	UPC: {
		name: 'UPC-A',
		description: 'Universal Product Code (11-12 digits)',
		placeholder: '12345678901',
		validator: (v) => /^\d{11,12}$/.test(v),
	},
	ITF14: {
		name: 'ITF-14',
		description: 'Shipping containers (14 digits)',
		placeholder: '12345678901231',
		validator: (v) => /^\d{14}$/.test(v),
	},
	ITF: {
		name: 'ITF (Interleaved 2 of 5)',
		description: 'Numeric only, even number of digits',
		placeholder: '123456',
		validator: (v) => /^\d+$/.test(v) && v.length % 2 === 0,
	},
	MSI: {
		name: 'MSI',
		description: 'Numeric only, inventory tracking',
		placeholder: '123456',
		validator: (v) => /^\d+$/.test(v),
	},
	pharmacode: {
		name: 'Pharmacode',
		description: 'Pharmaceutical industry (3-131070)',
		placeholder: '1234',
		validator: (v) => /^\d+$/.test(v) && parseInt(v) >= 3 && parseInt(v) <= 131070,
	},
	codabar: {
		name: 'Codabar',
		description: 'Libraries, blood banks (0-9, - $ : / . +)',
		placeholder: 'A12345B',
	},
};

export default function BarcodeGeneratorComponent() {
	const [text, setText] = useState('');
	const [format, setFormat] = useState<BarcodeFormat>('CODE128');
	const [width, setWidth] = useState(2);
	const [height, setHeight] = useState(100);
	const [showText, setShowText] = useState(true);
	const [foregroundColor, setForegroundColor] = useState('#000000');
	const [backgroundColor, setBackgroundColor] = useState('#ffffff');
	const [error, setError] = useState<string | null>(null);
	const [barcodeGenerated, setBarcodeGenerated] = useState(false);

	const svgRef = useRef<SVGSVGElement>(null);
	const { downloadBlob, downloadDataUrl } = useDownload();

	const generateBarcode = useCallback(() => {
		if (!text.trim()) {
			setError(null);
			setBarcodeGenerated(false);
			return;
		}

		const formatInfo = FORMAT_INFO[format];
		if (formatInfo.validator && !formatInfo.validator(text)) {
			setError(`Invalid format for ${formatInfo.name}. ${formatInfo.description}`);
			setBarcodeGenerated(false);
			return;
		}

		if (!svgRef.current) return;

		try {
			JsBarcode(svgRef.current, text, {
				format,
				width,
				height,
				displayValue: showText,
				lineColor: foregroundColor,
				background: backgroundColor,
				margin: 10,
				fontSize: 16,
				textMargin: 5,
			});
			setError(null);
			setBarcodeGenerated(true);
		} catch (err) {
			setError(`Failed to generate barcode. ${err instanceof Error ? err.message : 'Invalid input for this format.'}`);
			setBarcodeGenerated(false);
		}
	}, [text, format, width, height, showText, foregroundColor, backgroundColor]);

	useEffect(() => {
		generateBarcode();
	}, [generateBarcode]);

	const handleDownloadSvg = useCallback(() => {
		if (!svgRef.current || !barcodeGenerated) return;

		const svgData = new XMLSerializer().serializeToString(svgRef.current);
		const blob = new Blob([svgData], { type: 'image/svg+xml' });
		downloadBlob(blob, 'barcode.svg');
	}, [barcodeGenerated, downloadBlob]);

	const handleDownloadPng = useCallback(() => {
		if (!svgRef.current || !barcodeGenerated) return;

		const svgData = new XMLSerializer().serializeToString(svgRef.current);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = new Image();

		img.onload = () => {
			canvas.width = img.width * 2;
			canvas.height = img.height * 2;
			ctx?.scale(2, 2);
			ctx?.drawImage(img, 0, 0);
			const dataUrl = canvas.toDataURL('image/png');
			downloadDataUrl(dataUrl, 'barcode.png');
		};

		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
	}, [barcodeGenerated, downloadDataUrl]);

	useKeyboardShortcut({ key: 's', modifiers: ['ctrl'], callback: handleDownloadPng, disabled: !barcodeGenerated });

	const currentFormat = FORMAT_INFO[format];

	return (
		<div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-4xl mx-auto">
			{/* Controls */}
			<div className="w-full md:w-72 flex-shrink-0 space-y-4 order-2 md:order-1">
				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Barcode Format</label>
					<select
						value={format}
						onChange={(e) => setFormat(e.target.value as BarcodeFormat)}
						className="w-full p-2 border border-zinc-300 rounded-sm text-sm">
						{Object.entries(FORMAT_INFO).map(([key, info]) => (
							<option key={key} value={key}>
								{info.name}
							</option>
						))}
					</select>
					<p className="text-xs text-zinc-500">{currentFormat.description}</p>
				</div>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Content</label>
					<input
						type="text"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder={currentFormat.placeholder}
						className="w-full p-3 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
					/>
				</div>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Bar Width: {width}px</label>
					<input
						type="range"
						value={width}
						onChange={(e) => setWidth(Number(e.target.value))}
						min={1}
						max={5}
						step={0.5}
						className="w-full accent-zinc-600"
					/>
				</div>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Height: {height}px</label>
					<input
						type="range"
						value={height}
						onChange={(e) => setHeight(Number(e.target.value))}
						min={30}
						max={200}
						step={10}
						className="w-full accent-zinc-600"
					/>
				</div>

				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="showText"
						checked={showText}
						onChange={(e) => setShowText(e.target.checked)}
						className="w-4 h-4 accent-zinc-600"
					/>
					<label htmlFor="showText" className="text-sm font-medium text-zinc-700">
						Show text below barcode
					</label>
				</div>

				<div className="space-y-3">
					<div className="space-y-2">
						<label className="block text-sm font-medium text-zinc-700">Foreground</label>
						<div className="flex gap-2">
							<input
								type="color"
								value={foregroundColor}
								onChange={(e) => setForegroundColor(e.target.value)}
								className="w-10 h-10 border border-zinc-300 rounded-sm cursor-pointer flex-shrink-0"
							/>
							<input
								type="text"
								value={foregroundColor}
								onChange={(e) => setForegroundColor(e.target.value)}
								className="flex-1 min-w-0 p-2 border border-zinc-300 rounded-sm text-sm font-mono"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<label className="block text-sm font-medium text-zinc-700">Background</label>
						<div className="flex gap-2">
							<input
								type="color"
								value={backgroundColor}
								onChange={(e) => setBackgroundColor(e.target.value)}
								className="w-10 h-10 border border-zinc-300 rounded-sm cursor-pointer flex-shrink-0"
							/>
							<input
								type="text"
								value={backgroundColor}
								onChange={(e) => setBackgroundColor(e.target.value)}
								className="flex-1 min-w-0 p-2 border border-zinc-300 rounded-sm text-sm font-mono"
							/>
						</div>
					</div>
				</div>

				{barcodeGenerated && (
					<div className="space-y-2 pt-4 border-t border-zinc-200">
						<button
							onClick={handleDownloadPng}
							className="w-full bg-zinc-600 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2 transition-colors">
							<IconDownload size={18} />
							<span>Download PNG</span>
							<span className="text-xs text-zinc-400 ml-1">⌘S</span>
						</button>
						<button
							onClick={handleDownloadSvg}
							className="w-full bg-zinc-200 hover:bg-zinc-300 p-2 rounded-sm flex items-center justify-center gap-2 transition-colors">
							<IconDownload size={18} />
							<span>Download SVG</span>
						</button>
					</div>
				)}
			</div>

			{/* Preview */}
			<div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden order-1 md:order-2">
				{error ? (
					<div className="text-red-600 text-sm text-center px-4">{error}</div>
				) : barcodeGenerated ? (
					<div
						className="border border-zinc-200 rounded-sm p-4 overflow-x-auto"
						style={{ backgroundColor: backgroundColor }}>
						<svg ref={svgRef} className="max-w-full h-auto" />
					</div>
				) : (
					<div className="border-2 border-dashed border-zinc-300 rounded-sm p-8 sm:p-16 text-zinc-400 text-center text-sm sm:text-base">
						<p>Enter content to generate barcode</p>
						<svg ref={svgRef} className="hidden" />
					</div>
				)}
				{!barcodeGenerated && !error && <svg ref={svgRef} className="hidden" />}
			</div>
		</div>
	);
}
