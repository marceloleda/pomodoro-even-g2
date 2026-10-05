import { STORAGE_KEY } from './config';
import { bridge, getTimerState } from './state';
import { enqueue } from './glasses/queue';
import type { TimerState } from './types';

// Android can kill a backgrounded WebView without warning, so state is saved on
// every change rather than on exit. The bridge storage is the documented one;
// browser localStorage is a fallback for web preview mode and a failed read.
export function saveTimerState() {
  const raw = JSON.stringify(getTimerState());
  writeBrowserStorage(raw);
  const b = bridge;
  if (!b) return;
  enqueue('setLocalStorage', () => b.setLocalStorage(STORAGE_KEY, raw))
    .catch((err: unknown) => console.warn('[pomodoro] setLocalStorage failed:', err));
}

export async function loadTimerState(): Promise<TimerState | null> {
  let raw = '';
  const b = bridge;
  if (b) {
    try {
      raw = await enqueue('getLocalStorage', () => b.getLocalStorage(STORAGE_KEY));
    } catch (err) {
      console.warn('[pomodoro] getLocalStorage failed:', err);
    }
  }
  if (!raw) raw = readBrowserStorage();
  return raw ? parseTimerState(raw) : null;
}

function parseTimerState(raw: string): TimerState | null {
  try {
    const s: Partial<TimerState> = JSON.parse(raw);
    const valid =
      (s.mode === 'work' || s.mode === 'break') &&
      Number.isInteger(s.cycle) && s.cycle! >= 0 &&
      typeof s.running === 'boolean' &&
      Number.isFinite(s.endsAt) &&
      Number.isFinite(s.remainingMs) && s.remainingMs! >= 0 &&
      typeof s.alert === 'string';
    return valid ? (s as TimerState) : null;
  } catch {
    return null;
  }
}

function readBrowserStorage(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeBrowserStorage(raw: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}
