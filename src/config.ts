// No imports: scripts/check-text.ts loads this file directly with Node.

// Pomodoro timing defaults; the phone page can change them (see Settings).
export const DEFAULT_SETTINGS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsPerSet: 4,
};

// Allowed range for each setting, [min, max]. Eight session dots still fit one row.
export const SETTINGS_LIMITS: Record<keyof typeof DEFAULT_SETTINGS, readonly [number, number]> = {
  workMinutes: [5, 90],
  shortBreakMinutes: [1, 30],
  longBreakMinutes: [5, 60],
  sessionsPerSet: [2, 8],
};

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
