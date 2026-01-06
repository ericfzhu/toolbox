import { GeistMono } from 'geist/font/mono';
import type { Metadata, Viewport } from 'next';

import { ToastProvider } from '@/components/Toast';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

import './globals.css';

export const metadata: Metadata = {
	title: 'Toolbox',
	description: 'A collection of useful tools',
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'Toolbox',
	},
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: '#18181b',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/icon.jpg" />
				<link rel="apple-touch-icon" href="/icon.jpg" />
			</head>
			<body className={GeistMono.className}>
				<ToastProvider>{children}</ToastProvider>
				<ServiceWorkerRegistration />
			</body>
		</html>
	);
}
