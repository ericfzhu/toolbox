'use client';

import { IconDownload } from '@tabler/icons-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDownload, useImageUpload } from '@/hooks';

interface RgbColor {
	r: number;
	g: number;
	b: number;
}

function detectBackgroundColor(imageData: ImageData): RgbColor {
	const { data, width, height } = imageData;
	let totalR = 0;
	let totalG = 0;
	let totalB = 0;
	let samples = 0;
	const step = Math.max(1, Math.floor(Math.max(width, height) / 600));

	for (let x = 0; x < width; x += step) {
		const topIndex = x * 4;
		const bottomIndex = ((height - 1) * width + x) * 4;
		totalR += data[topIndex] + data[bottomIndex];
		totalG += data[topIndex + 1] + data[bottomIndex + 1];
		totalB += data[topIndex + 2] + data[bottomIndex + 2];
		samples += 2;
	}

	for (let y = 1; y < height - 1; y += step) {
		const leftIndex = (y * width) * 4;
		const rightIndex = (y * width + (width - 1)) * 4;
		totalR += data[leftIndex] + data[rightIndex];
		totalG += data[leftIndex + 1] + data[rightIndex + 1];
		totalB += data[leftIndex + 2] + data[rightIndex + 2];
		samples += 2;
	}

	if (samples === 0) {
		return { r: 255, g: 255, b: 255 };
	}

	return {
		r: Math.round(totalR / samples),
		g: Math.round(totalG / samples),
		b: Math.round(totalB / samples),
	};
}

export default function BackgroundRemoverComponent(): JSX.Element {
	const [aggressiveness, setAggressiveness] = useState<number>(35);
	const [processedImage, setProcessedImage] = useState<string | null>(null);
	const [backgroundColor, setBackgroundColor] = useState<RgbColor | null>(null);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

	const removeBackground = useCallback((): void => {
		if (!originalImage) {
			setProcessedImage(null);
			setBackgroundColor(null);
			return;
		}

		setIsProcessing(true);
		const img = new window.Image();
		img.onload = (): void => {
			const canvas = canvasRef.current;
			if (!canvas) {
				setIsProcessing(false);
				return;
			}

			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				setIsProcessing(false);
				return;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0);

			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const bgColor = detectBackgroundColor(imageData);
			setBackgroundColor(bgColor);

			const threshold = 8 + (aggressiveness / 100) * 120;
			const feather = Math.max(6, threshold * 0.45);
			const { data } = imageData;

			for (let i = 0; i < data.length; i += 4) {
				const dr = data[i] - bgColor.r;
				const dg = data[i + 1] - bgColor.g;
				const db = data[i + 2] - bgColor.b;
				const distance = Math.sqrt(dr * dr + dg * dg + db * db);

				if (distance <= threshold) {
					data[i + 3] = 0;
				} else if (distance <= threshold + feather) {
					const mix = (distance - threshold) / feather;
					data[i + 3] = Math.round(data[i + 3] * mix);
				}
			}

			ctx.putImageData(imageData, 0, 0);
			setProcessedImage(canvas.toDataURL('image/png'));
			setIsProcessing(false);
		};
		img.src = originalImage;
	}, [aggressiveness, originalImage]);

	useEffect(() => {
		removeBackground();
	}, [removeBackground]);

	function handleDownload() {
		if (processedImage) {
			downloadDataUrl(processedImage, 'background-removed.png');
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
					<label htmlFor="aggressiveness" className="block">
						Aggressiveness: {aggressiveness}%
					</label>
					<input
						id="aggressiveness"
						type="range"
						min="0"
						max="100"
						step="1"
						value={aggressiveness}
						onChange={(e) => setAggressiveness(Number(e.target.value))}
						className="w-full accent-zinc-500"
					/>
					<p className="text-xs text-zinc-500">Higher values remove more colors close to the background.</p>
				</div>

				{backgroundColor && (
					<div className="space-y-2 border-t pt-4">
						<p className="text-sm text-zinc-700">Detected Background</p>
						<div className="flex items-center gap-3">
							<div
								className="h-8 w-8 rounded border border-zinc-300"
								style={{ backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})` }}
							/>
							<p className="text-xs text-zinc-500">{`rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`}</p>
						</div>
					</div>
				)}

				{processedImage && (
					<button
						onClick={handleDownload}
						className="w-full bg-zinc-500 hover:bg-zinc-700 text-white font-bold p-2 rounded-sm flex items-center justify-center gap-2"
						aria-label="Download background removed image">
						<IconDownload size={20} />
						<span>Download PNG</span>
					</button>
				)}
			</div>

			{!originalImage || !imageDimensions ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="border-2 border-dashed border-zinc-300 rounded-sm w-[50vw] h-[50vh] flex items-center justify-center text-zinc-500">
						Upload an image to get started
					</div>
				</div>
			) : (
				<div className="flex-1 flex flex-col items-center gap-3">
					<div
						className="relative"
						style={{
							width: imageDimensions.width >= imageDimensions.height ? '50vw' : 'auto',
							height: imageDimensions.height > imageDimensions.width ? '50vw' : 'auto',
							maxWidth: '100%',
							maxHeight: '70vh',
							aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
							backgroundColor: '#ffffff',
							backgroundImage:
								'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
							backgroundSize: '20px 20px',
							backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
						}}>
						{processedImage ? (
							<Image src={processedImage} alt="Background removed" className="object-contain" fill sizes="50vw" />
						) : (
							<Image src={originalImage} alt="Original" className="object-contain opacity-60" fill sizes="50vw" />
						)}
					</div>
					{isProcessing && <p className="text-sm text-zinc-500">Processing image...</p>}
				</div>
			)}
			<canvas ref={canvasRef} style={{ display: 'none' }} />
		</div>
	);
}
