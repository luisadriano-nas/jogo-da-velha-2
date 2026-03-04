// generate-icons.js — rode com: node generate-icons.js
// Gera icon-192.png e icon-512.png na pasta public/

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Background
  ctx.fillStyle = '#111008';
  ctx.beginPath();
  ctx.roundRect(0, 0, s, s, s * 0.18);
  ctx.fill();

  // Draw tic-tac-toe grid lines
  ctx.strokeStyle = 'rgba(240,230,200,0.6)';
  ctx.lineWidth = s * 0.025;
  ctx.lineCap = 'round';

  const p = s * 0.12;
  const t = (s - p * 2) / 3;

  // Horizontal lines
  ctx.beginPath(); ctx.moveTo(p, p + t); ctx.lineTo(s - p, p + t); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p, p + t * 2); ctx.lineTo(s - p, p + t * 2); ctx.stroke();
  // Vertical lines
  ctx.beginPath(); ctx.moveTo(p + t, p); ctx.lineTo(p + t, s - p); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p + t * 2, p); ctx.lineTo(p + t * 2, s - p); ctx.stroke();

  // Draw X in top-left cell
  ctx.strokeStyle = '#d63030';
  ctx.lineWidth = s * 0.04;
  const xp = p + t * 0.2;
  const xe = p + t * 0.8;
  ctx.beginPath(); ctx.moveTo(xp, xp); ctx.lineTo(xe, xe); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xe, xp); ctx.lineTo(xp, xe); ctx.stroke();

  // Draw O in center cell
  ctx.strokeStyle = '#2277bb';
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.arc(p + t * 1.5, p + t * 1.5, t * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

try {
  const outDir = path.join(__dirname, 'public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192));
  fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512));
  console.log('✅ Ícones gerados em public/icon-192.png e public/icon-512.png');
} catch (e) {
  console.log('⚠️  Para gerar os ícones rode: npm install canvas && node generate-icons.js');
  console.log('   Ou use qualquer imagem PNG de 192x192 e 512x512 e salve como icon-192.png e icon-512.png na pasta public/');
}
