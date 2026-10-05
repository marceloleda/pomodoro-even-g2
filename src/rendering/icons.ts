import { createCanvas, canvasToBytes } from './canvas';

const ON = '#fff';
const OFF = '#000';

// Cache icons since they never change
const iconCache = new Map<string, number[]>();

export function getTomatoIcon(size: number): number[] {
  const key = `tomato-${size}`;
  if (!iconCache.has(key)) iconCache.set(key, drawTomatoIcon(size));
  return iconCache.get(key)!;
}

export function getCoffeeIcon(size: number): number[] {
  const key = `coffee-${size}`;
  if (!iconCache.has(key)) iconCache.set(key, drawCoffeeIcon(size));
  return iconCache.get(key)!;
}

// Flat silhouettes: lit shapes separated by unlit gaps at least 3px wide, so
// they survive thresholding to on/off pixels (see canvasToBytes).
function drawTomatoIcon(size: number): number[] {
  const { canvas, ctx } = createCanvas(size, size);
  const centerX = size / 2;
  const bodyY = size * 0.6;
  const rx = size * 0.47;
  const ry = size * 0.37;
  const gap = Math.max(3, size / 20);

  // Body
  ctx.fillStyle = ON;
  ctx.beginPath();
  ctx.ellipse(centerX, bodyY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Calyx: a five-pointed star over the top of the body, cut out of it by an unlit outline
  const starY = bodyY - ry + size * 0.08;
  const outer = size * 0.26;
  const inner = outer * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(centerX + r * Math.cos(a), starY + r * Math.sin(a) * 0.7);
  }
  ctx.closePath();
  ctx.lineWidth = gap * 2;
  ctx.strokeStyle = OFF;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = ON;
  ctx.fill();

  // Stem
  const stemW = size * 0.09;
  ctx.fillRect(centerX - stemW / 2, starY - outer * 0.95, stemW, outer * 0.8);

  return canvasToBytes(canvas);
}

function drawCoffeeIcon(size: number): number[] {
  const { canvas, ctx } = createCanvas(size, size);
  const gap = Math.max(3, size / 20);
  const stroke = Math.max(4, size / 16);

  const cupL = size * 0.12;
  const cupR = size * 0.66;
  const cupTop = size * 0.4;
  const cupBot = size * 0.8;
  const taper = size * 0.05;

  // Saucer, drawn first so the cup can cut a gap into it
  ctx.fillStyle = ON;
  ctx.beginPath();
  ctx.ellipse(size * 0.42, cupBot + size * 0.04, size * 0.4, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Handle
  ctx.strokeStyle = ON;
  ctx.lineWidth = stroke;
  ctx.beginPath();
  ctx.arc(cupR, (cupTop + cupBot) / 2, size * 0.11, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Cup body (tapered), outlined in unlit pixels to separate it from the saucer
  ctx.beginPath();
  ctx.moveTo(cupL, cupTop);
  ctx.lineTo(cupL + taper, cupBot);
  ctx.lineTo(cupR - taper, cupBot);
  ctx.lineTo(cupR, cupTop);
  ctx.closePath();
  ctx.lineWidth = gap * 2;
  ctx.strokeStyle = OFF;
  ctx.stroke();
  ctx.fillStyle = ON;
  ctx.fill();

  // Steam
  ctx.strokeStyle = ON;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const sx = cupL + size * 0.12 + i * size * 0.15;
    const top = cupTop - size * 0.08;
    const steamH = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.quadraticCurveTo(sx + size * 0.07, top - steamH * 0.5, sx, top - steamH);
    ctx.stroke();
  }

  return canvasToBytes(canvas);
}
