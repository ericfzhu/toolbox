'use client';

import { useClipboard } from '@/hooks';
import { IconCopy, IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

type TimestampUnit = 'seconds' | 'milliseconds';

function parseTimestamp(input: string): number | null {
	const trimmed = input.trim();
	if (!/^[+-]?\d+$/.test(trimmed)) return null;

	const value = Number(trimmed);
	return Number.isSafeInteger(value) ? value : null;
}

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

		const num = parseTimestamp(epochInput);
		if (num === null) {
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
			const dateTimeString = timeInput.trim() ? `${dateInput}T${timeInput}` : `${dateInput}T00:00:00`;

			const date = useLocalTime ? new Date(dateTimeString) : new Date(dateTimeString + 'Z');

			if (isNaN(date.getTime())) {
				setDateError('Invalid date');
				setConvertedEpoch(null);
				return;
			}

			const epoch = timestampUnit === 'seconds' ? Math.floor(date.getTime() / 1000) : date.getTime();

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
		const year = useLocalTime ? now.getFullYear() : now.getUTCFullYear();
		const month = String((useLocalTime ? now.getMonth() : now.getUTCMonth()) + 1).padStart(2, '0');
		const day = String(useLocalTime ? now.getDate() : now.getUTCDate()).padStart(2, '0');
		const hours = String(useLocalTime ? now.getHours() : now.getUTCHours()).padStart(2, '0');
		const minutes = String(useLocalTime ? now.getMinutes() : now.getUTCMinutes()).padStart(2, '0');
		const seconds = String(useLocalTime ? now.getSeconds() : now.getUTCSeconds()).padStart(2, '0');

		setDateInput(`${year}-${month}-${day}`);
		setTimeInput(`${hours}:${minutes}:${seconds}`);
	}, [useLocalTime]);

	const formatNumber = (num: number) => {
		return num.toLocaleString('en-US');
	};

	return (
		<div className="flex w-full max-w-5xl flex-col gap-6 md:gap-8">
			{/* Current Time Display */}
			<div className="rounded-[28px] bg-white p-2 text-center shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<div className="rounded-[20px] bg-zinc-50 p-4">
					<div className="mb-1 text-sm text-zinc-500">Current Unix Timestamp</div>
					<div className="flex items-center justify-center gap-2">
						<span className="font-mono text-2xl font-medium tabular-nums md:text-3xl">{formatNumber(currentEpoch)}</span>
						<button
							onClick={() => copy(currentEpoch.toString())}
							className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-zinc-500 transition-[transform,background-color,color] duration-200 ease-out hover:bg-white hover:text-zinc-900 active:scale-[0.96]"
							title="Copy to clipboard">
							<IconCopy size={18} className="text-zinc-500" />
						</button>
					</div>
					<div className="mt-1 text-xs text-zinc-400">seconds since Jan 1, 1970 UTC</div>
				</div>
			</div>

			{/* Settings */}
			<div className="flex flex-wrap justify-center gap-3 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<div className="flex items-center gap-2">
					<label className="text-sm text-zinc-700">Unit:</label>
					<select
						value={timestampUnit}
						onChange={(e) => setTimestampUnit(e.target.value as TimestampUnit)}
						className="min-h-11 rounded-2xl bg-zinc-50 px-3 py-2 pr-10 text-sm text-zinc-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]">
						<option value="seconds">Seconds</option>
						<option value="milliseconds">Milliseconds</option>
					</select>
				</div>
				<label className="flex min-h-11 items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
					<input
						type="checkbox"
						id="useLocalTime"
						checked={useLocalTime}
						onChange={(e) => setUseLocalTime(e.target.checked)}
						className="h-4 w-4 accent-zinc-900"
					/>
					<span>Use local timezone</span>
				</label>
			</div>

			<div className="flex flex-col gap-6 md:flex-row md:gap-8">
				{/* Epoch to Date */}
				<div className="flex-1 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-4 rounded-[20px] bg-zinc-50 p-4">
						<h2 className="text-lg font-medium text-zinc-800">Timestamp → Date</h2>

						<div className="space-y-2">
							<div className="flex gap-2">
								<input
									type="text"
									value={epochInput}
									onChange={(e) => setEpochInput(e.target.value)}
									placeholder={timestampUnit === 'seconds' ? '1704067200' : '1704067200000'}
									className="min-h-11 min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
								/>
								<button
									onClick={handleUseCurrentEpoch}
									className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96]"
									title="Use current timestamp">
									<IconRefresh size={18} />
								</button>
							</div>
						</div>

						{epochError ? (
							<div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600 shadow-[0px_0px_0px_1px_rgba(220,38,38,0.16)]">
								{epochError}
							</div>
						) : convertedDate ? (
							<div className="rounded-2xl bg-white p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
								<div className="flex items-start justify-between gap-2">
									<span className="text-sm">{convertedDate}</span>
									<button
										onClick={() => copy(convertedDate)}
										className="inline-flex min-h-10 min-w-10 flex-shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96]"
										title="Copy to clipboard">
										<IconCopy size={16} className="text-zinc-500" />
									</button>
								</div>
							</div>
						) : (
							<div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-3 text-center text-sm text-zinc-400">
								Enter a timestamp to convert
							</div>
						)}
					</div>
				</div>

				{/* Date to Epoch */}
				<div className="flex-1 rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
					<div className="space-y-4 rounded-[20px] bg-zinc-50 p-4">
						<h2 className="text-lg font-medium text-zinc-800">Date → Timestamp</h2>

						<div className="space-y-2">
							<div className="flex gap-2">
								<input
									type="date"
									value={dateInput}
									onChange={(e) => setDateInput(e.target.value)}
									className="min-h-11 min-w-0 flex-1 rounded-2xl bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
								/>
								<button
									onClick={handleUseCurrentDate}
									className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96]"
									title="Use current date/time">
									<IconRefresh size={18} />
								</button>
							</div>
							<input
								type="time"
								value={timeInput}
								onChange={(e) => setTimeInput(e.target.value)}
								step="1"
								className="min-h-11 w-full rounded-2xl bg-white px-3 py-2 text-sm text-zinc-700 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 ease-out focus:outline-none focus:shadow-[0px_0px_0px_2px_rgba(24,24,27,0.18)]"
							/>
						</div>

						{dateError ? (
							<div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600 shadow-[0px_0px_0px_1px_rgba(220,38,38,0.16)]">
								{dateError}
							</div>
						) : convertedEpoch !== null ? (
							<div className="rounded-2xl bg-white p-3 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
								<div className="flex items-center justify-between gap-2">
									<span className="font-mono text-sm tabular-nums">{formatNumber(convertedEpoch)}</span>
									<button
										onClick={() => copy(convertedEpoch.toString())}
										className="inline-flex min-h-10 min-w-10 flex-shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-[transform,background-color,color] duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96]"
										title="Copy to clipboard">
										<IconCopy size={16} className="text-zinc-500" />
									</button>
								</div>
							</div>
						) : (
							<div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-3 text-center text-sm text-zinc-400">
								Select a date to convert
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Quick Reference */}
			<div className="rounded-[28px] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)]">
				<div className="space-y-2 rounded-[20px] bg-zinc-50 p-4">
					<h3 className="text-sm font-medium text-zinc-700">Quick Reference</h3>
					<div className="grid grid-cols-1 gap-2 text-xs text-zinc-600 sm:grid-cols-2 md:grid-cols-3">
						<div className="flex justify-between">
							<span>1 minute</span>
							<span className="font-mono tabular-nums">60</span>
						</div>
						<div className="flex justify-between">
							<span>1 hour</span>
							<span className="font-mono tabular-nums">3,600</span>
						</div>
						<div className="flex justify-between">
							<span>1 day</span>
							<span className="font-mono tabular-nums">86,400</span>
						</div>
						<div className="flex justify-between">
							<span>1 week</span>
							<span className="font-mono tabular-nums">604,800</span>
						</div>
						<div className="flex justify-between">
							<span>30 days</span>
							<span className="font-mono tabular-nums">2,592,000</span>
						</div>
						<div className="flex justify-between">
							<span>1 year</span>
							<span className="font-mono tabular-nums">31,536,000</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
