# Pomodoro G2

A Pomodoro technique timer for **Even Realities G2** smart glasses, built with the Even Hub SDK.

<p align="center">
  <img src="screenshots/compact-view.gif" width="576" alt="A tap switches the paused page to the compact view: ▶ 12 min and a mini progress bar in the top-right corner. Another tap brings the full page back.">
</p>

<p align="center"><sub>Simulator recording: a tap starts the timer and only the time stays, in a corner; a tap pauses and brings everything back.</sub></p>

## Features

- **25-minute work sessions** with 5-minute short breaks and a 15-minute long break after every 4 sessions, all adjustable on the phone
- **One tap to start or pause**; Skip and Reset live in the glasses' contextual menu
- **Pixel art icons**: tomato for work, coffee cup for breaks
- **Text progress bar** (`▄▄▄▄▁▁▁▁`), **session dots** and the clock time the phase **ends at**
- **Compact view**: while the timer runs, only the time and a mini progress bar stay on the glasses, dimmed in the top-right corner. Pause to see everything (a switch on the phone turns it off)
- **Whole minutes by default** (`24 min`), with the seconds counting down only the last minute: nothing ticks in the corner of your eye, and a 25-minute session takes about 100 Bluetooth writes instead of 1500. A switch on the phone brings the seconds back
- **Phase-end alert**: the glasses have no speaker or haptics, so the status line blinks (again every minute for 10 minutes) and the timer counts the extra time (`+3 min`) until you start the next phase
- **Survives a locked phone and app restarts**: the timer runs on the wall clock and its state is saved on every change
- **Phone companion page** in the Even app with the same controls and the timer settings
- **8 languages**: English, Spanish, French, German, Italian, Chinese, Japanese and Korean, picked from the phone's language
- **Easy on the battery**: the glasses are only written to when something on screen changes, and not at all while they are off your face

## Screenshots

| Paused | Running (compact view) | Phase-end alert |
|:---:|:---:|:---:|
| ![Paused work session: tomato icon, status, 18:36, progress bar, session dots and what a tap does](screenshots/work-paused.png) | ![Compact view: only ▶ 12 min and a mini progress bar in the top-right corner](screenshots/compact-view.png) | ![Break alert: Break time!, overtime +00:45 and the next phase's length](screenshots/break-alert.png) |

The phone page in the Even app mirrors the timer, has the same controls and holds the settings (light and dark theme):

<p align="center">
  <img src="screenshots/phone-page.png" width="600" alt="Phone page in light and dark theme: running timer with progress, Pause, Skip and Reset buttons, the phase lengths and the Compact view and Show seconds switches">
</p>

## Controls

| Input | Action |
|-------|--------|
| **Tap** | Start / pause (or start the next phase after an alert) |
| **Tap, then hold** | Contextual menu: Skip, Reset |
| **Swipe up / down** | Show the gestures in the footer |
| **Double tap** | Exit (system confirmation dialog) |

## Getting Started

### Prerequisites

- Node.js 20 LTS or 22+
- Even Realities G2 glasses (or the evenhub-simulator for development)

### Install

```bash
git clone https://github.com/marceloleda/pomodoro-even-g2.git
cd pomodoro-even-g2
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Run the simulator (in another terminal)
npm run sim
```

`npm run sim` calls the simulator directly because `npx evenhub-simulator` fails: npm drops its `.bin` link, since its platform packages declare the same command name.

### Run on your glasses

1. Turn on Developer Mode in the Even Realities app.
2. Start the dev server: `npm run dev` (it listens on your local network).
3. In another terminal, make a QR code for your computer's LAN address (`hostname -I` on Linux, `ipconfig getifaddr en0` on macOS):

   ```bash
   npx evenhub qr --url "http://<your-lan-ip>:5173"
   ```

4. In the app's **Even Hub** tab, tap **Scan QR** and point the camera at the terminal. The app opens on the glasses, and saving a file updates it without scanning again.

The phone has to reach your computer on port 5173: if the scan doesn't connect, check the firewall, or Wi-Fi client isolation (a phone hotspot gets around it). In this mode, locking the phone suspends the WebView, so the locked-phone behavior is tested with a Beta build instead (see the [pre-submission checklist](store/LISTING.md#pre-submission-checklist)).

### Build & Package

```bash
npm run check:text   # every glasses string, in every language, fits its row and the G2 fonts
npm run pack         # builds and writes pomodoro.ehpk, stamping min_app_version from SDK 0.0.16
```

The app follows the device language. To preview a translation, point the simulator at `http://localhost:5173/?lang=de` (or any other supported code): `node node_modules/@evenrealities/evenhub-simulator/bin/index.js 'http://localhost:5173/?lang=de'`.

Store listing text, icon, screenshots and the pre-submission checklist are in [`store/`](store/LISTING.md).

## Tech Stack

- **TypeScript** + **Vite**
- **@evenrealities/even_hub_sdk** (0.0.16): G2 display and event bridge
- **@evenrealities/evenhub-simulator**: development preview and screenshots
- **Canvas API**: icons, thresholded to on/off pixels
- **@evenrealities/pretext**: checks text against the G2 firmware fonts (`npm run check:text`)

## Display Layout

```
[Tomato]  ‖  WORK · 1/4
          18:36
          ▄▄▄▄▄▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
          ● ○ ○ ○

Tap to resume · Tap + hold: menu
```

- Icon (80x80) and, in one column next to it, the status line, the timer (or the overtime after a phase ends), the progress bar and the session dots
- The status glyph is the timer's state: `▷` ready, `▶` running, `‖` paused, `★` phase ended
- Footer: when the phase ends, or what a tap does while the timer waits
- The timer row captures input; Skip and Reset are in the system contextual menu

With the compact view on, a running phase shows only the time and a five-segment bar whose current segment grows `▁▂▃▄`; a swipe shows the gestures at the bottom:

```
                                    ▶ 19 min  ▄▄▃▁▁
```

Every write to the glasses is a Bluetooth round trip that costs about the same whatever it carries, so the app counts calls rather than bytes: the time is in whole minutes unless you turn on Show seconds (the last minute of a phase and the first minute of overtime always count seconds), a row is only rewritten when its text changes, and Start/Pause swap the two pages with a single rebuild.

## License

[MIT](LICENSE)
