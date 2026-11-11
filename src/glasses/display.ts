import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  StartUpPageCreateResult,
} from '@evenrealities/even_hub_sdk';
import { ICON_SIZE, TEXT_BRIGHT, TEXT_OFF, ALERT_BLINKS, ALERT_BLINK_MS, HINT_MS } from '../config';
import { bridge, mode, alert, isPageCreated, setPageCreated, isCompactView, buildStatusLine } from '../state';
import {
  buildPage, rowText, CONTAINER_NAMES, VIEW_ROWS, STATUS_ID, TIMER_ID, PROGRESS_ID, FOOTER_ID, ICON_ID,
  type PageView,
} from './containers';
import { enqueue } from './queue';
import type { PomodoroMode } from '../types';
import { getTomatoIcon, getCoffeeIcon } from '../rendering/icons';
import { t } from '../i18n';

// Every call to the glasses costs about the same Bluetooth round trip whatever
// it carries (measured by the community at ~80ms for a text upgrade, ~165ms for
// a rebuild of any size, ~105ms for an image), so this module counts calls: a
// row is only rewritten when its text changed, and several rows changing with
// the layout go out as one rebuild.

// Text last sent to each row, recorded when the write is queued: writes run in
// order, so that is what the row ends up showing. A write that fails forgets its
// row, which sends it again on the next tick.
const sentText = new Map<number, string>();
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
// they go to its rows. shownView is the last one drawn, kept for a failed rebuild;
// both are null after a call that timed out, when the page on screen is unknown.
let pageView: PageView | null = null;
let shownView: PageView | null = null;

function canDraw(): boolean {
  return !!bridge && isPageCreated && !suspended && !covered;
}

function currentView(): PageView {
  return isCompactView() ? 'compact' : 'full';
}

// Switching layouts takes a rebuild. Only Start, Pause, a phase end, Skip, Reset
// or the setting can call for one, so refreshAll and updateStatus check here, and
// updateTick in case a switch failed.
function viewChanged(): boolean {
  return pageView !== currentView();
}

async function writeText(containerID: number, content: string, textColor?: number): Promise<void> {
  const b = bridge;
  if (!b || !canDraw() || !pageView || !VIEW_ROWS[pageView].has(containerID)) return;
  const containerName = CONTAINER_NAMES[containerID];
  sentText.set(containerID, content);
  let ok = false;
  try {
    ok = await enqueue(`textContainerUpgrade(${containerName})`, () =>
      b.textContainerUpgrade(new TextContainerUpgrade({ containerID, containerName, content, textColor })));
    if (!ok) console.warn(`[pomodoro] textContainerUpgrade(${containerName}) returned false`);
  } catch (err) {
    console.error(`[pomodoro] textContainerUpgrade(${containerName}) failed:`, err);
  }
  // Unless a newer write or a new page has replaced it since.
  if (!ok && sentText.get(containerID) === content) sentText.delete(containerID);
}

// A row's current text on the page being shown, read when the write is queued.
// Without `level` the row keeps its brightness.
function writeRow(containerID: number, level?: number): Promise<void> {
  return pageView ? writeText(containerID, rowText(containerID, pageView), level) : Promise.resolve();
}

// The same, unless the row already shows that text.
function writeChanged(containerID: number): Promise<void> {
  if (!pageView || !canDraw()) return Promise.resolve();
  const text = rowText(containerID, pageView);
  return sentText.get(containerID) === text ? Promise.resolve() : writeText(containerID, text);
}

// Draws the whole page: the startup page the first time, a rebuild after that.
// Returns whether the page was drawn.
export async function renderPage(): Promise<boolean> {
  const b = bridge;
  if (!b) return false;
  cancelBlink();
  cancelHint();
  const view = currentView();
  const page = buildPage(view);
  pageView = view;
  // Recorded now, not once the page is up: a tick during the call is compared
  // with what the page was built with, and its write is queued behind the page.
  sentText.clear();
  for (const row of page.textObject) sentText.set(row.containerID!, row.content!);
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
        sentText.clear();
        return false;
      }
    }
    shownView = view;
    setPageCreated(true);
    // Image containers start empty after the page is created or rebuilt.
    lastIconMode = null;
    shownIcon = null;
    // The clock may have moved on while the page was drawn, and the next tick can
    // be a minute away.
    await writeChanged(TIMER_ID);
    await writeChanged(PROGRESS_ID);
    await sendIcon();
    // Drawing the page cancelled any blink; a pending alert (including one from a
    // phase that ended while the app was closed) starts blinking again.
    if (alert) blinkStatus();
    return true;
  } catch (err) {
    console.error('[pomodoro] renderPage failed:', err);
    // A call that timed out may still go through, so either page could be up:
    // the next redraw rebuilds it.
    pageView = shownView = null;
    sentText.clear();
    return false;
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

// Called whenever the time or the bar on screen is due to change (timer.ts wakes
// up for exactly that): each row is written only if its text did. A page left in
// the wrong layout (a switch that failed or timed out) is rebuilt here.
export async function updateTick(): Promise<void> {
  if (canDraw() && viewChanged()) {
    await renderPage();
    return;
  }
  await writeChanged(TIMER_ID);
  await writeChanged(PROGRESS_ID);
}

// Start and Pause. With the compact view on they swap pages: one rebuild, which
// takes about as long as two text writes and changes every row at once. A page
// that wasn't drawn is retried right away, since a paused timer has no tick to
// do it later. Otherwise the status line, the timer and the footer change in place.
export async function updateStatus(): Promise<void> {
  cancelBlink();
  if (!canDraw()) return;
  if (viewChanged()) {
    if (!(await renderPage()) && canDraw() && viewChanged()) await renderPage();
    return;
  }
  // At full brightness, in case a blink was cut short on its dark half.
  await writeRow(STATUS_ID, TEXT_BRIGHT);
  await writeChanged(TIMER_ID);
  await updateFooter();
}

async function updateFooter(): Promise<void> {
  cancelHint();
  await writeChanged(FOOTER_ID);
}

// Every row at its own brightness, which also undoes a blink, and the icon if
// the page lacks it; a new page if the layout changed. Phase changes come here
// rather than to a rebuild: text upgrades are flicker-free on hardware, and the
// icon only goes out when the mode changes. Also the redraw after the glasses
// were away (taken off, another app in front), so nothing is skipped as unchanged.
export async function refreshAll(): Promise<void> {
  if (!canDraw()) return;
  if (viewChanged() || !pageView) {
    await renderPage();
    return;
  }
  cancelBlink();
  cancelHint();
  for (const [containerID, level] of VIEW_ROWS[pageView]) await writeRow(containerID, level);
  await sendIcon();
}

// A swipe has nothing to scroll, so it shows the gestures in the footer for a
// few seconds: every gesture gets a visible response, as the review requires.
export async function showGestureHint(): Promise<void> {
  if (!canDraw() || !pageView) return;
  cancelHint();
  hintTimer = setTimeout(() => {
    hintTimer = null;
    void writeChanged(FOOTER_ID);
  }, HINT_MS);
  await writeText(FOOTER_ID, t.glasses.gestureHint, VIEW_ROWS[pageView].get(FOOTER_ID));
}

function cancelHint() {
  if (hintTimer) {
    clearTimeout(hintTimer);
    hintTimer = null;
  }
}

// The glasses have no speaker or haptics: blinking the status line is the
// only way to flag a phase change. Ends on full brightness. A blink already
// running carries on: a redraw that started one is often followed by a call here.
export function blinkStatus() {
  // Before the page exists or while the glasses are off nobody would see it; the
  // alert blinks once the page is drawn or the glasses go back on.
  if (blinkTimer || !canDraw()) return;
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
  if (alert) blinkStatus();
}
