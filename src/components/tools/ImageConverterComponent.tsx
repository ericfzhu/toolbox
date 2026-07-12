'use client';

import { IconChevronDown, IconChevronUp, IconDownload, IconUpload } from '@tabler/icons-react';
import Image from 'next/image';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';

interface ImageDimensions {
	width: number;
	height: number;
}

const MAX_IMAGE_DIMENSION = 4096;
const MAX_OUTPUT_DIMENSION = 8192;
const MAX_OUTPUT_PIXELS = 32000000;
const IMAGE_FORMATS = ['png', 'webp', 'jpeg'] as const;

type ImageFormat = (typeof IMAGE_FORMATS)[number];

function constrainDimensions(dimensions: ImageDimensions): ImageDimensions {
	const maxDimensionScale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(dimensions.width, dimensions.height));
	const pixelScale = Math.min(1, Math.sqrt(MAX_OUTPUT_PIXELS / (dimensions.width * dimensions.height)));
	const scale = Math.min(maxDimensionScale, pixelScale);

	return {
		width: Math.max(1, Math.round(dimensions.width * scale)),
		height: Math.max(1, Math.round(dimensions.height * scale)),
	};
}

export default function ImageConverterComponent() {
	const [isImageDragging, setIsImageDragging] = useState<boolean>(false);
	const [originalImage, setOriginalImage] = useState<string | null>(null);
	const [selectedFormat, setSelectedFormat] = useState<ImageFormat>('png');
	const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
	const [aspectRatio, setAspectRatio] = useState<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartY, setDragStartY] = useState(0);
	const [activeDimension, setActiveDimension] = useState<'width' | 'height' | null>(null);

	useEffect(() => {
		return () => {
			setOriginalImage(null);
		};
	}, []);

	useEffect(() => {
		if (originalImage) {
			const img = new window.Image();
			img.onload = () => {
				let { width, height } = img;

				if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
					const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
					width = Math.round(width * scale);
					height = Math.round(height * scale);
				}

				const ratio = width / height;
				setAspectRatio(ratio);
				setImageDimensions({ width, height });
			};
			img.src = originalImage;
		}
	}, [originalImage]);

	useEffect(() => {
		function handleMouseMove(e: MouseEvent) {
			if (!isDragging || !activeDimension || !aspectRatio) return;

			const deltaY = dragStartY - e.clientY;
			const sensitivity = 2;
			let newValue = imageDimensions[activeDimension] + Math.round(deltaY / sensitivity);
			newValue = Math.max(1, newValue);

			setImageDimensions(() => {
				if (activeDimension === 'width') {
					return constrainDimensions({
						width: newValue,
						height: Math.round(newValue / aspectRatio),
					});
				}

				return constrainDimensions({
					width: Math.round(newValue * aspectRatio),
					height: newValue,
				});
			});

			setDragStartY(e.clientY);
		}

		function handleMouseUp() {
			setIsDragging(false);
			setActiveDimension(null);
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, activeDimension, aspectRatio, dragStartY, imageDimensions]);

	function handleImageDragOver(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setIsImageDragging(true);
	}

	function handleImageDragLeave() {
		setIsImageDragging(false);
	}

	function handleImageDrop(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setIsImageDragging(false);
		const file = event.dataTransfer.files[0];
		if (file) {
			processImageFile(file);
		}
	}

	function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) {
			processImageFile(file);
		}
	}

	function processImageFile(file: File) {
		if (file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = (e) => {
				setOriginalImage(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	}

	function handleDimensionChange(dimension: 'width' | 'height', value: number) {
		if (value <= 0 || !aspectRatio) return;

		setImageDimensions(() => {
			if (dimension === 'width') {
				return constrainDimensions({
					width: value,
					height: Math.round(value / aspectRatio),
				});
			}

			return constrainDimensions({
				width: Math.round(value * aspectRatio),
				height: value,
			});
		});
	}

	function handleDragStart(e: React.MouseEvent, dimension: 'width' | 'height') {
		e.preventDefault();
		setIsDragging(true);
		setDragStartY(e.clientY);
		setActiveDimension(dimension);
	}

	function handleConvertAndDownload() {
		if (!originalImage) return;

		const img = new window.Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = imageDimensions.width;
			canvas.height = imageDimensions.height;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							const url = URL.createObjectURL(blob);
							const link = document.createElement('a');
							link.href = url;
							link.download = `image.${selectedFormat}`;
							document.body.appendChild(link);
							link.click();
							document.body.removeChild(link);
							URL.revokeObjectURL(url);
						}
					},
					`image/${selectedFormat}`,
					selectedFormat === 'jpeg' ? 0.92 : undefined,
				);
			}
		};
		img.src = originalImage;
	}

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
			<div className="w-full max-w-sm space-y-4 lg:sticky lg:top-8 lg:w-80 lg:self-start">
				<div
					className={`rounded-[28px] p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] transition-[box-shadow,background-color] duration-200 ease-out ${
						isImageDragging
							? 'bg-zinc-100 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)]'
							: 'bg-white'
					}`}
					onDragOver={handleImageDragOver}
					onDragLeave={handleImageDragLeave}
					onDrop={handleImageDrop}>
					<div
						className={`rounded-[20px] border border-dashed px-5 py-6 text-center transition-[border-color,background-color] duration-200 ease-out ${
							isImageDragging ? 'border-zinc-600 bg-zinc-50' : 'border-zinc-300 bg-zinc-50/60'
						}`}>
						<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
						<IconUpload className="mx-auto h-12 w-12 text-zinc-400" />
						<p className="mt-3 text-sm text-zinc-600">Drag and drop an image here, or</p>
						<button
							onClick={() => fileInputRef.current?.click()}
							className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
							Select Image
						</button>
					</div>
				</div>

				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-5 rounded-[20px] bg-zinc-50 px-4 py-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-zinc-900">Format</label>
							<div className="grid grid-cols-3 gap-2">
								{IMAGE_FORMATS.map((format) => (
									<button
										key={format}
										onClick={() => setSelectedFormat(format)}
										className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-medium uppercase tracking-[0.08em] transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.96] ${
											selectedFormat === format
												? 'bg-zinc-900 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)]'
												: 'bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] hover:bg-zinc-100'
										}`}>
										{format}
									</button>
								))}
							</div>
						</div>

						<div className="space-y-3">
							<label className="block text-sm font-medium text-zinc-900">Dimensions</label>
							{(['width', 'height'] as const).map((dimension) => (
								<div
									key={dimension}
									className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
									<span className="text-sm capitalize text-zinc-600">{dimension}</span>
									<div className="flex items-center">
										<input
											type="number"
											value={imageDimensions[dimension]}
											onChange={(e) => handleDimensionChange(dimension, parseInt(e.target.value))}
											disabled={!originalImage}
											min={1}
											max={MAX_OUTPUT_DIMENSION}
											className="w-24 bg-transparent text-right text-sm tabular-nums text-zinc-900 focus:outline-none disabled:text-zinc-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
										<div
											className={`ml-2 hidden cursor-ns-resize flex-col text-zinc-500 sm:flex ${originalImage ? '' : 'pointer-events-none opacity-40'}`}
											onMouseDown={(e) => handleDragStart(e, dimension)}>
											<IconChevronUp size={16} className="h-5 w-5" />
											<IconChevronDown size={16} className="h-5 w-5" />
										</div>
									</div>
								</div>
							))}
						</div>

						<button
							onClick={handleConvertAndDownload}
							disabled={!originalImage}
							className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow,color] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
							aria-label="Convert and download image">
							<IconDownload size={20} />
							<span>Download</span>
						</button>
					</div>
				</div>
			</div>

			{!originalImage ? (
				<div className="flex flex-1 items-center justify-center">
					<div className="flex h-[60vh] w-full items-center justify-center rounded-[32px] bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)]">
						<div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-zinc-500">
							Upload an image to get started
						</div>
					</div>
				</div>
			) : (
				<div className="flex flex-1 flex-col items-center">
					<div className="flex h-[70vh] w-full items-center justify-center rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div
							className="relative"
							style={{
								aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
								width: imageDimensions.width >= imageDimensions.height ? '100%' : 'auto',
								height: imageDimensions.height > imageDimensions.width ? '100%' : 'auto',
								maxWidth: '100%',
								maxHeight: 'calc(70vh - 24px)',
							}}>
							<Image
								src={originalImage}
								alt="Original"
								className="absolute inset-0 select-none rounded-[24px] object-contain outline outline-1 -outline-offset-1 outline-black/10"
								fill
								sizes="100vw"
								unoptimized
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
