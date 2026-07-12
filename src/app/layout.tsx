import { GeistMono } from 'geist/font/mono';
import type { Metadata, Viewport } from 'next';

import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { ToastProvider } from '@/components/Toast';

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
				<link rel="icon" href="/icon.svg" />
				<link rel="apple-touch-icon" href="/icon.svg" />
			</head>
			<body className={`${GeistMono.className} antialiased`}>
				<ToastProvider>{children}</ToastProvider>
				<ServiceWorkerRegistration />
			</body>
		</html>
	);
}
