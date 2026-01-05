'use client';

import { IconChevronDown, IconChevronUp, IconCopy, IconDownload, IconPalette, IconX } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';

import { useClipboard, useImageUpload } from '@/hooks';
import { colorDistance, formatHsl, formatRgb, hexToRgb, rgbToHex, rgbToHsl } from '@/lib/color';

interface Color {
	rgb: string;
	hex: string;
	hsl: string;
}

interface ColorWithPalette extends Color {
	palette: string[];
	showPalette: boolean;
}

export default function ColorPickerComponent() {
	const [selectedColors, setSelectedColors] = useState<ColorWithPalette[]>([]);
	const [magnifierPosition, setMagnifierPosition] = useState<{ x: number; y: number } | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);

	const {
		image,
		dimensions: imageDimensions,
		isDragging,
		fileInputRef,
		handleFileChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		openFilePicker,
	} = useImageUpload({ maxDimension: 2048 });

	const { copy } = useClipboard();

	// Cleanup on unmount to prevent memory leaks
	useEffect(() => {
		const canvas = canvasRef.current;

		return () => {
			setSelectedColors([]);
			setMagnifierPosition(null);
			if (canvas) {
				const ctx = canvas.getContext('2d');
				ctx?.clearRect(0, 0, canvas.width, canvas.height);
				canvas.width = 0;
				canvas.height = 0;
			}
		};
	}, []);

	function getPalette(imageData: ImageData, colorCount: number = 5, quality: number = 10): [number, number, number][] {
		const pixels: [number, number, number][] = [];
		for (let i = 0; i < imageData.data.length; i += 4 * quality) {
			pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
		}

		// Initialize centroids randomly
		let centroids: [number, number, number][] = pixels.slice(0, colorCount);

		for (let iteration = 0; iteration < 20; iteration++) {
			// Assign pixels to centroids
			const clusters: [number, number, number][][] = Array.from({ length: colorCount }, () => []);
			for (const pixel of pixels) {
				let nearestCentroidIndex = 0;
				let minDistance = Infinity;
				for (let i = 0; i < centroids.length; i++) {
					const distance = colorDistance(pixel, centroids[i]);
					if (distance < minDistance) {
						minDistance = distance;
						nearestCentroidIndex = i;
					}
				}
				clusters[nearestCentroidIndex].push(pixel);
			}

			// Update centroids
			const newCentroids: [number, number, number][] = centroids.map((_, i) => {
				if (clusters[i].length === 0) return centroids[i];
				const sum = clusters[i].reduce((acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]]);
				return [Math.round(sum[0] / clusters[i].length), Math.round(sum[1] / clusters[i].length), Math.round(sum[2] / clusters[i].length)];
			});

			// Check for convergence
			if (JSON.stringify(newCentroids) === JSON.stringify(centroids)) {
				break;
			}
			centroids = newCentroids;
		}

		return centroids;
	}

	function handleImageClick(e: React.MouseEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const imageData = ctx.getImageData(x, y, 1, 1);
		const [r, g, b] = Array.from(imageData.data.slice(0, 3));
		const [h, s, l] = rgbToHsl(r, g, b);

		const color: ColorWithPalette = {
			rgb: formatRgb(r, g, b),
			hex: rgbToHex(r, g, b),
			hsl: formatHsl(h, s, l),
			palette: [],
			showPalette: false,
		};

		setSelectedColors((prevColors) => [...prevColors, color]);
	}

	function copyToClipboard(text: string) {
		copy(text);
	}

	async function generatePalette(index: number) {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const palette = getPalette(imageData, 20);

		const selectedColor = selectedColors[index];
		const selectedRgb = hexToRgb(selectedColor.hex);

		// Sort colors by their distance from the selected color
		const sortedPalette = palette
			.map((color) => ({ color, distance: colorDistance(selectedRgb, color) }))
			.sort((a, b) => a.distance - b.distance);

		// Select 4 colors: closest, farthest, and two in between
		const harmonicPalette = [
			selectedRgb,
			sortedPalette[1].color,
			sortedPalette[Math.floor(sortedPalette.length / 3)].color,
			sortedPalette[Math.floor((2 * sortedPalette.length) / 3)].color,
			sortedPalette[sortedPalette.length - 1].color,
		];

		const hexPalette = harmonicPalette.map((color) => rgbToHex(...color));

		setSelectedColors((prevColors) => prevColors.map((color, i) => (i === index ? { ...color, palette: hexPalette, showPalette: true } : color)));
	}

	function togglePalette(index: number) {
		setSelectedColors((prevColors) => prevColors.map((color, i) => (i === index ? { ...color, showPalette: !color.showPalette } : color)));
	}

	useEffect(() => {
		if (image && canvasRef.current) {
			const canvas = canvasRef.current;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			const img = new window.Image();
			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);
			};
			img.src = image;
		}
	}, [image]);

	function downloadImageWithPalette(palette: string[]) {
		if (!imageDimensions) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const newCanvas = document.createElement('canvas');
		const newCtx = newCanvas.getContext('2d');
		if (!newCtx) return;

		const squareSize = Math.floor(imageDimensions.width / 5);
		const paletteHeight = squareSize;

		newCanvas.width = imageDimensions.width;
		newCanvas.height = imageDimensions.height + paletteHeight;

		newCtx.drawImage(canvas, 0, 0);

		palette.forEach((color, index) => {
			newCtx.fillStyle = color;
			newCtx.fillRect(index * squareSize, imageDimensions.height, squareSize, squareSize);
		});

		const link = document.createElement('a');
		link.download = 'image-with-palette.png';
		link.href = newCanvas.toDataURL('image/png');
		link.click();
	}

	function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();

		setMagnifierPosition({
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		});
	}

	function handleMouseLeave() {
		setMagnifierPosition(null);
	}

	return (
		<div className="flex gap-4">
			<div className="w-64 space-y-4">
				<div
					className={`border-2 border-dashed p-4 text-center ${isDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-300'}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
					<button onClick={openFilePicker} className="bg-zinc-200 hover:bg-zinc-300 py-2 px-4">
						Select Image
					</button>
					<p className="mt-2 text-sm text-zinc-600">or drag and drop an image here</p>
				</div>

				{selectedColors.map((color, index) => (
					<div key={index} className="p-4 bg-white rounded-sm border border-zinc-200">
						<div className="flex justify-between items-center mb-2 relative">
							<div className="w-full h-12 rounded-sm" style={{ backgroundColor: color.rgb }}></div>
							<button
								onClick={() => setSelectedColors((colors) => colors.filter((_, i) => i !== index))}
								className="absolute right-1 top-1 p-1 bg-zinc-500 text-white rounded-sm hover:bg-zinc-600 transition-colors"
								aria-label="Remove color">
								<IconX size={14} />
							</button>
						</div>
						<div className="space-y-1 text-sm">
							{['rgb', 'hex', 'hsl'].map((format) => (
								<button
									key={format}
									className="flex items-center w-full text-left p-1 hover:bg-zinc-50 rounded-sm"
									onClick={() => copyToClipboard(color[format as keyof Color])}>
									<span className="w-8 uppercase text-zinc-500">{format}</span>
									<span className="flex-grow font-mono">{color[format as keyof Color]}</span>
									<IconCopy size={14} className="text-zinc-400" />
								</button>
							))}
						</div>
						<div className="mt-2">
							<button
								onClick={() => (color.palette.length ? togglePalette(index) : generatePalette(index))}
								className="w-full bg-zinc-200 hover:bg-zinc-300 py-2 px-3 rounded-sm flex items-center justify-center text-sm">
								<IconPalette size={16} className="mr-2" />
								{color.palette.length ? (color.showPalette ? 'Hide' : 'Show') : 'Generate'} Palette
								{color.palette.length > 0 &&
									(color.showPalette ? (
										<IconChevronUp size={16} className="ml-2" />
									) : (
										<IconChevronDown size={16} className="ml-2" />
									))}
							</button>
						</div>
						{color.showPalette && (
							<div className="mt-2 space-y-2">
								<div className="flex space-x-1">
									{color.palette.map((paletteColor, i) => (
										<button
											key={i}
											className="w-8 h-8 rounded-sm cursor-pointer transition-transform hover:scale-110"
											style={{ backgroundColor: paletteColor }}
											title={`Click to copy: ${paletteColor}`}
											onClick={() => copyToClipboard(paletteColor)}
										/>
									))}
								</div>
								<button
									onClick={() => downloadImageWithPalette(color.palette)}
									className="w-full bg-zinc-500 hover:bg-zinc-700 text-white py-2 px-3 rounded-sm flex items-center justify-center text-sm gap-2">
									<IconDownload size={16} />
									<span>Download with Palette</span>
								</button>
							</div>
						)}
					</div>
				))}
			</div>

			{!image ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="border-2 border-dashed border-zinc-300 rounded-sm w-[50vw] h-[50vh] flex items-center justify-center text-zinc-500">
						Upload an image to get started
					</div>
				</div>
			) : (
				<div className="flex-1 flex flex-col items-center">
					<div className="relative" style={{ maxWidth: '70vw', maxHeight: '70vh' }}>
						<canvas
							ref={canvasRef}
							onClick={handleImageClick}
							onMouseMove={handleMouseMove}
							onMouseLeave={handleMouseLeave}
							className="cursor-none max-w-full max-h-full"
							style={{ height: 'auto' }}
						/>
						{magnifierPosition && (
							<div
								className="absolute pointer-events-none"
								style={{
									left: `${magnifierPosition.x}px`,
									top: `${magnifierPosition.y}px`,
									width: '100px',
									height: '100px',
									border: '2px solid white',
									boxShadow: '0 0 0 1px black',
									borderRadius: '50%',
									transform: 'translate(-50%, -50%)',
									overflow: 'hidden',
								}}>
								<canvas
									ref={(el) => {
										if (el && canvasRef.current) {
											const ctx = el.getContext('2d');
											const sourceCtx = canvasRef.current.getContext('2d');
											if (ctx && sourceCtx) {
												el.width = 100;
												el.height = 100;
												ctx.imageSmoothingEnabled = false;

												const rect = canvasRef.current.getBoundingClientRect();
												const scaleX = canvasRef.current.width / rect.width;
												const scaleY = canvasRef.current.height / rect.height;
												const sourceX = magnifierPosition.x * scaleX;
												const sourceY = magnifierPosition.y * scaleY;

												ctx.drawImage(canvasRef.current, sourceX - 5, sourceY - 5, 10, 10, 0, 0, 100, 100);
												ctx.strokeStyle = 'white';
												ctx.lineWidth = 2;
												ctx.strokeRect(45, 45, 10, 10);
											}
										}
									}}
								/>
							</div>
						)}
						{/* eslint-disable-next-line @next/next/no-img-element -- Hidden img used for canvas CORS operations */}
						<img ref={imageRef} src={image} alt="Uploaded" className="hidden" crossOrigin="anonymous" />
					</div>
				</div>
			)}
		</div>
	);
}
