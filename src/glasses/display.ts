import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  StartUpPageCreateResult,
} from '@evenrealities/even_hub_sdk';
import { ICON_SIZE, TEXT_BRIGHT, TEXT_OFF, ALERT_BLINKS, ALERT_BLINK_MS } from '../config';
import {
  bridge, mode, alert, isPageCreated, setPageCreated,
  formatTime, secondsLeft, buildStatusLine, buildSessionDots, buildProgressBar,
} from '../state';
import { buildContainers, STATUS_ID, TIMER_ID, PROGRESS_ID, DOTS_ID, ICON_ID } from './containers';
import { enqueue } from './queue';
import type { PomodoroMode } from '../types';
import { getTomatoIcon, getCoffeeIcon } from '../rendering/icons';

const CONTAINER_NAMES: Record<number, string> = {
  [STATUS_ID]: 'status', [TIMER_ID]: 'timer', [PROGRESS_ID]: 'progress', [DOTS_ID]: 'dots',
};

// Last content sent, so unchanged frames are skipped; reset whenever the page is redrawn.
let lastProgress = '';
let lastIconMode: PomodoroMode | null = null;
// True while the glasses are off the user's face: nobody sees the display, so skip writes.
let suspended = false;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;

function canDraw(): boolean {
  return !!bridge && isPageCreated && !suspended;
}

async function writeText(containerID: number, content: string, textColor?: number): Promise<void> {
  const b = bridge;
  if (!b || !canDraw()) return;
  const containerName = CONTAINER_NAMES[containerID];
  try {
    const ok = await enqueue(`textContainerUpgrade(${containerName})`, () =>
      b.textContainerUpgrade(new TextContainerUpgrade({ containerID, containerName, content, textColor })));
    if (!ok) console.warn(`[pomodoro] textContainerUpgrade(${containerName}) returned false`);
  } catch (err) {
    console.error(`[pomodoro] textContainerUpgrade(${containerName}) failed:`, err);
  }
}

export async function renderPage(): Promise<void> {
  const b = bridge;
  if (!b) return;
  const { iconImg, statusText, timerText, progressText, dotsText, menuList } = buildContainers();
  const page = {
    containerTotalNum: 6,
    imageObject: [iconImg],
    textObject: [statusText, timerText, progressText, dotsText],
    listObject: [menuList],
  };
  try {
    const result = await enqueue('createStartUpPageContainer', () =>
      b.createStartUpPageContainer(new CreateStartUpPageContainer(page)));
    if (result !== StartUpPageCreateResult.success) {
      // The startup page can only be created once per glasses session. After a
      // WebView reload it already exists, so redraw it in place instead.
      const rebuilt = await enqueue('rebuildPageContainer', () =>
        b.rebuildPageContainer(new RebuildPageContainer(page)));
      if (!rebuilt) {
        console.error('[pomodoro] createStartUpPageContainer returned', result, 'and rebuildPageContainer failed');
        return;
      }
    }
    setPageCreated(true);
    lastProgress = progressText.content ?? '';
    lastIconMode = null;
    // Image containers start empty after the page is created.
    await sendIcon();
  } catch (err) {
    console.error('[pomodoro] renderPage failed:', err);
  }
}

export async function sendIcon(): Promise<void> {
  const b = bridge;
  if (!b || !canDraw() || lastIconMode === mode) return;
  const iconMode = mode;
  lastIconMode = iconMode;
  try {
    const imageData = iconMode === 'work' ? getTomatoIcon(ICON_SIZE) : getCoffeeIcon(ICON_SIZE);
    const result = await enqueue('updateImageRawData(icon)', () =>
      b.updateImageRawData(new ImageRawDataUpdate({ containerID: ICON_ID, containerName: 'icon', imageData })));
    if (result !== ImageRawDataUpdateResult.success) {
      lastIconMode = null;
      console.warn('[pomodoro] updateImageRawData(icon) returned', result);
    }
  } catch (err) {
    lastIconMode = null;
    console.error('[pomodoro] sendIcon failed:', err);
  }
}

// Called every second while running: the countdown always changes, the bar
// only every PROGRESS_SEGMENTS-th of the phase.
export async function updateTick(): Promise<void> {
  await writeText(TIMER_ID, formatTime(secondsLeft()));
  const progress = buildProgressBar();
  if (progress !== lastProgress && canDraw()) {
    lastProgress = progress;
    await writeText(PROGRESS_ID, progress);
  }
}

export async function updateStatusLine(): Promise<void> {
  cancelBlink();
  await writeText(STATUS_ID, buildStatusLine(), TEXT_BRIGHT);
}

export async function refreshAll(): Promise<void> {
  if (!canDraw()) return;
  cancelBlink();
  lastProgress = buildProgressBar();
  await writeText(STATUS_ID, buildStatusLine(), TEXT_BRIGHT);
  await writeText(TIMER_ID, formatTime(secondsLeft()));
  await writeText(PROGRESS_ID, lastProgress);
  await writeText(DOTS_ID, buildSessionDots());
}

// The glasses have no speaker or haptics: blinking the status line is the
// only way to flag a phase change. Ends on full brightness.
export function blinkStatus() {
  cancelBlink();
  let step = 0;
  const next = () => {
    blinkTimer = null;
    if (step >= ALERT_BLINKS * 2) return;
    const level = step % 2 === 0 ? TEXT_OFF : TEXT_BRIGHT;
    step++;
    void writeText(STATUS_ID, buildStatusLine(), level);
    blinkTimer = setTimeout(next, ALERT_BLINK_MS);
  };
  next();
}

export function cancelBlink() {
  if (blinkTimer) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
  }
}

// Driven by the wearing sensor. Taking the glasses off stops display writes
// (the timer keeps running); putting them back on redraws the current state.
export async function setDisplaySuspended(value: boolean): Promise<void> {
  if (suspended === value) return;
  suspended = value;
  if (value) {
    cancelBlink();
    return;
  }
  await refreshAll();
  await sendIcon();
  if (alert) blinkStatus();
}
