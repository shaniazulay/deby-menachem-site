// Converts the raw Figma image exports (assets/*.png, multi-MB) into web-sized WebP files
// in assets/img/. Run once after re-downloading assets: npm run optimize-images
import sharp from 'sharp';
import fs from 'node:fs';

const jobs = [
  // [source, output, max width]
  ['hero.png', 'hero.webp', 3200],
  ['about-room.png', 'about-room.webp', 900],
  ['about-oils.png', 'about-oils.webp', 900],
  ['philosophy.png', 'philosophy.webp', 1000],
  ['gift.png', 'gift.webp', 1200],
  ['svc-reflex.png', 'svc-reflex.webp', 700],
  ['svc-massage.png', 'svc-massage.webp', 700],
  ['svc-stones.png', 'svc-stones.webp', 700],
  ['svc-cupping.png', 'svc-cupping.webp', 700],
  ['logo.png', 'logo.webp', 640],
];

fs.mkdirSync('assets/img', { recursive: true });
for (const [src, out, w] of jobs) {
  const info = await sharp(`design-src/${src}`)
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality: src === 'logo.png' ? 92 : 80, alphaQuality: 100 })
    .toFile(`assets/img/${out}`);
  console.log(out, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)}KB`);
}
