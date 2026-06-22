'use client';

import { useDownload, useKeyboardShortcut } from '@/hooks';
import { IconDownload } from '@tabler/icons-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';

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
	const generationIdRef = useRef(0);
	const { downloadDataUrl } = useDownload();

	const generateQrCode = useCallback(async () => {
		const generationId = generationIdRef.current + 1;
		generationIdRef.current = generationId;

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
			if (generationId !== generationIdRef.current) return;
			setQrDataUrl(dataUrl);
			setError(null);
		} catch (err) {
			if (generationId !== generationIdRef.current) return;
			setError('Failed to generate QR code. Text may be too long.');
			setQrDataUrl(null);
		}
	}, [text, size, errorCorrection, foregroundColor, backgroundColor]);

	useEffect(() => {
		generateQrCode();
	}, [generateQrCode]);

	const handleDownload = useCallback(
		(format: 'png' | 'svg') => {
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
		},
		[text, errorCorrection, foregroundColor, backgroundColor, qrDataUrl, downloadDataUrl],
	);

	const handleDownloadPng = useCallback(() => handleDownload('png'), [handleDownload]);

	// Keyboard shortcut: Ctrl+S to download PNG
	useKeyboardShortcut({ key: 's', modifiers: ['ctrl'], callback: handleDownloadPng, disabled: !qrDataUrl });

	return (
		<div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">
			<div className="w-full max-w-sm shrink-0 space-y-4 lg:w-80">
				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-4 rounded-[20px] bg-zinc-50 p-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-900">Text or URL</label>
							<textarea
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="Enter text or URL..."
								className="h-28 w-full resize-none rounded-[20px] bg-white p-3 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label className="block text-sm font-medium text-zinc-900">Size</label>
								<span className="tabular-nums text-sm text-zinc-500">{size}px</span>
							</div>
							<input
								type="range"
								value={size}
								onChange={(e) => setSize(Number(e.target.value))}
								min={128}
								max={512}
								step={32}
								className="w-full accent-zinc-900"
							/>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-900">Error Correction</label>
							<select
								value={errorCorrection}
								onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrectionLevel)}
								className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 pr-10 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
								<option value="L">Low (~7%)</option>
								<option value="M">Medium (~15%)</option>
								<option value="Q">Quartile (~25%)</option>
								<option value="H">High (~30%)</option>
							</select>
							<p className="text-xs leading-5 text-zinc-500">Higher correction allows more damage but creates denser codes</p>
						</div>

						<div className="space-y-3">
							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-900">Foreground</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={foregroundColor}
										onChange={(e) => setForegroundColor(e.target.value)}
										className="h-11 w-11 shrink-0 cursor-pointer rounded-2xl bg-white p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]"
									/>
									<input
										type="text"
										value={foregroundColor}
										onChange={(e) => setForegroundColor(e.target.value)}
										className="min-h-11 min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
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
										className="h-11 w-11 shrink-0 cursor-pointer rounded-2xl bg-white p-1 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]"
									/>
									<input
										type="text"
										value={backgroundColor}
										onChange={(e) => setBackgroundColor(e.target.value)}
										className="min-h-11 min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 font-mono text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
									/>
								</div>
							</div>
						</div>

						{qrDataUrl && (
							<div className="grid gap-2 border-t border-zinc-200 pt-4">
								<button
									onClick={() => handleDownload('png')}
									className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
									<IconDownload size={18} />
									<span>Download PNG</span>
									<span className="ml-1 text-xs text-zinc-400">⌘S</span>
								</button>
								<button
									onClick={() => handleDownload('svg')}
									className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.96]">
									<IconDownload size={18} />
									<span>Download SVG</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="flex min-h-[24rem] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[32px] bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)]">
				{error ? (
					<div className="rounded-[24px] bg-red-50 px-5 py-4 text-center text-sm text-red-600 shadow-[0px_0px_0px_1px_rgba(220,38,38,0.16)]">
						{error}
					</div>
				) : qrDataUrl ? (
					<div
						className="rounded-[24px] p-5 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.1),0px_12px_30px_rgba(0,0,0,0.08)]"
						style={{ backgroundColor: backgroundColor }}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={qrDataUrl}
							alt="QR Code"
							width={size}
							height={size}
							className="h-auto max-w-full outline outline-1 -outline-offset-1 outline-black/10"
							style={{ maxWidth: `${size}px` }}
						/>
					</div>
				) : (
					<div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-sm text-zinc-500 sm:text-base">
						<p>Enter text or URL to generate QR code</p>
					</div>
				)}
			</div>

			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
}
