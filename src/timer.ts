import { WORK_MINUTES, MOTIVATION_DISPLAY_SECONDS } from './config';
import {
  running, timeLeft, timerTimeout, timerGeneration, mode, cycle,
  setRunning, setTimeLeft, setTimerTimeout, incrementGeneration,
  setMode, setCycle, getBreakDuration, showTransientMessage, clearTransientMessage,
} from './state';
import { updateTimerDisplay, updateAllText, updateStatusLine, sendIcon } from './glasses/display';

let renderInFlight = false;
let currentTick: (() => void) | null = null;

function scheduleRender() {
  if (renderInFlight) return;
  renderInFlight = true;
  void updateTimerDisplay().finally(() => { renderInFlight = false; });
}

function startTicking() {
  setRunning(true);
  const myGen = incrementGeneration();

  const startedAt = Date.now();
  const initialTimeLeft = timeLeft;

  const tick = async () => {
    if (!running || myGen !== timerGeneration) return;

    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const newTimeLeft = Math.max(0, initialTimeLeft - elapsed);
    setTimeLeft(newTimeLeft);

    if (newTimeLeft <= 0) {
      // Advance before any await, so a resync or user action landing while
      // the glasses are still rendering can't end the same session twice.
      stopTicking();
      advancePhase();
      startTicking();
      await refreshPhaseDisplay();
      return;
    }

    // Align next tick to the next wall-clock second, before the render,
    // so Bluetooth latency and background throttling don't drift the clock.
    const nextDelay = 1000 - ((Date.now() - startedAt) % 1000);
    setTimerTimeout(setTimeout(tick, nextDelay));

    scheduleRender();
  };

  currentTick = tick;
  setTimerTimeout(setTimeout(tick, 1000));
}

function stopTicking() {
  setRunning(false);
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    setTimerTimeout(null);
  }
  currentTick = null;
}

// Work -> break counts a completed session; break -> work shows the motivation message.
function advancePhase() {
  if (mode === 'work') {
    setCycle(cycle + 1);
    setMode('break');
    setTimeLeft(getBreakDuration());
    clearTransientMessage();
  } else {
    setMode('work');
    setTimeLeft(WORK_MINUTES * 60);
    showTransientMessage('▶  Back to work!', MOTIVATION_DISPLAY_SECONDS, () => {
      void updateStatusLine();
    });
  }
}

async function refreshPhaseDisplay() {
  await updateAllText();
  await sendIcon();
}

export function startTimer() {
  if (running) return;
  startTicking();
  void updateStatusLine();
}

// Re-runs the current tick immediately (e.g. on visibilitychange), so the
// display resyncs to wall-clock time without waiting up to a second.
export function resyncTimer() {
  if (!running || !currentTick) return;
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    setTimerTimeout(null);
  }
  void currentTick();
}

export function pauseTimer() {
  if (!running) return;
  stopTicking();
  void updateStatusLine();
}

export async function resetTimer() {
  stopTicking();
  clearTransientMessage();
  setMode('work');
  setCycle(0);
  setTimeLeft(WORK_MINUTES * 60);
  await refreshPhaseDisplay();
}

export async function skipToNext() {
  stopTicking();
  advancePhase();
  await refreshPhaseDisplay();
}
