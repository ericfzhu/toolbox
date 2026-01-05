'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ImageDimensions } from '@/lib/types';

interface UseImageUploadOptions {
	onImageLoad?: (dataUrl: string, dimensions: ImageDimensions) => void;
	maxDimension?: number; // Optional max dimension to resize large images
}

interface UseImageUploadReturn {
	image: string | null;
	dimensions: ImageDimensions | null;
	isDragging: boolean;
	fileInputRef: React.RefObject<HTMLInputElement>;
	handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	handleDragLeave: () => void;
	handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	openFilePicker: () => void;
	reset: () => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
	const { maxDimension = 4096 } = options;
	const [image, setImage] = useState<string | null>(null);
	const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			setImage(null);
			setDimensions(null);
		};
	}, []);

	const processFile = useCallback(
		(file: File) => {
			if (!file.type.startsWith('image/')) return;

			const reader = new FileReader();
			reader.onload = (e) => {
				const dataUrl = e.target?.result as string;
				if (!dataUrl) return;

				const img = new window.Image();
				img.onload = () => {
					let { width, height } = img;

					// Resize if image is too large to prevent memory issues
					if (width > maxDimension || height > maxDimension) {
						const scale = maxDimension / Math.max(width, height);
						width = Math.round(width * scale);
						height = Math.round(height * scale);

						// Create a resized version
						const canvas = document.createElement('canvas');
						canvas.width = width;
						canvas.height = height;
						const ctx = canvas.getContext('2d');
						if (ctx) {
							ctx.drawImage(img, 0, 0, width, height);
							const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
							const dims = { width, height };
							setImage(resizedDataUrl);
							setDimensions(dims);
							options.onImageLoad?.(resizedDataUrl, dims);
							return;
						}
					}

					const dims = { width: img.width, height: img.height };
					setImage(dataUrl);
					setDimensions(dims);
					options.onImageLoad?.(dataUrl, dims);
				};
				img.src = dataUrl;
			};
			reader.readAsDataURL(file);
		},
		[options, maxDimension],
	);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) processFile(file);
		},
		[processFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) processFile(file);
		},
		[processFile],
	);

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const reset = useCallback(() => {
		setImage(null);
		setDimensions(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, []);

	return {
		image,
		dimensions,
		isDragging,
		fileInputRef,
		handleFileChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		openFilePicker,
		reset,
	};
}
