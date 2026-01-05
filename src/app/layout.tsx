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
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
				<link rel="icon" href="/icon.jpg" />
			</head>
			<body className={GeistMono.className}>{children}</body>
		</html>
	);
}
