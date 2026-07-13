'use client';

import { useDownload, useKeyboardShortcut } from '@/hooks';
import { IconDownload } from '@tabler/icons-react';
import JsBarcode from 'jsbarcode';
import { useCallback, useEffect, useRef, useState } from 'react';

type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14' | 'ITF' | 'MSI' | 'pharmacode' | 'codabar';

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
			svgRef.current?.replaceChildren();
			setError(null);
			setBarcodeGenerated(false);
			return;
		}

		const formatInfo = FORMAT_INFO[format];
		if (formatInfo.validator && !formatInfo.validator(text)) {
			svgRef.current?.replaceChildren();
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
			svgRef.current.replaceChildren();
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
		<div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">
			<div className="w-full max-w-sm shrink-0 space-y-4 lg:w-80">
				<div className="rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-4 rounded-none bg-zinc-50 p-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-900">Barcode Format</label>
							<select
								value={format}
								onChange={(e) => setFormat(e.target.value as BarcodeFormat)}
								className="min-h-11 w-full rounded-none bg-white px-3 py-2 pr-10 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
								{Object.entries(FORMAT_INFO).map(([key, info]) => (
									<option key={key} value={key}>
										{info.name}
									</option>
								))}
							</select>
							<p className="text-xs leading-5 text-zinc-500">{currentFormat.description}</p>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-900">Content</label>
							<input
								type="text"
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder={currentFormat.placeholder}
								className="min-h-11 w-full rounded-none bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label className="block text-sm font-medium text-zinc-900">Bar Width</label>
								<span className="tabular-nums text-sm text-zinc-500">{width}px</span>
							</div>
							<input
								type="range"
								value={width}
								onChange={(e) => setWidth(Number(e.target.value))}
								min={1}
								max={5}
								step={0.5}
								className="w-full accent-zinc-900"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label className="block text-sm font-medium text-zinc-900">Height</label>
								<span className="tabular-nums text-sm text-zinc-500">{height}px</span>
							</div>
							<input
								type="range"
								value={height}
								onChange={(e) => setHeight(Number(e.target.value))}
								min={30}
								max={200}
								step={10}
								className="w-full accent-zinc-900"
							/>
						</div>

						<label className="flex min-h-11 items-center gap-3 rounded-none bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
							<input
								type="checkbox"
								id="showText"
								checked={showText}
								onChange={(e) => setShowText(e.target.checked)}
								className="h-4 w-4 accent-zinc-900"
							/>
							<span>Show text below barcode</span>
						</label>

						<div className="space-y-3">
							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-900">Foreground</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={foregroundColor}
										onChange={(e) => setForegroundColor(e.target.value)}
										className="h-11 w-11 shrink-0 cursor-pointer rounded-none bg-white p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]"
									/>
									<input
										type="text"
										value={foregroundColor}
										onChange={(e) => setForegroundColor(e.target.value)}
										className="min-h-11 min-w-0 flex-1 rounded-none bg-white px-3 py-2 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-900">Background</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={backgroundColor}
										onChange={(e) => setBackgroundColor(e.target.value)}
										className="h-11 w-11 shrink-0 cursor-pointer rounded-none bg-white p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]"
									/>
									<input
										type="text"
										value={backgroundColor}
										onChange={(e) => setBackgroundColor(e.target.value)}
										className="min-h-11 min-w-0 flex-1 rounded-none bg-white px-3 py-2 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
									/>
								</div>
							</div>
						</div>

						{barcodeGenerated && (
							<div className="grid gap-2 border-t border-zinc-200 pt-4">
								<button
									onClick={handleDownloadPng}
									className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
									<IconDownload size={18} />
									<span>Download PNG</span>
									<span className="ml-1 text-xs text-zinc-400">⌘S</span>
								</button>
								<button
									onClick={handleDownloadSvg}
									className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-none bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96]">
									<IconDownload size={18} />
									<span>Download SVG</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="relative flex min-h-[24rem] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-none bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)]">
				{error ? (
					<div className="rounded-none bg-red-50 px-5 py-4 text-center text-sm text-red-600 shadow-[0px_0px_0px_1px_rgba(220,38,38,0.16)]">
						{error}
					</div>
				) : !barcodeGenerated ? (
					<div className="flex h-full w-full items-center justify-center rounded-none border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-sm text-zinc-500 sm:text-base">
						<p>Enter content to generate barcode</p>
					</div>
				) : null}
				<div
					className={`${barcodeGenerated && !error ? 'block' : 'pointer-events-none absolute invisible'} max-w-full overflow-x-auto rounded-none p-5 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.1),0px_12px_30px_rgba(0,0,0,0.08)]`}
					style={{ backgroundColor }}>
					<svg ref={svgRef} className="h-auto max-w-full outline outline-1 -outline-offset-1 outline-black/10" />
				</div>
			</div>
		</div>
	);
}
