#!/usr/bin/env node
/**
 * Generate minimal PWA PNG icons without external dependencies.
 * Creates solid-color icons with proper PNG encoding.
 * For better icons, replace these with designed assets.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeB = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeB, data]);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT - raw pixel data with filter byte per row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = y * (1 + width * 4) + 1 + x * 4;
      rawData[ri] = pixels[pi];
      rawData[ri + 1] = pixels[pi + 1];
      rawData[ri + 2] = pixels[pi + 2];
      rawData[ri + 3] = pixels[pi + 3];
    }
  }
  const compressed = deflateSync(rawData);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;

      // Rounded rect mask
      const cornerR = s * 0.156;
      let inside = true;
      if (x < cornerR && y < cornerR) {
        inside = Math.hypot(x - cornerR, y - cornerR) <= cornerR;
      } else if (x >= s - cornerR && y < cornerR) {
        inside = Math.hypot(x - (s - cornerR), y - cornerR) <= cornerR;
      } else if (x < cornerR && y >= s - cornerR) {
        inside = Math.hypot(x - cornerR, y - (s - cornerR)) <= cornerR;
      } else if (x >= s - cornerR && y >= s - cornerR) {
        inside = Math.hypot(x - (s - cornerR), y - (s - cornerR)) <= cornerR;
      }

      if (!inside) {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0;
        continue;
      }

      // Background gradient (dark blue)
      const t = y / s;
      const bgR = Math.round(26 + (13 - 26) * t);
      const bgG = Math.round(35 + (71 - 35) * t);
      const bgB = Math.round(126 + (161 - 126) * t);

      let r = bgR, g = bgG, b = bgB, a = 255;

      // Ring (golden circle, center at 0.5, 0.43)
      const ringCx = cx;
      const ringCy = s * 0.43;
      const ringR = s * 0.176;
      const ringW = s * 0.055;
      const dist = Math.hypot(x - ringCx, y - ringCy);

      if (Math.abs(dist - ringR) < ringW) {
        const ringT = (y - (ringCy - ringR)) / (ringR * 2);
        r = Math.round(255 * (1 - ringT * 0.3));
        g = Math.round(215 - ringT * 70);
        b = Math.round(64 + ringT * 10);
      }

      // Ring highlight (lighter arc on top-left)
      if (Math.abs(dist - ringR) < ringW * 0.4) {
        const angle = Math.atan2(y - ringCy, x - ringCx);
        if (angle > -2.0 && angle < -0.5) {
          r = Math.min(255, r + 60);
          g = Math.min(255, g + 60);
          b = Math.min(255, b + 60);
        }
      }

      // Letter "P" - approximate with rectangles
      const pLeft = cx - s * 0.07;
      const pRight = cx + s * 0.09;
      const pTop = s * 0.63;
      const pBottom = s * 0.85;
      const pMid = s * 0.74;
      const pStroke = s * 0.04;
      const pCurveR = s * 0.06;

      // Vertical bar of P
      if (x >= pLeft && x <= pLeft + pStroke && y >= pTop && y <= pBottom) {
        r = 255; g = 255; b = 255;
      }
      // Top bar of P
      if (x >= pLeft && x <= pRight && y >= pTop && y <= pTop + pStroke) {
        r = 255; g = 255; b = 255;
      }
      // Middle bar of P
      if (x >= pLeft && x <= pRight && y >= pMid - pStroke && y <= pMid) {
        r = 255; g = 255; b = 255;
      }
      // Right curve of P (simplified as vertical bar)
      if (x >= pRight - pStroke && x <= pRight && y >= pTop && y <= pMid) {
        r = 255; g = 255; b = 255;
      }

      // Small stars
      const stars = [
        [s * 0.195, s * 0.195, s * 0.012],
        [s * 0.78, s * 0.234, s * 0.008],
        [s * 0.254, s * 0.742, s * 0.01],
        [s * 0.8, s * 0.703, s * 0.006],
      ];
      for (const [sx, sy, sr] of stars) {
        if (Math.hypot(x - sx, y - sy) <= sr) {
          r = 255; g = 215; b = 64; a = 200;
        }
      }

      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }
  }

  return createPNG(size, size, pixels);
}

const sizes = [192, 512];

for (const size of sizes) {
  const png = generateIcon(size);
  const path = join(publicDir, `icon-${size}x${size}.png`);
  writeFileSync(path, png);
  console.log(`Created ${size}x${size} icon: ${path}`);
}

console.log('PWA icons generated successfully!');
