import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import type { PomodoroMode, Settings, TimerState } from './types';
import {
  DEFAULT_SETTINGS, PROGRESS_SEGMENTS, PROGRESS_FILLED, PROGRESS_EMPTY, OVERTIME_MAX_MS,
  PULSE_ON, PULSE_OFF, MINI_BAR_SEGMENTS, MINI_BAR_LEVELS,
} from './config';
import { t, formatClock } from './i18n';

// --- Mutable state ---
export let settings: Settings = { ...DEFAULT_SETTINGS };
export let mode: PomodoroMode = 'work';
export let cycle = 0;
export let running = false;
export let endsAt = 0;
export let durationMs = DEFAULT_SETTINGS.workMinutes * 60_000;
export let remainingMs = durationMs;
export let alert = false;
export let endedAt = 0;
export let isPageCreated = false;
// Stays null in web preview mode, where there are no glasses to talk to.
export let bridge: EvenAppBridge | null = null;

// --- State setters ---
export function setPageCreated(v: boolean) { isPageCreated = v; }
export function setBridge(b: EvenAppBridge) { bridge = b; }
export function setSettings(s: Settings) { settings = s; }

export function getTimerState(): TimerState {
  return { mode, cycle, running, endsAt, remainingMs, durationMs, alert, endedAt };
}

export function updateTimerState(changes: Partial<TimerState>) {
  ({ mode, cycle, running, endsAt, remainingMs, durationMs, alert, endedAt } = { ...getTimerState(), ...changes });
}

// --- Derived state ---

export function isLongBreak(c = cycle): boolean {
  return c > 0 && c % settings.sessionsPerSet === 0;
}

export function getModeLabel(): string {
  if (mode === 'work') return t.glasses.work;
  return isLongBreak() ? t.glasses.longBreak : t.glasses.shortBreak;
}

export function getAlertText(): string {
  if (mode === 'work') return t.glasses.alertWork;
  return isLongBreak() ? t.glasses.alertLongBreak : t.glasses.alertBreak;
}

// Length of a phase under the current settings; a phase in progress keeps durationMs.
export function phaseDurationMs(m: PomodoroMode = mode, c = cycle): number {
  if (m === 'work') return settings.workMinutes * 60_000;
  return (isLongBreak(c) ? settings.longBreakMinutes : settings.shortBreakMinutes) * 60_000;
}

export function msLeft(now = Date.now()): number {
  return running ? Math.max(0, endsAt - now) : remainingMs;
}

export function secondsLeft(now = Date.now()): number {
  return Math.ceil(msLeft(now) / 1000);
}

// Time since the previous phase ended, while its alert is up.
export function overtimeMs(now = Date.now()): number {
  return alert && endedAt ? Math.min(OVERTIME_MAX_MS, Math.max(0, now - endedAt)) : 0;
}

export function progressFraction(now = Date.now()): number {
  return Math.min(1, Math.max(0, 1 - msLeft(now) / durationMs));
}

// While a phase runs the glasses can show just the time; paused, waiting or
// alerting, they show the whole page.
export function isCompactView(): boolean {
  return running && settings.compactView;
}

// A phase that hasn't been started or paused yet.
export function isPhaseUntouched(): boolean {
  return !running && remainingMs === durationMs;
}

// Work sessions completed in the current set. `cycle` keeps counting across sets,
// so the long break shows the full set and the next work session starts a new one.
export function completedInSet(): number {
  if (mode === 'break' && isLongBreak()) return settings.sessionsPerSet;
  return cycle % settings.sessionsPerSet;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// The countdown, or how long ago the previous phase ended while its alert is up.
export function buildTimerText(now = Date.now()): string {
  if (alert && endedAt) return `+${formatTime(Math.floor(overtimeMs(now) / 1000))}`;
  return formatTime(secondsLeft(now));
}

// Compact view: the ▶ and the colon blink with the seconds.
export function buildCompactTimer(now = Date.now()): string {
  const seconds = secondsLeft(now);
  const time = formatTime(seconds);
  return seconds % 2 === 0 ? `${PULSE_ON} ${time}` : `${PULSE_OFF} ${time.replace(':', ' ')}`;
}

// Compact view: each segment grows ▁ ▂ ▃ and fills ▄ before the next one starts.
export function buildMiniBar(): string {
  const levels = [...MINI_BAR_LEVELS];
  const steps = levels.length - 1;
  const done = Math.floor(progressFraction() * MINI_BAR_SEGMENTS * steps);
  return Array.from({ length: MINI_BAR_SEGMENTS }, (_, i) =>
    levels[Math.min(steps, Math.max(0, done - i * steps))]
  ).join('');
}

export function buildSessionDots(): string {
  const completed = completedInSet();
  return Array.from({ length: settings.sessionsPerSet }, (_, i) =>
    i < completed ? '●' : '○'
  ).join(' ');
}

export function buildStatusLine(): string {
  if (alert) return `★ ${getAlertText()}`;
  const icon = running ? '▶' : '| |';
  return `${icon}  ${getModeLabel()} · ${completedInSet()}/${settings.sessionsPerSet}`;
}

export function buildProgressBar(): string {
  const filled = Math.round(progressFraction() * PROGRESS_SEGMENTS);
  return PROGRESS_FILLED.repeat(filled) + PROGRESS_EMPTY.repeat(PROGRESS_SEGMENTS - filled);
}

// Footer: when the phase ends while running, otherwise what a tap does.
export function buildFooter(): string {
  if (running) return t.glasses.endsAt(formatClock(endsAt));
  if (alert) return t.glasses.tapToStartNext(formatTime(Math.round(remainingMs / 1000)));
  return isPhaseUntouched() ? t.glasses.tapToStart : t.glasses.tapToResume;
}
