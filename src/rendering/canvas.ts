export function canvasToBytes(canvas: HTMLCanvasElement): number[] {
  const dataUrl = canvas.toDataURL('image/png');
  const binary = atob(dataUrl.split(',')[1]);
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i));
  }
  return bytes;
}

export function createCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return { canvas, ctx };
}
