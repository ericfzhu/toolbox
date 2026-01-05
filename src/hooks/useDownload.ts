'use client';

import { useCallback } from 'react';

type DownloadContent = string | Blob;

interface DownloadOptions {
	filename: string;
	mimeType?: string;
}

interface UseDownloadReturn {
	downloadText: (content: string, filename: string) => void;
	downloadBlob: (blob: Blob, filename: string) => void;
	downloadDataUrl: (dataUrl: string, filename: string) => void;
	download: (content: DownloadContent, options: DownloadOptions) => void;
}

export function useDownload(): UseDownloadReturn {
	const triggerDownload = useCallback((url: string, filename: string) => {
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, []);

	const downloadText = useCallback(
		(content: string, filename: string) => {
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			triggerDownload(url, filename);
		},
		[triggerDownload],
	);

	const downloadBlob = useCallback(
		(blob: Blob, filename: string) => {
			const url = URL.createObjectURL(blob);
			triggerDownload(url, filename);
		},
		[triggerDownload],
	);

	const downloadDataUrl = useCallback(
		(dataUrl: string, filename: string) => {
			const link = document.createElement('a');
			link.href = dataUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		[],
	);

	const download = useCallback(
		(content: DownloadContent, options: DownloadOptions) => {
			const { filename, mimeType = 'application/octet-stream' } = options;

			if (typeof content === 'string') {
				const blob = new Blob([content], { type: mimeType });
				downloadBlob(blob, filename);
			} else {
				downloadBlob(content, filename);
			}
		},
		[downloadBlob],
	);

	return {
		downloadText,
		downloadBlob,
		downloadDataUrl,
		download,
	};
}
