import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import type { PomodoroMode, TimerState } from './types';
import {
  WORK_MINUTES, SHORT_BREAK_MINUTES, LONG_BREAK_MINUTES,
  CYCLES_BEFORE_LONG_BREAK, PROGRESS_SEGMENTS,
} from './config';

// --- Mutable state ---
export let mode: PomodoroMode = 'work';
export let cycle = 0;
export let running = false;
export let endsAt = 0;
export let remainingMs = WORK_MINUTES * 60_000;
export let alert = '';
export let isPageCreated = false;
// Stays null in web preview mode, where there are no glasses to talk to.
export let bridge: EvenAppBridge | null = null;

// --- State setters ---
export function setPageCreated(v: boolean) { isPageCreated = v; }
export function setBridge(b: EvenAppBridge) { bridge = b; }

export function getTimerState(): TimerState {
  return { mode, cycle, running, endsAt, remainingMs, alert };
}

export function updateTimerState(changes: Partial<TimerState>) {
  ({ mode, cycle, running, endsAt, remainingMs, alert } = { ...getTimerState(), ...changes });
}

// --- Derived state ---

export function isLongBreak(c = cycle): boolean {
  return c > 0 && c % CYCLES_BEFORE_LONG_BREAK === 0;
}

export function getModeLabel(): string {
  if (mode === 'work') return 'WORK';
  return isLongBreak() ? 'LONG BREAK' : 'SHORT BREAK';
}

export function phaseDurationMs(m: PomodoroMode = mode, c = cycle): number {
  if (m === 'work') return WORK_MINUTES * 60_000;
  return (isLongBreak(c) ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES) * 60_000;
}

export function msLeft(now = Date.now()): number {
  return running ? Math.max(0, endsAt - now) : remainingMs;
}

export function secondsLeft(now = Date.now()): number {
  return Math.ceil(msLeft(now) / 1000);
}

export function progressFraction(now = Date.now()): number {
  const total = phaseDurationMs();
  return Math.min(1, Math.max(0, 1 - msLeft(now) / total));
}

// Work sessions completed in the current set. `cycle` keeps counting across sets,
// so the long break shows the full set and the next work session starts a new one.
export function completedInSet(): number {
  if (mode === 'break' && isLongBreak()) return CYCLES_BEFORE_LONG_BREAK;
  return cycle % CYCLES_BEFORE_LONG_BREAK;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function buildSessionDots(): string {
  const completed = completedInSet();
  return Array.from({ length: CYCLES_BEFORE_LONG_BREAK }, (_, i) =>
    i < completed ? '●' : '○'
  ).join(' ');
}

export function buildStatusLine(): string {
  if (alert) return `★ ${alert}`;
  const icon = running ? '▶' : '| |';
  return `${icon}  ${getModeLabel()} · ${completedInSet()}/${CYCLES_BEFORE_LONG_BREAK}`;
}

export function buildProgressBar(): string {
  const filled = Math.round(progressFraction() * PROGRESS_SEGMENTS);
  return '━'.repeat(filled) + '─'.repeat(PROGRESS_SEGMENTS - filled);
}
