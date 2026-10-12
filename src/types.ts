export type PomodoroMode = 'work' | 'break';

// Everything needed to rebuild the timer after the WebView is killed.
export interface TimerState {
  mode: PomodoroMode;
  cycle: number;
  running: boolean;
  // Wall-clock end of the phase while running; remainingMs is used while paused.
  endsAt: number;
  remainingMs: number;
  // Full length of the current phase, fixed when it starts so a settings change
  // mid-phase doesn't throw off the progress bar.
  durationMs: number;
  // Phase-end alert, shown until the user starts the next phase.
  alert: boolean;
  // Wall-clock end of the previous phase while the alert is up (overtime counter).
  endedAt: number;
}

export interface Settings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsPerSet: number;
}
