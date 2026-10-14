import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, SETTINGS_LIMITS } from './config';
import { bridge, getTimerState, settings } from './state';
import { enqueue } from './glasses/queue';
import type { Settings, TimerState } from './types';

// Android can kill a backgrounded WebView without warning, so state is saved on
// every change rather than on exit. The bridge storage is the documented one;
// browser localStorage is a fallback for web preview mode and a failed read.
function writeItem(key: string, raw: string) {
  writeBrowserStorage(key, raw);
  const b = bridge;
  if (!b) return;
  enqueue('setLocalStorage', () => b.setLocalStorage(key, raw))
    .catch((err: unknown) => console.warn('[pomodoro] setLocalStorage failed:', err));
}

async function readItem(key: string): Promise<string> {
  let raw = '';
  const b = bridge;
  if (b) {
    try {
      raw = await enqueue('getLocalStorage', () => b.getLocalStorage(key));
    } catch (err) {
      console.warn('[pomodoro] getLocalStorage failed:', err);
    }
  }
  return raw || readBrowserStorage(key);
}

export function saveTimerState() {
  writeItem(STORAGE_KEY, JSON.stringify(getTimerState()));
}

export async function loadTimerState(): Promise<Partial<TimerState> | null> {
  const raw = await readItem(STORAGE_KEY);
  return raw ? parseTimerState(raw) : null;
}

export function saveSettings() {
  writeItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadSettings(): Promise<Settings | null> {
  const raw = await readItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return clampSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Fills gaps with the defaults and keeps every number inside SETTINGS_LIMITS.
// Settings saved by 1.1.0 have no compactView, so they get the default.
export function clampSettings(s: Partial<Settings>): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(SETTINGS_LIMITS) as Array<keyof typeof SETTINGS_LIMITS>) {
    const [min, max] = SETTINGS_LIMITS[key];
    const v = s[key];
    if (Number.isFinite(v)) out[key] = Math.min(max, Math.max(min, Math.round(v!)));
  }
  if (typeof s.compactView === 'boolean') out.compactView = s.compactView;
  return out;
}

// durationMs and endedAt are missing from states saved by 1.0.0, where alert
// was the message text; the caller fills them in.
function parseTimerState(raw: string): Partial<TimerState> | null {
  try {
    const s = JSON.parse(raw);
    const valid =
      (s.mode === 'work' || s.mode === 'break') &&
      Number.isInteger(s.cycle) && s.cycle >= 0 &&
      typeof s.running === 'boolean' &&
      Number.isFinite(s.endsAt) && (!s.running || s.endsAt > 0) &&
      Number.isFinite(s.remainingMs) && s.remainingMs >= 0;
    if (!valid) return null;
    const alert = typeof s.alert === 'string' ? s.alert !== '' : s.alert === true;
    const state: Partial<TimerState> = {
      mode: s.mode, cycle: s.cycle, running: s.running, endsAt: s.endsAt, remainingMs: s.remainingMs,
      // A running phase can't also be waiting on the previous one's alert.
      alert: alert && !s.running,
    };
    if (Number.isFinite(s.durationMs) && s.durationMs > 0) state.durationMs = s.durationMs;
    if (Number.isFinite(s.endedAt) && s.endedAt > 0) state.endedAt = s.endedAt;
    return state;
  } catch {
    return null;
  }
}

function readBrowserStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeBrowserStorage(key: string, raw: string) {
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}
