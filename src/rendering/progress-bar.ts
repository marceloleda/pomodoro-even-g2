import { createCanvas, canvasToBytes } from './canvas';
import { PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_RADIUS } from '../config';

export function drawProgressBar(remaining: number, total: number): number[] {
  const { canvas, ctx } = createCanvas(PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT);
  const safeTotal = Math.max(1, total);
  const pct = Math.min(1, (safeTotal - remaining) / safeTotal);

  // Outline (always visible on G2 transparent display)
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, PROGRESS_BAR_WIDTH - 2, PROGRESS_BAR_HEIGHT - 2, PROGRESS_BAR_RADIUS);
  ctx.stroke();

  // Fill
  const fillW = Math.round(pct * (PROGRESS_BAR_WIDTH - 6));
  if (fillW > 0) {
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.roundRect(3, 3, fillW, PROGRESS_BAR_HEIGHT - 6, PROGRESS_BAR_RADIUS - 2);
    ctx.fill();
  }

  return canvasToBytes(canvas);
}
