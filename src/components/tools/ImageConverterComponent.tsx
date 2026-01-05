'use client';

import { IconChevronDown, IconChevronUp, IconDownload, IconUpload } from '@tabler/icons-react';
import Image from 'next/image';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';

interface ImageDimensions {
	width: number;
	height: number;
}

const MAX_IMAGE_DIMENSION = 4096;

export default function ImageConverterComponent() {
	const [isImageDragging, setIsImageDragging] = useState<boolean>(false);
	const [originalImage, setOriginalImage] = useState<string | null>(null);
	const [selectedFormat, setSelectedFormat] = useState<string>('png');
	const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
	const [aspectRatio, setAspectRatio] = useState<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartY, setDragStartY] = useState(0);
	const [activeDimension, setActiveDimension] = useState<'width' | 'height' | null>(null);

	// Cleanup on unmount to prevent memory leaks
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

				// Resize if too large
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
					return {
						width: newValue,
						height: Math.round(newValue / aspectRatio),
					};
				} else {
					return {
						width: Math.round(newValue * aspectRatio),
						height: newValue,
					};
				}
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

		setImageDimensions((prev) => {
			if (dimension === 'width') {
				return {
					width: value,
					height: Math.round(value / aspectRatio),
				};
			} else {
				return {
					width: Math.round(value * aspectRatio),
					height: value,
				};
			}
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
		<div className="mx-auto mt-10 space-y-4">
			<div
				className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
					isImageDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-300'
				}`}
				onDragOver={handleImageDragOver}
				onDragLeave={handleImageDragLeave}
				onDrop={handleImageDrop}>
				<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
				<IconUpload className="mx-auto h-12 w-12 text-gray-400" />
				<p className="mt-2 text-sm text-gray-600">Drag and drop an image here, or</p>
				<button
					onClick={() => fileInputRef.current?.click()}
					className="mt-2 bg-zinc-500 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded transition duration-300">
					Select Image
				</button>
			</div>

			{originalImage && (
				<div className="relative text-5xl text-white w-full">
					<Image
						src={originalImage}
						alt="Original"
						width={imageDimensions.width}
						height={imageDimensions.height}
						className="pointer-events-none w-full"
						style={{
							width: imageDimensions.width >= imageDimensions.height ? '60vh' : 'auto',
							height: imageDimensions.height > imageDimensions.width ? '60vh' : 'auto',
							maxWidth: '100%',
							maxHeight: '60vh',
							aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
						}}
						unoptimized
					/>

					<div className="absolute top-2 left-2 space-y-1 flex flex-col">
						{['png', 'webp', 'jpeg'].map((format) => (
							<button
								key={format}
								onClick={() => setSelectedFormat(format)}
								className={`text-left px-3 py-1 transition-colors drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] ${
									selectedFormat === format ? 'bg-zinc-300 bg-opacity-50' : 'bg-transparent hover:bg-zinc-300 hover:bg-opacity-30'
								}`}>
								{format.toUpperCase()}
							</button>
						))}
					</div>

					<div className="absolute top-2 right-2 space-y-1 flex flex-col items-end drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
						{['width', 'height'].map((dimension) => (
							<div key={dimension} className="flex items-center space-x-2 w-fit">
								<span className="">{dimension.charAt(0).toUpperCase()}:</span>
								<div className="relative flex items-center">
									<input
										type="number"
										value={imageDimensions[dimension as keyof ImageDimensions]}
										onChange={(e) => handleDimensionChange(dimension as 'width' | 'height', parseInt(e.target.value))}
										className="bg-transparent w-32 text-right focus:outline-none focus:border-zinc-500 
                               [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
									/>
									<div
										className="flex flex-col ml-1 cursor-ns-resize"
										onMouseDown={(e) => handleDragStart(e, dimension as 'width' | 'height')}>
										<IconChevronUp size={16} className="w-8 h-8" />
										<IconChevronDown size={16} className="w-8 h-8" />
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="absolute bottom-2 right-2">
						<button
							onClick={handleConvertAndDownload}
							className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] text-white font-bold p-2 rounded"
							aria-label="Convert and download image">
							<IconDownload size={24} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
