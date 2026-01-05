'use client';

import { useCallback, useEffect } from 'react';

type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift';

interface ShortcutOptions {
	key: string;
	modifiers?: ModifierKey[];
	callback: () => void;
	preventDefault?: boolean;
	disabled?: boolean;
}

/**
 * Hook to register a keyboard shortcut
 *
 * @example
 * // Ctrl/Cmd + S to save
 * useKeyboardShortcut({
 *   key: 's',
 *   modifiers: ['ctrl'],
 *   callback: handleSave,
 * });
 *
 * // Ctrl/Cmd + Shift + C to copy
 * useKeyboardShortcut({
 *   key: 'c',
 *   modifiers: ['ctrl', 'shift'],
 *   callback: handleCopy,
 * });
 */
export function useKeyboardShortcut({ key, modifiers = [], callback, preventDefault = true, disabled = false }: ShortcutOptions) {
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (disabled) return;

			// Don't trigger shortcuts when typing in inputs/textareas (unless it's Escape)
			const target = event.target as HTMLElement;
			const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

			if (isInput && key.toLowerCase() !== 'escape') {
				// Allow Ctrl/Cmd shortcuts in inputs (like Ctrl+S)
				const hasCtrlOrMeta = modifiers.includes('ctrl') || modifiers.includes('meta');
				if (!hasCtrlOrMeta) return;
			}

			// Check if the key matches
			if (event.key.toLowerCase() !== key.toLowerCase()) return;

			// Check modifiers - treat ctrl and meta as equivalent (for cross-platform)
			const ctrlOrMetaRequired = modifiers.includes('ctrl') || modifiers.includes('meta');
			const ctrlOrMetaPressed = event.ctrlKey || event.metaKey;

			if (ctrlOrMetaRequired && !ctrlOrMetaPressed) return;
			if (!ctrlOrMetaRequired && ctrlOrMetaPressed) return;

			const shiftRequired = modifiers.includes('shift');
			if (shiftRequired !== event.shiftKey) return;

			const altRequired = modifiers.includes('alt');
			if (altRequired !== event.altKey) return;

			if (preventDefault) {
				event.preventDefault();
			}

			callback();
		},
		[key, modifiers, callback, preventDefault, disabled],
	);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);
}

/**
 * Hook to register multiple keyboard shortcuts at once
 */
export function useKeyboardShortcuts(shortcuts: ShortcutOptions[]) {
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

			for (const shortcut of shortcuts) {
				if (shortcut.disabled) continue;

				// Check key
				if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

				const modifiers = shortcut.modifiers || [];

				// Skip if in input and not a special shortcut
				if (isInput && shortcut.key.toLowerCase() !== 'escape') {
					const hasCtrlOrMeta = modifiers.includes('ctrl') || modifiers.includes('meta');
					if (!hasCtrlOrMeta) continue;
				}

				// Check modifiers
				const ctrlOrMetaRequired = modifiers.includes('ctrl') || modifiers.includes('meta');
				const ctrlOrMetaPressed = event.ctrlKey || event.metaKey;

				if (ctrlOrMetaRequired && !ctrlOrMetaPressed) continue;
				if (!ctrlOrMetaRequired && ctrlOrMetaPressed) continue;

				const shiftRequired = modifiers.includes('shift');
				if (shiftRequired !== event.shiftKey) continue;

				const altRequired = modifiers.includes('alt');
				if (altRequired !== event.altKey) continue;

				// Match found
				if (shortcut.preventDefault !== false) {
					event.preventDefault();
				}

				shortcut.callback();
				return;
			}
		},
		[shortcuts],
	);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);
}
