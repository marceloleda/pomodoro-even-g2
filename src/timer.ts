import type { Settings, TimerState } from './types';
import { ALERT_REPEAT_MS, ALERT_REPEATS, OVERTIME_MAX_MS } from './config';
import {
  mode, cycle, running, remainingMs, alert, endedAt, endsAt,
  updateTimerState, setSettings, phaseDurationMs, msLeft, isPhaseUntouched,
} from './state';
import { saveTimerState, saveSettings } from './storage';
import {
  updateTick, updateStatus, refreshAll, redrawPage, sendIcon, blinkStatus, cancelBlink,
} from './glasses/display';

// Wake slightly after the second boundary so the countdown never shows the same second twice.
const TICK_MARGIN_MS = 10;
// Stepping a setting on the phone several times in a row saves and redraws once.
const SETTINGS_COMMIT_MS = 300;

let tickTimeout: ReturnType<typeof setTimeout> | null = null;
let renderInFlight = false;
// When the phase-end alert blinks again; 0 once it has stopped repeating.
let nextReblinkAt = 0;
let settingsCommitTimer: ReturnType<typeof setTimeout> | null = null;

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

// The time shown is always derived from the wall clock (endsAt, endedAt), so a
// throttled or suspended WebView catches up on the next tick instead of drifting.
// Ticks run while the countdown runs and, after a phase ends, while the
// overtime counter is counting up.
function scheduleTick() {
  clearTick();
  let delay: number;
  if (running) {
    const left = msLeft();
    if (left <= 0) {
      finishPhase(true);
      return;
    }
    // Next wake-up is when the displayed second changes.
    delay = left % 1000 || 1000;
  } else if (alert && endedAt) {
    const over = Date.now() - endedAt;
    if (over >= OVERTIME_MAX_MS) return;
    delay = 1000 - (over % 1000);
  } else {
    return;
  }
  tickTimeout = setTimeout(onTick, delay + TICK_MARGIN_MS);
}

function onTick() {
  tickTimeout = null;
  scheduleTick();
  if (running || alert) scheduleRender();
  if (alert) maybeReblink();
}

// A missed alert blinks again every ALERT_REPEAT_MS, for ALERT_REPEATS times.
// Slots count from endedAt, so tick jitter or a throttled WebView can't push
// the last one out of the window.
function maybeReblink(now = Date.now()) {
  if (!nextReblinkAt || now < nextReblinkAt) return;
  const slot = Math.floor((now - endedAt) / ALERT_REPEAT_MS);
  if (slot > ALERT_REPEATS) {
    nextReblinkAt = 0;
    return;
  }
  nextReblinkAt = endedAt + (slot + 1) * ALERT_REPEAT_MS;
  blinkStatus();
}

// The first re-blink slot still ahead of `now`.
function nextReblinkSlot(now = Date.now()): number {
  return endedAt + (Math.floor((now - endedAt) / ALERT_REPEAT_MS) + 1) * ALERT_REPEAT_MS;
}

// Work -> break counts a completed session.
function nextPhase(): Pick<TimerState, 'mode' | 'cycle'> {
  return mode === 'work' ? { mode: 'break', cycle: cycle + 1 } : { mode: 'work', cycle };
}

function enterPhase(next: Pick<TimerState, 'mode' | 'cycle'>, phaseEndedAt = 0) {
  clearTick();
  const duration = phaseDurationMs(next.mode, next.cycle);
  updateTimerState({
    ...next,
    running: false,
    endsAt: 0,
    remainingMs: duration,
    durationMs: duration,
    alert: phaseEndedAt > 0,
    endedAt: phaseEndedAt,
  });
  nextReblinkAt = phaseEndedAt ? nextReblinkSlot() : 0;
  saveTimerState();
}

// The glasses can't beep, so instead of rolling into the next phase unnoticed
// the timer stops, alerts and counts the overtime until the user starts it.
function finishPhase(blink: boolean) {
  enterPhase(nextPhase(), endsAt);
  scheduleTick();
  // The user may already have started the next phase by the time the redraw is done.
  void refreshPhaseDisplay().then(() => { if (blink && alert) blinkStatus(); });
}

async function refreshPhaseDisplay() {
  await refreshAll();
  await sendIcon();
}

export function startTimer() {
  if (running) return;
  clearTick();
  updateTimerState({ running: true, endsAt: Date.now() + remainingMs, alert: false, endedAt: 0 });
  nextReblinkAt = 0;
  saveTimerState();
  scheduleTick();
  void updateStatus();
}

export function pauseTimer() {
  if (!running) return;
  clearTick();
  updateTimerState({ running: false, remainingMs: msLeft(), endsAt: 0 });
  saveTimerState();
  void updateStatus();
}

export function toggleTimer() {
  // The phase is over but a throttled WebView hasn't ticked yet: end it now
  // (alert and all) instead of pausing at 00:00.
  if (running && msLeft() <= 0) {
    scheduleTick();
    return;
  }
  if (running) pauseTimer();
  else startTimer();
}

// Skip and Reset rebuild the page: cheaper than upgrading five text containers.
export async function skipToNext() {
  enterPhase(nextPhase());
  await redrawPage();
}

export async function resetTimer() {
  enterPhase({ mode: 'work', cycle: 0 });
  await redrawPage();
}

// New lengths apply to a phase that hasn't started yet; one in progress keeps its
// own. The state changes at once (the phone page shows it); saving and redrawing
// the glasses wait until the stepping stops, so the BLE queue isn't flooded.
export function applySettings(next: Settings) {
  setSettings(next);
  if (isPhaseUntouched()) {
    const duration = phaseDurationMs();
    updateTimerState({ remainingMs: duration, durationMs: duration });
  }
  if (settingsCommitTimer) clearTimeout(settingsCommitTimer);
  settingsCommitTimer = setTimeout(() => {
    settingsCommitTimer = null;
    saveSettings();
    saveTimerState();
    void refreshAll();
  }, SETTINGS_COMMIT_MS);
}

// Re-reads the wall clock right away (e.g. on visibilitychange or when the
// glasses app returns to the foreground) instead of waiting for the next tick.
export function resyncTimer() {
  if (!running && !alert) return;
  scheduleTick();
  scheduleRender();
}

// Applies a saved state on launch. A phase that ended while the app was closed
// shows its alert and overtime; one still running picks up where the wall clock says it is.
export function restoreTimer(saved: Partial<TimerState>) {
  const restoredMode = saved.mode ?? 'work';
  const restoredCycle = saved.cycle ?? 0;
  const duration = saved.durationMs ?? phaseDurationMs(restoredMode, restoredCycle);
  updateTimerState({
    ...saved,
    durationMs: duration,
    remainingMs: Math.min(saved.remainingMs ?? duration, duration),
    endsAt: saved.running ? Math.min(saved.endsAt ?? 0, Date.now() + duration) : 0,
    // 1.0.0 didn't save when the phase ended; count the overtime from now.
    endedAt: saved.alert ? saved.endedAt || Date.now() : 0,
  });
  if (alert) nextReblinkAt = nextReblinkSlot();
  scheduleTick();
}

export function stopTimer() {
  clearTick();
  cancelBlink();
  nextReblinkAt = 0;
}

