import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  StartUpPageCreateResult,
} from '@evenrealities/even_hub_sdk';
import {
  ICON_SIZE, TEXT_BRIGHT, TEXT_OFF, ALERT_BLINKS, ALERT_BLINK_MS, HINT_MS, BLANK_TEXT, FADE_LEVELS, FADE_STEP_MS,
} from '../config';
import { bridge, mode, alert, isPageCreated, setPageCreated, isCompactView, buildStatusLine } from '../state';
import {
  buildPage, rowText, CONTAINER_NAMES, VIEW_ROWS, STATUS_ID, TIMER_ID, PROGRESS_ID, FOOTER_ID, ICON_ID,
  type PageView,
} from './containers';
import { enqueue } from './queue';
import type { PomodoroMode } from '../types';
import { getTomatoIcon, getCoffeeIcon } from '../rendering/icons';
import { t } from '../i18n';

// Last content sent, so unchanged frames are skipped; reset whenever the page is redrawn.
let lastProgress = '';
let lastFooter = '';
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
// True while the system exit dialog covers the page: writes would land under it.
let covered = false;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
// Puts the footer back after a swipe showed the gesture hint in it.
let hintTimer: ReturnType<typeof setTimeout> | null = null;
// Layout of the last page sent. Writes queued after it run once it is drawn, so
// they go to its rows. shownView is the last one drawn, kept for a failed rebuild.
let pageView: PageView | null = null;
let shownView: PageView | null = null;
// Every redraw bumps fadeRun, which stops a fade in progress; fading is set while one runs.
let fadeRun = 0;
let fading = false;

function canDraw(): boolean {
  return !!bridge && isPageCreated && !suspended && !covered;
}

function currentView(): PageView {
  return isCompactView() ? 'compact' : 'full';
}

// Switching layouts takes a rebuild. Only Start, Pause, a phase end, Skip, Reset
// or the setting can call for one, so refreshAll and updateStatus check here.
function viewChanged(): boolean {
  return pageView !== currentView();
}

async function writeText(containerID: number, content: string, textColor?: number): Promise<void> {
  const b = bridge;
  if (!b || !canDraw() || !pageView || !VIEW_ROWS[pageView].has(containerID)) return;
  const containerName = CONTAINER_NAMES[containerID];
  try {
    const ok = await enqueue(`textContainerUpgrade(${containerName})`, () =>
      b.textContainerUpgrade(new TextContainerUpgrade({ containerID, containerName, content, textColor })));
    if (!ok) console.warn(`[pomodoro] textContainerUpgrade(${containerName}) returned false`);
  } catch (err) {
    console.error(`[pomodoro] textContainerUpgrade(${containerName}) failed:`, err);
  }
}

// A row's current text on the page being shown, read when the write is queued.
// Without `level` the row keeps its brightness, so a tick doesn't undo a fade.
function writeRow(containerID: number, level?: number): Promise<void> {
  return pageView ? writeText(containerID, rowText(containerID, pageView), level) : Promise.resolve();
}

// Draws the whole page: the startup page the first time, a rebuild after that.
// A fade draws it dimmed to `maxLevel`; any other redraw stops a fade.
export async function renderPage(maxLevel?: number): Promise<void> {
  const b = bridge;
  if (!b) return;
  if (maxLevel === undefined) stopFade();
  cancelBlink();
  cancelHint();
  const view = currentView();
  const page = buildPage(view, maxLevel);
  pageView = view;
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
        pageView = shownView;
        return;
      }
    }
    shownView = view;
    setPageCreated(true);
    lastProgress = rowText(PROGRESS_ID, view);
    lastFooter = rowText(FOOTER_ID, view);
    // Image containers start empty after the page is created or rebuilt.
    lastIconMode = null;
    shownIcon = null;
    await sendIcon();
    // Drawing the page cancelled any blink; a pending alert (including one from a
    // phase that ended while the app was closed) starts blinking again.
    if (alert) blinkStatus();
  } catch (err) {
    console.error('[pomodoro] renderPage failed:', err);
    pageView = shownView;
  }
}

export async function sendIcon(): Promise<void> {
  const b = bridge;
  if (!b || !canDraw() || pageView !== 'full' || iconFailures >= MAX_ICON_FAILURES || lastIconMode === mode) return;
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

// Called every second while the countdown or the overtime counter runs: the
// timer row always changes (on the compact page the pulse too), the bar only
// when it gains a segment, or on the compact page a step.
export async function updateTick(): Promise<void> {
  await writeRow(TIMER_ID);
  const progress = pageView && rowText(PROGRESS_ID, pageView);
  if (progress && progress !== lastProgress && canDraw()) {
    lastProgress = progress;
    await writeText(PROGRESS_ID, progress);
  }
}

// Start and Pause change the status line and the footer, or with the compact
// view on, fade to the other page.
export async function updateStatus(): Promise<void> {
  cancelBlink();
  if (!canDraw()) return;
  if (viewChanged()) return fadeToView();
  // Tapped again mid-fade, back to the page it started from: undim every row.
  if (fading) return refreshAll();
  await writeRow(STATUS_ID, TEXT_BRIGHT);
  await writeRow(TIMER_ID);
  await updateFooter();
}

async function updateFooter(): Promise<void> {
  cancelHint();
  if (!pageView || !canDraw()) return;
  const footer = rowText(FOOTER_ID, pageView);
  if (footer === lastFooter) return;
  lastFooter = footer;
  await writeText(FOOTER_ID, footer);
}

// Every row at its own brightness, which also undoes a fade or a blink; a new
// page if the layout changed.
export async function refreshAll(): Promise<void> {
  if (!canDraw()) return;
  stopFade();
  if (viewChanged() || !pageView) return renderPage();
  cancelBlink();
  cancelHint();
  lastProgress = rowText(PROGRESS_ID, pageView);
  lastFooter = rowText(FOOTER_ID, pageView);
  for (const [containerID, level] of VIEW_ROWS[pageView]) await writeRow(containerID, level);
}

function stopFade() {
  fadeRun++;
  fading = false;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Moves every row with text toward `level`, each capped at its own brightness.
// `shown` holds each row's level, so rows already there aren't rewritten.
async function stepRows(level: number, shown: Map<number, number>): Promise<boolean> {
  const view = pageView;
  if (!view) return false;
  let wrote = false;
  for (const [containerID, own] of VIEW_ROWS[view]) {
    const next = Math.min(level, own);
    if (shown.get(containerID) === next || rowText(containerID, view) === BLANK_TEXT) continue;
    shown.set(containerID, next);
    wrote = true;
    await writeRow(containerID, next);
  }
  return wrote;
}

// Start and Pause switch layouts with a fade: the old page dims through
// FADE_LEVELS, the new one is drawn at the lowest and brightens back up. Each
// step waits for its writes, so a slow link makes it slower, never out of order.
// Any other redraw stops it and puts every row back at its own brightness.
async function fadeToView(): Promise<void> {
  stopFade();
  const run = fadeRun;
  fading = true;
  const live = () => run === fadeRun && canDraw();
  const floor = FADE_LEVELS[0];
  let shown = new Map(pageView ? VIEW_ROWS[pageView] : []);
  for (const level of [...FADE_LEVELS].reverse()) {
    if (await stepRows(level, shown)) await sleep(FADE_STEP_MS);
    if (!live()) return;
  }
  await renderPage(floor);
  if (!pageView) return;
  shown = new Map([...VIEW_ROWS[pageView]].map(([containerID, own]) => [containerID, Math.min(floor, own)]));
  for (const level of [...FADE_LEVELS.slice(1), TEXT_BRIGHT]) {
    await sleep(FADE_STEP_MS);
    if (!live()) return;
    await stepRows(level, shown);
  }
  fading = false;
}

// A swipe has nothing to scroll, so it shows the gestures in the footer for a
// few seconds: every gesture gets a visible response, as the review requires.
export async function showGestureHint(): Promise<void> {
  if (!canDraw() || !pageView) return;
  cancelHint();
  lastFooter = t.glasses.gestureHint;
  hintTimer = setTimeout(() => {
    hintTimer = null;
    void updateFooter();
  }, HINT_MS);
  // At the footer's own brightness: the blank compact footer is left out of fades.
  await writeText(FOOTER_ID, lastFooter, VIEW_ROWS[pageView].get(FOOTER_ID));
}

function cancelHint() {
  if (hintTimer) {
    clearTimeout(hintTimer);
    hintTimer = null;
  }
}

// The glasses have no speaker or haptics: blinking the status line is the
// only way to flag a phase change. Ends on full brightness.
export function blinkStatus() {
  cancelBlink();
  // Before the page exists or while the glasses are off nobody would see it; the
  // alert blinks once the page is drawn or the glasses go back on.
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

// Set while the exit dialog is up (events.ts redraws once it closes).
export function setDisplayCovered(value: boolean) {
  covered = value;
  if (value) {
    cancelBlink();
    cancelHint();
  }
}

// After the app exits nothing may reach the glasses, not even a pending hint or blink.
export function shutdownDisplay() {
  stopFade();
  cancelBlink();
  cancelHint();
  setPageCreated(false);
}

// Driven by the wearing sensor. Taking the glasses off stops display writes
// (the timer keeps running); putting them back on redraws the current state.
export async function setDisplaySuspended(value: boolean): Promise<void> {
  if (suspended === value) return;
  suspended = value;
  if (value) {
    cancelBlink();
    cancelHint();
    return;
  }
  await refreshAll();
  await sendIcon();
  if (alert) blinkStatus();
}
