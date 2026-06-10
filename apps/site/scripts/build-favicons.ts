/**
 * Generate the site favicon set from the «Є» mark — first letter of Єрмілов,
 * a letter unique to the Ukrainian alphabet. Drawn with satori (PT Serif 700,
 * glyph baked to a path — no system-font dependence), then:
 *
 *   public/favicon.svg        scheme-aware (green-on-paper, dark variant)
 *   public/favicon-48.png     PNG fallback for browsers without SVG favicons
 *   public/apple-touch-icon.png  180×180, solid background
 *
 * Run once and commit the outputs:  node apps/site/scripts/build-favicons.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const PAPER = '#f7f3ea';
const PAPER_DARK = '#0f1410';
const GREEN = '#1f5d3b';
const GREEN_DARK = '#5fb682';
const ORANGE = '#d9621b';

const require_ = createRequire(import.meta.url);
const ptSerifDir = require_.resolve('@fontsource/pt-serif/package.json').replace(/package\.json$/, '');
const ptSerif = readFileSync(`${ptSerifDir}files/pt-serif-cyrillic-700-normal.woff`);

function el(type: string, style: Record<string, unknown>, children?: unknown) {
  return { type, props: { style, ...(children !== undefined ? { children } : {}) } };
}

const tree = el(
  'div',
  {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAPER,
    borderRadius: 13,
    position: 'relative',
    fontFamily: 'PT Serif',
  },
  [
    el(
      'div',
      { fontSize: 46, fontWeight: 700, color: GREEN, marginTop: -3 },
      'Є',
    ),
    // the square ledger node from the timeline, tucked at the corner
    el('div', {
      position: 'absolute',
      right: 9,
      bottom: 9,
      width: 7,
      height: 7,
      backgroundColor: ORANGE,
      transform: 'rotate(45deg)',
    }),
  ],
);

const svg = await satori(tree as Parameters<typeof satori>[0], {
  width: 64,
  height: 64,
  fonts: [{ name: 'PT Serif', data: ptSerif, weight: 700, style: 'normal' }],
});

/* Scheme-aware SVG: swap the hardcoded fills for classes + a media query. */
const themed = svg
  .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  .replace(
    /(<svg[^>]*>)/,
    `$1<style>.og-bg{fill:${PAPER}}.og-fg{fill:${GREEN}}@media(prefers-color-scheme:dark){.og-bg{fill:${PAPER_DARK}}.og-fg{fill:${GREEN_DARK}}}</style>`,
  )
  .replaceAll(`fill="${PAPER}"`, 'class="og-bg"')
  .replaceAll(`fill="${GREEN}"`, 'class="og-fg"');

const publicDir = new URL('../public/', import.meta.url);
writeFileSync(new URL('favicon.svg', publicDir), themed);

for (const [file, size] of [
  ['favicon-48.png', 48],
  ['apple-touch-icon.png', 180],
] as const) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(new URL(file, publicDir), png);
}

console.log('favicon.svg, favicon-48.png, apple-touch-icon.png written to apps/site/public/');
