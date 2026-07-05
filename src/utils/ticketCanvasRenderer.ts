import qr from 'qr.js';
import { formatPrice } from './currencies';
import { formatDateDMY } from './format';

interface TicketData {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  ticketType: string;
  price: string;
  qrCode: string;
  ticketNumber?: string;
}

const W = 600;
const H = 920;
const R = 24;
const P = 24;
const IMG_H = 280;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawQR(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  const qrCode = qr(text, { typeNumber: -1, errorCorrectLevel: 2 });
  const modules = qrCode.modules;
  const count = modules.length;
  const cellSize = size / count;

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules[row][col]) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + col * cellSize, y + row * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, type: 'calendar' | 'clock' | 'map', cx: number, cy: number, size: number) {
  const s = size;
  const h = s / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, cx - h, cy - h, s, s, 8);
  ctx.fill();

  ctx.beginPath();
  if (type === 'calendar') {
    const pad = s * 0.25;
    roundRect(ctx, cx - h + pad, cy - h + pad * 0.6, s - pad * 2, s - pad * 1.2, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - h + pad * 0.6 + 4);
    ctx.lineTo(cx, cy + h - pad * 0.6 - 2);
    ctx.moveTo(cx - h + pad, cy + 1);
    ctx.lineTo(cx + h - pad, cy + 1);
    ctx.stroke();
  } else if (type === 'clock') {
    const r = s * 0.32;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 2);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + r * 0.5, cy);
    ctx.stroke();
  } else if (type === 'map') {
    const r = s * 0.2;
    ctx.arc(cx, cy - 1, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 1 + r);
    ctx.lineTo(cx - h * 0.45, cy + h * 0.6);
    ctx.quadraticCurveTo(cx, cy + h * 0.75, cx + h * 0.45, cy + h * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.save();
  const metrics = ctx.measureText(text);
  const padX = 12;
  const bw = metrics.width + padX * 2;
  const bh = 22;
  roundRect(ctx, x, y, bw, bh, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + bh / 2);
  ctx.restore();
}

function drawTextWrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const chars = text.split('');
  let line = '';
  let lineY = y;
  for (const ch of chars) {
    const test = line + ch;
    const m = ctx.measureText(test);
    if (m.width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = ch;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

export async function renderTicketToCanvas(ticket: TicketData): Promise<Blob> {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Card background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#1A0533');
  bgGrad.addColorStop(0.5, '#4C1D95');
  bgGrad.addColorStop(1, '#831843');
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 0, 0, W, H, R);
  ctx.fill();

  // Clip to rounded rect
  ctx.save();
  roundRect(ctx, 0, 0, W, H, R);
  ctx.clip();

  // Shimmer overlay
  const shimmerGrad = ctx.createLinearGradient(-W, 0, W * 2, 0);
  shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)');
  shimmerGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimmerGrad;
  ctx.fillRect(0, 0, W, H);

  // Event image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Image load failed'));
    if (!ticket.image) {
      const dummy = new Image();
      dummy.width = W;
      dummy.height = IMG_H;
      resolve(dummy);
      return;
    }
    i.src = ticket.image;
  });

  if (img.width > 0) {
    ctx.drawImage(img, 0, 0, W, IMG_H);
  } else {
    ctx.fillStyle = '#2D1B69';
    ctx.fillRect(0, 0, W, IMG_H);
  }

  // Image gradient overlay
  const imgOverlay = ctx.createLinearGradient(0, IMG_H * 0.4, 0, IMG_H);
  imgOverlay.addColorStop(0, 'rgba(0,0,0,0)');
  imgOverlay.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = imgOverlay;
  ctx.fillRect(0, 0, W, IMG_H);

  // Category badge (top-left)
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  drawBadge(ctx, ticket.category, 16, 16);

  // VIP badge (top-right)
  if (ticket.ticketType === 'VIP') {
    ctx.save();
    const vipText = 'VIP ACCESS';
    const vipMetrics = ctx.measureText(vipText);
    const vipPadX = 12;
    const vipW = vipMetrics.width + vipPadX * 2;
    const vipX = W - 16 - vipW;
    const vipGrad = ctx.createLinearGradient(vipX, 0, vipX + vipW, 0);
    vipGrad.addColorStop(0, '#FBBF24');
    vipGrad.addColorStop(1, '#D97706');
    ctx.fillStyle = vipGrad;
    roundRect(ctx, vipX, 16, vipW, 22, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(vipText, vipX + vipPadX, 27);
    ctx.restore();
  }

  // Event name + ticket type (bottom of image)
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  drawTextWrap(ctx, ticket.name, P, IMG_H - P - 24, W - P * 2, 28);

  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${ticket.ticketType}`, P, IMG_H - P);

  // Details section
  const detailY = IMG_H + P;

  // Date/Time grid
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textBaseline = 'top';

  const colW = (W - P * 2 - 16) / 2;

  // Date
  drawIcon(ctx, 'calendar', P + 16, detailY + 4, 28);
  ctx.fillText('Date', P + 56, detailY + 6);
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatDateDMY(ticket.date), P + 56, detailY + 24);

  // Time
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  drawIcon(ctx, 'clock', P + 16 + colW + 16, detailY + 4, 28);
  ctx.fillText('Time', P + 56 + colW + 16, detailY + 6);
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ticket.time, P + 56 + colW + 16, detailY + 24);

  // Location
  const locY = detailY + 72;
  drawIcon(ctx, 'map', P + 16, locY + 4, 28);
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textBaseline = 'top';
  ctx.fillText('Location', P + 56, locY + 6);
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ticket.location, P + 56, locY + 24);

  // Divider
  const divY = locY + 76;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(P, divY);
  ctx.lineTo(W - P, divY);
  ctx.stroke();

  // Notches
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(0, divY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W, divY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Divider dots
  const dotGap = 12;
  const dotStart = P + 20;
  const dotEnd = W - P - 20;
  for (let dx = dotStart; dx < dotEnd; dx += dotGap) {
    ctx.beginPath();
    ctx.arc(dx, divY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
  }

  // QR Code + Ticket info
  const qrY = divY + 36;
  const qrSize = 120;

  // QR white bg
  roundRect(ctx, P, qrY, qrSize, qrSize, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Inner QR bg
  roundRect(ctx, P + 6, qrY + 6, qrSize - 12, qrSize - 12, 8);
  const qrInnerGrad = ctx.createLinearGradient(P + 6, qrY + 6, P + qrSize - 6, qrY + qrSize - 6);
  qrInnerGrad.addColorStop(0, '#F3F4F6');
  qrInnerGrad.addColorStop(1, '#FCE7F3');
  ctx.fillStyle = qrInnerGrad;
  ctx.fill();

  // Draw QR code centered in the inner area
  const qrInnerX = P + 6 + 8;
  const qrInnerY = qrY + 6 + 8;
  const qrInnerSize = qrSize - 12 - 16;
  drawQR(ctx, ticket.qrCode || `TICKET-${ticket.id}`, qrInnerX, qrInnerY, qrInnerSize);

  // Ticket info (right of QR)
  const infoX = P + qrSize + 20;
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textBaseline = 'top';
  ctx.fillText('Ticket Number', infoX, qrY + 4);

  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const ticketNumber = ticket.ticketNumber || `EVTZ-${String(ticket.id).padStart(6, '0')}`;
  ctx.fillText(ticketNumber, infoX, qrY + 22);

  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textBaseline = 'top';
  ctx.fillText('Price', infoX, qrY + 56);

  ctx.font = '700 26px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatPrice(ticket.price), infoX, qrY + 74);

  // Notice
  const noticeY = qrY + qrSize + 24;
  roundRect(ctx, P, noticeY, W - P * 2, 48, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, P, noticeY, W - P * 2, 48, 10);
  ctx.stroke();

  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textBaseline = 'top';
  ctx.fillText('Show this QR code at the entrance.', P + 14, noticeY + 10);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Screenshot or save this ticket for offline access. Valid for one-time entry only.', P + 14, noticeY + 28);

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}
