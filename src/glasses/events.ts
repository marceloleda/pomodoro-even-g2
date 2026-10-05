import {
  OsEventTypeList,
  type EvenHubEvent,
  type DeviceStatus,
  type List_ItemEvent,
} from '@evenrealities/even_hub_sdk';
import { MENU_ITEMS } from '../config';
import { bridge } from '../state';
import { saveTimerState } from '../storage';
import { refreshAll, setDisplaySuspended } from './display';
import { toggleTimer, resetTimer, skipToNext, resyncTimer, stopTimer } from '../timer';

const MENU_HANDLERS: Record<(typeof MENU_ITEMS)[number], () => void | Promise<void>> = {
  'Start / Pause': toggleTimer,
  Skip: skipToNext,
  Reset: resetTimer,
};

let unsubscribers: Array<() => void> = [];

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

function handleListClick(listEvent: List_ItemEvent) {
  // Index 0 arrives as undefined (protobuf zero omission); the name is checked first.
  const item = MENU_ITEMS.find((name) => name === listEvent.currentSelectItemName)
    ?? MENU_ITEMS[listEvent.currentSelectItemIndex ?? 0];
  if (item) void MENU_HANDLERS[item]();
}

// Review rule: a root-page double-tap must open the system exit dialog (mode 1).
// Nothing is torn down here, since the user can still cancel; that happens on
// SYSTEM_EXIT_EVENT / ABNORMAL_EXIT_EVENT.
async function requestExit() {
  try {
    if (!await bridge?.shutDownPageContainer(1)) console.warn('[pomodoro] shutDownPageContainer(1) returned false');
  } catch (err) {
    console.error('[pomodoro] shutDownPageContainer failed:', err);
  }
}

function teardown() {
  stopTimer();
  saveTimerState();
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
}

function handleEvent(event: EvenHubEvent) {
  switch (resolveEventType(event)) {
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      void requestExit();
      return;
    case OsEventTypeList.CLICK_EVENT:
      // With the list capturing input, a click without listEvent carries no selection.
      if (event.listEvent) handleListClick(event.listEvent);
      return;
    case OsEventTypeList.FOREGROUND_ENTER_EVENT:
      // Also fires when the system menu opens, so this must stay idempotent.
      resyncTimer();
      void refreshAll();
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
