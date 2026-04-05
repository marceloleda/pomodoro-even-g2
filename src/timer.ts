import { WORK_MINUTES, MOTIVATION_DISPLAY_SECONDS } from './config';
import {
  running, timeLeft, timerTimeout, timerGeneration, mode, cycle,
  setRunning, setTimeLeft, setTimerTimeout, incrementGeneration,
  setMode, setCycle, getBreakDuration, showTransientMessage,
} from './state';
import { updateTimerDisplay, updateAllText, updateStatusLine, updateDotsLine, sendIcon } from './glasses/display';

export function startTimer() {
  if (running) return;
  setRunning(true);
  const myGen = incrementGeneration();
  void updateStatusLine();

  const tick = async () => {
    if (!running || myGen !== timerGeneration) return;
    if (timeLeft <= 0) {
      await handleTimerEnd();
      return;
    }
    setTimeLeft(timeLeft - 1);
    await updateTimerDisplay();
    if (running && myGen === timerGeneration) {
      setTimerTimeout(setTimeout(tick, 1000));
    }
  };

  setTimerTimeout(setTimeout(tick, 1000));
}

export function pauseTimer() {
  setRunning(false);
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    setTimerTimeout(null);
  }
  void updateStatusLine();
  void updateDotsLine();
}

export async function resetTimer() {
  pauseTimer();
  setMode('work');
  setCycle(0);
  setTimeLeft(WORK_MINUTES * 60);
  await updateAllText();
  await sendIcon();
}

export async function skipToNext() {
  pauseTimer();
  const wasBreak = mode === 'break';
  if (mode === 'work') {
    setCycle(cycle + 1);
    setMode('break');
    setTimeLeft(getBreakDuration());
  } else {
    setMode('work');
    setTimeLeft(WORK_MINUTES * 60);
  }
  if (wasBreak && cycle > 0) {
    showTransientMessage('\u25B6  Back to work!', MOTIVATION_DISPLAY_SECONDS, () => {
      void updateStatusLine();
    });
  }
  await updateAllText();
  await sendIcon();
}

async function handleTimerEnd() {
  pauseTimer();
  await skipToNext();
  startTimer();
}
