export type PomodoroMode = 'work' | 'break';

// Everything needed to rebuild the timer after the WebView is killed.
export interface TimerState {
  mode: PomodoroMode;
  cycle: number;
  running: boolean;
  // Wall-clock end of the phase while running; remainingMs is used while paused.
  endsAt: number;
  remainingMs: number;
  // Phase-end message shown until the user starts the next phase.
  alert: string;
}
