import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  StartUpPageCreateResult,
} from '@evenrealities/even_hub_sdk';
import { ICON_SIZE } from '../config';
import {
  bridge, mode, timeLeft, isPageCreated, setPageCreated,
  formatTime, buildStatusLine, buildSessionDots, buildMenuText, getTotalTime,
} from '../state';
import { buildContainers, STATUS_ID, TIMER_ID, PBAR_IMG_ID, DOTS_ID, MENU_ID, ICON_ID } from './containers';
import { getTomatoIcon, getCoffeeIcon } from '../rendering/icons';
import { drawProgressBar, progressFillWidth } from '../rendering/progress-bar';

// The SDK forbids concurrent image transfers, so every updateImageRawData
// call is chained behind the previous one.
let imageQueue: Promise<void> = Promise.resolve();
// Fill width last sent to the glasses; -1 forces the next send.
let lastProgressFill = -1;

function sendImage(containerID: number, containerName: string, imageData: number[]): Promise<void> {
  const send = imageQueue.then(async () => {
    if (!bridge) return;
    const result = await bridge.updateImageRawData(new ImageRawDataUpdate({
      containerID, containerName, imageData,
    }));
    if (result !== ImageRawDataUpdateResult.success) {
      console.warn(`[pomodoro] updateImageRawData(${containerName}) returned ${result}`);
    }
  });
  imageQueue = send.catch(() => {});
  return send;
}

export async function renderPage(): Promise<void> {
  if (!bridge) return;
  const { iconImg, statusText, timerText, progressImg, dotsText, menuText } = buildContainers();
  const config = {
    containerTotalNum: 6,
    imageObject: [iconImg, progressImg],
    textObject: [statusText, timerText, dotsText, menuText],
  };
  try {
    if (!isPageCreated) {
      const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(config));
      if (result !== StartUpPageCreateResult.success) {
        console.error('[pomodoro] createStartUpPageContainer returned', result);
        return;
      }
      setPageCreated(true);
    } else if (!await bridge.rebuildPageContainer(new RebuildPageContainer(config))) {
      console.warn('[pomodoro] rebuildPageContainer returned false');
    }
    // Image containers start empty after a create/rebuild.
    await sendIcon();
    await sendProgressBar(true);
  } catch (err) {
    console.error('[pomodoro] renderPage failed:', err);
  }
}

export async function sendIcon(): Promise<void> {
  if (!bridge) return;
  try {
    const bytes = mode === 'work' ? getTomatoIcon(ICON_SIZE) : getCoffeeIcon(ICON_SIZE);
    await sendImage(ICON_ID, 'icon', bytes);
  } catch (err) {
    console.error('[pomodoro] sendIcon failed:', err);
  }
}

// Skips the transfer when the visible fill hasn't changed: the SDK warns
// against sending images too often, and the bar moves ~every 5s in work mode.
export async function sendProgressBar(force = false): Promise<void> {
  if (!bridge) return;
  const fillW = progressFillWidth(timeLeft, getTotalTime());
  if (!force && fillW === lastProgressFill) return;
  lastProgressFill = fillW;
  try {
    await sendImage(PBAR_IMG_ID, 'pbar', drawProgressBar(fillW));
  } catch (err) {
    lastProgressFill = -1;
    console.error('[pomodoro] sendProgressBar failed:', err);
  }
}

export async function updateTimerDisplay(): Promise<void> {
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

export async function updateStatusLine(): Promise<void> {
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

export async function updateMenuDisplay(): Promise<void> {
  if (!bridge) return;
  try {
    const menu = buildMenuText();
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: MENU_ID, containerName: 'menu',
      contentOffset: 0, contentLength: menu.length, content: menu,
    }));
  } catch (err) {
    console.error('[pomodoro] updateMenuDisplay failed, rebuilding page:', err);
    await renderPage();
  }
}

export async function updateAllText(): Promise<void> {
  if (!bridge) return;
  try {
    const status = buildStatusLine();
    const dots = buildSessionDots();

    await Promise.all([
      bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: STATUS_ID, containerName: 'status',
        contentOffset: 0, contentLength: status.length, content: status,
      })),
      bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: TIMER_ID, containerName: 'timer',
        contentOffset: 0, contentLength: 5, content: formatTime(timeLeft),
      })),
      bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: DOTS_ID, containerName: 'dots',
        contentOffset: 0, contentLength: dots.length, content: dots,
      })),
    ]);
    await sendProgressBar();
  } catch (err) {
    console.error('[pomodoro] updateAllText failed:', err);
  }
}
