import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  ImageRawDataUpdate,
  StartUpPageCreateResult,
} from '@evenrealities/even_hub_sdk';
import { ICON_SIZE } from '../config';
import {
  bridge, mode, timeLeft, isPageCreated, setPageCreated,
  formatTime, buildStatusLine, buildSessionDots, buildMenuText, getTotalTime,
} from '../state';
import { buildContainers, STATUS_ID, TIMER_ID, PBAR_IMG_ID, DOTS_ID, MENU_ID, ICON_ID } from './containers';
import { getTomatoIcon, getCoffeeIcon } from '../rendering/icons';
import { drawProgressBar } from '../rendering/progress-bar';

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
      if (result === StartUpPageCreateResult.success) {
        setPageCreated(true);
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

export async function sendIcon(): Promise<void> {
  if (!bridge) return;
  try {
    const bytes = mode === 'work' ? getTomatoIcon(ICON_SIZE) : getCoffeeIcon(ICON_SIZE);
    await bridge.updateImageRawData(new ImageRawDataUpdate({
      containerID: ICON_ID, containerName: 'icon', imageData: bytes,
    }));
  } catch (err) {
    console.error('[pomodoro] sendIcon failed:', err);
  }
}

export async function sendProgressBar(): Promise<void> {
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

export async function updateDotsLine(): Promise<void> {
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

export async function updateMenuDisplay(): Promise<void> {
  if (!bridge) return;
  try {
    const menu = buildMenuText();
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: MENU_ID, containerName: 'menu',
      contentOffset: 0, contentLength: menu.length, content: menu,
    }));
  } catch (err) {
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
