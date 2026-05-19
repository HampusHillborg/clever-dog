// Visuellt centrera resources/icon.png genom att hitta non-background-
// pixlarnas viktade tyngdpunkt och shift:a bilden så centroiden hamnar
// i canvas-mitten. Skiljer sig från bbox-centrering: tar hänsyn till
// VAR pixlarna sitter, inte bara extremerna.

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const input = 'resources/icon.png';

const img = sharp(input);
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;

const bgR = data[0], bgG = data[1], bgB = data[2];
console.log(`Background: rgb(${bgR}, ${bgG}, ${bgB})`);

const tol = 12;
let sumX = 0, sumY = 0, n = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * ch;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = ch === 4 ? data[i + 3] : 255;
    const isBg =
      a < 10 ||
      (Math.abs(r - bgR) < tol && Math.abs(g - bgG) < tol && Math.abs(b - bgB) < tol);
    if (!isBg) {
      sumX += x;
      sumY += y;
      n++;
    }
  }
}

const cx = sumX / n;
const cy = sumY / n;
const targetX = info.width / 2;
const targetY = info.height / 2;
const shiftX = Math.round(targetX - cx);
const shiftY = Math.round(targetY - cy);
console.log(`Centroid: (${cx.toFixed(1)}, ${cy.toFixed(1)}), shift: (${shiftX}, ${shiftY})`);

// Skapa en ny canvas av samma storlek, fyll med bg, klistra på den ursprungliga
// med beräknad shift.
const bg = await sharp({
  create: {
    width: info.width,
    height: info.height,
    channels: 3,
    background: { r: bgR, g: bgG, b: bgB },
  },
}).png().toBuffer();

const out = await sharp(bg)
  .composite([{ input: input, left: shiftX, top: shiftY }])
  .png()
  .toBuffer();

writeFileSync(input, out);
console.log(`Wrote centered ${input}`);
