/**
 * One-off: render the lab cover for /lab/check-network/ — the same three-bar chart the post
 * carries, re-laid-out for the card slot.
 *
 * The lab index crops every cover to `aspect-ratio: 4/5` with `object-fit: cover`, so the wide
 * chart from the post body (2.5:1) would survive only as a sliver. This draws it PORTRAIT and
 * keeps the numbers off the left/right edges, where a centre-crop bites.
 *
 * Same pipeline as the OG cards (satori → resvg) so the Cyrillic renders in PT Serif rather than
 * a fallback. Writes the exact files the two lab entries reference (PNG — flat vector-ish art, so
 * it beats JPEG on both size and crispness here), one per locale. Re-run it to regenerate them:
 *
 *   pnpm --filter web exec tsx scripts/build-check-network-cover.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const require_ = createRequire(import.meta.url);
const fontFile = (pkg: string, file: string): Buffer => {
  const root = require_.resolve(`${pkg}/package.json`).replace(/package\.json$/, '');
  return readFileSync(`${root}files/${file}`);
};

const PAPER = '#f7f3ea';
const INK = '#10241b';
const MUTED = '#516257';
const RULE = '#dcd5c4';
const GREEN = '#1f5d3b';

const W = 1040;
const H = 1300; // 4:5, 2× the ~520px card slot

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, ...(children !== undefined ? { children } : {}) },
});

// One row = label + sublabel + a bar whose WIDTH encodes Mbps on a shared scale.
// scale: 640 Mbps spans 700px.
const px = (mbps: number) => Math.round((mbps / 640) * 700);

const row = (label: string, sub: string, bars: Array<{ w: number; fill: string }>, value: string, valueMuted = false) =>
  el('div', { display: 'flex', flexDirection: 'column', marginBottom: 58 }, [
    el('div', { display: 'flex', fontSize: 30, color: INK }, label),
    el('div', { display: 'flex', fontSize: 25, color: MUTED, marginTop: 4 }, sub),
    el('div', { display: 'flex', alignItems: 'center', marginTop: 16 }, [
      ...bars.map((b) => el('div', { display: 'flex', width: b.w, height: 30, backgroundColor: b.fill, borderRadius: 3, marginRight: 6 })),
      el('div', { display: 'flex', fontSize: 34, fontFamily: 'MonoLat, MonoCyr', color: valueMuted ? MUTED : INK, marginLeft: 14 }, value),
    ]),
  ]);

interface Copy {
  kicker: string;
  title: [string, string];
  sub: string;
  rows: Array<[string, string]>;
}
const COPY: Record<'ua' | 'en', Copy> = {
  ua: {
    kicker: 'МБІТ/С · ОДИН НОУТБУК',
    title: ['Куди дівся', 'мій гігабіт'],
    sub: 'Той самий ноутбук, три конфігурації.',
    rows: [
      ['Стіл, вай-фай', 'через екстендер · 5% втрат'],
      ['Поруч із роутером', 'той самий вай-фай · 0% втрат'],
      ['Стіл, кабель', 'в екстендер · 0% втрат'],
    ],
  },
  en: {
    kicker: 'MBPS · ONE LAPTOP',
    title: ['Where my gigabit', 'went'],
    sub: 'Same laptop, three setups.',
    rows: [
      ['Desk, Wi-Fi', 'through the extender · 5% loss'],
      ['Next to the router', 'same Wi-Fi · 0% loss'],
      ['Desk, cable', 'into the extender · 0% loss'],
    ],
  },
};

const buildTree = (c: Copy) =>
  el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: PAPER,
      color: INK,
      fontFamily: 'SerifCyr, SerifLat',
      padding: '84px 76px',
    },
    [
      el('div', { display: 'flex', fontSize: 22, fontFamily: 'MonoLat, MonoCyr', color: MUTED, letterSpacing: 3 }, c.kicker),
      el('div', { display: 'flex', fontSize: 68, fontWeight: 700, marginTop: 10, lineHeight: 1.1 }, c.title[0]),
      el('div', { display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.1 }, c.title[1]),
      el('div', { display: 'flex', fontSize: 28, color: MUTED, marginTop: 14, marginBottom: 56 }, c.sub),

      // The desk number never held still (75–190) — draw the RANGE, not one invented figure.
      row(c.rows[0]![0], c.rows[0]![1], [
        { w: px(75), fill: RULE },
        { w: px(190 - 75), fill: 'rgba(16,36,27,0.35)' },
      ], '75–190', true),

      row(c.rows[1]![0], c.rows[1]![1], [{ w: px(624), fill: 'rgba(16,36,27,0.72)' }], '624'),

      row(c.rows[2]![0], c.rows[2]![1], [{ w: px(492), fill: GREEN }], '492'),

      el('div', { display: 'flex', flexGrow: 1 }),
      el('div', {
        display: 'flex',
        borderTop: `2px solid ${RULE}`,
        paddingTop: 22,
        fontSize: 21,
        fontFamily: 'MonoLat, MonoCyr',
        color: MUTED,
        letterSpacing: 2,
      }, 'CHECK-NETWORK · LEARN-YY-SKILLS'),
    ],
  );

// Fontsource ships ONE SUBSET PER FILE, and satori does not fall back between two fonts
// registered under the SAME family name — it picks the first and renders .notdef for anything
// the subset lacks. Registering both PT Serif files as "PT Serif" therefore tofu'd every digit,
// Latin letter and comma (the Cyrillic subset has none of them). So each subset gets its OWN
// family name and the styles declare a fallback STACK, which satori does honour per glyph.
const FONTS = [
    { name: 'SerifCyr', data: fontFile('@fontsource/pt-serif', 'pt-serif-cyrillic-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'SerifCyr', data: fontFile('@fontsource/pt-serif', 'pt-serif-cyrillic-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'SerifLat', data: fontFile('@fontsource/pt-serif', 'pt-serif-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'SerifLat', data: fontFile('@fontsource/pt-serif', 'pt-serif-latin-700-normal.woff'), weight: 700, style: 'normal' },
  { name: 'MonoLat', data: fontFile('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'MonoCyr', data: fontFile('@fontsource/jetbrains-mono', 'jetbrains-mono-cyrillic-400-normal.woff'), weight: 400, style: 'normal' },
] as const;

for (const locale of ['ua', 'en'] as const) {
  const svg = await satori(buildTree(COPY[locale]) as never, { width: W, height: H, fonts: FONTS as never });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const out = `public/lab/check-network-cover${locale === 'en' ? '-en' : ''}.png`;
  writeFileSync(out, png);
  console.log(`wrote ${out} (${W}×${H}, ${(png.length / 1024).toFixed(0)} KB)`);
}
