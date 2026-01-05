'use client';

import { IconDownload } from '@tabler/icons-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDownload } from '@/hooks';

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export default function QrCodeComponent() {
	const [text, setText] = useState('');
	const [size, setSize] = useState(256);
	const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>('M');
	const [foregroundColor, setForegroundColor] = useState('#000000');
	const [backgroundColor, setBackgroundColor] = useState('#ffffff');
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { downloadDataUrl } = useDownload();

	const generateQrCode = useCallback(async () => {
		if (!text.trim()) {
			setQrDataUrl(null);
			setError(null);
			return;
		}

		try {
			const dataUrl = await QRCode.toDataURL(text, {
				width: size,
				margin: 2,
				errorCorrectionLevel: errorCorrection,
				color: {
					dark: foregroundColor,
					light: backgroundColor,
				},
			});
			setQrDataUrl(dataUrl);
			setError(null);
		} catch (err) {
			setError('Failed to generate QR code. Text may be too long.');
			setQrDataUrl(null);
		}
	}, [text, size, errorCorrection, foregroundColor, backgroundColor]);

	useEffect(() => {
		generateQrCode();
	}, [generateQrCode]);

	function handleDownload(format: 'png' | 'svg') {
		if (!text.trim()) return;

		if (format === 'svg') {
			QRCode.toString(text, {
				type: 'svg',
				margin: 2,
				errorCorrectionLevel: errorCorrection,
				color: {
					dark: foregroundColor,
					light: backgroundColor,
				},
			})
				.then((svg) => {
					const blob = new Blob([svg], { type: 'image/svg+xml' });
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = 'qrcode.svg';
					link.click();
					URL.revokeObjectURL(url);
				})
				.catch(console.error);
		} else if (qrDataUrl) {
			downloadDataUrl(qrDataUrl, 'qrcode.png');
		}
	}

	return (
		<div className="flex gap-8 w-full max-w-4xl mx-auto">
			{/* Controls */}
			<div className="w-72 space-y-4">
				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Text or URL</label>
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Enter text or URL..."
						className="w-full h-32 p-3 border border-zinc-300 rounded-sm text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
					/>
				</div>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Size: {size}px</label>
					<input
						type="range"
						value={size}
						onChange={(e) => setSize(Number(e.target.value))}
						min={128}
						max={512}
						step={32}
						className="w-full accent-zinc-600"
					/>
				</div>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-zinc-700">Error Correction</label>
					<select
						value={errorCorrection}
						onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrectionLevel)}
						className="w-full p-2 border border-zinc-300 rounded-sm text-sm">
						<option value="L">Low (~7%)</option>
						<option value="M">Medium (~15%)</option>
						<option value="Q">Quartile (~25%)</option>
						<option value="H">High (~30%)</option>
					</select>
					<p className="text-xs text-zinc-500">Higher correction allows more damage but creates denser codes</p>
				</div>

				<div className="flex gap-4">
					<div className="flex-1 space-y-2">
						<label className="block text-sm font-medium text-zinc-700">Foreground</label>
						<div className="flex gap-2">
							<input
								type="color"
								value={foregroundColor}
								onChange={(e) => setForegroundColor(e.target.value)}
								className="w-10 h-10 border border-zinc-300 rounded-sm cursor-pointer"
							/>
							<input
								type="text"
								value={foregroundColor}
								onChange={(e) => setForegroundColor(e.target.value)}
								className="flex-1 p-2 border border-zinc-300 rounded-sm text-sm font-mono"
							/>
						</div>
					</div>
					<div className="flex-1 space-y-2">
						<label className="block text-sm font-medium text-zinc-700">Background</label>
						<div className="flex gap-2">
							<input
								type="color"
								value={backgroundColor}
								onChange={(e) => setBackgroundColor(e.target.value)}
								className="w-10 h-10 border border-zinc-300 rounded-sm cursor-pointer"
							/>
							<input
								type="text"
								value={backgroundColor}
								onChange={(e) => setBackgroundColor(e.target.value)}
								className="flex-1 p-2 border border-zinc-300 rounded-sm text-sm font-mono"
							/>
						</div>
					</div>
				</div>

				{qrDataUrl && (
					<div className="space-y-2 pt-4 border-t border-zinc-200">
						<button
							onClick={() => handleDownload('png')}
							className="w-full bg-zinc-600 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2 transition-colors">
							<IconDownload size={18} />
							<span>Download PNG</span>
						</button>
						<button
							onClick={() => handleDownload('svg')}
							className="w-full bg-zinc-200 hover:bg-zinc-300 p-2 rounded-sm flex items-center justify-center gap-2 transition-colors">
							<IconDownload size={18} />
							<span>Download SVG</span>
						</button>
					</div>
				)}
			</div>

			{/* Preview */}
			<div className="flex-1 flex items-center justify-center">
				{error ? (
					<div className="text-red-600 text-sm">{error}</div>
				) : qrDataUrl ? (
					<div
						className="border border-zinc-200 rounded-sm p-4"
						style={{ backgroundColor: backgroundColor }}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={qrDataUrl} alt="QR Code" width={size} height={size} />
					</div>
				) : (
					<div className="border-2 border-dashed border-zinc-300 rounded-sm p-16 text-zinc-400 text-center">
						<p>Enter text or URL to generate QR code</p>
					</div>
				)}
			</div>

			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
}
