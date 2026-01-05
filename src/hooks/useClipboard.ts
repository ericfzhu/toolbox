'use client';

import { useCallback, useState } from 'react';

interface UseClipboardOptions {
	resetDelay?: number;
}

interface UseClipboardReturn {
	copied: boolean;
	copy: (text: string) => Promise<boolean>;
}

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
	const { resetDelay = 2000 } = options;
	const [copied, setCopied] = useState(false);

	const copy = useCallback(
		async (text: string): Promise<boolean> => {
			try {
				await navigator.clipboard.writeText(text);
				setCopied(true);

				if (resetDelay > 0) {
					setTimeout(() => setCopied(false), resetDelay);
				}

				return true;
			} catch (error) {
				console.error('Failed to copy to clipboard:', error);
				return false;
			}
		},
		[resetDelay],
	);

	return { copied, copy };
}
