import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
	title: 'Toolbox',
	description: 'A collection of useful programs',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<link rel="icon" href="/icon.jpg" />
			<body className={GeistMono.className}>{children}</body>
		</html>
	);
}
