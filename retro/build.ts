/**
 * Retro-games build: scans the original Turbo Pascal game folders, decodes the
 * CP866 sources to UTF-8 for the F3 viewer, compiles the ported games with
 * pas2js, and writes everything the Norton Commander lab page serves:
 *
 *   apps/web/public/retro/manifest.json      — the "file system" the NC renders
 *   apps/web/public/retro/src/<DIR>/<FILE>   — decoded original sources (F3)
 *   apps/web/public/retro/games/<slug>/      — per-game runnable bundle
 *                                              (index.html + <slug>.js + rtl.js)
 *
 * Everything under public/retro/ is COMMITTED: pas2js only exists locally
 * (built from FPC 3.2.2 sources — see retro/README.md), Railway just serves
 * the artifacts. Run from the repo root:
 *
 *   node retro/build.ts
 *
 * The original games live outside the repo (RETRO_GAMES_DIR, default
 * /Users/yarik/games). Ported sources + shims live in retro/ IN the repo —
 * the originals are never modified.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.dirname(import.meta.dirname);
const GAMES_DIR = process.env.RETRO_GAMES_DIR ?? '/Users/yarik/games';
const OUT_DIR = path.join(REPO_ROOT, 'apps/web/public/retro');
const PAS2JS = process.env.PAS2JS ?? 'pas2js';
/** pas2js RTL sources checkout matching the compiler (see retro/README.md). */
const PAS2JS_RTL = process.env.PAS2JS_RTL ?? '';

/** Which original folders appear in the NC, in panel order, with port status. */
interface GameDef {
  dir: string; // folder name under GAMES_DIR (and public/retro/src/)
  title: string; // human title for F1 help
  year: string;
  note: string; // one-liner for F1 help (what the program is)
  controls?: string; // shown before launch / in F1
  /** Ported programs of this folder: slug under public/retro/games/ + main .pas
   *  in retro/games/<dir>/ + the manifest file whose Enter launches it (for
   *  folders without .EXEs, e.g. the CARS sources). Any .EXE still launches
   *  the FIRST port (the folder default). */
  ports?: Array<{ slug: string; main: string; file?: string }>;
}

const GAMES: GameDef[] = [
  {
    dir: 'PINGPONG',
    title: 'Ping-Pong',
    year: '2005',
    note: 'Арканоїд: платформа, мʼяч і стіна блоків.',
    controls: '← → — рухати платформу · Esc — вийти',
    ports: [{ slug: 'pingpong', main: 'PINGPONG.pas' }],
  },
  {
    dir: 'PUSHKA',
    title: 'Пушка',
    year: '2008',
    note: 'Балістика: політ снаряда під кутом.',
    controls: 'введи кут/швидкість/координати + Enter · будь-яка клавіша — стоп · Esc — вийти',
    ports: [{ slug: 'pushka', main: 'PUSHKA.pas' }],
  },
  {
    dir: 'ANIMGAME',
    title: 'Cars',
    year: '2005',
    note: 'Текстові анімації: машинка ▲ і зорепад (CARS1/CARS2).',
    controls: '← → — рухати машинку · Esc — вийти',
    ports: [
      { slug: 'cars2', main: 'CARS2.pas', file: 'CARS/CARS2.PAS' },
      { slug: 'cars1', main: 'CARS1.pas', file: 'CARS/CARS1.PAS' },
    ],
  },
  {
    dir: 'SUPER',
    title: 'Super',
    year: '2008',
    note: 'Вавилонська бібліотека: перебір УСІХ рядків довжини n (47 символів).',
    controls: 'введи n + Enter (1–3 розумно, далі — вічність) · Esc — вийти',
    ports: [{ slug: 'super', main: 'SUPER.pas' }],
  },
  { dir: 'QUIDDITC', title: 'Quidditch', year: '2008', note: 'Квідич: RANDOM і SNITCH.' },
  { dir: 'BAKKARA', title: 'Бакара', year: '2005', note: 'Карткова гра проти компʼютера.' },
  { dir: 'FOOTBALL', title: 'Football', year: '2005–2009', note: 'Футбольний менеджер: NEWTEAM, MATCH, EMATCH.' },
  { dir: 'WARWORK', title: 'WarWork', year: '2005', note: 'Воєнна гра: літаки, прапори, WW2/WW3.' },
  { dir: 'STARWARS', title: 'Star Wars', year: '2005', note: 'За мотивами «Зоряних воєн».' },
  { dir: 'SAPER', title: 'Сапер', year: '2006', note: 'Мінер. Сорс лише C++ (SAPER.CPP) — pas2js не застосовний.' },
  { dir: 'game', title: 'game', year: '2005–2009', note: 'Олімпіадна задачка (теорія ігор, file I/O) — не гра.' },
];

/** Extensions treated as viewable text (decoded CP866 → UTF-8, served for F3). */
const TEXT_EXT = new Set(['.pas', '.bak', '.bat', '.txt', '.cpp', '.h', '.dat']);

// ---------------------------------------------------------------------------
// CP866 → Unicode. The high half (0x80–0xFF) of the DOS Cyrillic codepage;
// the low half is ASCII. Row 0x80: А–П, 0x90: Р–Я, 0xA0: а–п, 0xE0: р–я,
// 0xB0–0xDF: box-drawing, 0xF0+: Ё/ё, Є/є, Ї/ї, Ў/ў and symbols.
// ---------------------------------------------------------------------------
const CP866_HIGH: number[] = [
  0x0410, 0x0411, 0x0412, 0x0413, 0x0414, 0x0415, 0x0416, 0x0417,
  0x0418, 0x0419, 0x041a, 0x041b, 0x041c, 0x041d, 0x041e, 0x041f,
  0x0420, 0x0421, 0x0422, 0x0423, 0x0424, 0x0425, 0x0426, 0x0427,
  0x0428, 0x0429, 0x042a, 0x042b, 0x042c, 0x042d, 0x042e, 0x042f,
  0x0430, 0x0431, 0x0432, 0x0433, 0x0434, 0x0435, 0x0436, 0x0437,
  0x0438, 0x0439, 0x043a, 0x043b, 0x043c, 0x043d, 0x043e, 0x043f,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556,
  0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b, 0x2510,
  0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x255e, 0x255f,
  0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567,
  0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256b,
  0x256a, 0x2518, 0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580,
  0x0440, 0x0441, 0x0442, 0x0443, 0x0444, 0x0445, 0x0446, 0x0447,
  0x0448, 0x0449, 0x044a, 0x044b, 0x044c, 0x044d, 0x044e, 0x044f,
  0x0401, 0x0451, 0x0404, 0x0454, 0x0407, 0x0457, 0x040e, 0x045e,
  0x00b0, 0x2219, 0x00b7, 0x221a, 0x2116, 0x00a4, 0x25a0, 0x00a0,
];

function decodeCp866(buf: Buffer): string {
  let out = '';
  for (const b of buf) {
    if (b === 0x0d) continue; // CRLF → LF
    out += b < 0x80 ? String.fromCharCode(b) : String.fromCharCode(CP866_HIGH[b - 0x80]!);
  }
  return out;
}

// ---------------------------------------------------------------------------

interface ManifestFile {
  name: string;
  size: number; // original byte size, as DOS would report it
  mtime: string; // YYYY-MM-DD of the original file
  view: boolean; // has a decoded copy under src/<dir>/ for F3
}

function scanFolder(def: GameDef): { files: ManifestFile[] } {
  const abs = path.join(GAMES_DIR, def.dir);
  const files: ManifestFile[] = [];
  const walk = (rel: string) => {
    for (const entry of fs.readdirSync(path.join(abs, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(relPath);
        continue;
      }
      const st = fs.statSync(path.join(abs, relPath));
      const ext = path.extname(entry.name).toLowerCase();
      const view = TEXT_EXT.has(ext) && st.size <= 256 * 1024;
      if (view) {
        const dest = path.join(OUT_DIR, 'src', def.dir, relPath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, decodeCp866(fs.readFileSync(path.join(abs, relPath))));
      }
      files.push({
        name: relPath,
        size: st.size,
        mtime: st.mtime.toISOString().slice(0, 10),
        view,
      });
    }
  };
  walk('');
  return { files };
}

function compilePort(def: GameDef, port: { slug: string; main: string }): void {
  const srcDir = path.join(REPO_ROOT, 'retro/games', def.dir);
  const shims = path.join(REPO_ROOT, 'retro/shims');
  const outGame = path.join(OUT_DIR, 'games', port.slug);
  fs.mkdirSync(outGame, { recursive: true });
  if (!PAS2JS_RTL) {
    // No RTL checkout on this machine: keep the committed bundle as-is.
    if (fs.existsSync(path.join(outGame, `${port.slug}.js`))) {
      console.log(`~ ${port.slug}: PAS2JS_RTL not set — keeping the committed bundle`);
      return;
    }
    throw new Error(`${port.slug}: no committed bundle and PAS2JS_RTL is not set (see retro/README.md)`);
  }
  const main = path.join(srcDir, port.main);
  // -Ji INLINES the runtime into the bundle, and it must be the protocol-10501
  // rtl.js (retro/rtl.js, from the FPC 3.2.2 tree) — by ABSOLUTE path, or the
  // compiler silently picks the RTL checkout's own rtl.js (protocol 30200),
  // which compiles clean and dies at load with a null 'DoClassRef' (the
  // documented asymmetric-match trap; bit this build once already).
  execFileSync(
    PAS2JS,
    ['-Jc', `-Ji${path.join(REPO_ROOT, 'retro/rtl.js')}`, `-Fu${shims}`, `-Fu${srcDir}`, `-Fu${PAS2JS_RTL}/src`, '-Tbrowser', `-o${path.join(outGame, `${port.slug}.js`)}`, main],
    { stdio: 'inherit' },
  );
  console.log(`✓ ${port.slug}: compiled`);
}

function writeGameIndexHtml(def: GameDef, port: { slug: string; main: string }): void {
  const outGame = path.join(OUT_DIR, 'games', port.slug);
  fs.mkdirSync(outGame, { recursive: true });
  // The text-mode renderer draws glyphs with fillText — embed the IBM VGA face
  // as a data: URI (a sandboxed iframe has an opaque origin, so a cross-origin
  // font URL would need CORS headers the static host doesn't send).
  const woff = fs.readFileSync(path.join(OUT_DIR, 'fonts/WebPlus_IBM_VGA_8x16.woff')).toString('base64');
  // Self-contained bundle page. Esc inside the game posts `retro:quit` to the
  // parent so the NC can close the window; the game itself also reacts to Esc.
  const html = `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <title>${def.dir} — pas2js</title>
  <style>
    @font-face { font-family: 'IBM VGA'; src: url(data:font/woff;base64,${woff}) format('woff'); }
    html, body { margin:0; height:100%; background:#000; overflow:hidden; }
    body { display:flex; align-items:center; justify-content:center; }
    /* object-fit honours the canvas's INTRINSIC ratio — 640×480 for graphics
       mode, 640×400 once crt's text renderer resizes the backing store — so
       text cells are never stretched into 4:3. */
    canvas { image-rendering:pixelated; width:100vw; height:100vh; object-fit:contain; }
  </style>
</head>
<body>
  <canvas id="screen" width="640" height="480"></canvas>
  <script src="${port.slug}.js"></script>
  <script>
    addEventListener('load', function () { rtl.run(); });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape') parent.postMessage({ type: 'retro:quit' }, '*');
    });
    // The NC parent relays its keydowns here (retro:key): keyboard focus can sit
    // on the parent document (or an automation layer may not route into a
    // sandboxed frame), so direct input is not guaranteed. The synthetic event
    // feeds the crt shim's document-level listener exactly like a real key.
    addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'retro:key' && typeof d.key === 'string')
        document.dispatchEvent(new KeyboardEvent('keydown', { key: d.key }));
    });
  </script>
</body>
</html>
`;
  fs.writeFileSync(path.join(outGame, 'index.html'), html);
}

// ---------------------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(path.join(OUT_DIR, 'src'), { recursive: true, force: true });

const manifest = {
  generatedAt: new Date().toISOString().slice(0, 10),
  folders: GAMES.map((def) => {
    const { files } = scanFolder(def);
    console.log(`· ${def.dir}: ${files.length} files`);
    return {
      dir: def.dir,
      title: def.title,
      year: def.year,
      note: def.note,
      ...(def.controls ? { controls: def.controls } : {}),
      // `run` = the folder default (F6 / any .EXE); `runs` maps specific files
      // to their own port (folders whose programs never got compiled to .EXE).
      ...(def.ports?.length ? { run: def.ports[0]!.slug } : {}),
      ...(def.ports?.some((p) => p.file)
        ? { runs: Object.fromEntries(def.ports.filter((p) => p.file).map((p) => [p.file!, p.slug])) }
        : {}),
      files,
    };
  }),
};

for (const def of GAMES) {
  for (const port of def.ports ?? []) {
    compilePort(def, port);
    writeGameIndexHtml(def, port);
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`✓ manifest.json: ${manifest.folders.length} folders`);
