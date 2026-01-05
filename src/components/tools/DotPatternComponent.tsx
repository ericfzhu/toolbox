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
		if (convertedImage && canvasRef.current) {
			const canvas = canvasRef.current;
			let mimeType: string;
			let filename: string;
			let quality = imageFormat === 'png' ? undefined : imageQuality;

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

			const dataUrl = canvas.toDataURL(mimeType, quality);
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
						setOriginalImage(canvas.toDataURL('image/jpeg', 0.9));
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
		<div className="flex gap-4">
			<div className="w-64 space-y-4">
				<div
					className={`border-2 border-dashed p-4 text-center ${isDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-300'}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
					<button onClick={() => fileInputRef.current?.click()} className="bg-zinc-200 hover:bg-zinc-300 py-2 px-4">
						Select Image
					</button>
					<p className="mt-2 text-sm text-zinc-600">or drag and drop an image here</p>
				</div>

				<div className="space-y-2">
					<label htmlFor="dotSize" className="block">
						Size: {dotSize}px
					</label>
					<input
						type="range"
						id="dotSize"
						value={dotSize}
						onChange={handleDotSizeChange}
						min="1"
						max="50"
						className="w-full accent-zinc-500"
					/>
				</div>

				<div className="space-y-2">
					<label className="block">Shape</label>
					<div className="grid grid-cols-3 gap-2">
						{(['circle', 'square', 'heart'] as const).map((shapeOption) => (
							<button
								key={shapeOption}
								onClick={() => setShape(shapeOption)}
								className={`p-2 border rounded-sm ${
									shape === shapeOption ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300' : 'border-zinc-300 hover:bg-zinc-100'
								}`}>
								{shapeOption.charAt(0).toUpperCase() + shapeOption.slice(1)}
							</button>
						))}
					</div>
				</div>

				{convertedImage && (
					<div className="space-y-4 border-t pt-4">
						<div className="space-y-2">
							<label className="block">Format</label>
							<div className="grid grid-cols-3 gap-2">
								{(['png', 'jpeg', 'webp'] as const).map((format) => (
									<button
										key={format}
										onClick={() => setImageFormat(format)}
										className={`p-2 border rounded-sm ${
											imageFormat === format
												? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300'
												: 'border-zinc-300 hover:bg-zinc-100'
										}`}>
										{format.toUpperCase()}
									</button>
								))}
							</div>
						</div>

						{imageFormat !== 'png' && (
							<div className="space-y-2">
								<label htmlFor="quality" className="block">
									Quality: {Math.round(imageQuality * 100)}%
								</label>
								<input
									type="range"
									id="quality"
									value={imageQuality}
									onChange={(e) => setImageQuality(Number(e.target.value))}
									min="0.1"
									max="1"
									step="0.01"
									className="w-full accent-zinc-500"
								/>
							</div>
						)}

						<button
							onClick={handleDownload}
							className="w-full bg-zinc-500 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2"
							aria-label="Download converted image">
							<IconDownload size={20} />
							<span>Download</span>
						</button>
					</div>
				)}
			</div>

			{!originalImage ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="border-2 border-dashed border-zinc-300 rounded-sm w-[70vw] h-[70vh] flex items-center justify-center text-zinc-500">
						Upload an image to get started
					</div>
				</div>
			) : (
				originalImage &&
				convertedImage &&
				imageDimensions && (
					<div className="flex-1 flex flex-col items-center">
						<div
							className="relative"
							ref={compareContainerRef}
							style={{
								width: imageDimensions.width >= imageDimensions.height ? '70vw' : 'auto',
								height: imageDimensions.height > imageDimensions.width ? '70vw' : 'auto',
								maxWidth: '100%',
								maxHeight: '70vh',
								aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
							}}>
							<Image
								src={originalImage}
								alt="Original"
								className="absolute top-0 left-0 select-none pointer-events-none object-contain"
								style={{
									clipPath: `inset(0 ${100 - comparePosition}% 0 0)`,
								}}
								fill
								sizes="50vw"
							/>
							<Image
								src={convertedImage}
								alt="Converted"
								className="absolute top-0 left-0 select-none pointer-events-none object-contain"
								style={{
									clipPath: `inset(0 0 0 ${comparePosition}%)`,
								}}
								fill
								sizes="50vw"
							/>
							<div
								ref={sliderRef}
								style={{
									position: 'absolute',
									top: 0,
									left: `${comparePosition}%`,
									width: '4px',
									height: '100%',
									backgroundColor: 'white',
									cursor: 'ew-resize',
								}}
								onMouseDown={handleSliderDrag}
							/>
						</div>
					</div>
				)
			)}
			<canvas ref={canvasRef} style={{ display: 'none' }} />
		</div>
	);
}
