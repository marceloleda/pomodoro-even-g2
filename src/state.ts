import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import type { PomodoroMode } from './types';
import {
  WORK_MINUTES, SHORT_BREAK_MINUTES, LONG_BREAK_MINUTES,
  CYCLES_BEFORE_LONG_BREAK, STATUS_PAD_LENGTH, ACTIONS,
} from './config';

// --- Mutable state ---
export let mode: PomodoroMode = 'work';
export let timeLeft = WORK_MINUTES * 60;
export let running = false;
export let cycle = 0;
export let timerTimeout: ReturnType<typeof setTimeout> | null = null;
export let timerGeneration = 0;
export let isPageCreated = false;
// Stays null in web preview mode, where there are no glasses to talk to.
export let bridge: EvenAppBridge | null = null;
export let transientMessage = '';
export let transientTimeout: ReturnType<typeof setTimeout> | null = null;
export let selectedIndex = 0;

// --- State setters ---
export function setMode(m: PomodoroMode) { mode = m; }
export function setTimeLeft(t: number) { timeLeft = t; }
export function setRunning(r: boolean) { running = r; }
export function setCycle(c: number) { cycle = c; }
export function setTimerTimeout(t: ReturnType<typeof setTimeout> | null) { timerTimeout = t; }
export function incrementGeneration() { timerGeneration++; return timerGeneration; }
export function setPageCreated(v: boolean) { isPageCreated = v; }
export function setBridge(b: EvenAppBridge) { bridge = b; }
export function setSelectedIndex(i: number) { selectedIndex = i; }

// --- Derived state ---

export function isLongBreak(): boolean {
  return cycle > 0 && cycle % CYCLES_BEFORE_LONG_BREAK === 0;
}

export function getModeLabel(): string {
  if (mode === 'work') return 'WORK';
  return isLongBreak() ? 'LONG BREAK' : 'SHORT BREAK';
}

// Work sessions completed in the current set. `cycle` keeps counting across sets,
// so the long break shows the full set and the next work session starts a new one.
export function completedInSet(): number {
  if (mode === 'break' && isLongBreak()) return CYCLES_BEFORE_LONG_BREAK;
  return cycle % CYCLES_BEFORE_LONG_BREAK;
}

export function getBreakDuration(): number {
  return (isLongBreak() ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES) * 60;
}

export function getTotalTime(): number {
  if (mode === 'work') return WORK_MINUTES * 60;
  return getBreakDuration();
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function buildSessionDots(): string {
  const completed = completedInSet();
  return Array.from({ length: CYCLES_BEFORE_LONG_BREAK }, (_, i) =>
    i < completed ? '\u25CF' : '\u25CB'
  ).join(' ');
}

export function buildStatusLine(): string {
  if (transientMessage) return transientMessage.padEnd(STATUS_PAD_LENGTH);
  const icon = running ? '\u25B6' : '| |';
  return `${icon}  ${getModeLabel()} \u00B7 ${completedInSet()}/${CYCLES_BEFORE_LONG_BREAK}`.padEnd(STATUS_PAD_LENGTH);
}

export function buildMenuText(): string {
  return ACTIONS.map((a, i) =>
    i === selectedIndex ? `[${a}]` : ` ${a} `
  ).join('\n');
}

export function showTransientMessage(msg: string, durationSec: number, onExpire: () => void) {
  transientMessage = msg;
  if (transientTimeout) clearTimeout(transientTimeout);
  transientTimeout = setTimeout(() => {
    transientMessage = '';
    transientTimeout = null;
    onExpire();
  }, durationSec * 1000);
}

export function clearTransientMessage() {
  transientMessage = '';
  if (transientTimeout) {
    clearTimeout(transientTimeout);
    transientTimeout = null;
  }
}
