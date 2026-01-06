'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface Toast {
	id: number;
	message: string;
}

interface ToastContextType {
	showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback((message: string) => {
		const id = ++toastId;
		setToasts((prev) => [...prev, { id, message }]);

		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 2000);
	}, []);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className="bg-zinc-800 text-white px-4 py-2 rounded-sm shadow-lg text-sm animate-toast-in"
					>
						{toast.message}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextType {
	const context = useContext(ToastContext);
	if (!context) {
		// Return a no-op if used outside provider (graceful fallback)
		return { showToast: () => {} };
	}
	return context;
}
