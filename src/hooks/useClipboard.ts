'use client';

import { useCallback, useState } from 'react';

import { useToast } from '@/components/Toast';

interface UseClipboardOptions {
	resetDelay?: number;
	showToast?: boolean;
}

interface UseClipboardReturn {
	copied: boolean;
	copy: (text: string) => Promise<boolean>;
}

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
	const { resetDelay = 2000, showToast: shouldShowToast = true } = options;
	const [copied, setCopied] = useState(false);
	const { showToast } = useToast();

	const copy = useCallback(
		async (text: string): Promise<boolean> => {
			try {
				await navigator.clipboard.writeText(text);
				setCopied(true);

				if (shouldShowToast) {
					showToast('Copied to clipboard');
				}

				if (resetDelay > 0) {
					setTimeout(() => setCopied(false), resetDelay);
				}

				return true;
			} catch (error) {
				console.error('Failed to copy to clipboard:', error);
				if (shouldShowToast) {
					showToast('Failed to copy');
				}
				return false;
			}
		},
		[resetDelay, shouldShowToast, showToast],
	);

	return { copied, copy };
}
