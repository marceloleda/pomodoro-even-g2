import {
  OsEventTypeList,
  type EvenHubEvent,
  type DeviceStatus,
} from '@evenrealities/even_hub_sdk';
import { MENU_SKIP_ID, MENU_RESET_ID, REPEATED_TAP_MS, EXIT_DIALOG_MAX_MS } from '../config';
import { bridge } from '../state';
import { saveTimerState } from '../storage';
import {
  refreshAll, renderPage, setDisplaySuspended, setDisplayCovered, showGestureHint, shutdownDisplay,
} from './display';
import { enqueue } from './queue';
import { toggleTimer, resetTimer, skipToNext, resyncTimer, stopTimer } from '../timer';

// Contextual menu items (containers.ts), by itemID.
const MENU_HANDLERS: Record<number, () => Promise<void>> = {
  [MENU_SKIP_ID]: skipToNext,
  [MENU_RESET_ID]: resetTimer,
};

let unsubscribers: Array<() => void> = [];
// Last accepted tap, so the firmware's repeats of it can be dropped.
let lastTap = { key: '', at: 0 };
// True while the system exit dialog is up; the host clears our page to show it.
let exitDialogOpen = false;
let exitDialogTimer: ReturnType<typeof setTimeout> | null = null;

// Resolve eventType from all possible locations (even-dev / EvenChess pattern)
// The SDK can place the type in different fields depending on source
// (simulator sends sysEvent, hardware sends textEvent)
function resolveEventType(event: EvenHubEvent): OsEventTypeList | undefined {
  const raw = event.jsonData ?? {};
  const rawType =
    event.listEvent?.eventType ??
    event.textEvent?.eventType ??
    event.sysEvent?.eventType ??
    raw.eventType ?? raw.event_type ?? raw.Event_Type;

  // Protobuf omits zero-valued fields, so a click (0) arrives with no eventType.
  // A type this SDK doesn't know is ignored rather than taken for a tap.
  if (rawType === undefined || rawType === null) {
    return event.listEvent || event.textEvent || event.sysEvent ? OsEventTypeList.CLICK_EVENT : undefined;
  }
  return OsEventTypeList.fromJson(rawType);
}

// A repeated tap would undo the Start / Pause it repeats (and a repeated menu
// selection would skip twice), so the same gesture inside REPEATED_TAP_MS is
// dropped, whichever envelope it came in (the docs disagree on text vs sys for
// taps). The window counts from the accepted tap.
function isRepeatedTap(key: string): boolean {
  const now = Date.now();
  if (key === lastTap.key && now - lastTap.at < REPEATED_TAP_MS) return true;
  lastTap = { key, at: now };
  return false;
}

// Review rule: a root-page double-tap must open the system exit dialog (mode 1).
// Nothing is torn down here, since the user can still cancel; that happens on
// SYSTEM_EXIT_EVENT / ABNORMAL_EXIT_EVENT. The flag is set first because the
// dialog's FOREGROUND_ENTER can arrive before the call resolves. Display writes
// stop and the queue drains first, so the call doesn't overlap a BLE write; it
// stays outside the queue because it may only resolve once the user answers.
async function requestExit() {
  openExitDialog();
  await enqueue('drain before exit dialog', async () => {}).catch(() => {});
  try {
    if (await bridge?.shutDownPageContainer(1)) return;
    console.warn('[pomodoro] shutDownPageContainer(1) returned false');
  } catch (err) {
    console.error('[pomodoro] shutDownPageContainer failed:', err);
  }
  closeExitDialog(false);
}

function openExitDialog() {
  exitDialogOpen = true;
  setDisplayCovered(true);
  if (exitDialogTimer) clearTimeout(exitDialogTimer);
  exitDialogTimer = setTimeout(() => {
    exitDialogTimer = null;
    closeExitDialog(false);
  }, EXIT_DIALOG_MAX_MS);
}

// `rebuild` when the dialog is known to be gone: the host cleared our page to
// show it. Otherwise only the text is refreshed, which can't dismiss a dialog.
function closeExitDialog(rebuild: boolean) {
  if (!exitDialogOpen) return;
  exitDialogOpen = false;
  if (exitDialogTimer) {
    clearTimeout(exitDialogTimer);
    exitDialogTimer = null;
  }
  setDisplayCovered(false);
  resyncTimer();
  void (rebuild ? renderPage() : refreshAll());
}

function teardown() {
  exitDialogOpen = false;
  if (exitDialogTimer) {
    clearTimeout(exitDialogTimer);
    exitDialogTimer = null;
  }
  stopTimer();
  shutdownDisplay();
  saveTimerState();
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
}

function handleEvent(event: EvenHubEvent) {
  // Menu selections bypass isEventCapture and carry only the item ID.
  const itemID = event.menuItemClickEvent?.itemID;
  if (itemID !== undefined) {
    if (!isRepeatedTap(`menu:${itemID}`)) void MENU_HANDLERS[itemID]?.();
    return;
  }

  const type = resolveEventType(event);
  if ((type === OsEventTypeList.CLICK_EVENT || type === OsEventTypeList.DOUBLE_CLICK_EVENT)
    && isRepeatedTap(String(type))) return;

  switch (type) {
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      void requestExit();
      return;
    case OsEventTypeList.CLICK_EVENT:
      // A tap reaching our page means the exit dialog is gone, whatever events it
      // sent. It may be the dialog's own Yes/No leaking through, so it doesn't toggle.
      if (exitDialogOpen) {
        closeExitDialog(true);
        return;
      }
      toggleTimer();
      return;
    case OsEventTypeList.SCROLL_TOP_EVENT:
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
    case OsEventTypeList.LONG_PRESS_EVENT:
      // Swipes have nothing to scroll and a plain hold opens nothing (tap then
      // hold is the menu), so both show the gestures: the review wants a
      // visible response to every gesture.
      void showGestureHint();
      return;
    case OsEventTypeList.FOREGROUND_ENTER_EVENT:
      // Also fires when the contextual menu or the exit dialog opens, so this must
      // stay idempotent; under the dialog there is nothing of ours to redraw.
      if (exitDialogOpen) return;
      resyncTimer();
      void refreshAll();
      return;
    case OsEventTypeList.FOREGROUND_EXIT_EVENT:
      // "No" on the exit dialog: the host cleared our page to show it, so rebuild it.
      // Closing the contextual menu also lands here, with our page untouched.
      closeExitDialog(true);
      return;
    case OsEventTypeList.SYSTEM_EXIT_EVENT:
    case OsEventTypeList.ABNORMAL_EXIT_EVENT:
      teardown();
      return;
    default:
      // Long-press release and IMU are unused.
      return;
  }
}

function handleDeviceStatus(status: DeviceStatus) {
  if (typeof status.isWearing === 'boolean') void setDisplaySuspended(!status.isWearing);
}

export function setupEventListeners() {
  const b = bridge;
  if (!b) return;
  unsubscribers.push(b.onEvenHubEvent(handleEvent), b.onDeviceStatusChanged(handleDeviceStatus));
}
