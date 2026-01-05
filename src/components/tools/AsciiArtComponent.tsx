'use client';

import { Download } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { clamp, rgbToGrayscale } from '@/lib/color';
import { ImageDimensions } from '@/lib/types';

// Character sets for ASCII art
const CHAR_SETS = {
	detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'.',
	standard: '@%#*+=-:.',
	blocks: '█▓▒░ ',
	binary: '01',
	hex: '0123456789ABCDEF',
};

interface AsciiChar {
	char: string;
	color: {
		r: number;
		g: number;
		b: number;
	};
}

// Pure functions moved outside component to avoid recreating on each render
function applyFloydSteinbergDithering(data: number[], width: number, height: number, levels: number): number[] {
	const result = [...data];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			const oldPixel = result[idx];
			const newPixel = Math.round((oldPixel / 255) * (levels - 1)) * (255 / (levels - 1));
			result[idx] = newPixel;

			const error = oldPixel - newPixel;

			if (x + 1 < width) {
				result[idx + 1] = clamp(result[idx + 1] + error * (7 / 16), 0, 255);
			}
			if (y + 1 < height) {
				if (x > 0) {
					result[idx + width - 1] = clamp(result[idx + width - 1] + error * (3 / 16), 0, 255);
				}
				result[idx + width] = clamp(result[idx + width] + error * (5 / 16), 0, 255);
				if (x + 1 < width) {
					result[idx + width + 1] = clamp(result[idx + width + 1] + error * (1 / 16), 0, 255);
				}
			}
		}
	}
	return result;
}

function applyAtkinsonDithering(data: number[], width: number, height: number, levels: number): number[] {
	const result = [...data];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			const oldPixel = result[idx];
			const newPixel = Math.round((oldPixel / 255) * (levels - 1)) * (255 / (levels - 1));
			result[idx] = newPixel;

			const error = Math.floor((oldPixel - newPixel) / 8);

			const neighbors = [
				[x + 1, y],
				[x + 2, y],
				[x - 1, y + 1],
				[x, y + 1],
				[x + 1, y + 1],
				[x, y + 2],
			];

			neighbors.forEach(([nx, ny]) => {
				if (nx >= 0 && nx < width && ny < height) {
					const nidx = ny * width + nx;
					result[nidx] = clamp(result[nidx] + error, 0, 255);
				}
			});
		}
	}
	return result;
}

function applySobelEdgeDetection(data: number[], width: number, height: number, threshold: number): number[] {
	const result = new Array(width * height).fill(255);
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			const surroundingPixels = [
				data[idx - width - 1],
				data[idx - width],
				data[idx - width + 1],
				data[idx - 1],
				data[idx],
				data[idx + 1],
				data[idx + width - 1],
				data[idx + width],
				data[idx + width + 1],
			];

			// Sobel operators
			const gx =
				-1 * surroundingPixels[0] +
				1 * surroundingPixels[2] +
				-2 * surroundingPixels[3] +
				2 * surroundingPixels[5] +
				-1 * surroundingPixels[6] +
				1 * surroundingPixels[8];

			const gy =
				-1 * surroundingPixels[0] +
				-2 * surroundingPixels[1] +
				-1 * surroundingPixels[2] +
				1 * surroundingPixels[6] +
				2 * surroundingPixels[7] +
				1 * surroundingPixels[8];

			const magnitude = Math.sqrt(gx * gx + gy * gy);
			result[idx] = magnitude > threshold ? 0 : 255;
		}
	}
	return result;
}

export default function EnhancedAsciiArtComponent() {
	const [originalImage, setOriginalImage] = useState<string | null>(null);
	const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
	const [asciiData, setAsciiData] = useState<AsciiChar[][]>([]);
	const [settings, setSettings] = useState({
		width: 150,
		brightness: 0,
		contrast: 0,
		blur: 0,
		isDithering: true,
		ditherAlgorithm: 'floyd',
		isInverted: false,
		ignoreWhite: true,
		charSet: 'detailed',
		manualChar: '0',
		edgeMethod: 'none',
		edgeThreshold: 100,
		dogThreshold: 100,
		zoom: 100,
		isColor: true,
	});

	const fileInputRef = useRef<HTMLInputElement>(null);
	const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
	const displayCanvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [comparePosition, setComparePosition] = useState<number>(50);
	const [dragState, setDragState] = useState<'upload' | 'divider' | null>(null);

	// Handle file upload
	const handleFileUpload = useCallback((file: File) => {
		if (!file.type.startsWith('image/')) return;

		const reader = new FileReader();
		reader.onload = (e: ProgressEvent<FileReader>) => {
			const result = e.target?.result;
			if (typeof result === 'string') {
				const img = new window.Image();
				img.onload = () => {
					setImageDimensions({ width: img.width, height: img.height });
					setOriginalImage(result);
				};
				img.src = result;
			}
		};
		reader.readAsDataURL(file);
	}, []);

	// Generate ASCII art
	const generateAscii = useCallback(() => {
		if (!originalImage || !imageDimensions || !hiddenCanvasRef.current) return;

		setIsGenerating(true);
		const canvas = hiddenCanvasRef.current;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new window.Image();
		img.onload = () => {
			const fontAspectRatio = 0.55;
			const asciiWidth = settings.width;
			const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontAspectRatio);

			canvas.width = asciiWidth;
			canvas.height = asciiHeight;

			// Apply blur if needed
			ctx.filter = settings.blur > 0 ? `blur(${settings.blur}px)` : 'none';
			ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight);

			const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight);
			const data = imageData.data;

			// Get character set
			const gradient =
				CHAR_SETS[settings.charSet as keyof typeof CHAR_SETS] ||
				(settings.charSet === 'manual' ? settings.manualChar + ' ' : CHAR_SETS.detailed);

			const nLevels = gradient.length;
			const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

			// Convert to grayscale and apply adjustments
			let grayData = new Array(asciiWidth * asciiHeight);
			for (let i = 0; i < data.length; i += 4) {
				let lum = rgbToGrayscale(data[i], data[i + 1], data[i + 2]);
				if (settings.isInverted) lum = 255 - lum;
				lum = clamp(contrastFactor * (lum - 128) + 128 + settings.brightness, 0, 255);
				grayData[i / 4] = lum;
			}

			// Apply dithering if enabled
			if (settings.isDithering) {
				switch (settings.ditherAlgorithm) {
					case 'floyd':
						grayData = applyFloydSteinbergDithering(grayData, asciiWidth, asciiHeight, nLevels);
						break;
					case 'atkinson':
						grayData = applyAtkinsonDithering(grayData, asciiWidth, asciiHeight, nLevels);
						break;
				}
			}

			// Apply edge detection if enabled
			if (settings.edgeMethod === 'sobel') {
				grayData = applySobelEdgeDetection(grayData, asciiWidth, asciiHeight, settings.edgeThreshold);
			}

			// Convert to ASCII characters with color information
			const asciiGrid: AsciiChar[][] = [];
			for (let y = 0; y < asciiHeight; y++) {
				const row: AsciiChar[] = [];
				for (let x = 0; x < asciiWidth; x++) {
					const idx = y * asciiWidth + x;
					const pixelIdx = idx * 4;
					const gray = grayData[idx];

					if (settings.ignoreWhite && gray === 255) {
						row.push({
							char: ' ',
							color: { r: 255, g: 255, b: 255 },
						});
						continue;
					}

					const level = Math.floor((gray / 255) * (nLevels - 1));
					row.push({
						char: gradient[level],
						color: {
							r: data[pixelIdx],
							g: data[pixelIdx + 1],
							b: data[pixelIdx + 2],
						},
					});
				}
				asciiGrid.push(row);
			}

			setAsciiData(asciiGrid);
			setIsGenerating(false);
		};
		img.src = originalImage;
	}, [originalImage, imageDimensions, settings]);

	// Render ASCII art to canvas
	const renderAsciiToCanvas = useCallback(() => {
		if (!displayCanvasRef.current || !containerRef.current || asciiData.length === 0 || !imageDimensions) return;

		const canvas = displayCanvasRef.current;
		const container = containerRef.current;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const containerRect = container.getBoundingClientRect();

		// Set canvas size to match container
		canvas.width = containerRect.width;
		canvas.height = containerRect.height;

		// Calculate scaling to maintain aspect ratio
		const scale = Math.min(containerRect.width / imageDimensions.width, containerRect.height / imageDimensions.height);

		const displayWidth = imageDimensions.width * scale;
		const displayHeight = imageDimensions.height * scale;

		// Center the content
		const offsetX = (containerRect.width - displayWidth) / 2;
		const offsetY = (containerRect.height - displayHeight) / 2;

		// Calculate character dimensions
		const charWidth = displayWidth / asciiData[0].length;
		const charHeight = displayHeight / asciiData.length;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Set font based on character height
		ctx.font = `${charHeight}px monospace`;
		ctx.textBaseline = 'top';

		// Draw ASCII art
		for (let y = 0; y < asciiData.length; y++) {
			for (let x = 0; x < asciiData[y].length; x++) {
				const { char, color } = asciiData[y][x];
				if (settings.isColor) {
					ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
				} else {
					const gray = rgbToGrayscale(color.r, color.g, color.b);
					ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
				}
				ctx.fillText(char, offsetX + x * charWidth, offsetY + y * charHeight);
			}
		}
	}, [asciiData, imageDimensions, settings.isColor]);

	const handleDownload = useCallback(
		(type: 'txt' | 'jpg-bw' | 'jpg-color' | 'webp-bw' | 'webp-color') => {
			if (asciiData.length === 0 || !imageDimensions) return;

			if (type === 'txt') {
				// Download as text file
				const ascii = asciiData.map((row) => row.map((cell) => cell.char).join('')).join('\n');
				const blob = new Blob([ascii], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = 'ascii-art.txt';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
				return;
			}

			// For image downloads
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			// Calculate dimensions maintaining aspect ratio
			const scaleFactor = 2; // For better quality
			const borderMargin = 20 * scaleFactor;

			// Calculate text dimensions
			const fontSize = Math.max(8, Math.floor(imageDimensions.width / asciiData[0].length)) * scaleFactor;
			ctx.font = `${fontSize}px monospace`;

			// Measure the width of a sample line
			const sampleLine = asciiData[0].map((cell) => cell.char).join('');
			const maxLineWidth = ctx.measureText(sampleLine).width;

			// Calculate total dimensions
			const lineHeight = fontSize * 1.2;
			const textWidth = maxLineWidth;
			const textHeight = asciiData.length * lineHeight;

			// Set canvas size with margins
			canvas.width = textWidth + 2 * borderMargin;
			canvas.height = textHeight + 2 * borderMargin;

			// Fill background
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Set up text rendering
			ctx.font = `${fontSize}px monospace`;
			ctx.textBaseline = 'top';

			// Draw each character
			for (let y = 0; y < asciiData.length; y++) {
				for (let x = 0; x < asciiData[y].length; x++) {
					const { char, color } = asciiData[y][x];

					// Set color based on download type
					if (type.includes('color')) {
						ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
					} else {
						const gray = rgbToGrayscale(color.r, color.g, color.b);
						ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
					}

					// Calculate position with margin
					const xPos = borderMargin + x * (textWidth / asciiData[y].length);
					const yPos = borderMargin + y * lineHeight;

					ctx.fillText(char, xPos, yPos);
				}
			}

			// Convert to blob and download
			const format = type.startsWith('webp') ? 'image/webp' : 'image/jpeg';
			const extension = type.startsWith('webp') ? 'webp' : 'jpg';

			canvas.toBlob(
				(blob) => {
					if (!blob) return;
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `ascii-art.${extension}`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				},
				format,
				0.95, // Quality
			);
		},
		[asciiData, imageDimensions],
	);

	// Update canvas on changes
	useEffect(() => {
		renderAsciiToCanvas();
	}, [asciiData, renderAsciiToCanvas]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (dragState !== 'divider' || !containerRef.current) return;

			const containerRect = containerRef.current.getBoundingClientRect();
			const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
			setComparePosition(Math.min(Math.max(newPosition, 0), 100));
		};

		const handleMouseUp = () => {
			if (dragState === 'divider') setDragState(null);
		};

		if (dragState === 'divider') {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [dragState]);

	// Handle window resize
	useEffect(() => {
		const observer = new ResizeObserver(() => {
			renderAsciiToCanvas();
		});

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => observer.disconnect();
	}, [renderAsciiToCanvas]);

	// Generate ASCII art when settings change
	useEffect(() => {
		if (originalImage && imageDimensions) {
			generateAscii();
		}
	}, [originalImage, imageDimensions, settings, generateAscii]);

	return (
		<div className="flex flex-col md:flex-row gap-4">
			{/* Controls Sidebar */}
			<div className="w-full md:w-64 space-y-4">
				{/* File Upload */}
				<div
					className={`border-2 border-dashed p-4 text-center ${dragState === 'upload' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-300'}`}
					onDragOver={(e) => {
						e.preventDefault();
						setDragState('upload');
					}}
					onDragLeave={() => setDragState(null)}
					onDrop={(e) => {
						e.preventDefault();
						setDragState(null);
						const file = e.dataTransfer.files[0];
						if (file) handleFileUpload(file);
					}}>
					<input
						type="file"
						accept="image/*"
						className="hidden"
						ref={fileInputRef}
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) handleFileUpload(file);
						}}
					/>
					<button onClick={() => fileInputRef.current?.click()} className="bg-zinc-200 hover:bg-zinc-300 py-2 px-4">
						Select Image
					</button>
					<p className="mt-2 text-sm text-zinc-600">or drag and drop an image here</p>
				</div>

				{/* Settings Controls */}
				{imageDimensions && (
					<div className="space-y-4">
						{/* Width Control */}
						<div className="space-y-2">
							<label className="block text-sm">Width (chars): {settings.width}</label>
							<input
								type="range"
								value={settings.width}
								onChange={(e) => setSettings((s) => ({ ...s, width: parseInt(e.target.value) }))}
								min="20"
								max="300"
								className="w-full accent-zinc-500"
							/>
						</div>

						{/* Brightness */}
						<div className="space-y-2">
							<label className="block text-sm">Brightness: {settings.brightness}</label>
							<input
								type="range"
								value={settings.brightness}
								onChange={(e) => setSettings((s) => ({ ...s, brightness: parseInt(e.target.value) }))}
								min="-100"
								max="100"
								className="w-full accent-zinc-500"
							/>
						</div>

						{/* Contrast */}
						<div className="space-y-2">
							<label className="block text-sm">Contrast: {settings.contrast}</label>
							<input
								type="range"
								value={settings.contrast}
								onChange={(e) => setSettings((s) => ({ ...s, contrast: parseInt(e.target.value) }))}
								min="-100"
								max="100"
								className="w-full accent-zinc-500"
							/>
						</div>

						{/* Blur */}
						<div className="space-y-2">
							<label className="block text-sm">Blur: {settings.blur}px</label>
							<input
								type="range"
								value={settings.blur}
								onChange={(e) => setSettings((s) => ({ ...s, blur: parseFloat(e.target.value) }))}
								min="0"
								max="10"
								step="0.1"
								className="w-full accent-zinc-500"
							/>
						</div>

						{/* Dithering Controls */}
						<div className="space-y-2">
							<div className="flex items-center">
								<input
									type="checkbox"
									id="dithering"
									checked={settings.isDithering}
									onChange={(e) => setSettings((s) => ({ ...s, isDithering: e.target.checked }))}
									className="mr-2"
								/>
								<label htmlFor="dithering" className="text-sm">
									Enable Dithering
								</label>
							</div>

							{settings.isDithering && (
								<select
									value={settings.ditherAlgorithm}
									onChange={(e) => setSettings((s) => ({ ...s, ditherAlgorithm: e.target.value }))}
									className="w-full p-1 border border-zinc-300 rounded-sm">
									<option value="floyd">Floyd-Steinberg</option>
									<option value="atkinson">Atkinson</option>
								</select>
							)}
						</div>

						{/* Edge Detection */}
						<div className="space-y-2">
							<label className="block text-sm">Edge Detection</label>
							<select
								value={settings.edgeMethod}
								onChange={(e) => setSettings((s) => ({ ...s, edgeMethod: e.target.value }))}
								className="w-full p-1 border border-zinc-300 rounded-sm">
								<option value="none">None</option>
								<option value="sobel">Sobel</option>
								<option value="dog">DoG (Contour)</option>
							</select>

							{settings.edgeMethod !== 'none' && (
								<div className="space-y-2">
									<label className="block text-sm">
										Threshold: {settings.edgeMethod === 'sobel' ? settings.edgeThreshold : settings.dogThreshold}
									</label>
									<input
										type="range"
										value={settings.edgeMethod === 'sobel' ? settings.edgeThreshold : settings.dogThreshold}
										onChange={(e) =>
											setSettings((s) => ({
												...s,
												[settings.edgeMethod === 'sobel' ? 'edgeThreshold' : 'dogThreshold']: parseInt(e.target.value),
											}))
										}
										min="0"
										max="255"
										className="w-full accent-zinc-500"
									/>
								</div>
							)}
						</div>

						{/* Character Set */}
						<div className="space-y-2">
							<label className="block text-sm">Character Set</label>
							<select
								value={settings.charSet}
								onChange={(e) => setSettings((s) => ({ ...s, charSet: e.target.value }))}
								className="w-full p-1 border border-zinc-300 rounded-sm">
								<option value="detailed">Detailed</option>
								<option value="standard">Standard</option>
								<option value="blocks">Blocks</option>
								<option value="binary">Binary</option>
								<option value="hex">Hex</option>
								<option value="manual">Manual</option>
							</select>

							{settings.charSet === 'manual' && (
								<input
									type="text"
									maxLength={1}
									value={settings.manualChar}
									onChange={(e) => setSettings((s) => ({ ...s, manualChar: e.target.value }))}
									className="w-full p-1 border border-zinc-300 rounded-sm"
								/>
							)}
						</div>

						{/* Color Toggle */}
						<div className="flex space-x-2 mt-4">
							<button
								onClick={() => setSettings((s) => ({ ...s, isColor: true }))}
								className={`flex-1 border p-2 rounded-sm ${
									settings.isColor ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300' : 'border-zinc-300 hover:bg-zinc-100'
								}`}>
								Color
							</button>
							<button
								onClick={() => setSettings((s) => ({ ...s, isColor: false }))}
								className={`flex-1 border p-2 rounded-sm ${
									!settings.isColor ? 'bg-zinc-200 border-zinc-400 hover:bg-zinc-300' : 'border-zinc-300 hover:bg-zinc-100'
								}`}>
								B&W
							</button>
						</div>

						{/* Download Buttons */}
						{asciiData.length > 0 && (
							<div className="space-y-2">
								<button
									onClick={() => handleDownload('txt')}
									className="w-full bg-zinc-500 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2">
									<Download size={20} />
									<span>TXT</span>
								</button>
								<button
									onClick={() => handleDownload('jpg-bw')}
									className="w-full bg-zinc-500 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2">
									<Download size={20} />
									<span>JPG (B&W)</span>
								</button>
								<button
									onClick={() => handleDownload('jpg-color')}
									className="w-full bg-zinc-500 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2">
									<Download size={20} />
									<span>JPG (Color)</span>
								</button>
								<button
									onClick={() => handleDownload('webp-bw')}
									className="w-full bg-zinc-500 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2">
									<Download size={20} />
									<span>WebP (B&W)</span>
								</button>
								<button
									onClick={() => handleDownload('webp-color')}
									className="w-full bg-zinc-500 hover:bg-zinc-700 text-white p-2 rounded-sm flex items-center justify-center gap-2">
									<Download size={20} />
									<span>WebP (Color)</span>
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col items-center">
				{!originalImage ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="border-2 border-dashed border-zinc-300 rounded-sm w-[70vw] h-[70vh] flex items-center justify-center text-zinc-500">
							Upload an image to get started
						</div>
					</div>
				) : (
					imageDimensions && (
						<div
							ref={containerRef}
							className="relative"
							style={{
								width: imageDimensions.width >= imageDimensions.height ? '70vw' : 'auto',
								height: imageDimensions.height > imageDimensions.width ? '70vh' : 'auto',
								maxWidth: '100%',
								maxHeight: '70vh',
								aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
							}}>
							{/* Original Image */}
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

							{/* ASCII Art Canvas */}
							<canvas
								ref={displayCanvasRef}
								className="absolute top-0 left-0 select-none pointer-events-none object-contain"
								style={{
									clipPath: `inset(0 0 0 ${comparePosition}%)`,
								}}
							/>

							{/* Divider */}
							<div
								className="absolute top-0 bg-white/80 w-1 h-full cursor-ew-resize"
								style={{
									left: `${comparePosition}%`,
								}}
								onMouseDown={() => setDragState('divider')}
							/>
						</div>
					)
				)}

				{/* Hidden Canvas for Processing */}
				<canvas ref={hiddenCanvasRef} className="hidden" />
			</div>
		</div>
	);
}
