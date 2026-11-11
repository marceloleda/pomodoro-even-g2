import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import type { PomodoroMode, Settings, TimerState } from './types';
import {
  DEFAULT_SETTINGS, PROGRESS_SEGMENTS, PROGRESS_FILLED, PROGRESS_EMPTY, OVERTIME_MAX_MS,
  MINI_BAR_SEGMENTS, MINI_BAR_LEVELS, SECONDS_WINDOW_MS,
  STATUS_READY, STATUS_RUNNING, STATUS_PAUSED, statusText, alertText, compactTimerText,
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

// The countdown, or how long ago the previous phase ended while its alert is up,
// to the second. The phone page always shows this.
export function buildTimerText(now = Date.now()): string {
  if (alert && endedAt) return `+${formatTime(Math.floor(overtimeMs(now) / 1000))}`;
  return formatTime(secondsLeft(now));
}

// Whether the glasses show seconds right now: always if the setting is on or the
// timer is stopped (a stopped time costs no writes); otherwise only in the last
// minute of a running phase and the first minute of overtime.
export function countsSeconds(now = Date.now()): boolean {
  if (settings.showSeconds) return true;
  if (running) return msLeft(now) <= SECONDS_WINDOW_MS;
  return overtimeMs(now) < SECONDS_WINDOW_MS;
}

// The glasses' timer row: buildTimerText, or whole minutes ("24 min" for anything
// from 23:01 to 24:00 left, "+3 min" of overtime).
export function buildGlassesTimer(now = Date.now()): string {
  if (countsSeconds(now)) return buildTimerText(now);
  if (alert && endedAt) return `+${t.glasses.minutes(Math.floor(overtimeMs(now) / 60_000))}`;
  return t.glasses.minutes(Math.ceil(secondsLeft(now) / 60));
}

// Compact view: while the seconds show, the ▶ blinks with them.
export function buildCompactTimer(now = Date.now()): string {
  return compactTimerText(buildGlassesTimer(now), !countsSeconds(now) || secondsLeft(now) % 2 === 0);
}

// Both bars are step counters over the phase: the full page's fills a segment at
// a time (rounded, so it ends full), the compact one's five segments each grow
// ▁ ▂ ▃ and fill ▄ before the next one starts.
function barShape(compact: boolean): { steps: number; bias: number } {
  return compact
    ? { steps: MINI_BAR_SEGMENTS * (MINI_BAR_LEVELS.length - 1), bias: 0 }
    : { steps: PROGRESS_SEGMENTS, bias: 0.5 };
}

function barStep(compact: boolean, now: number): number {
  const { steps, bias } = barShape(compact);
  return Math.floor(progressFraction(now) * steps + bias);
}

// How long until the bar of the page a running phase shows gains a step, so the
// timer can wake up for it instead of polling; Infinity once it is full.
export function msToNextBarStep(now = Date.now()): number {
  if (!running) return Infinity;
  const compact = isCompactView();
  const { steps, bias } = barShape(compact);
  const fraction = (barStep(compact, now) + 1 - bias) / steps;
  return fraction > 1 ? Infinity : msLeft(now) - durationMs * (1 - fraction);
}

export function buildMiniBar(now = Date.now()): string {
  const levels = [...MINI_BAR_LEVELS];
  const top = levels.length - 1;
  const done = barStep(true, now);
  return Array.from({ length: MINI_BAR_SEGMENTS }, (_, i) =>
    levels[Math.min(top, Math.max(0, done - i * top))]
  ).join('');
}

export function buildSessionDots(): string {
  const completed = completedInSet();
  return Array.from({ length: settings.sessionsPerSet }, (_, i) =>
    i < completed ? '●' : '○'
  ).join(' ');
}

// ▷ ready to start, ▶ running, ‖ paused, ★ the previous phase just ended.
export function buildStatusLine(): string {
  if (alert) return alertText(getAlertText());
  const glyph = running ? STATUS_RUNNING : isPhaseUntouched() ? STATUS_READY : STATUS_PAUSED;
  return statusText(glyph, getModeLabel(), completedInSet(), settings.sessionsPerSet);
}

export function buildProgressBar(now = Date.now()): string {
  const filled = Math.min(PROGRESS_SEGMENTS, barStep(false, now));
  return PROGRESS_FILLED.repeat(filled) + PROGRESS_EMPTY.repeat(PROGRESS_SEGMENTS - filled);
}

// Footer: when the phase ends while running, otherwise what a tap does.
export function buildFooter(): string {
  if (running) return t.glasses.endsAt(formatClock(endsAt));
  if (alert) return t.glasses.tapToStartNext(formatTime(Math.round(remainingMs / 1000)));
  return isPhaseUntouched() ? t.glasses.tapToStart : t.glasses.tapToResume;
}
