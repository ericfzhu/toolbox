'use client';

import { IconDownload } from '@tabler/icons-react';
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

function createGaussianKernel(sigma: number): number[] {
	const radius = Math.max(1, Math.ceil(sigma * 3));
	const kernel: number[] = [];
	let total = 0;

	for (let offset = -radius; offset <= radius; offset++) {
		const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
		kernel.push(weight);
		total += weight;
	}

	return kernel.map((weight) => weight / total);
}

function applySeparableGaussianBlur(data: number[], width: number, height: number, sigma: number): Float32Array {
	const kernel = createGaussianKernel(sigma);
	const radius = Math.floor(kernel.length / 2);
	const horizontal = new Float32Array(data.length);
	const result = new Float32Array(data.length);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let value = 0;
			for (let offset = -radius; offset <= radius; offset++) {
				const sampleX = clamp(x + offset, 0, width - 1);
				value += data[y * width + sampleX] * kernel[offset + radius];
			}
			horizontal[y * width + x] = value;
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let value = 0;
			for (let offset = -radius; offset <= radius; offset++) {
				const sampleY = clamp(y + offset, 0, height - 1);
				value += horizontal[sampleY * width + x] * kernel[offset + radius];
			}
			result[y * width + x] = value;
		}
	}

	return result;
}

function applyDifferenceOfGaussians(data: number[], width: number, height: number, threshold: number): number[] {
	const narrowBlur = applySeparableGaussianBlur(data, width, height, 0.8);
	const wideBlur = applySeparableGaussianBlur(data, width, height, 1.6);
	const differences = new Float32Array(data.length);
	let maxDifference = 0;

	for (let i = 0; i < data.length; i++) {
		const difference = Math.abs(narrowBlur[i] - wideBlur[i]);
		differences[i] = difference;
		maxDifference = Math.max(maxDifference, difference);
	}

	if (maxDifference === 0) return new Array(data.length).fill(255);

	return Array.from(differences, (difference) => ((difference / maxDifference) * 255 >= threshold ? 0 : 255));
}

// Maximum image dimension to prevent memory issues
const MAX_IMAGE_DIMENSION = 2048;

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

	// Cleanup on unmount to prevent memory leaks
	useEffect(() => {
		const hiddenCanvas = hiddenCanvasRef.current;
		const displayCanvas = displayCanvasRef.current;

		return () => {
			setOriginalImage(null);
			setImageDimensions(null);
			setAsciiData([]);
			// Clear canvas contexts
			if (hiddenCanvas) {
				const ctx = hiddenCanvas.getContext('2d');
				ctx?.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
				hiddenCanvas.width = 0;
				hiddenCanvas.height = 0;
			}
			if (displayCanvas) {
				const ctx = displayCanvas.getContext('2d');
				ctx?.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
				displayCanvas.width = 0;
				displayCanvas.height = 0;
			}
		};
	}, []);

	// Handle file upload with automatic resizing for large images
	const handleFileUpload = useCallback((file: File) => {
		if (!file.type.startsWith('image/')) return;

		// Clear previous data to free memory
		setAsciiData([]);
		setOriginalImage(null);

		const reader = new FileReader();
		reader.onload = (e: ProgressEvent<FileReader>) => {
			const result = e.target?.result;
			if (typeof result === 'string') {
				const img = new window.Image();
				img.onload = () => {
					let { width, height } = img;

					// Resize if image is too large to prevent memory issues
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
							const resizedDataUrl = canvas.toDataURL('image/png');
							setImageDimensions({ width, height });
							setOriginalImage(resizedDataUrl);
							return;
						}
					}

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

			// Edge detection produces a binary image, so dithering only applies to normal tone conversion.
			if (settings.edgeMethod === 'sobel') {
				grayData = applySobelEdgeDetection(grayData, asciiWidth, asciiHeight, settings.edgeThreshold);
			} else if (settings.edgeMethod === 'dog') {
				grayData = applyDifferenceOfGaussians(grayData, asciiWidth, asciiHeight, settings.dogThreshold);
			} else if (settings.isDithering) {
				switch (settings.ditherAlgorithm) {
					case 'floyd':
						grayData = applyFloydSteinbergDithering(grayData, asciiWidth, asciiHeight, nLevels);
						break;
					case 'atkinson':
						grayData = applyAtkinsonDithering(grayData, asciiWidth, asciiHeight, nLevels);
						break;
				}
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

			// Determine if color output is requested
			const useColor = type.includes('color');

			// For image downloads
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			// Calculate dimensions maintaining aspect ratio
			const scaleFactor = 2; // For better quality
			const borderMargin = 20 * scaleFactor;

			// Calculate text dimensions - need a temp canvas to measure before setting final size
			const tempCanvas = document.createElement('canvas');
			const tempCtx = tempCanvas.getContext('2d');
			if (!tempCtx) return;

			const fontSize = Math.max(8, Math.floor(imageDimensions.width / asciiData[0].length)) * scaleFactor;
			tempCtx.font = `${fontSize}px monospace`;

			// Measure the width of a sample line
			const sampleLine = asciiData[0].map((cell) => cell.char).join('');
			const maxLineWidth = tempCtx.measureText(sampleLine).width;

			// Calculate total dimensions
			const lineHeight = fontSize * 1.2;
			const textWidth = maxLineWidth;
			const textHeight = asciiData.length * lineHeight;

			// Set canvas size with margins (this resets context state)
			canvas.width = textWidth + 2 * borderMargin;
			canvas.height = textHeight + 2 * borderMargin;

			// Re-establish context state after canvas resize
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Set up text rendering
			ctx.font = `${fontSize}px monospace`;
			ctx.textBaseline = 'top';

			// Calculate character width for positioning
			const charWidth = textWidth / asciiData[0].length;

			// Draw each character
			for (let y = 0; y < asciiData.length; y++) {
				for (let x = 0; x < asciiData[y].length; x++) {
					const { char, color } = asciiData[y][x];

					// Skip spaces for performance
					if (char === ' ') continue;

					// Set color based on download type
					if (useColor) {
						ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
					} else {
						const gray = Math.round(rgbToGrayscale(color.r, color.g, color.b));
						ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
					}

					// Calculate position with margin
					const xPos = borderMargin + x * charWidth;
					const yPos = borderMargin + y * lineHeight;

					ctx.fillText(char, xPos, yPos);
				}
			}

			// Convert to blob and download - use PNG for color to preserve quality
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
				0.95,
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
		<div className="flex w-full min-h-0 flex-col gap-5 lg:h-[calc(100svh-18rem)] lg:flex-row lg:gap-6">
			<div className="w-full max-w-md shrink-0 space-y-4 lg:h-full lg:w-96 lg:overflow-y-auto lg:pr-1">
				<div
					className={`rounded-[28px] p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] transition-[box-shadow,background-color] duration-200 ease-out ${
						dragState === 'upload'
							? 'bg-zinc-100 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)]'
							: 'bg-white'
					}`}
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
					<div
						className={`rounded-[20px] border border-dashed px-5 py-5 text-center transition-[border-color,background-color] duration-200 ease-out ${
							dragState === 'upload' ? 'border-zinc-600 bg-zinc-50' : 'border-zinc-300 bg-zinc-50/60'
						}`}>
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
						<button
							onClick={() => fileInputRef.current?.click()}
							className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
							Select Image
						</button>
						<p className="mt-3 text-sm text-zinc-500">or drag and drop an image here</p>
					</div>
				</div>

				{imageDimensions && (
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="space-y-4 rounded-[20px] bg-zinc-50 px-4 py-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-4">
									<label className="block text-sm font-medium text-zinc-900">Width (chars)</label>
									<span className="tabular-nums text-sm text-zinc-500">{settings.width}</span>
								</div>
								<input
									type="range"
									value={settings.width}
									onChange={(e) => setSettings((s) => ({ ...s, width: parseInt(e.target.value) }))}
									min="20"
									max="300"
									className="w-full accent-zinc-900"
								/>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between gap-4">
									<label className="block text-sm font-medium text-zinc-900">Brightness</label>
									<span className="tabular-nums text-sm text-zinc-500">{settings.brightness}</span>
								</div>
								<input
									type="range"
									value={settings.brightness}
									onChange={(e) => setSettings((s) => ({ ...s, brightness: parseInt(e.target.value) }))}
									min="-100"
									max="100"
									className="w-full accent-zinc-900"
								/>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between gap-4">
									<label className="block text-sm font-medium text-zinc-900">Contrast</label>
									<span className="tabular-nums text-sm text-zinc-500">{settings.contrast}</span>
								</div>
								<input
									type="range"
									value={settings.contrast}
									onChange={(e) => setSettings((s) => ({ ...s, contrast: parseInt(e.target.value) }))}
									min="-100"
									max="100"
									className="w-full accent-zinc-900"
								/>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between gap-4">
									<label className="block text-sm font-medium text-zinc-900">Blur</label>
									<span className="tabular-nums text-sm text-zinc-500">{settings.blur}px</span>
								</div>
								<input
									type="range"
									value={settings.blur}
									onChange={(e) => setSettings((s) => ({ ...s, blur: parseFloat(e.target.value) }))}
									min="0"
									max="10"
									step="0.1"
									className="w-full accent-zinc-900"
								/>
							</div>

							<div className="space-y-2">
								<label className="flex min-h-11 items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
									<input
										type="checkbox"
										id="dithering"
										checked={settings.isDithering}
										onChange={(e) => setSettings((s) => ({ ...s, isDithering: e.target.checked }))}
										className="h-4 w-4 accent-zinc-900"
									/>
									<span>Enable Dithering</span>
								</label>

								{settings.isDithering && (
									<select
										value={settings.ditherAlgorithm}
										onChange={(e) => setSettings((s) => ({ ...s, ditherAlgorithm: e.target.value }))}
										className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 pr-10 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
										<option value="floyd">Floyd-Steinberg</option>
										<option value="atkinson">Atkinson</option>
									</select>
								)}
							</div>

							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-900">Edge Detection</label>
								<select
									value={settings.edgeMethod}
									onChange={(e) => setSettings((s) => ({ ...s, edgeMethod: e.target.value }))}
									className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 pr-10 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
									<option value="none">None</option>
									<option value="sobel">Sobel</option>
									<option value="dog">DoG (Contour)</option>
								</select>

								{settings.edgeMethod !== 'none' && (
									<div className="space-y-2">
										<div className="flex items-center justify-between gap-4">
											<label className="block text-sm text-zinc-700">Threshold</label>
											<span className="tabular-nums text-sm text-zinc-500">
												{settings.edgeMethod === 'sobel' ? settings.edgeThreshold : settings.dogThreshold}
											</span>
										</div>
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
											className="w-full accent-zinc-900"
										/>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-900">Character Set</label>
								<select
									value={settings.charSet}
									onChange={(e) => setSettings((s) => ({ ...s, charSet: e.target.value }))}
									className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 pr-10 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
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
										className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
									/>
								)}
							</div>

							<div className="grid grid-cols-2 gap-2">
								<button
									onClick={() => setSettings((s) => ({ ...s, isColor: true }))}
									className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-medium transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
										settings.isColor
											? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)]'
											: 'bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-zinc-100'
									}`}>
									Color
								</button>
								<button
									onClick={() => setSettings((s) => ({ ...s, isColor: false }))}
									className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-medium transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
										!settings.isColor
											? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)]'
											: 'bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-zinc-100'
									}`}>
									B&W
								</button>
							</div>
						</div>
					</div>
				)}

				{asciiData.length > 0 && (
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="space-y-2 rounded-[20px] bg-zinc-50 p-4">
							<button
								onClick={() => handleDownload('txt')}
								className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
								<IconDownload size={18} />
								<span>TXT</span>
							</button>
							<div className="grid grid-cols-2 gap-2">
								{[
									['jpg-bw', 'JPG (B&W)'],
									['jpg-color', 'JPG (Color)'],
									['webp-bw', 'WebP (B&W)'],
									['webp-color', 'WebP (Color)'],
								].map(([type, label]) => (
									<button
										key={type}
										onClick={() => handleDownload(type as 'txt' | 'jpg-bw' | 'jpg-color' | 'webp-bw' | 'webp-color')}
										className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
										<IconDownload size={18} />
										<span>{label}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex min-w-0 flex-1 flex-col items-center">
				{!originalImage ? (
					<div className="flex min-h-72 w-full flex-1 items-center justify-center lg:min-h-0">
						<div className="flex h-[46vh] min-h-72 w-full items-center justify-center rounded-[32px] bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)] lg:h-full lg:min-h-0">
							<div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-zinc-500">
								Upload an image to get started
							</div>
						</div>
					</div>
				) : (
					imageDimensions && (
						<div className="flex h-[52vh] min-h-80 w-full items-center justify-center rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] lg:h-full lg:min-h-0">
							<div
								ref={containerRef}
								className="relative"
								style={{
									width: imageDimensions.width >= imageDimensions.height ? '100%' : 'auto',
									height: imageDimensions.height > imageDimensions.width ? '100%' : 'auto',
									maxWidth: '100%',
									maxHeight: 'calc(100% - 24px)',
									aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
								}}>
								<div className="pointer-events-none absolute left-6 top-6 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
									Original
								</div>
								<div className="pointer-events-none absolute right-6 top-6 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
									ASCII
								</div>

								<Image
									src={originalImage}
									alt="Original"
									className="absolute inset-0 select-none pointer-events-none rounded-[24px] object-contain outline outline-1 -outline-offset-1 outline-black/10"
									style={{
										clipPath: `inset(0 ${100 - comparePosition}% 0 0)`,
									}}
									fill
									sizes="70vw"
								/>

								<canvas
									ref={displayCanvasRef}
									className="absolute inset-0 select-none pointer-events-none rounded-[24px] object-contain outline outline-1 -outline-offset-1 outline-black/10"
									style={{
										clipPath: `inset(0 0 0 ${comparePosition}%)`,
									}}
								/>

								<div
									className="group absolute inset-y-0 z-20 w-10 -translate-x-5 cursor-ew-resize"
									style={{
										left: `${comparePosition}%`,
									}}
									onMouseDown={() => setDragState('divider')}>
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

								{isGenerating && (
									<div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
										<div className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
											Generating...
										</div>
									</div>
								)}
							</div>
						</div>
					)
				)}

				<canvas ref={hiddenCanvasRef} className="hidden" />
			</div>
		</div>
	);
}
