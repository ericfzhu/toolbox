'use client';

import { useClipboard, useImageUpload } from '@/hooks';
import { IconChevronDown, IconChevronUp, IconCopy, IconDownload, IconPalette, IconX } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';

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
		const maxSamples = 20000;
		const totalPixels = imageData.data.length / 4;
		const sampleStride = Math.max(quality, Math.ceil(totalPixels / maxSamples));
		const pixels: [number, number, number][] = [];
		for (let i = 0; i < imageData.data.length; i += 4 * sampleStride) {
			if (imageData.data[i + 3] < 128) continue;
			pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
		}
		if (pixels.length === 0) return [[255, 255, 255]];

		const centroidCount = Math.min(colorCount, pixels.length);
		let centroids = Array.from(
			{ length: centroidCount },
			(_, index) => [...pixels[Math.floor((index * pixels.length) / centroidCount)]] as [number, number, number],
		);

		for (let iteration = 0; iteration < 12; iteration++) {
			const sums = Array.from({ length: centroidCount }, () => [0, 0, 0] as [number, number, number]);
			const counts = new Uint32Array(centroidCount);

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
				sums[nearestCentroidIndex][0] += pixel[0];
				sums[nearestCentroidIndex][1] += pixel[1];
				sums[nearestCentroidIndex][2] += pixel[2];
				counts[nearestCentroidIndex]++;
			}

			const newCentroids: [number, number, number][] = centroids.map((_, i) => {
				if (counts[i] === 0) return centroids[i];
				return [Math.round(sums[i][0] / counts[i]), Math.round(sums[i][1] / counts[i]), Math.round(sums[i][2] / counts[i])];
			});

			const converged = newCentroids.every((centroid, index) =>
				centroid.every((channel, channelIndex) => channel === centroids[index][channelIndex]),
			);
			centroids = newCentroids;
			if (converged) break;
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
		const paletteAt = (ratio: number) => sortedPalette[Math.min(sortedPalette.length - 1, Math.floor(ratio * (sortedPalette.length - 1)))].color;
		const harmonicPalette = [selectedRgb, paletteAt(0.1), paletteAt(1 / 3), paletteAt(2 / 3), paletteAt(1)];

		const hexPalette = harmonicPalette.map((color) => rgbToHex(...color));

		setSelectedColors((prevColors) => prevColors.map((color, i) => (i === index ? { ...color, palette: hexPalette, showPalette: true } : color)));
	}

	function togglePalette(index: number) {
		setSelectedColors((prevColors) => prevColors.map((color, i) => (i === index ? { ...color, showPalette: !color.showPalette } : color)));
	}

	useEffect(() => {
		if (image && canvasRef.current) {
			setSelectedColors([]);
			setMagnifierPosition(null);
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

		const paletteHeight = Math.max(1, Math.floor(imageDimensions.width / palette.length));

		newCanvas.width = imageDimensions.width;
		newCanvas.height = imageDimensions.height + paletteHeight;

		newCtx.drawImage(canvas, 0, 0);

		palette.forEach((color, index) => {
			const startX = Math.floor((index * imageDimensions.width) / palette.length);
			const endX = Math.floor(((index + 1) * imageDimensions.width) / palette.length);
			newCtx.fillStyle = color;
			newCtx.fillRect(startX, imageDimensions.height, endX - startX, paletteHeight);
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
		<div className="flex flex-col gap-6 md:flex-row md:gap-8">
			<div className="order-2 w-full max-w-sm space-y-4 md:order-1 md:w-80">
				<div
					className={`rounded-[28px] p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] transition-[box-shadow,background-color] duration-200 ease-out ${
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
						<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
						<button
							onClick={openFilePicker}
							className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
							Select Image
						</button>
						<p className="mt-3 text-sm text-zinc-500">or drag and drop an image here</p>
					</div>
				</div>

				{selectedColors.map((color, index) => (
					<div
						key={index}
						className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-[20px] bg-zinc-50 p-4">
							<div className="relative mb-3 flex items-center justify-between">
								<div
									className="h-14 w-full rounded-2xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]"
									style={{ backgroundColor: color.rgb }}></div>
								<button
									onClick={() => setSelectedColors((colors) => colors.filter((_, i) => i !== index))}
									className="absolute right-2 top-2 inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 active:scale-[0.96]"
									aria-label="Remove color">
									<IconX size={14} />
								</button>
							</div>
							<div className="space-y-1 text-sm">
								{['rgb', 'hex', 'hsl'].map((format) => (
									<button
										key={format}
										className="flex min-h-11 w-full items-center rounded-2xl bg-white px-2 py-2 text-left shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-100 active:scale-[0.98]"
										onClick={() => copyToClipboard(color[format as keyof Color])}>
										<span className="w-10 uppercase text-zinc-500">{format}</span>
										<span className="flex-grow font-mono text-zinc-700">{color[format as keyof Color]}</span>
										<IconCopy size={14} className="text-zinc-400" />
									</button>
								))}
							</div>
							<div className="mt-3">
								<button
									onClick={() => (color.palette.length ? togglePalette(index) : generatePalette(index))}
									className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 active:scale-[0.96]">
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
								<div className="mt-3 space-y-3">
									<div className="flex space-x-2">
										{color.palette.map((paletteColor, i) => (
											<button
												key={i}
												className="h-10 w-10 rounded-2xl cursor-pointer shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,box-shadow] duration-200 ease-out hover:scale-110 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]"
												style={{ backgroundColor: paletteColor }}
												title={`Click to copy: ${paletteColor}`}
												onClick={() => copyToClipboard(paletteColor)}
											/>
										))}
									</div>
									<button
										onClick={() => downloadImageWithPalette(color.palette)}
										className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 active:scale-[0.96]">
										<IconDownload size={16} />
										<span>Download with Palette</span>
									</button>
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{!image ? (
				<div className="flex-1 flex items-center justify-center order-1 md:order-2">
					<div className="flex h-[40vh] w-full items-center justify-center rounded-[32px] bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)] md:h-[50vh]">
						<div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-zinc-500 text-sm sm:text-base">
							Upload an image to get started
						</div>
					</div>
				</div>
			) : (
				<div className="flex-1 flex flex-col items-center order-1 md:order-2">
					<div
						className="relative w-full rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]"
						style={{ maxHeight: '50vh' }}>
						<canvas
							ref={canvasRef}
							onClick={handleImageClick}
							onMouseMove={handleMouseMove}
							onMouseLeave={handleMouseLeave}
							className="cursor-none max-h-full max-w-full rounded-[24px] bg-white outline outline-1 -outline-offset-1 outline-black/10"
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
