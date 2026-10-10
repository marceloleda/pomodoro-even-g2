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
// Icon actually on screen; a create or rebuild leaves the image container empty.
let shownIcon: PomodoroMode | null = null;
// The image channel can stay wedged for the rest of the session (reported after
// the exit dialog is dismissed), so icon sends stop after this many failures in a row.
const MAX_ICON_FAILURES = 2;
let iconFailures = 0;
// createStartUpPageContainer works once per glasses session, and a second call
// blocks for ~2s before returning invalid, so it is only ever tried once.
let startupCalled = false;
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

// Draws the whole page: the startup page the first time, a rebuild after that.
export async function renderPage(): Promise<void> {
  const b = bridge;
  if (!b) return;
  cancelBlink();
  const { iconImg, statusText, timerText, progressText, dotsText, menuList } = buildContainers();
  const page = {
    containerTotalNum: 6,
    imageObject: [iconImg],
    textObject: [statusText, timerText, progressText, dotsText],
    listObject: [menuList],
  };
  try {
    let created = false;
    if (!startupCalled) {
      startupCalled = true;
      const result = await enqueue('createStartUpPageContainer', () =>
        b.createStartUpPageContainer(new CreateStartUpPageContainer(page)));
      created = result === StartUpPageCreateResult.success;
      // After a WebView reload the startup page already exists and this returns invalid.
      if (!created) console.warn('[pomodoro] createStartUpPageContainer returned', result, '- rebuilding instead');
    }
    if (!created) {
      const rebuilt = await enqueue('rebuildPageContainer', () =>
        b.rebuildPageContainer(new RebuildPageContainer(page)));
      if (!rebuilt) {
        console.error('[pomodoro] rebuildPageContainer failed');
        return;
      }
    }
    setPageCreated(true);
    lastProgress = progressText.content ?? '';
    // Image containers start empty after the page is created or rebuilt.
    lastIconMode = null;
    shownIcon = null;
    await sendIcon();
    // Drawing the page cancelled any blink; a pending alert (including one from a
    // phase that ended while the app was closed) starts blinking again.
    if (alert) blinkStatus();
  } catch (err) {
    console.error('[pomodoro] renderPage failed:', err);
  }
}

// Used for Skip/Reset. A rebuild puts the native list selection back on
// "Start / Pause", so the next tap starts the phase instead of skipping or
// resetting again, and it costs less than four text upgrades.
export async function redrawPage(): Promise<void> {
  if (!canDraw()) return;
  await renderPage();
}

export async function sendIcon(): Promise<void> {
  const b = bridge;
  if (!b || !canDraw() || iconFailures >= MAX_ICON_FAILURES || lastIconMode === mode) return;
  const iconMode = mode;
  lastIconMode = iconMode;
  let ok = false;
  try {
    const imageData = iconMode === 'work' ? getTomatoIcon(ICON_SIZE) : getCoffeeIcon(ICON_SIZE);
    const result = await enqueue('updateImageRawData(icon)', () =>
      b.updateImageRawData(new ImageRawDataUpdate({ containerID: ICON_ID, containerName: 'icon', imageData })));
    ok = result === ImageRawDataUpdateResult.success;
    if (!ok) console.warn('[pomodoro] updateImageRawData(icon) returned', result);
  } catch (err) {
    console.error('[pomodoro] sendIcon failed:', err);
  }
  if (ok) {
    shownIcon = iconMode;
    iconFailures = 0;
    return;
  }
  lastIconMode = null;
  iconFailures++;
  if (iconFailures >= MAX_ICON_FAILURES) console.warn('[pomodoro] icon sends keep failing; no icon for this session');
  // No icon beats the previous phase's one: a rebuild empties the container and
  // retries once. It resets shownIcon, so this branch can't recurse again.
  if (shownIcon !== null && shownIcon !== mode) await renderPage();
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
  // Before the page exists or while the glasses are off nobody would see it; the
  // alert blinks once the page is drawn (main.ts) or the glasses go back on.
  if (!canDraw()) return;
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
