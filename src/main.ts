import './style.css';
import {
  waitForEvenAppBridge,
  type EvenAppBridge,
  TextContainerProperty,
  ImageContainerProperty,
  ImageRawDataUpdate,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  StartUpPageCreateResult,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';

// --- Display constants (G2: 576x288, 4-bit greyscale) ---
const DISPLAY_WIDTH = 576;
const PADDING = 6;

// --- Pomodoro Config ---
const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const CYCLES_BEFORE_LONG_BREAK = 4;

// --- State ---
let mode: 'work' | 'break' = 'work';
let timeLeft = WORK_MINUTES * 60;
let running = false;
let cycle = 0;
let timerTimeout: ReturnType<typeof setTimeout> | null = null;
let timerSeq = 0;
let startupRendered = false;
let bridge: EvenAppBridge;
let motivationMsg = '';
let motivationTimeout: ReturnType<typeof setTimeout> | null = null;

// --- Helpers ---
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getModeLabel(): string {
  if (mode === 'work') return 'WORK';
  const isLong = cycle > 0 && cycle % CYCLES_BEFORE_LONG_BREAK === 0;
  return isLong ? 'LONG BREAK' : 'SHORT BREAK';
}

function getBreakDuration(): number {
  const isLong = cycle > 0 && cycle % CYCLES_BEFORE_LONG_BREAK === 0;
  return (isLong ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES) * 60;
}

function getTotalTime(): number {
  if (mode === 'work') return WORK_MINUTES * 60;
  return getBreakDuration();
}

// --- Pixel art rendering (canvas → PNG bytes for G2) ---

function canvasToBytes(canvas: HTMLCanvasElement): number[] {
  const dataUrl = canvas.toDataURL('image/png');
  const binary = atob(dataUrl.split(',')[1]);
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i));
  }
  return bytes;
}

// Draw a tomato/pomodoro icon (bold silhouette — G2 greyscale optimized)
function drawTomatoIcon(size: number): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const bodyY = size * 0.56;
  const rx = size * 0.42;
  const ry = size * 0.33;
  const lw = Math.max(2, size / 25);

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // Tomato body: solid bright fill, dark outline
  ctx.fillStyle = '#ddd';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Calyx: 5 bold leaf petals (exaggerated for readability)
  ctx.fillStyle = '#ccc';
  const leafBase = bodyY - ry + 3;
  const leafLen = size * 0.2;
  const leafW = size * 0.08;
  for (const angle of [-1.2, -0.55, 0, 0.55, 1.2]) {
    ctx.save();
    ctx.translate(cx, leafBase);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-leafW, -leafLen * 0.5, 0, -leafLen);
    ctx.quadraticCurveTo(leafW, -leafLen * 0.5, 0, 2);
    ctx.fill();
    ctx.restore();
  }

  // Leaf outlines for contrast against body
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  for (const angle of [-1.2, -0.55, 0, 0.55, 1.2]) {
    ctx.save();
    ctx.translate(cx, leafBase);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-leafW, -leafLen * 0.5, 0, -leafLen);
    ctx.quadraticCurveTo(leafW, -leafLen * 0.5, 0, 2);
    ctx.stroke();
    ctx.restore();
  }

  // Stem: short, thick, visible
  ctx.fillStyle = '#aaa';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  const stemH = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(cx - 3, leafBase);
  ctx.lineTo(cx - 2, leafBase - stemH);
  ctx.lineTo(cx + 2, leafBase - stemH);
  ctx.lineTo(cx + 3, leafBase);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  return canvasToBytes(canvas);
}

// Draw a coffee cup icon (bold silhouette — G2 greyscale optimized)
function drawCoffeeIcon(size: number): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const lw = Math.max(2, size / 25);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // Cup body (slightly tapered — wider at top)
  const cupL = size * 0.15;
  const cupR = size * 0.65;
  const cupTop = size * 0.38;
  const cupBot = size * 0.78;
  const taper = size * 0.03;

  ctx.fillStyle = '#ddd';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(cupL, cupTop);
  ctx.lineTo(cupL + taper, cupBot);
  ctx.lineTo(cupR - taper, cupBot);
  ctx.lineTo(cupR, cupTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cup rim (thicker top edge)
  ctx.fillStyle = '#eee';
  ctx.fillRect(cupL - 2, cupTop - 3, cupR - cupL + 4, 5);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cupL - 2, cupTop - 3, cupR - cupL + 4, 5);

  // Handle (bold arc on the right)
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = lw * 1.5;
  const handleX = cupR + 2;
  const handleCy = (cupTop + cupBot) / 2;
  const handleR = size * 0.1;
  ctx.beginPath();
  ctx.arc(handleX, handleCy, handleR, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  // Handle outline
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(handleX, handleCy, handleR + lw * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(handleX, handleCy, handleR - lw * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Saucer (flat ellipse under cup)
  ctx.fillStyle = '#bbb';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(size * 0.42, cupBot + 4, size * 0.38, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Steam: 3 wavy lines above cup
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const sx = cupL + size * 0.1 + i * size * 0.13;
    const steamH = size * 0.15 + i * 2;
    ctx.beginPath();
    ctx.moveTo(sx, cupTop - 6);
    ctx.quadraticCurveTo(sx + 5, cupTop - 6 - steamH * 0.5, sx, cupTop - 6 - steamH);
    ctx.stroke();
  }

  return canvasToBytes(canvas);
}

// --- Visual elements ---

const PBAR_W = 280;
const PBAR_H = 22;
const PBAR_R = 6; // corner radius

function drawProgressBar(remaining: number, total: number): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = PBAR_W;
  canvas.height = PBAR_H;
  const ctx = canvas.getContext('2d')!;
  const safeTotal = Math.max(1, total);
  const pct = Math.min(1, (safeTotal - remaining) / safeTotal);

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, PBAR_W, PBAR_H);

  // Outline only (bright, always visible)
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, PBAR_W - 2, PBAR_H - 2, PBAR_R);
  ctx.stroke();

  // Fill inside the outline
  const fillW = Math.round(pct * (PBAR_W - 6));
  if (fillW > 0) {
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.roundRect(3, 3, fillW, PBAR_H - 6, PBAR_R - 2);
    ctx.fill();
  }

  return canvasToBytes(canvas);
}

function buildSessionDots(): string {
  return Array.from({ length: CYCLES_BEFORE_LONG_BREAK }, (_, i) =>
    i < cycle ? '\u25CF' : '\u25CB'
  ).join(' ');
}

function buildStatusLine(): string {
  if (motivationMsg) return motivationMsg.padEnd(30);
  const icon = running ? '\u25B6' : '| |';
  return `${icon}  ${getModeLabel()} \u00B7 ${cycle}/${CYCLES_BEFORE_LONG_BREAK}`.padEnd(30);
}

function showMotivation(msg: string, durationSec: number) {
  motivationMsg = msg;
  if (motivationTimeout) clearTimeout(motivationTimeout);
  motivationTimeout = setTimeout(() => {
    motivationMsg = '';
    void updateStatusLine();
  }, durationSec * 1000);
}

// --- Menu ---
const ACTIONS = ['Start', 'Pause', 'Reset', 'Skip'];
let selectedIndex = 0;

function buildMenuText(): string {
  return ACTIONS.map((a, i) =>
    i === selectedIndex ? `[ ${a} ]` : `  ${a}`
  ).join('\n');
}

// --- Container IDs ---
const ICON_ID = 1;
const STATUS_ID = 2;
const TIMER_ID = 3;
const PBAR_IMG_ID = 4;
const DOTS_ID = 5;
const MENU_ID = 6;

// --- Glasses UI ---

const ICON_SIZE = 80;

function buildContainers() {
  const iconImg = new ImageContainerProperty({
    xPosition: 4, yPosition: 4,
    width: ICON_SIZE, height: ICON_SIZE,
    containerID: ICON_ID, containerName: 'icon',
  });

  const statusText = new TextContainerProperty({
    xPosition: 90, yPosition: 0,
    width: 260, height: 30,
    containerID: STATUS_ID, containerName: 'status',
    content: buildStatusLine(),
    isEventCapture: 0, paddingLength: 4,
    borderWidth: 0, borderColor: 0,
  });

  const timerText = new TextContainerProperty({
    xPosition: 90, yPosition: 32,
    width: 260, height: 70,
    containerID: TIMER_ID, containerName: 'timer',
    content: formatTime(timeLeft),
    isEventCapture: 0, paddingLength: PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const progressImg = new ImageContainerProperty({
    xPosition: 30, yPosition: 115,
    width: PBAR_W, height: PBAR_H,
    containerID: PBAR_IMG_ID, containerName: 'pbar',
  });

  const dotsText = new TextContainerProperty({
    xPosition: 10, yPosition: 150,
    width: 340, height: 35,
    containerID: DOTS_ID, containerName: 'dots',
    content: buildSessionDots(),
    isEventCapture: 0, paddingLength: PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const menuText = new TextContainerProperty({
    xPosition: 370, yPosition: 30,
    width: DISPLAY_WIDTH - 370, height: 240,
    containerID: MENU_ID, containerName: 'menu',
    content: buildMenuText(),
    isEventCapture: 1, paddingLength: PADDING,
    borderWidth: 0, borderColor: 0,
  });

  return { iconImg, statusText, timerText, progressImg, dotsText, menuText };
}

async function sendProgressBar(): Promise<void> {
  if (!bridge) return;
  try {
    const bytes = drawProgressBar(timeLeft, getTotalTime());
    await bridge.updateImageRawData(new ImageRawDataUpdate({
      containerID: PBAR_IMG_ID, containerName: 'pbar', imageData: bytes,
    }));
  } catch (err) {
    console.error('[pomodoro] sendProgressBar failed:', err);
  }
}

async function sendIcon(): Promise<void> {
  if (!bridge) return;
  try {
    const bytes = mode === 'work' ? drawTomatoIcon(ICON_SIZE) : drawCoffeeIcon(ICON_SIZE);
    await bridge.updateImageRawData(new ImageRawDataUpdate({
      containerID: ICON_ID, containerName: 'icon', imageData: bytes,
    }));
  } catch (err) {
    console.error('[pomodoro] sendIcon failed:', err);
  }
}

async function renderPage(): Promise<void> {
  if (!bridge) return;
  const { iconImg, statusText, timerText, progressImg, dotsText, menuText } = buildContainers();
  const config = {
    containerTotalNum: 6,
    imageObject: [iconImg, progressImg],
    textObject: [statusText, timerText, dotsText, menuText],
  };
  try {
    if (!startupRendered) {
      const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(config));
      if (result === StartUpPageCreateResult.success) {
        startupRendered = true;
        await sendIcon();
        await sendProgressBar();
      }
    } else {
      await bridge.rebuildPageContainer(new RebuildPageContainer(config));
      await sendIcon();
      await sendProgressBar();
    }
  } catch (err) {
    console.error('[pomodoro] renderPage failed:', err);
  }
}

async function updateMenuDisplay(): Promise<void> {
  if (!bridge) return;
  try {
    const menu = buildMenuText();
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: MENU_ID, containerName: 'menu',
      contentOffset: 0, contentLength: menu.length, content: menu,
    }));
  } catch {
    await renderPage();
  }
}

async function updateTimerDisplay(): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: TIMER_ID, containerName: 'timer',
      contentOffset: 0, contentLength: 5, content: formatTime(timeLeft),
    }));

    await sendProgressBar();
  } catch (err) {
    console.error('[pomodoro] updateTimerDisplay failed:', err);
  }
}

async function updateAllText(): Promise<void> {
  if (!bridge) return;
  try {
    const status = buildStatusLine();
    const dots = buildSessionDots();

    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: STATUS_ID, containerName: 'status',
      contentOffset: 0, contentLength: status.length, content: status,
    }));
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: TIMER_ID, containerName: 'timer',
      contentOffset: 0, contentLength: 5, content: formatTime(timeLeft),
    }));
    await sendProgressBar();
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: DOTS_ID, containerName: 'dots',
      contentOffset: 0, contentLength: dots.length, content: dots,
    }));
  } catch (err) {
    console.error('[pomodoro] updateAllText failed:', err);
  }
}

// --- Timer Logic ---

function startTimer() {
  if (running) return;
  running = true;
  timerSeq++;
  const mySeq = timerSeq;
  void updateStatusLine();

  const tick = async () => {
    if (!running || mySeq !== timerSeq) return;
    if (timeLeft <= 0) {
      await handleTimerEnd();
      return;
    }
    timeLeft--;
    await updateTimerDisplay();
    if (running && mySeq === timerSeq) {
      timerTimeout = setTimeout(tick, 1000);
    }
  };

  timerTimeout = setTimeout(tick, 1000);
}

function pauseTimer() {
  running = false;
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }
  void updateStatusLine();
  void updateDotsLine();
}

async function updateDotsLine(): Promise<void> {
  if (!bridge) return;
  try {
    const dots = buildSessionDots();
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: DOTS_ID, containerName: 'dots',
      contentOffset: 0, contentLength: dots.length, content: dots,
    }));
  } catch (err) {
    console.error('[pomodoro] updateDotsLine failed:', err);
  }
}

async function updateStatusLine(): Promise<void> {
  if (!bridge) return;
  try {
    const status = buildStatusLine();
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: STATUS_ID, containerName: 'status',
      contentOffset: 0, contentLength: status.length, content: status,
    }));
  } catch (err) {
    console.error('[pomodoro] updateStatusLine failed:', err);
  }
}

async function resetTimer() {
  pauseTimer();
  mode = 'work';
  cycle = 0;
  timeLeft = WORK_MINUTES * 60;
  await updateAllText();
  await sendIcon();
}

async function skipToNext() {
  pauseTimer();
  const wasBreak = mode === 'break';
  if (mode === 'work') {
    cycle++;
    mode = 'break';
    timeLeft = getBreakDuration();
  } else {
    mode = 'work';
    timeLeft = WORK_MINUTES * 60;
  }
  if (wasBreak && cycle > 0) {
    showMotivation('\u25B6  Back to work!', 60);
  }
  await updateAllText();
  await sendIcon();
}

async function handleTimerEnd() {
  pauseTimer();
  await skipToNext();
  startTimer();
}

// --- Event Handling ---

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
    if (v.includes('SCROLL_TOP') || v.includes('UP')) return OsEventTypeList.SCROLL_TOP_EVENT;
    if (v.includes('SCROLL_BOTTOM') || v.includes('DOWN')) return OsEventTypeList.SCROLL_BOTTOM_EVENT;
  }
  return undefined;
}

function handleAction(action: string) {
  switch (action) {
    case 'Start': startTimer(); break;
    case 'Pause': pauseTimer(); break;
    case 'Reset': resetTimer(); break;
    case 'Skip': skipToNext(); break;
  }
}

function setupEventListeners() {
  bridge.onEvenHubEvent((event) => {
    const eventType = resolveEventType(event);

    if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      selectedIndex = Math.max(0, selectedIndex - 1);
      void updateMenuDisplay();
      return;
    }

    if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      selectedIndex = Math.min(ACTIONS.length - 1, selectedIndex + 1);
      void updateMenuDisplay();
      return;
    }

    if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      skipToNext();
      return;
    }

    if (eventType === OsEventTypeList.CLICK_EVENT || event.textEvent || event.listEvent || event.sysEvent) {
      handleAction(ACTIONS[selectedIndex]);
      return;
    }
  });
}

// --- Web Preview ---

function renderWebPreview() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <div style="
      width: ${DISPLAY_WIDTH}px; height: 288px;
      background: #000; color: #0f0;
      font-family: monospace;
      display: flex; gap: 40px;
      align-items: center; justify-content: center;
      border: 1px solid #0f03; border-radius: 8px;
      margin: 40px auto; padding: 20px;
    ">
      <div style="flex:1;">
        <div id="web-status" style="font-size: 13px; opacity:0.7;">${buildStatusLine()}</div>
        <div id="web-timer" style="font-size: 64px; font-weight: bold; margin: 8px 0;">${formatTime(timeLeft)}</div>
        <div id="web-progress" style="height:12px;background:#333;border-radius:6px;margin:8px 0;overflow:hidden;"><div id="web-fill" style="height:100%;background:#0f0;border-radius:6px;width:0%;transition:width 0.5s;"></div></div>
        <div id="web-dots" style="font-size: 16px; margin-top: 10px; letter-spacing: 4px;">${buildSessionDots()}</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <button onclick="window.__pomodoro.start()" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Start</button>
        <button onclick="window.__pomodoro.pause()" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Pause</button>
        <button onclick="window.__pomodoro.reset()" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Reset</button>
        <button onclick="window.__pomodoro.skip()" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Skip</button>
      </div>
    </div>
  `;

  setInterval(() => {
    const timerEl = document.getElementById('web-timer');
    const statusEl = document.getElementById('web-status');
    const fillEl = document.getElementById('web-fill');
    const dotsEl = document.getElementById('web-dots');
    if (timerEl) timerEl.textContent = formatTime(timeLeft);
    if (statusEl) statusEl.textContent = buildStatusLine();
    if (fillEl) {
      const total = getTotalTime();
      const pct = Math.min(100, ((total - timeLeft) / Math.max(1, total)) * 100);
      fillEl.style.width = `${pct}%`;
    }
    if (dotsEl) dotsEl.textContent = buildSessionDots();
  }, 200);

  (window as any).__pomodoro = {
    start: startTimer,
    pause: pauseTimer,
    reset: resetTimer,
    skip: skipToNext,
  };
}

// --- Init ---

function isEvenAppEnvironment(): boolean {
  return typeof (window as any).flutter_inappwebview !== 'undefined';
}

async function init() {
  if (!isEvenAppEnvironment()) {
    renderWebPreview();
    return;
  }

  try {
    bridge = await waitForEvenAppBridge();
    await renderPage();
    setupEventListeners();
  } catch {
    renderWebPreview();
  }
}

init();
