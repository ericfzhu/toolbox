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

				<div className="space-y-2">
					<label htmlFor="r" className="block">
						Radius: {r.toFixed(1)}px
					</label>
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
						className="w-full accent-zinc-500"
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="sigma" className="block">
						Sigma: {sigma.toFixed(1)}
					</label>
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
						className="w-full accent-zinc-500"
					/>
				</div>

				{blurredImage && (
					<div className="space-y-4 border-t pt-4">
						<button
							onClick={handleDownload}
							className="w-full bg-zinc-500 hover:bg-zinc-700 text-white font-bold p-2 rounded-sm flex items-center justify-center gap-2"
							aria-label="Download blurred image">
							<IconDownload size={20} />
							<span>Download</span>
						</button>
					</div>
				)}
			</div>

			{!originalImage ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="border-2 border-dashed border-zinc-300 rounded-sm w-[50vw] h-[50vh] flex items-center justify-center text-zinc-500">
						Upload an image to get started
					</div>
				</div>
			) : (
				originalImage &&
				blurredImage &&
				imageDimensions && (
					<div className="flex-1 flex flex-col items-center">
						<div
							className="relative"
							ref={compareContainerRef}
							style={{
								width: imageDimensions.width >= imageDimensions.height ? '50vw' : 'auto',
								height: imageDimensions.height > imageDimensions.width ? '50vw' : 'auto',
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
								src={blurredImage}
								alt="Blurred"
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
								onMouseDown={handleCompareSliderDrag}
							/>
						</div>
					</div>
				)
			)}
			<canvas ref={canvasRef} style={{ display: 'none' }} />
		</div>
	);
}
