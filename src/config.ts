// Pomodoro timing
export const WORK_MINUTES = 25;
export const SHORT_BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;
export const CYCLES_BEFORE_LONG_BREAK = 4;

// Icon
export const ICON_SIZE = 80;

// Progress bar, drawn with ━/─ text as the design guidelines recommend. Each
// glyph advances 20px, so 17 fit the row; one more wraps and adds a scrollbar.
export const PROGRESS_SEGMENTS = 16;

// Text brightness levels (textColor, 0-4; 0 may be invisible on hardware)
export const TEXT_BRIGHT = 4;
export const TEXT_DIM = 2;
// Blink "off" level for the phase-end alert; 0 may be fully dark, which is the point here
export const TEXT_OFF = 0;

// Glasses menu, a native list: the index of each label is what a click reports
export const MENU_ITEMS = ['Start / Pause', 'Skip', 'Reset'] as const;

// The firmware can repeat a tap 50-100ms later. Two real taps that close
// together arrive as one double tap, so a repeat inside this window is a duplicate.
export const REPEATED_TAP_MS = 450;

// Phase-end alert: the glasses have no speaker or haptics, so the status line blinks
export const ALERT_BLINKS = 3;
export const ALERT_BLINK_MS = 500;

// Bridge
export const BRIDGE_CALL_TIMEOUT_MS = 5000;
export const STORAGE_KEY = 'pomodoro.state.v1';

// Phone page
export const PHONE_POLL_MS = 250;
