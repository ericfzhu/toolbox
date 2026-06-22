interface BlurWorkerRequest {
	id: number;
	width: number;
	height: number;
	radius: number;
	sigma: number;
	buffer: ArrayBuffer;
}

type WorkerScope = typeof globalThis & {
	onmessage: ((event: MessageEvent<BlurWorkerRequest>) => void) | null;
	postMessage: (message: unknown, transfer: Transferable[]) => void;
};

const workerScope = self as WorkerScope;

function buildKernel(radius: number, sigma: number): Float32Array {
	const safeRadius = Math.max(1, Math.floor(radius));
	const kernelSize = safeRadius * 2 + 1;
	const kernel = new Float32Array(kernelSize);
	let sum = 0;

	for (let i = 0; i < kernelSize; i++) {
		const offset = i - safeRadius;
		const value = Math.exp(-(offset * offset) / (2 * sigma * sigma));
		kernel[i] = value;
		sum += value;
	}

	for (let i = 0; i < kernel.length; i++) {
		kernel[i] /= sum;
	}

	return kernel;
}

function blurSeparable(data: Uint8ClampedArray, width: number, height: number, radius: number, sigma: number): Uint8ClampedArray {
	const kernel = buildKernel(radius, sigma);
	const halfKernel = Math.floor(kernel.length / 2);
	const temp = new Float32Array(data.length);
	const output = new Uint8ClampedArray(data.length);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0;

			for (let k = 0; k < kernel.length; k++) {
				const sampleX = Math.min(Math.max(x + k - halfKernel, 0), width - 1);
				const index = (y * width + sampleX) * 4;
				const weight = kernel[k];
				r += data[index] * weight;
				g += data[index + 1] * weight;
				b += data[index + 2] * weight;
				a += data[index + 3] * weight;
			}

			const writeIndex = (y * width + x) * 4;
			temp[writeIndex] = r;
			temp[writeIndex + 1] = g;
			temp[writeIndex + 2] = b;
			temp[writeIndex + 3] = a;
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0;

			for (let k = 0; k < kernel.length; k++) {
				const sampleY = Math.min(Math.max(y + k - halfKernel, 0), height - 1);
				const index = (sampleY * width + x) * 4;
				const weight = kernel[k];
				r += temp[index] * weight;
				g += temp[index + 1] * weight;
				b += temp[index + 2] * weight;
				a += temp[index + 3] * weight;
			}

			const writeIndex = (y * width + x) * 4;
			output[writeIndex] = Math.round(r);
			output[writeIndex + 1] = Math.round(g);
			output[writeIndex + 2] = Math.round(b);
			output[writeIndex + 3] = Math.round(a);
		}
	}

	return output;
}

workerScope.onmessage = (event: MessageEvent<BlurWorkerRequest>) => {
	const { id, width, height, radius, sigma, buffer } = event.data;
	const source = new Uint8ClampedArray(buffer);
	const output = blurSeparable(source, width, height, radius, sigma);

	workerScope.postMessage(
		{
			id,
			width,
			height,
			buffer: output.buffer,
		},
		[output.buffer],
	);
};
