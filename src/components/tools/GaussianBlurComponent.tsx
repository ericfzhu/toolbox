'use client';

import { useDownload, useImageUpload } from '@/hooks';
import { IconDownload } from '@tabler/icons-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
	v_texCoord = a_texCoord;
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_direction;
uniform vec2 u_texelSize;
uniform float u_sigma;
uniform float u_radius;

float gaussian(float x, float sigma) {
	return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
	vec4 color = vec4(0.0);
	float total = 0.0;

	for (int i = -24; i <= 24; i++) {
		float fi = float(i);
		if (abs(fi) > u_radius) {
			continue;
		}

		float weight = gaussian(fi, u_sigma);
		vec2 offset = u_direction * u_texelSize * fi;
		color += texture2D(u_image, v_texCoord + offset) * weight;
		total += weight;
	}

	gl_FragColor = color / total;
}
`;

interface WebGLBlurRenderer {
	render: (image: HTMLImageElement, radius: number, sigma: number) => void;
	dispose: () => void;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error('Failed to create shader.');
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(info || 'Shader compilation failed.');
	}

	return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	const program = gl.createProgram();

	if (!program) {
		throw new Error('Failed to create program.');
	}

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(info || 'Program linking failed.');
	}

	return program;
}

function createTexture(gl: WebGLRenderingContext): WebGLTexture {
	const texture = gl.createTexture();
	if (!texture) {
		throw new Error('Failed to create texture.');
	}

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	return texture;
}

function createFramebuffer(gl: WebGLRenderingContext, texture: WebGLTexture): WebGLFramebuffer {
	const framebuffer = gl.createFramebuffer();
	if (!framebuffer) {
		throw new Error('Failed to create framebuffer.');
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	return framebuffer;
}

function createWebGLBlurRenderer(canvas: HTMLCanvasElement): WebGLBlurRenderer {
	const gl = canvas.getContext('webgl', {
		preserveDrawingBuffer: true,
		premultipliedAlpha: false,
		alpha: true,
	});

	if (!gl) {
		throw new Error('WebGL is not available.');
	}

	const glContext = gl;
	const program = createProgram(glContext, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
	const positionLocation = glContext.getAttribLocation(program, 'a_position');
	const texCoordLocation = glContext.getAttribLocation(program, 'a_texCoord');
	const imageLocation = glContext.getUniformLocation(program, 'u_image');
	const directionLocation = glContext.getUniformLocation(program, 'u_direction');
	const texelSizeLocation = glContext.getUniformLocation(program, 'u_texelSize');
	const sigmaLocation = glContext.getUniformLocation(program, 'u_sigma');
	const radiusLocation = glContext.getUniformLocation(program, 'u_radius');

	if (!imageLocation || !directionLocation || !texelSizeLocation || !sigmaLocation || !radiusLocation) {
		throw new Error('Failed to locate WebGL uniforms.');
	}

	const positionBuffer = glContext.createBuffer();
	const texCoordBuffer = glContext.createBuffer();
	if (!positionBuffer || !texCoordBuffer) {
		throw new Error('Failed to create WebGL buffers.');
	}

	glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
	glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), glContext.STATIC_DRAW);

	glContext.bindBuffer(glContext.ARRAY_BUFFER, texCoordBuffer);
	glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), glContext.STATIC_DRAW);

	const sourceTexture = createTexture(glContext);
	const intermediateTexture = createTexture(glContext);
	const intermediateFramebuffer = createFramebuffer(glContext, intermediateTexture);

	function drawPass(
		directionX: number,
		directionY: number,
		inputTexture: WebGLTexture,
		framebuffer: WebGLFramebuffer | null,
		width: number,
		height: number,
		sigma: number,
		radius: number,
	) {
		glContext.bindFramebuffer(glContext.FRAMEBUFFER, framebuffer);
		glContext.viewport(0, 0, width, height);
		glContext.useProgram(program);

		glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
		glContext.enableVertexAttribArray(positionLocation);
		glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

		glContext.bindBuffer(glContext.ARRAY_BUFFER, texCoordBuffer);
		glContext.enableVertexAttribArray(texCoordLocation);
		glContext.vertexAttribPointer(texCoordLocation, 2, glContext.FLOAT, false, 0, 0);

		glContext.activeTexture(glContext.TEXTURE0);
		glContext.bindTexture(glContext.TEXTURE_2D, inputTexture);
		glContext.uniform1i(imageLocation, 0);
		glContext.uniform2f(directionLocation, directionX, directionY);
		glContext.uniform2f(texelSizeLocation, 1 / width, 1 / height);
		glContext.uniform1f(sigmaLocation, Math.max(0.1, sigma));
		glContext.uniform1f(radiusLocation, Math.max(1, Math.floor(radius)));

		glContext.drawArrays(glContext.TRIANGLES, 0, 6);
	}

	return {
		render(image: HTMLImageElement, radius: number, sigma: number) {
			canvas.width = image.width;
			canvas.height = image.height;

			glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, 1);
			glContext.bindTexture(glContext.TEXTURE_2D, sourceTexture);
			glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, image);

			glContext.bindTexture(glContext.TEXTURE_2D, intermediateTexture);
			glContext.texImage2D(
				glContext.TEXTURE_2D,
				0,
				glContext.RGBA,
				canvas.width,
				canvas.height,
				0,
				glContext.RGBA,
				glContext.UNSIGNED_BYTE,
				null,
			);

			drawPass(1, 0, sourceTexture, intermediateFramebuffer, canvas.width, canvas.height, sigma, radius);
			drawPass(0, 1, intermediateTexture, null, canvas.width, canvas.height, sigma, radius);
		},
		dispose() {
			glContext.deleteFramebuffer(intermediateFramebuffer);
			glContext.deleteTexture(sourceTexture);
			glContext.deleteTexture(intermediateTexture);
			glContext.deleteBuffer(positionBuffer);
			glContext.deleteBuffer(texCoordBuffer);
			glContext.deleteProgram(program);
		},
	};
}

function renderCanvasBlur(image: HTMLImageElement, radius: number, sigma: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D is not available.');

	ctx.filter = `blur(${Math.max(radius, sigma)}px)`;
	ctx.drawImage(image, 0, 0);
	return canvas;
}

export default function GaussianBlurComponent(): React.JSX.Element {
	const [radius, setRadius] = useState<number>(2);
	const [sigma, setSigma] = useState<number>(5);
	const [appliedRadius, setAppliedRadius] = useState<number>(2);
	const [appliedSigma, setAppliedSigma] = useState<number>(5);
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

	const renderCanvasRef = useRef<HTMLCanvasElement>(null);
	const compareContainerRef = useRef<HTMLDivElement>(null);
	const sliderRef = useRef<HTMLDivElement>(null);
	const rendererRef = useRef<WebGLBlurRenderer | null>(null);
	const blurredImageUrlRef = useRef<string | null>(null);
	const latestRequestIdRef = useRef<number>(0);

	useEffect(() => {
		const canvas = renderCanvasRef.current;
		if (!canvas) return;

		try {
			rendererRef.current = createWebGLBlurRenderer(canvas);
		} catch (error) {
			console.error('Failed to initialize WebGL blur renderer:', error);
		}

		return () => {
			rendererRef.current?.dispose();
			rendererRef.current = null;

			if (blurredImageUrlRef.current) {
				URL.revokeObjectURL(blurredImageUrlRef.current);
				blurredImageUrlRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!originalImage) {
			if (blurredImageUrlRef.current) {
				URL.revokeObjectURL(blurredImageUrlRef.current);
				blurredImageUrlRef.current = null;
			}
			setBlurredImage(null);
			setIsProcessing(false);
			return;
		}

		const canvas = renderCanvasRef.current;
		if (!canvas) {
			setIsProcessing(false);
			return;
		}

		const img = new window.Image();
		const requestId = latestRequestIdRef.current + 1;
		latestRequestIdRef.current = requestId;

		setIsProcessing(true);

		img.onload = () => {
			if (requestId !== latestRequestIdRef.current) return;
			let outputCanvas = canvas;

			try {
				if (rendererRef.current) {
					try {
						rendererRef.current.render(img, appliedRadius, appliedSigma);
					} catch (error) {
						console.warn('WebGL blur failed; using Canvas 2D fallback.', error);
						outputCanvas = renderCanvasBlur(img, appliedRadius, appliedSigma);
					}
				} else {
					outputCanvas = renderCanvasBlur(img, appliedRadius, appliedSigma);
				}
			} catch (error) {
				console.error('Unable to render blur.', error);
				setIsProcessing(false);
				return;
			}

			requestAnimationFrame(() => {
				outputCanvas.toBlob((blob) => {
					if (requestId !== latestRequestIdRef.current) return;
					if (!blob) {
						setIsProcessing(false);
						return;
					}

					if (blurredImageUrlRef.current) {
						URL.revokeObjectURL(blurredImageUrlRef.current);
					}

					const nextUrl = URL.createObjectURL(blob);
					blurredImageUrlRef.current = nextUrl;
					setBlurredImage(nextUrl);
					setIsProcessing(false);
				}, 'image/png');
			});
		};

		img.onerror = () => {
			if (requestId === latestRequestIdRef.current) {
				setIsProcessing(false);
			}
		};

		img.src = originalImage;
	}, [appliedRadius, appliedSigma, originalImage]);

	function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) {
		setter(parseFloat(event.target.value));
	}

	function commitBlurSettings() {
		setAppliedRadius(radius);
		setAppliedSigma(sigma);
	}

	const handleCompareSliderDrag = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.preventDefault();
			const container = compareContainerRef.current;
			if (!container) return;

			const startX = event.clientX;
			const startPosition = comparePosition;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const deltaX = moveEvent.clientX - startX;
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
					className={`rounded-none p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] transition-[box-shadow,background-color] duration-200 ease-out ${
						isDragging
							? 'bg-zinc-100 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)]'
							: 'bg-white'
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<div
						className={`rounded-none border border-dashed px-5 py-6 text-center transition-[border-color,background-color] duration-200 ease-out ${
							isDragging ? 'border-zinc-600 bg-zinc-50' : 'border-zinc-300 bg-zinc-50/60'
						}`}>
						<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
						<button
							onClick={openFilePicker}
							className="inline-flex min-h-11 items-center justify-center rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]">
							Select Image
						</button>
						<p className="mt-3 text-sm text-zinc-500">or drag and drop an image here</p>
					</div>
				</div>

				<div className="rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-5 rounded-none bg-zinc-50 px-4 py-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<label htmlFor="r" className="block text-sm font-medium text-zinc-900">
									Radius
								</label>
								<span className="tabular-nums text-sm text-zinc-500">{radius.toFixed(1)}px</span>
							</div>
							<input
								type="range"
								id="r"
								value={radius}
								onChange={(event) => handleSliderChange(event, setRadius)}
								onMouseUp={commitBlurSettings}
								onTouchEnd={commitBlurSettings}
								onBlur={commitBlurSettings}
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
								onChange={(event) => handleSliderChange(event, setSigma)}
								onMouseUp={commitBlurSettings}
								onTouchEnd={commitBlurSettings}
								onBlur={commitBlurSettings}
								min="0.1"
								max="10"
								step="0.1"
								className="w-full accent-zinc-900"
							/>
						</div>
					</div>
				</div>

				{blurredImage && (
					<div className="rounded-none bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
						<div className="rounded-none bg-zinc-50 p-4">
							<button
								onClick={handleDownload}
								className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_2px_rgba(0,0,0,0.18)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-zinc-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.16)] active:scale-[0.96]"
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
					<div className="flex h-[60vh] w-full items-center justify-center rounded-none bg-zinc-50 p-3 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.08)]">
						<div className="flex h-full w-full items-center justify-center rounded-none border border-dashed border-zinc-300 bg-white/70 px-6 text-center text-zinc-500">
							Upload an image to get started
						</div>
					</div>
				</div>
			) : (
				originalImage &&
				imageDimensions && (
					<div className="flex-1 flex flex-col items-center">
						<div className="flex h-[70vh] w-full items-center justify-center rounded-none bg-zinc-50 p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
							<div
								className="relative"
								ref={compareContainerRef}
								style={{
									aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
									width: imageDimensions.width >= imageDimensions.height ? '100%' : 'auto',
									height: imageDimensions.height > imageDimensions.width ? '100%' : 'auto',
									maxWidth: '100%',
									maxHeight: 'calc(70vh - 24px)',
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
									className="absolute inset-0 select-none pointer-events-none rounded-none object-contain outline outline-1 -outline-offset-1 outline-black/10"
									style={{
										clipPath: `inset(0 ${100 - comparePosition}% 0 0)`,
									}}
									fill
									sizes="100vw"
									unoptimized
								/>
								{blurredImage ? (
									<Image
										src={blurredImage}
										alt="Blurred"
										className="absolute inset-0 select-none pointer-events-none rounded-none object-contain outline outline-1 -outline-offset-1 outline-black/10"
										style={{
											clipPath: `inset(0 0 0 ${comparePosition}%)`,
										}}
										fill
										sizes="100vw"
										unoptimized
									/>
								) : (
									<div className="absolute inset-0 rounded-none bg-white/60 backdrop-blur-[2px]" />
								)}
								<div
									ref={sliderRef}
									className={`group absolute inset-y-0 z-20 ${blurredImage ? '' : 'pointer-events-none opacity-50'}`}
									style={{
										left: `${comparePosition}%`,
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
								{!blurredImage && (
									<div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
										<div className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
											Processing blur...
										</div>
									</div>
								)}
							</div>
						</div>
						{isProcessing && <p className="mt-3 text-sm text-zinc-500">Processing image...</p>}
					</div>
				)
			)}
			<canvas ref={renderCanvasRef} className="hidden" />
		</div>
	);
}
