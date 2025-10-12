/**
 * Timer hook
 * Provides a tick counter that updates at regular intervals
 */

import { useState, useEffect } from 'react';
import { PROCESSING_CONSTANTS } from '@/constants/processing';

export interface UseTimerOptions {
  enabled?: boolean;
  interval?: number;
}

/**
 * Hook that provides a tick counter for time-based updates
 * Useful for displaying elapsed time in UI
 */
export function useTimer({
  enabled = true,
  interval = PROCESSING_CONSTANTS.TIMER_INTERVAL_MS
}: UseTimerOptions = {}): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      setTick(prev => prev + 1);
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval]);

  return tick;
}

/**
 * Format elapsed time from timestamp
 */
export function formatElapsedTime(startTime?: number): string {
  if (!startTime) return '0:00';
  const elapsed = Math.floor((Date.now() - startTime) / 1000); // seconds
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  const mb = kb / 1024;
  const gb = mb / 1024;

  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${kb.toFixed(2)} KB`;
}
