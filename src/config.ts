// No imports: scripts/check-text.ts loads this file directly with Node.

// Pomodoro timing defaults; the phone page can change them (see Settings).
export const DEFAULT_SETTINGS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsPerSet: 4,
  compactView: true,
};

// Allowed range for each numeric setting, [min, max]. Eight session dots still fit one row.
export const SETTINGS_LIMITS = {
  workMinutes: [5, 90],
  shortBreakMinutes: [1, 30],
  longBreakMinutes: [5, 60],
  sessionsPerSet: [2, 8],
} as const satisfies Record<string, readonly [number, number]>;

// Icon
export const ICON_SIZE = 80;

// Glasses layout (576x288). Every text container is one 27px line plus padding;
// a line that wraps makes the firmware draw a scrollbar, so `npm run check:text`
// measures every string against these widths.
export const TEXT_PADDING = 4;
export const TEXT_ROW_HEIGHT = 40;
export const HEADER_X = 116;
export const HEADER_WIDTH = 440;
export const BODY_X = 14;
export const BODY_WIDTH = 548;

// Compact view: while a phase runs, the top-right corner shows "▶ 24:13" and a
// mini bar, each in its own container so the bar stays put while the digits
// (which differ in width) change. The widest time ("▶ 44:44") is 79px, the bar
// 100px; the bar keeps the body's 14px margin on the right.
export const COMPACT_TIMER_WIDTH = 92;
export const COMPACT_BAR_WIDTH = 112;
export const COMPACT_BAR_X = 576 - BODY_X - COMPACT_BAR_WIDTH;
export const COMPACT_TIMER_X = COMPACT_BAR_X - COMPACT_TIMER_WIDTH;
export const COMPACT_Y = 18;
// The ▶ and the colon blink with the seconds, so the corner shows the timer is running.
export const PULSE_ON = '▶';
export const PULSE_OFF = '▷';
// Each segment of the mini bar grows through these before the next one starts.
export const MINI_BAR_SEGMENTS = 5;
export const MINI_BAR_LEVELS = '▁▂▃▄';
// A blank row. A space, not '': protobuf drops empty strings, so an upgrade
// with '' may not clear anything.
export const BLANK_TEXT = ' ';

// Progress bar, drawn with block glyphs from the design guidelines: a half-height
// bar over a thin track. ━/─ (3px vs 1px lines) made the filled part hard to tell
// apart. Each glyph advances 20px, so 27 fit the 540px row; one more wraps and adds a scrollbar.
export const PROGRESS_SEGMENTS = 26;
export const PROGRESS_FILLED = '▄';
export const PROGRESS_EMPTY = '▁';

// Text brightness levels (textColor, 0-4; 0 may be invisible on hardware)
export const TEXT_BRIGHT = 4;
export const TEXT_DIM = 2;
// Blink "off" level for the phase-end alert; 0 may be fully dark, which is the point here
export const TEXT_OFF = 0;
// Start and Pause fade between the full and compact pages: the old one steps
// down through these levels, the new one is drawn at the lowest and steps up,
// each row stopping at its own brightness. A step is one Bluetooth write per
// row, so there are few of them.
export const FADE_LEVELS: readonly number[] = [1, 2];
export const FADE_STEP_MS = 80;

// Contextual menu (tap then long press). Item IDs must be non-zero.
export const MENU_SKIP_ID = 1;
export const MENU_RESET_ID = 2;

// The firmware can repeat a tap 50-100ms later. Two real taps that close
// together arrive as one double tap, so a repeat inside this window is a duplicate.
export const REPEATED_TAP_MS = 450;

// How long a swipe shows the gesture hint in the footer before it goes back.
export const HINT_MS = 4000;

// Display writes pause while the exit dialog is up. If it stays up longer than
// this without telling us it closed, writes resume (and land under it, as in 1.0.0).
export const EXIT_DIALOG_MAX_MS = 30_000;

// Phase-end alert: the glasses have no speaker or haptics, so the status line
// blinks, and blinks again every minute for a while in case it was missed.
export const ALERT_BLINKS = 3;
export const ALERT_BLINK_MS = 500;
export const ALERT_REPEAT_MS = 60_000;
export const ALERT_REPEATS = 10;
// The overtime counter stops here; it still fits the mm:ss format.
export const OVERTIME_MAX_MS = (99 * 60 + 59) * 1000;

// Bridge
export const BRIDGE_CALL_TIMEOUT_MS = 5000;
export const STORAGE_KEY = 'pomodoro.state.v1';
export const SETTINGS_KEY = 'pomodoro.settings.v1';

// Phone page
export const PHONE_POLL_MS = 250;
