import {
  OsEventTypeList,
  type EvenHubEvent,
  type DeviceStatus,
  type List_ItemEvent,
} from '@evenrealities/even_hub_sdk';
import { MENU_ITEMS, REPEATED_TAP_MS } from '../config';
import { bridge } from '../state';
import { saveTimerState } from '../storage';
import { refreshAll, renderPage, setDisplaySuspended } from './display';
import { toggleTimer, resetTimer, skipToNext, resyncTimer, stopTimer } from '../timer';

type MenuItem = (typeof MENU_ITEMS)[number];

const MENU_HANDLERS: Record<MenuItem, () => void | Promise<void>> = {
  'Start / Pause': toggleTimer,
  Skip: skipToNext,
  Reset: resetTimer,
};

let unsubscribers: Array<() => void> = [];
// Last accepted tap, so the firmware's repeats of it can be dropped.
let lastTap = { key: '', at: 0 };
// True while the system exit dialog is up; the host clears our page to show it.
let exitDialogOpen = false;

// Resolve eventType from all possible locations (even-dev / EvenChess pattern)
// The SDK can place the type in different fields depending on source
// (simulator sends sysEvent, hardware sends textEvent/listEvent)
function resolveEventType(event: EvenHubEvent): OsEventTypeList | undefined {
  const raw = event.jsonData ?? {};
  const rawType =
    event.listEvent?.eventType ??
    event.textEvent?.eventType ??
    event.sysEvent?.eventType ??
    raw.eventType ?? raw.event_type ?? raw.Event_Type ?? raw.type;

  const type = OsEventTypeList.fromJson(rawType);
  if (type !== undefined) return type;

  // Protobuf omits zero-valued fields, so a click (0) can arrive with no eventType.
  if (event.listEvent || event.textEvent || event.sysEvent) return OsEventTypeList.CLICK_EVENT;
  return undefined;
}

// Index 0 arrives as undefined (protobuf zero omission); the name is checked first.
function selectedMenuItem(listEvent: List_ItemEvent): MenuItem | undefined {
  return MENU_ITEMS.find((name) => name === listEvent.currentSelectItemName)
    ?? MENU_ITEMS[listEvent.currentSelectItemIndex ?? 0];
}

function handleListClick(listEvent: List_ItemEvent) {
  const item = selectedMenuItem(listEvent);
  if (item) void MENU_HANDLERS[item]();
}

// A repeated Start / Pause would undo itself, so the same tap on the same item
// inside REPEATED_TAP_MS is dropped. The window counts from the accepted tap.
function isRepeatedTap(type: OsEventTypeList, event: EvenHubEvent): boolean {
  const envelope = event.listEvent ? 'list' : event.textEvent ? 'text' : event.sysEvent ? 'sys' : 'raw';
  const item = event.listEvent ? selectedMenuItem(event.listEvent) : '';
  const key = `${type}:${envelope}:${item}`;
  const now = Date.now();
  if (key === lastTap.key && now - lastTap.at < REPEATED_TAP_MS) return true;
  lastTap = { key, at: now };
  return false;
}

// Review rule: a root-page double-tap must open the system exit dialog (mode 1).
// Nothing is torn down here, since the user can still cancel; that happens on
// SYSTEM_EXIT_EVENT / ABNORMAL_EXIT_EVENT. The flag is set first because the
// dialog's FOREGROUND_ENTER can arrive before the call resolves.
async function requestExit() {
  exitDialogOpen = true;
  try {
    if (await bridge?.shutDownPageContainer(1)) return;
    console.warn('[pomodoro] shutDownPageContainer(1) returned false');
  } catch (err) {
    console.error('[pomodoro] shutDownPageContainer failed:', err);
  }
  exitDialogOpen = false;
}

function teardown() {
  exitDialogOpen = false;
  stopTimer();
  saveTimerState();
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
}

function handleEvent(event: EvenHubEvent) {
  const type = resolveEventType(event);
  if ((type === OsEventTypeList.CLICK_EVENT || type === OsEventTypeList.DOUBLE_CLICK_EVENT)
    && isRepeatedTap(type, event)) return;

  switch (type) {
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      void requestExit();
      return;
    case OsEventTypeList.CLICK_EVENT:
      // A tap reaching our page means the exit dialog is gone, whatever events it sent.
      exitDialogOpen = false;
      // With the list capturing input, a click without listEvent carries no selection.
      if (event.listEvent) handleListClick(event.listEvent);
      return;
    case OsEventTypeList.FOREGROUND_ENTER_EVENT:
      // Also fires when the system menu or the exit dialog opens, so this must
      // stay idempotent; under the dialog there is nothing of ours to redraw.
      if (exitDialogOpen) return;
      resyncTimer();
      void refreshAll();
      return;
    case OsEventTypeList.FOREGROUND_EXIT_EVENT:
      // "No" on the exit dialog: the host cleared our page to show it, so rebuild it.
      if (!exitDialogOpen) return;
      exitDialogOpen = false;
      resyncTimer();
      void renderPage();
      return;
    case OsEventTypeList.SYSTEM_EXIT_EVENT:
    case OsEventTypeList.ABNORMAL_EXIT_EVENT:
      teardown();
      return;
    default:
      // Swipes move the list highlight in firmware; long press and IMU are unused.
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
