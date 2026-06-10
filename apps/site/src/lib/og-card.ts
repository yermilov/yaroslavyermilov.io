/**
 * Build-time social-card renderer (satori → resvg → PNG), drawing each card
 * in the Field Journal identity: paper ground, green top rule, spine + square
 * ledger node, mono eyebrow, serif title, and a giant low-ink «Є» watermark.
 *
 * Newsreader has no Cyrillic subset, so UA titles render in PT Serif — the
 * same graceful degradation the live site gets from its serif font stack.
 * Dingbat glyphs (✎ ❖ ✧) are avoided: satori only sees the loaded fonts.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { Locale } from '@lib/i18n';

export interface OgCard {
  /** filename stem under /og/, e.g. "post-mcp-considered-harmful" */
  id: string;
  language: Locale;
  /** mono label line, already uppercase, e.g. "POST · 27 APR 2026" */
  eyebrow: string;
  title: string;
}

const PAPER = '#f7f3ea';
const INK = '#10241b';
const INK_MUTED = '#516257';
const RULE = '#dcd5c4';
const GREEN = '#1f5d3b';
const ORANGE = '#d9621b';

const require_ = createRequire(import.meta.url);

function fontFile(pkg: string, file: string): Buffer {
  const pkgRoot = require_.resolve(`${pkg}/package.json`).replace(/package\.json$/, '');
  return readFileSync(`${pkgRoot}files/${file}`);
}

interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

let fontsCache: SatoriFont[] | null = null;
function loadFonts(): SatoriFont[] {
  fontsCache ??= [
    { name: 'Newsreader', data: fontFile('@fontsource/newsreader', 'newsreader-latin-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'Newsreader', data: fontFile('@fontsource/newsreader', 'newsreader-latin-ext-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'PT Serif', data: fontFile('@fontsource/pt-serif', 'pt-serif-cyrillic-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'PT Serif', data: fontFile('@fontsource/pt-serif', 'pt-serif-latin-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'JetBrains Mono', data: fontFile('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'JetBrains Mono', data: fontFile('@fontsource/jetbrains-mono', 'jetbrains-mono-cyrillic-400-normal.woff'), weight: 400, style: 'normal' },
  ];
  return fontsCache;
}

let avatarCache: string | null = null;
function avatarDataUri(): string {
  if (!avatarCache) {
    // import.meta.url points into dist/ in the built bundle, so resolve from
    // the Astro project root (cwd during `astro build`), with a repo-root
    // fallback for scripts run from the workspace top level.
    let buf: Buffer;
    try {
      buf = readFileSync('public/home/avatar.jpg');
    } catch {
      buf = readFileSync('apps/site/public/home/avatar.jpg');
    }
    avatarCache = `data:image/jpeg;base64,${buf.toString('base64')}`;
  }
  return avatarCache;
}

/** satori element helper — plain object tree instead of JSX */
function el(type: string, style: Record<string, unknown>, children?: unknown, extra?: Record<string, unknown>) {
  return { type, props: { style, ...(extra ?? {}), ...(children !== undefined ? { children } : {}) } };
}

function titleFontSize(title: string): number {
  if (title.length > 90) return 56;
  if (title.length > 50) return 68;
  return 84;
}

export async function renderOgCard(card: OgCard): Promise<Uint8Array> {
  const serif = card.language === 'ua' ? 'PT Serif' : 'Newsreader';

  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: PAPER,
      borderTop: `12px solid ${GREEN}`,
      position: 'relative',
      fontFamily: serif,
    },
    [
      // «Є» watermark — the favicon mark, oversized and almost off the page
      el(
        'div',
        {
          position: 'absolute',
          right: -36,
          bottom: -210,
          fontSize: 560,
          fontFamily: 'PT Serif',
          fontWeight: 700,
          color: 'rgba(31, 93, 59, 0.07)',
        },
        'Є',
      ),
      // main row: spine rail + content
      el(
        'div',
        { display: 'flex', flexGrow: 1, padding: '64px 72px 56px', gap: 36 },
        [
          // spine with square ledger node
          el(
            'div',
            { display: 'flex', width: 28, position: 'relative', flexShrink: 0 },
            [
              el('div', {
                position: 'absolute',
                left: 13,
                top: 8,
                bottom: 0,
                width: 2,
                backgroundColor: RULE,
              }),
              el('div', {
                position: 'absolute',
                left: 3,
                top: 92,
                width: 22,
                height: 22,
                backgroundColor: GREEN,
                border: `4px solid ${PAPER}`,
                transform: 'rotate(45deg)',
              }),
            ],
          ),
          // content column
          el(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flexGrow: 1,
              minWidth: 0,
            },
            [
              el('div', { display: 'flex', flexDirection: 'column' }, [
                el(
                  'div',
                  {
                    fontFamily: 'JetBrains Mono',
                    fontSize: 27,
                    letterSpacing: 2,
                    color: GREEN,
                  },
                  card.eyebrow,
                ),
                el(
                  'div',
                  {
                    marginTop: 30,
                    fontSize: titleFontSize(card.title),
                    fontWeight: 700,
                    lineHeight: 1.12,
                    letterSpacing: '-0.015em',
                    color: INK,
                    lineClamp: 4,
                  },
                  card.title,
                ),
              ]),
              // footer: avatar · name · domain
              el(
                'div',
                { display: 'flex', alignItems: 'center', gap: 22 },
                [
                  el(
                    'img',
                    { width: 64, height: 64, borderRadius: 64 },
                    undefined,
                    { src: avatarDataUri() },
                  ),
                  el(
                    'div',
                    { fontSize: 30, fontWeight: 700, color: INK },
                    card.language === 'ua' ? 'Ярослав Єрмілов' : 'Yaroslav Yermilov',
                  ),
                  el(
                    'div',
                    {
                      fontFamily: 'JetBrains Mono',
                      fontSize: 24,
                      color: INK_MUTED,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    },
                    [
                      // square ledger node as the separator — drawn, not a glyph,
                      // since the mono woff subsets lack arrow codepoints
                      el('div', {
                        width: 11,
                        height: 11,
                        backgroundColor: ORANGE,
                        transform: 'rotate(45deg)',
                      }),
                      el('div', {}, 'yaroslavyermilov.io'),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );

  // satori's types want React nodes; the plain-object tree is the documented
  // runtime shape for JSX-free usage.
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: loadFonts(),
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  // Copy into a fresh ArrayBuffer-backed view so the result satisfies BodyInit
  // (Node Buffers are typed over ArrayBufferLike, which Response rejects).
  const out = new Uint8Array(new ArrayBuffer(png.byteLength));
  out.set(png);
  return out;
}
