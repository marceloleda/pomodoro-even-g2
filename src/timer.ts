import type { TimerState } from './types';
import {
  mode, cycle, running, remainingMs,
  updateTimerState, isLongBreak, phaseDurationMs, msLeft,
} from './state';
import { saveTimerState } from './storage';
import { updateTick, updateStatusLine, refreshAll, sendIcon, blinkStatus, cancelBlink } from './glasses/display';

// Wake slightly after the second boundary so the countdown never shows the same second twice.
const TICK_MARGIN_MS = 10;

let tickTimeout: ReturnType<typeof setTimeout> | null = null;
let renderInFlight = false;

function scheduleRender() {
  if (renderInFlight) return;
  renderInFlight = true;
  void updateTick().finally(() => { renderInFlight = false; });
}

function clearTick() {
  if (tickTimeout) {
    clearTimeout(tickTimeout);
    tickTimeout = null;
  }
}

// The remaining time is always derived from the wall clock (endsAt), so a
// throttled or suspended WebView catches up on the next tick instead of drifting.
function scheduleTick() {
  clearTick();
  const left = msLeft();
  if (left <= 0) {
    finishPhase(true);
    return;
  }
  // Next wake-up is when the displayed second changes.
  tickTimeout = setTimeout(onTick, (left % 1000 || 1000) + TICK_MARGIN_MS);
}

function onTick() {
  tickTimeout = null;
  if (!running) return;
  scheduleTick();
  if (running) scheduleRender();
}

// Work -> break counts a completed session.
function nextPhase(): Pick<TimerState, 'mode' | 'cycle'> {
  return mode === 'work' ? { mode: 'break', cycle: cycle + 1 } : { mode: 'work', cycle };
}

function enterPhase(next: Pick<TimerState, 'mode' | 'cycle'>, alertText: string) {
  clearTick();
  updateTimerState({
    ...next,
    running: false,
    endsAt: 0,
    remainingMs: phaseDurationMs(next.mode, next.cycle),
    alert: alertText,
  });
  saveTimerState();
}

// The glasses can't beep, so instead of rolling into the next phase unnoticed
// the timer stops and alerts until the user starts it.
function finishPhase(blink: boolean) {
  const next = nextPhase();
  let alertText = 'Back to work!';
  if (next.mode === 'break') alertText = isLongBreak(next.cycle) ? 'Long break time!' : 'Break time!';
  enterPhase(next, alertText);
  void refreshPhaseDisplay().then(() => { if (blink) blinkStatus(); });
}

async function refreshPhaseDisplay() {
  await refreshAll();
  await sendIcon();
}

export function startTimer() {
  if (running) return;
  updateTimerState({ running: true, endsAt: Date.now() + remainingMs, alert: '' });
  saveTimerState();
  scheduleTick();
  void updateStatusLine();
}

export function pauseTimer() {
  if (!running) return;
  clearTick();
  updateTimerState({ running: false, remainingMs: msLeft(), endsAt: 0 });
  saveTimerState();
  void updateStatusLine();
}

export function toggleTimer() {
  if (running) pauseTimer();
  else startTimer();
}

export async function skipToNext() {
  enterPhase(nextPhase(), '');
  await refreshPhaseDisplay();
}

export async function resetTimer() {
  enterPhase({ mode: 'work', cycle: 0 }, '');
  await refreshPhaseDisplay();
}

// Re-reads the wall clock right away (e.g. on visibilitychange or when the
// glasses app returns to the foreground) instead of waiting for the next tick.
export function resyncTimer() {
  if (!running) return;
  scheduleTick();
  if (running) scheduleRender();
}

// Applies a saved state on launch. A phase that ended while the app was closed
// shows its alert; one still running picks up where the wall clock says it is.
export function restoreTimer(saved: TimerState) {
  const duration = phaseDurationMs(saved.mode, saved.cycle);
  updateTimerState({
    ...saved,
    remainingMs: Math.min(saved.remainingMs, duration),
    endsAt: saved.running ? Math.min(saved.endsAt, Date.now() + duration) : 0,
  });
  if (running) scheduleTick();
}

export function stopTimer() {
  clearTick();
  cancelBlink();
}
