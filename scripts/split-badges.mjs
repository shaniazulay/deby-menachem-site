// Splits a hero badge SVG into:
//   *-base.svg – static parts (white band, green disc, lotus icon)
//   *-ring.svg – rotating parts (dashed ring, circular text and the bottom arc that fills the text gap)
import fs from 'node:fs';

const pairs = [
  ['assets/badge-hero-full.svg', 'assets/badge-hero-base.svg', 'assets/badge-hero-ring.svg'],
  ['assets/badge-hero-m.svg', 'assets/badge-hero-m-base.svg', 'assets/badge-hero-m-ring.svg'],
];

for (const [src, base, ring] of pairs) {
  const s = fs.readFileSync(src, 'utf8');
  const head = s.match(/^<svg[^>]*>/)[0];
  const dashed = s.match(/<circle id="ornament[^>]*\/>/)[0];

  // Circular text block (possibly wrapped in an outer scale group).
  const i = s.indexOf('translate(29.03 26.31)');
  let start = s.lastIndexOf('<g', i);
  const prev = s.lastIndexOf('<g', start - 1);
  const between = s.slice(prev, start);
  if (between.includes('scale(') && !between.includes('</') && !between.includes('/>')) start = prev;
  const end = s.lastIndexOf('</svg>');
  const textBlock = s.slice(start, end);

  let rest = s.slice(head.length, start).replace(dashed, '');
  const arcRe = [/<g transform="[^"]*scale[^"]*"><path id="Line 1"[^>]*\/><\/g>/, /<path id="Line 1"[^>]*\/>/];
  const arc = (rest.match(arcRe[0]) || rest.match(arcRe[1]))[0];
  rest = rest.replace(arc, '');

  fs.writeFileSync(ring, `${head}\n${dashed}\n${arc}\n${textBlock}</svg>\n`);
  fs.writeFileSync(base, `${head}${rest}</svg>\n`);
  console.log(src, '→ base', fs.statSync(base).size, 'B, ring', fs.statSync(ring).size, 'B');
}
