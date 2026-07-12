'use client';

import { IconDownload } from '@tabler/icons-react';
import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

type ShapeType = 'circle' | 'square' | 'heart';
type ImageFormat = 'png' | 'jpeg' | 'webp';

const MAX_IMAGE_DIMENSION = 2048;

export default function DotPatternComponent() {
	const [originalImage, setOriginalImage] = useState<string | null>(null);
	const [convertedImage, setConvertedImage] = useState<string | null>(null);
	const [dotSize, setDotSize] = useState<number>(5);
	const [shape, setShape] = useState<ShapeType>('circle');
	const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
	const [imageQuality, setImageQuality] = useState<number>(0.92);
	const [comparePosition, setComparePosition] = useState<number>(50);
	const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const convertedCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const compareContainerRef = useRef<HTMLDivElement>(null);
	const sliderRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Cleanup on unmount to prevent memory leaks
	useEffect(() => {
		const canvas = canvasRef.current;

		return () => {
			setOriginalImage(null);
			setConvertedImage(null);
			setImageDimensions(null);
			convertedCanvasRef.current = null;
			if (canvas) {
				const ctx = canvas.getContext('2d');
				ctx?.clearRect(0, 0, canvas.width, canvas.height);
				canvas.width = 0;
				canvas.height = 0;
			}
		};
	}, []);

	const handleImageUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// processFile is a hoisted helper whose dependencies are only stable setters and refs.
			// eslint-disable-next-line react-hooks/immutability
			processFile(file);
		}
	}, []);

	const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		const file = event.dataTransfer.files[0];
		if (file) {
			processFile(file);
		}
	}, []);

	const handleDotSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setDotSize(Number(event.target.value));
	}, []);

	const drawShape = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: ShapeType) => {
		switch (shape) {
			case 'circle':
				ctx.beginPath();
				ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
				ctx.fill();
				break;
			case 'square':
				ctx.fillRect(x, y, size, size);
				break;
			case 'heart':
				const topX = x + size / 2;
				const topY = y + size / 4; // Moved top point up
				const scale = size / 18; // Increased overall scale

				ctx.beginPath();
				ctx.moveTo(topX, topY);
				// Left curve
				ctx.bezierCurveTo(
					topX - 8 * scale,
					topY - 5 * scale, // Control point 1
					topX - 16 * scale,
					topY + 5 * scale, // Control point 2
					topX,
					topY + 18 * scale, // Bottom point moved down
				);
				// Right curve
				ctx.bezierCurveTo(
					topX + 18 * scale,
					topY + 5 * scale, // Control point 1
					topX + 6 * scale,
					topY - 5 * scale, // Control point 2
					topX,
					topY,
				);
				ctx.fill();
				break;
		}
	}, []);

	const convertImage = useCallback(() => {
		if (!originalImage || !canvasRef.current) return;

		const img = new window.Image();
		img.onload = () => {
			const canvas = canvasRef.current!;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			canvas.width = img.width;
			canvas.height = img.height;
			setImageDimensions({ width: img.width, height: img.height });

			// Draw original image
			ctx.drawImage(img, 0, 0);

			// Get image data
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			// Create a new canvas for the dot pattern
			const dotCanvas = document.createElement('canvas');
			dotCanvas.width = canvas.width;
			dotCanvas.height = canvas.height;
			const dotCtx = dotCanvas.getContext('2d')!;

			// Create pattern
			for (let y = 0; y < canvas.height; y += dotSize) {
				for (let x = 0; x < canvas.width; x += dotSize) {
					let r = 0,
						g = 0,
						b = 0,
						count = 0;

					// Calculate average color for the area
					for (let dy = 0; dy < dotSize && y + dy < canvas.height; dy++) {
						for (let dx = 0; dx < dotSize && x + dx < canvas.width; dx++) {
							const i = ((y + dy) * canvas.width + (x + dx)) * 4;
							r += data[i];
							g += data[i + 1];
							b += data[i + 2];
							count++;
						}
					}

					// Draw the shape
					dotCtx.fillStyle = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
					drawShape(dotCtx, x, y, dotSize, shape);
				}
			}

			// Set the converted image
			convertedCanvasRef.current = dotCanvas;
			setConvertedImage(dotCanvas.toDataURL('image/png'));
		};
		img.src = originalImage;
	}, [originalImage, dotSize, shape, drawShape]);

	const handleSliderDrag = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const container = compareContainerRef.current;
			if (!container || !imageDimensions) return;

			const containerRect = container.getBoundingClientRect();

			const handleDrag = (e: MouseEvent) => {
				const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
				setComparePosition(Math.min(Math.max(newPosition, 0), 100));
			};

			const handleDragEnd = () => {
				document.removeEventListener('mousemove', handleDrag);
				document.removeEventListener('mouseup', handleDragEnd);
			};

			document.addEventListener('mousemove', handleDrag);
			document.addEventListener('mouseup', handleDragEnd);
		},
		[imageDimensions],
	);

	const handleDownload = useCallback(() => {
		if (convertedImage) {
			const canvas = convertedCanvasRef.current;
			let mimeType: string;
			let filename: string;
			const quality = imageFormat === 'png' ? undefined : imageQuality;

			switch (imageFormat) {
				case 'jpeg':
					mimeType = 'image/jpeg';
					filename = 'converted-image.jpg';
					break;
				case 'webp':
					mimeType = 'image/webp';
					filename = 'converted-image.webp';
					break;
				default:
					mimeType = 'image/png';
					filename = 'converted-image.png';
			}

			const dataUrl = canvas ? canvas.toDataURL(mimeType, quality) : convertedImage;
			const link = document.createElement('a');
			link.href = dataUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}, [convertedImage, imageFormat, imageQuality]);

	function processFile(file: File) {
		if (!file.type.startsWith('image/')) return;

		// Clear previous data to free memory
		setConvertedImage(null);
		setOriginalImage(null);
		convertedCanvasRef.current = null;

		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			if (!dataUrl) return;

			// Check if image needs resizing
			const img = new window.Image();
			img.onload = () => {
				let { width, height } = img;

				if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
					const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
					width = Math.round(width * scale);
					height = Math.round(height * scale);

					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0, width, height);
						setOriginalImage(canvas.toDataURL('image/png'));
						return;
					}
				}

				setOriginalImage(dataUrl);
			};
			img.src = dataUrl;
		};
		reader.readAsDataURL(file);
	}

	useEffect(() => {
		if (originalImage) {
			convertImage();
		}
	}, [originalImage, dotSize, shape, convertImage]);

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
			<div className="w-full max-w-sm space-y-4 lg:sticky lg:top-8 lg:w-80 lg:self-start">
				<div
					className={`rounded-[28px] p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] transition-[box-shadow,transform,background-color] duration-200 ease-out ${
						isDragging
							? 'bg-zinc-100 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)]'
							: 'bg-white'
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<div
						className={`rounded-[20px] border border-dashed px-5 py-6 text-center transition-[border-color,background-color] duration-200 ease-out ${
							isDragging ? 'border-zinc-600 bg-zinc-50' : 'border-zinc-300 bg-zinc-50/60'
						}`}>
						<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
						<button
							onClick={() => fileInputRef.current?.click()}
							className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
							Select Image
						</button>
						<p className="mt-3 text-sm text-zinc-500">or drag and drop an image here</p>
					</div>
				</div>

				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-5 rounded-[20px] bg-zinc-50 px-4 py-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label htmlFor="dotSize" className="block text-sm font-medium text-zinc-900">
									Dot size
								</label>
								<span className="tabular-nums text-sm text-zinc-500">{dotSize}px</span>
							</div>
							<input
								type="range"
								id="dotSize"
								value={dotSize}
								onChange={handleDotSizeChange}
								min="1"
								max="50"
								className="w-full accent-zinc-900"
							/>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-900">Shape</label>
							<div className="grid grid-cols-3 gap-2">
								{(['circle', 'square', 'heart'] as const).map((shapeOption) => (
									<button
										key={shapeOption}
										onClick={() => setShape(shapeOption)}
										className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-medium capitalize transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
											shape === shapeOption
												? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)]'
												: 'bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-zinc-100'
										}`}>
										{shapeOption}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{convertedImage && (
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="space-y-5 rounded-[20px] bg-zinc-50 px-4 py-4">
							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-900">Export format</label>
								<div className="grid grid-cols-3 gap-2">
									{(['png', 'jpeg', 'webp'] as const).map((format) => (
										<button
											key={format}
											onClick={() => setImageFormat(format)}
											className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-medium uppercase tracking-[0.08em] transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
												imageFormat === format
													? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)]'
													: 'bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-zinc-100'
											}`}>
											{format}
										</button>
									))}
								</div>
							</div>

							{imageFormat !== 'png' && (
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-4">
										<label htmlFor="quality" className="block text-sm font-medium text-zinc-900">
											Quality
										</label>
										<span className="tabular-nums text-sm text-zinc-500">{Math.round(imageQuality * 100)}%</span>
									</div>
									<input
										type="range"
										id="quality"
										value={imageQuality}
										onChange={(e) => setImageQuality(Number(e.target.value))}
										min="0.1"
										max="1"
										step="0.01"
										className="w-full accent-zinc-900"
									/>
								</div>
							)}

							<button
								onClick={handleDownload}
								className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]"
								aria-label="Download converted image">
								<IconDownload size={20} />
								<span>Download</span>
							</button>
						</div>
					</div>
				)}
			</div>

			{!originalImage ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="flex h-[60vh] w-full items-center justify-center rounded-[32px] bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)]">
						<div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-pretty text-zinc-500">
							Upload an image to preview the original and dot pattern side by side.
						</div>
					</div>
				</div>
			) : (
				originalImage &&
				convertedImage &&
				imageDimensions && (
					<div className="flex-1 flex flex-col items-center">
						<div
							className="relative overflow-hidden rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]"
							ref={compareContainerRef}
							style={{
								width: imageDimensions.width >= imageDimensions.height ? '100%' : 'auto',
								height: imageDimensions.height > imageDimensions.width ? '100%' : 'auto',
								maxWidth: '100%',
								maxHeight: '70vh',
								aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
							}}>
							<div className="pointer-events-none absolute left-6 top-6 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
								Original
							</div>
							<div className="pointer-events-none absolute right-6 top-6 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
								Dot pattern
							</div>
							<Image
								src={originalImage}
								alt="Original"
								className="absolute top-3 left-3 select-none pointer-events-none object-contain outline outline-1 -outline-offset-1 outline-black/10"
								style={{
									clipPath: `inset(0 ${100 - comparePosition}% 0 0)`,
								}}
								fill
								sizes="70vw"
							/>
							<Image
								src={convertedImage}
								alt="Converted"
								className="absolute top-3 left-3 select-none pointer-events-none object-contain outline outline-1 -outline-offset-1 outline-black/10"
								style={{
									clipPath: `inset(0 0 0 ${comparePosition}%)`,
								}}
								fill
								sizes="70vw"
							/>
							<div
								ref={sliderRef}
								className="group absolute top-3 z-20"
								style={{
									left: `${comparePosition}%`,
									height: 'calc(100% - 24px)',
									width: '40px',
									transform: 'translateX(-20px)',
									cursor: 'ew-resize',
								}}
								onMouseDown={handleSliderDrag}>
								<div className="relative mx-auto h-full w-1 rounded-full bg-white/95 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_4px_10px_rgba(0,0,0,0.18)] transition-[background-color,box-shadow] duration-200 ease-out group-hover:bg-white" />
								<div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_8px_20px_rgba(0,0,0,0.14)] transition-[transform,box-shadow] duration-200 ease-out group-hover:scale-105 group-active:scale-[0.96]">
									<>
										<span className="-mr-0.5">L</span>
										<span className="-ml-0.5">R</span>
									</>
								</div>
							</div>
							<div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white tabular-nums backdrop-blur-sm">
								{Math.round(comparePosition)}%
							</div>
						</div>
					</div>
				)
			)}
			<canvas ref={canvasRef} style={{ display: 'none' }} />
		</div>
	);
}
