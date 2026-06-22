'use client';

import { IconDownload } from '@tabler/icons-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useDownload, useImageUpload } from '@/hooks';
import { ImageDimensions } from '@/lib/types';

function gaussianBlur(imgData: ImageData, r: number, sigma: number): ImageData {
	const width: number = imgData.width;
	const height: number = imgData.height;
	const data: Uint8ClampedArray = imgData.data;
	const kernelSize: number = 2 * Math.max(1, Math.floor(r)) + 1;
	const kernel: number[][] = Array.from({ length: kernelSize }, () => Array(kernelSize).fill(0));

	// Generate Gaussian kernel
	let sum: number = 0;
	for (let y = 0; y < kernelSize; y++) {
		for (let x = 0; x < kernelSize; x++) {
			const rx = x - (kernelSize - 1) / 2;
			const ry = y - (kernelSize - 1) / 2;
			const value: number = Math.exp(-(rx * rx + ry * ry) / (2 * sigma * sigma));
			kernel[y][x] = value;
			sum += value;
		}
	}

	// Normalize kernel
	for (let y = 0; y < kernelSize; y++) {
		for (let x = 0; x < kernelSize; x++) {
			kernel[y][x] /= sum;
		}
	}

	// Apply convolution
	const result: Uint8ClampedArray = new Uint8ClampedArray(data.length);
	const halfKernel = Math.floor(kernelSize / 2);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let r = 0,
				g = 0,
				b = 0,
				a = 0;
			for (let ky = 0; ky < kernelSize; ky++) {
				for (let kx = 0; kx < kernelSize; kx++) {
					const ix = Math.min(Math.max(x + kx - halfKernel, 0), width - 1);
					const iy = Math.min(Math.max(y + ky - halfKernel, 0), height - 1);
					const i = (iy * width + ix) * 4;
					const weight = kernel[ky][kx];
					r += data[i] * weight;
					g += data[i + 1] * weight;
					b += data[i + 2] * weight;
					a += data[i + 3] * weight;
				}
			}
			const i = (y * width + x) * 4;
			result[i] = r;
			result[i + 1] = g;
			result[i + 2] = b;
			result[i + 3] = a;
		}
	}

	return new ImageData(result, width, height);
}

export default function GaussianBlurComponent(): JSX.Element {
	const [r, setR] = useState<number>(2);
	const [sigma, setSigma] = useState<number>(5);
	const [blurredImage, setBlurredImage] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [comparePosition, setComparePosition] = useState<number>(50);

	const {
		image: originalImage,
		dimensions: imageDimensions,
		isDragging,
		fileInputRef,
		handleFileChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		openFilePicker,
	} = useImageUpload({ maxDimension: 2048 });

	const { downloadDataUrl } = useDownload();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const compareContainerRef = useRef<HTMLDivElement>(null);
	const sliderRef = useRef<HTMLDivElement>(null);

	// Cleanup on unmount to prevent memory leaks
	useEffect(() => {
		const canvas = canvasRef.current;

		return () => {
			setBlurredImage(null);
			if (canvas) {
				const ctx = canvas.getContext('2d');
				ctx?.clearRect(0, 0, canvas.width, canvas.height);
				canvas.width = 0;
				canvas.height = 0;
			}
		};
	}, []);

	const applyBlur = useCallback((): void => {
		if (!originalImage) return;

		setIsProcessing(true);
		const img = new window.Image();
		img.onload = (): void => {
			const canvas: HTMLCanvasElement | null = canvasRef.current;
			if (canvas) {
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
				if (ctx) {
					ctx.drawImage(img, 0, 0);
					const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

					try {
						const blurredData: ImageData = gaussianBlur(imageData, r, sigma);
						ctx.putImageData(blurredData, 0, 0);
						setBlurredImage(canvas.toDataURL());
					} catch (error) {
						console.error('Error applying blur:', error);
						// Handle the error, maybe set an error state or show a message to the user
					}
				}
			}
			setIsProcessing(false);
		};
		img.src = originalImage;
	}, [originalImage, r, sigma]);

	useEffect(() => {
		if (originalImage) applyBlur();
	}, [originalImage, applyBlur]);

	function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) {
		setter(parseFloat(e.target.value));
	}

	function handleSliderRelease() {
		applyBlur();
	}

	const handleCompareSliderDrag = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			const container = compareContainerRef.current;
			if (!container) return;

			const startX = e.clientX;
			const startPosition = comparePosition;

			const handleMouseMove = (e: MouseEvent) => {
				const deltaX = e.clientX - startX;
				const deltaPercent = (deltaX / container.offsetWidth) * 100;
				setComparePosition(Math.max(0, Math.min(100, startPosition + deltaPercent)));
			};

			const handleMouseUp = () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		},
		[comparePosition],
	);

	function handleDownload() {
		if (blurredImage) {
			downloadDataUrl(blurredImage, 'blurred_image.png');
		}
	}

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
			<div className="w-full max-w-sm space-y-4 lg:sticky lg:top-8 lg:w-80 lg:self-start">
				<div
					className={`rounded-[28px] p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] transition-[box-shadow,background-color] duration-200 ease-out ${
						isDragging ? 'bg-zinc-100 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)]' : 'bg-white'
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

				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-5 rounded-[20px] bg-zinc-50 px-4 py-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label htmlFor="r" className="block text-sm font-medium text-zinc-900">
									Radius
								</label>
								<span className="tabular-nums text-sm text-zinc-500">{r.toFixed(1)}px</span>
							</div>
							<input
								type="range"
								id="r"
								value={r}
								onChange={(e) => handleSliderChange(e, setR)}
								onMouseUp={handleSliderRelease}
								onTouchEnd={handleSliderRelease}
								min="0.5"
								max="10"
								step="0.1"
								className="w-full accent-zinc-900"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label htmlFor="sigma" className="block text-sm font-medium text-zinc-900">
									Sigma
								</label>
								<span className="tabular-nums text-sm text-zinc-500">{sigma.toFixed(1)}</span>
							</div>
							<input
								type="range"
								id="sigma"
								value={sigma}
								onChange={(e) => handleSliderChange(e, setSigma)}
								onMouseUp={handleSliderRelease}
								onTouchEnd={handleSliderRelease}
								min="0.1"
								max="10"
								step="0.1"
								className="w-full accent-zinc-900"
							/>
						</div>
					</div>
				</div>

				{blurredImage && (
					<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-[20px] bg-zinc-50 p-4">
						<button
							onClick={handleDownload}
							className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]"
							aria-label="Download blurred image">
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
						<div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-zinc-500">
							Upload an image to get started
						</div>
					</div>
				</div>
			) : (
				originalImage &&
				blurredImage &&
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
								Blurred
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
								src={blurredImage}
								alt="Blurred"
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
								onMouseDown={handleCompareSliderDrag}>
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
