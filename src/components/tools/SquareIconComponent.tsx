'use client';

import { IconDownload } from '@tabler/icons-react';
import React, { useRef, useState } from 'react';

function parseCssColor(value: string): { css: string; hex: string } | null {
	if (!value.trim() || !CSS.supports('color', value)) return null;

	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	ctx.fillStyle = value;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	const hex = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
	return { css: value, hex };
}

export default function SquareIconComponent() {
	const [color, setColor] = useState('#BF5CFF');
	const [pickerColor, setPickerColor] = useState('#BF5CFF');
	const [inputValue, setInputValue] = useState('#BF5CFF');
	const [colorError, setColorError] = useState(false);
	const colorInputRef = useRef<HTMLInputElement>(null);

	function downloadImage() {
		const canvas = document.createElement('canvas');
		canvas.width = 10;
		canvas.height = 10;
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 10, 10);
			const dataUrl = canvas.toDataURL('image/jpeg');
			const link = document.createElement('a');
			link.href = dataUrl;
			link.download = 'square.jpg';
			link.click();
		}
	}

	function handleColorInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const newValue = e.target.value;
		setInputValue(newValue);

		const parsed = parseCssColor(newValue);
		setColorError(!parsed);
		if (!parsed) return;

		setColor(parsed.css);
		setPickerColor(parsed.hex);
	}

	function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
		const newColor = e.target.value;
		setColor(newColor);
		setPickerColor(newColor);
		setInputValue(newColor);
		setColorError(false);
	}

	return (
		<div className="mt-12 flex items-center justify-center">
			<div className="w-full max-w-sm space-y-5">
				<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-4 rounded-[20px] bg-zinc-50 p-4">
						<input
							type="text"
							value={inputValue}
							onChange={handleColorInputChange}
							aria-invalid={colorError}
							className="w-full rounded-2xl bg-white px-3 py-3 text-sm shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.28)]"
							placeholder="Enter color (hex, rgb, hsl)"
						/>
						{colorError && <p className="text-xs text-red-600">Enter a valid CSS color.</p>}
					</div>
				</div>

				<div className="rounded-[32px] bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="relative aspect-square overflow-hidden rounded-[24px] bg-white outline outline-1 -outline-offset-1 outline-black/10">
						<input
							ref={colorInputRef}
							type="color"
							value={pickerColor}
							onChange={handleColorPickerChange}
							className="absolute inset-0 h-full w-full cursor-pointer"
						/>
					</div>
				</div>

				<button
					onClick={downloadImage}
					className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]"
					aria-label="Download square icon">
					<IconDownload size={20} />
					<span>Download</span>
				</button>
			</div>
		</div>
	);
}
