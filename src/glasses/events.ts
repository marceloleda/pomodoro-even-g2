import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk';
import { ACTIONS } from '../config';
import { bridge, selectedIndex, setSelectedIndex } from '../state';
import { updateMenuDisplay } from './display';
import { startTimer, pauseTimer, resetTimer, skipToNext } from '../timer';

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

const ACTION_HANDLERS: Record<(typeof ACTIONS)[number], () => void | Promise<void>> = {
  Start: startTimer,
  Pause: pauseTimer,
  Reset: resetTimer,
  Skip: skipToNext,
};

export function setupEventListeners() {
  if (!bridge) return;
  bridge.onEvenHubEvent((event) => {
    const eventType = resolveEventType(event);

    if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
      void updateMenuDisplay();
      return;
    }

    if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      setSelectedIndex(Math.min(ACTIONS.length - 1, selectedIndex + 1));
      void updateMenuDisplay();
      return;
    }

    if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      void skipToNext();
      return;
    }

    // Lifecycle/IMU events (foreground enter/exit, system exit...) also arrive as
    // sysEvent and must not trigger the selected action.
    if (eventType === OsEventTypeList.CLICK_EVENT) {
      void ACTION_HANDLERS[ACTIONS[selectedIndex]]();
    }
  });
}
