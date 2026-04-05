import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import { ACTIONS } from '../config';
import { bridge, selectedIndex, setSelectedIndex } from '../state';
import { updateMenuDisplay } from './display';
import { startTimer, pauseTimer, resetTimer, skipToNext } from '../timer';

// Resolve eventType from all possible locations (even-dev / EvenChess pattern)
// The SDK can place the type in different fields depending on source
// (simulator sends sysEvent, hardware sends textEvent/listEvent)
function resolveEventType(event: any): OsEventTypeList | undefined {
  const raw: Record<string, unknown> = event?.jsonData ?? {};
  const rawType =
    event?.listEvent?.eventType ??
    event?.textEvent?.eventType ??
    event?.sysEvent?.eventType ??
    event?.eventType ??
    raw.eventType ?? raw.event_type ?? raw.Event_Type ?? raw.type;

  if (typeof rawType === 'number') {
    if (rawType === 0) return OsEventTypeList.CLICK_EVENT;
    if (rawType === 1) return OsEventTypeList.SCROLL_TOP_EVENT;
    if (rawType === 2) return OsEventTypeList.SCROLL_BOTTOM_EVENT;
    if (rawType === 3) return OsEventTypeList.DOUBLE_CLICK_EVENT;
  }
  if (typeof rawType === 'string') {
    const v = rawType.toUpperCase();
    if (v.includes('DOUBLE')) return OsEventTypeList.DOUBLE_CLICK_EVENT;
    if (v.includes('CLICK')) return OsEventTypeList.CLICK_EVENT;
    if (v.includes('SCROLL_TOP')) return OsEventTypeList.SCROLL_TOP_EVENT;
    if (v.includes('SCROLL_BOTTOM')) return OsEventTypeList.SCROLL_BOTTOM_EVENT;
  }
  return undefined;
}

const ACTION_HANDLERS: Record<string, () => void | Promise<void>> = {
  Start: startTimer,
  Pause: pauseTimer,
  Reset: resetTimer,
  Skip: skipToNext,
};

function handleAction(action: string) {
  const handler = ACTION_HANDLERS[action];
  if (handler) void handler();
}

export function setupEventListeners() {
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

    // Click: explicit or fallback for any unrecognized event
    if (eventType === OsEventTypeList.CLICK_EVENT || event.textEvent || event.listEvent || event.sysEvent) {
      handleAction(ACTIONS[selectedIndex]);
      return;
    }
  });
}
