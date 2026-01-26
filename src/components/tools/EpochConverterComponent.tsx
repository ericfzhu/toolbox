'use client';

import { IconCopy, IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import { useClipboard } from '@/hooks';

type TimestampUnit = 'seconds' | 'milliseconds';

export default function EpochConverterComponent() {
	const [epochInput, setEpochInput] = useState('');
	const [dateInput, setDateInput] = useState('');
	const [timeInput, setTimeInput] = useState('');
	const [timestampUnit, setTimestampUnit] = useState<TimestampUnit>('seconds');
	const [useLocalTime, setUseLocalTime] = useState(true);
	const [currentEpoch, setCurrentEpoch] = useState<number>(0);
	const [convertedDate, setConvertedDate] = useState<string | null>(null);
	const [convertedEpoch, setConvertedEpoch] = useState<number | null>(null);
	const [epochError, setEpochError] = useState<string | null>(null);
	const [dateError, setDateError] = useState<string | null>(null);

	const { copy } = useClipboard();

	// Update current epoch every second
	useEffect(() => {
		const updateCurrentEpoch = () => {
			setCurrentEpoch(Math.floor(Date.now() / 1000));
		};
		updateCurrentEpoch();
		const interval = setInterval(updateCurrentEpoch, 1000);
		return () => clearInterval(interval);
	}, []);

	// Convert epoch to date
	useEffect(() => {
		if (!epochInput.trim()) {
			setConvertedDate(null);
			setEpochError(null);
			return;
		}

		const num = parseInt(epochInput, 10);
		if (isNaN(num)) {
			setEpochError('Invalid timestamp');
			setConvertedDate(null);
			return;
		}

		try {
			const ms = timestampUnit === 'seconds' ? num * 1000 : num;
			const date = new Date(ms);

			if (isNaN(date.getTime())) {
				setEpochError('Invalid timestamp');
				setConvertedDate(null);
				return;
			}

			const formatted = useLocalTime
				? date.toLocaleString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
						timeZoneName: 'short',
					})
				: date.toUTCString();

			setConvertedDate(formatted);
			setEpochError(null);
		} catch {
			setEpochError('Invalid timestamp');
			setConvertedDate(null);
		}
	}, [epochInput, timestampUnit, useLocalTime]);

	// Convert date to epoch
	useEffect(() => {
		if (!dateInput.trim()) {
			setConvertedEpoch(null);
			setDateError(null);
			return;
		}

		try {
			const dateTimeString = timeInput.trim()
				? `${dateInput}T${timeInput}`
				: `${dateInput}T00:00:00`;

			const date = useLocalTime
				? new Date(dateTimeString)
				: new Date(dateTimeString + 'Z');

			if (isNaN(date.getTime())) {
				setDateError('Invalid date');
				setConvertedEpoch(null);
				return;
			}

			const epoch =
				timestampUnit === 'seconds'
					? Math.floor(date.getTime() / 1000)
					: date.getTime();

			setConvertedEpoch(epoch);
			setDateError(null);
		} catch {
			setDateError('Invalid date');
			setConvertedEpoch(null);
		}
	}, [dateInput, timeInput, timestampUnit, useLocalTime]);

	const handleUseCurrentEpoch = useCallback(() => {
		const epoch = timestampUnit === 'seconds' ? currentEpoch : currentEpoch * 1000;
		setEpochInput(epoch.toString());
	}, [currentEpoch, timestampUnit]);

	const handleUseCurrentDate = useCallback(() => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');

		setDateInput(`${year}-${month}-${day}`);
		setTimeInput(`${hours}:${minutes}:${seconds}`);
	}, []);

	const formatNumber = (num: number) => {
		return num.toLocaleString('en-US');
	};

	return (
		<div className="flex flex-col gap-6 md:gap-8 w-full max-w-4xl mx-auto">
			{/* Current Time Display */}
			<div className="bg-zinc-100 rounded-sm p-4 text-center">
				<div className="text-sm text-zinc-500 mb-1">Current Unix Timestamp</div>
				<div className="flex items-center justify-center gap-2">
					<span className="text-2xl md:text-3xl font-mono font-medium">
						{formatNumber(currentEpoch)}
					</span>
					<button
						onClick={() => copy(currentEpoch.toString())}
						className="p-1 hover:bg-zinc-200 rounded-sm transition-colors"
						title="Copy to clipboard">
						<IconCopy size={18} className="text-zinc-500" />
					</button>
				</div>
				<div className="text-xs text-zinc-400 mt-1">seconds since Jan 1, 1970 UTC</div>
			</div>

			{/* Settings */}
			<div className="flex flex-wrap gap-4 justify-center">
				<div className="flex items-center gap-2">
					<label className="text-sm text-zinc-700">Unit:</label>
					<select
						value={timestampUnit}
						onChange={(e) => setTimestampUnit(e.target.value as TimestampUnit)}
						className="p-2 border border-zinc-300 rounded-sm text-sm">
						<option value="seconds">Seconds</option>
						<option value="milliseconds">Milliseconds</option>
					</select>
				</div>
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="useLocalTime"
						checked={useLocalTime}
						onChange={(e) => setUseLocalTime(e.target.checked)}
						className="w-4 h-4 accent-zinc-600"
					/>
					<label htmlFor="useLocalTime" className="text-sm text-zinc-700">
						Use local timezone
					</label>
				</div>
			</div>

			<div className="flex flex-col md:flex-row gap-6 md:gap-8">
				{/* Epoch to Date */}
				<div className="flex-1 space-y-4">
					<h2 className="text-lg font-medium text-zinc-800 border-b border-zinc-200 pb-2">
						Timestamp → Date
					</h2>

					<div className="space-y-2">
						<div className="flex gap-2">
							<input
								type="text"
								value={epochInput}
								onChange={(e) => setEpochInput(e.target.value)}
								placeholder={timestampUnit === 'seconds' ? '1704067200' : '1704067200000'}
								className="flex-1 p-3 border border-zinc-300 rounded-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
							/>
							<button
								onClick={handleUseCurrentEpoch}
								className="px-3 bg-zinc-200 hover:bg-zinc-300 rounded-sm transition-colors"
								title="Use current timestamp">
								<IconRefresh size={18} />
							</button>
						</div>
					</div>

					{epochError ? (
						<div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-600 text-sm">
							{epochError}
						</div>
					) : convertedDate ? (
						<div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
							<div className="flex items-start justify-between gap-2">
								<span className="text-sm">{convertedDate}</span>
								<button
									onClick={() => copy(convertedDate)}
									className="p-1 hover:bg-zinc-200 rounded-sm transition-colors flex-shrink-0"
									title="Copy to clipboard">
									<IconCopy size={16} className="text-zinc-500" />
								</button>
							</div>
						</div>
					) : (
						<div className="p-3 border-2 border-dashed border-zinc-200 rounded-sm text-zinc-400 text-sm text-center">
							Enter a timestamp to convert
						</div>
					)}
				</div>

				{/* Date to Epoch */}
				<div className="flex-1 space-y-4">
					<h2 className="text-lg font-medium text-zinc-800 border-b border-zinc-200 pb-2">
						Date → Timestamp
					</h2>

					<div className="space-y-2">
						<div className="flex gap-2">
							<input
								type="date"
								value={dateInput}
								onChange={(e) => setDateInput(e.target.value)}
								className="flex-1 p-3 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
							/>
							<button
								onClick={handleUseCurrentDate}
								className="px-3 bg-zinc-200 hover:bg-zinc-300 rounded-sm transition-colors"
								title="Use current date/time">
								<IconRefresh size={18} />
							</button>
						</div>
						<input
							type="time"
							value={timeInput}
							onChange={(e) => setTimeInput(e.target.value)}
							step="1"
							className="w-full p-3 border border-zinc-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
						/>
					</div>

					{dateError ? (
						<div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-600 text-sm">
							{dateError}
						</div>
					) : convertedEpoch !== null ? (
						<div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm">
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-mono">{formatNumber(convertedEpoch)}</span>
								<button
									onClick={() => copy(convertedEpoch.toString())}
									className="p-1 hover:bg-zinc-200 rounded-sm transition-colors flex-shrink-0"
									title="Copy to clipboard">
									<IconCopy size={16} className="text-zinc-500" />
								</button>
							</div>
						</div>
					) : (
						<div className="p-3 border-2 border-dashed border-zinc-200 rounded-sm text-zinc-400 text-sm text-center">
							Select a date to convert
						</div>
					)}
				</div>
			</div>

			{/* Quick Reference */}
			<div className="bg-zinc-50 rounded-sm p-4 space-y-2">
				<h3 className="text-sm font-medium text-zinc-700">Quick Reference</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-zinc-600">
					<div className="flex justify-between">
						<span>1 minute</span>
						<span className="font-mono">60</span>
					</div>
					<div className="flex justify-between">
						<span>1 hour</span>
						<span className="font-mono">3,600</span>
					</div>
					<div className="flex justify-between">
						<span>1 day</span>
						<span className="font-mono">86,400</span>
					</div>
					<div className="flex justify-between">
						<span>1 week</span>
						<span className="font-mono">604,800</span>
					</div>
					<div className="flex justify-between">
						<span>30 days</span>
						<span className="font-mono">2,592,000</span>
					</div>
					<div className="flex justify-between">
						<span>1 year</span>
						<span className="font-mono">31,536,000</span>
					</div>
				</div>
			</div>
		</div>
	);
}
