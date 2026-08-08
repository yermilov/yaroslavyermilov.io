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

/** A UI string in both site locales (en default, ua). */
interface LocStr { en: string; ua: string }

/** Which original folders appear in the NC, in panel order, with port status. */
interface GameDef {
  dir: string; // folder name under GAMES_DIR (and public/retro/src/)
  title: string; // human title for F1 help
  year: string;
  note: LocStr; // one-liner for F1 help (what the program is)
  controls?: LocStr; // shown before launch / in F1
  /** Ported programs of this folder: slug under public/retro/games/ + main .pas
   *  in retro/games/<dir>/ + the manifest file whose Enter launches it. A `file`
   *  that isn't on disk is SYNTHESIZED as a cosmetic binary row (e.g. the CARS
   *  animations only ever existed as .PAS — the green CARS1.EXE/CARS2.EXE are
   *  minted so ANIMGAME reads like the truly-compiled folders; see scanFolder).
   *  Any .EXE still launches the FIRST port (the folder default). */
  ports?: Array<{ slug: string; main: string; file?: string }>;
}

const GAMES: GameDef[] = [
  {
    dir: 'PINGPONG',
    title: 'Ping-Pong',
    year: '2005',
    note: { ua: 'Арканоїд: платформа, мʼяч і стіна блоків.', en: 'Breakout: paddle, ball, wall of bricks.' },
    controls: { ua: '← → — рухати платформу · Esc — вийти', en: '← → move the paddle · Esc to exit' },
    ports: [{ slug: 'pingpong', main: 'PINGPONG.pas', file: 'PP.EXE' }],
  },
  {
    dir: 'ANIMGAME',
    title: 'Cars',
    year: '2005',
    note: { ua: 'Текстова анімація: кермуєш ▲ машинкою і ухиляєшся від зорепаду.', en: 'Text animation: drive the ▲ car and dodge the falling stars.' },
    controls: { ua: '← → — рухати машинку · Esc — вийти', en: '← → move the car · Esc to exit' },
    ports: [
      // The CARS animations were never compiled to an .EXE (sources only). Yarik
      // asked for a green CARS1.EXE/CARS2.EXE for visual consistency with the
      // other folders, so these `file`s are synthesized as cosmetic binary rows
      // (see scanFolder); the .PAS then stay as F3-viewable source.
      { slug: 'cars2', main: 'CARS2.pas', file: 'CARS/CARS2.EXE' },
      // No `file`, so no .EXE row: CARS2 IS CARS1 plus falling stars to dodge —
      // the same car, the same ← → driving, with obstacles added. So this is the
      // earlier, simpler cut of one animation rather than a second one, and the
      // folder shows the better version only. The .PAS stays F3-viewable and the
      // port still compiles; it is the panel that stops offering two.
      { slug: 'cars1', main: 'CARS1.pas' },
    ],
  },
  {
    dir: 'QUIDDITC',
    title: 'Quidditch',
    year: '2008',
    note: { ua: 'Квідичний матч-симулятор: a та s — голи, ловці полюють на снитч.', en: 'Quidditch match sim: a and s score, seekers hunt the snitch.' },
    controls: { ua: 'введи команди/ловців/числа + Enter · у SNITCH: a та s — голи · Esc — вийти', en: 'enter teams/seekers/numbers + Enter · in SNITCH a and s score · Esc to exit' },
    ports: [
      { slug: 'snitch', main: 'SNITCH.pas', file: 'SNITCH.EXE' },
      // No `file`, same reasoning: RANDOM is SNITCH with the player taken out.
      // Diffing the two sources gives SEVENTEEN differing lines out of ~140 —
      // SNITCH scores on a/s keypresses, RANDOM swaps that for a delay and asks
      // for team accuracy up front. One match simulator, one of them on autopilot.
      { slug: 'randommatch', main: 'RANDOM.pas' },
    ],
  },
  {
    dir: 'BAKKARA',
    title: 'Бакара',
    year: '2005',
    note: { ua: 'Карткова гра: ставка на гравця 1/2/нічию. Арт карт — реконструкція.', en: 'Card game: bet on player 1/2/draw. Card art is a reconstruction.' },
    controls: { ua: 'Enter · s/i/o/q у меню · f/s/n — ставка · Esc — вийти', en: 'Enter · s/i/o/q in the menu · f/s/n to bet · Esc to exit' },
    ports: [{ slug: 'bakkara', main: 'BAKKARA.pas', file: 'BAKKARA.EXE' }],
  },
  {
    dir: 'FOOTBALL',
    title: 'Football',
    year: '2005–2009',
    note: { ua: 'Симулятор матчу: 121 гравець, 8 команд. Голи, картки, коментар.', en: 'Match sim: 121 players, 8 teams. Goals, cards, commentary.' },
    controls: { ua: 'обери дві команди: ↑↓ + Enter або цифра 1-8', en: 'pick two teams: up/down + Enter, or press 1-8' },
    ports: [{ slug: 'match', main: 'MATCH.pas', file: 'MATCH.EXE' }],
  },
  {
    dir: 'WARWORK',
    title: 'WarWork',
    year: '2005',
    note: { ua: 'Екшн: літак проти зеніток і танків. Меню — мишею.', en: 'Action: a plane vs flak and tanks. Menu by mouse.' },
    controls: { ua: 'меню — миша · стрілки — рух · b бомба, r ракета · Esc — вийти', en: 'menu by mouse · arrows move · b bomb, r rocket · Esc to exit' },
    ports: [{ slug: 'warwork', main: 'WW3.pas', file: 'WW3.EXE' }],
  },
  // «STARWARS» (шутер K.Balitsky+A.Yakovenko — не Ярикова гра; юніти MENU_KB/ZASTAVA
  // втрачено як TPU-only, SVGA-256), «SAPER» (сапер/мінер, але C++/Win32 — не Pascal і
  // неграбельна) та «game» (олімпіадна задачка зі спортивного програмування, не гра)
  // прибрано на прохання Yarik.
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

// The original folders' mtimes are only partly trustworthy: git checkout / a re-copy
// reset a chunk of them to 2026-04-26 (PINGPONG, ANIMGAME, FOOTBALL are wholly
// reset), and some bundled DOS library files carry the TP compiler's own 1991–1998 date.
// Keep a file's real mtime only when its year sits in the games' plausible era; otherwise
// fall back to the folder's curated `year` so the panel never shows a copy/library date
// (Yarik: "why all dates switched to 2026?"). Real 2005–2008 dates (QUIDDITC/BAKKARA/WARWORK)
// are preserved.
function fileEra(mtime: Date, folderYear: string): string {
  const year = mtime.getFullYear();
  return year >= 2000 && year <= 2019 ? mtime.toISOString().slice(0, 10) : folderYear;
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
        mtime: fileEra(st.mtime, def.year),
        view,
      });
    }
  };
  walk('');
  // Synthetic .EXE rows for ports that were never compiled to a real executable.
  // The CARS text-animations only ever existed as .PAS sources; Yarik asked for a
  // green CARS1.EXE/CARS2.EXE in the panel so ANIMGAME reads like the other
  // (truly-compiled) folders. We mint a cosmetic binary entry — view:false, sized
  // and dated to sit believably next to its .PAS — that the manifest's `runs` map
  // launches; the .PAS stays viewable source (cyan), exactly like SNITCH.PAS next
  // to a real SNITCH.EXE. Only fires for a port `file` that is NOT on disk (real
  // .EXE folders skip this and use their genuine sizes/dates).
  for (const port of def.ports ?? []) {
    if (!port.file || files.some((f) => f.name === port.file)) continue;
    const src = files.find((f) => f.name === port.file!.replace(/\.exe$/i, '.PAS'));
    files.push({
      name: port.file,
      size: (src?.size ?? 0) + 3200, // synthetic — a small TP7 CRT .EXE's ballpark
      mtime: src?.mtime ?? def.year,
      view: false, // binary: F3 shows "preview unavailable", same as real .EXEs
    });
  }
  // ONE .EXE PER GAME in the panel (Yarik, twice: "each game/directory should have
  // only 1 exe file"). These folders are 20-year-old working directories, so they
  // carry drafts and leftovers beside the real binary — PINGPONG shipped SIX
  // (PP/PP1/BLOCKS10/PP10/SUPERCOD…), FOOTBALL three. Only the .EXE a port
  // actually declares survives; the rest are hidden from the listing.
  //
  // Per GAME, not per folder: ANIMGAME (CARS1+CARS2) and QUIDDITC (SNITCH+RANDOM)
  // are two games each and legitimately keep two. That is also why this filters on
  // the ports' own `file` set rather than "first .EXE wins" — the latter would have
  // silently swallowed a real second game.
  //
  // Display-only. Nothing is deleted from ~/games; the originals are untouched.
  const keepExe = new Set((def.ports ?? []).map((p) => p.file).filter(Boolean) as string[]);
  const isExe = (n: string) => n.toLowerCase().endsWith('.exe');
  const hidden = files.filter((f) => isExe(f.name) && !keepExe.has(f.name)).map((f) => f.name);
  if (hidden.length > 0) {
    console.log(`  · ${def.dir}: hiding ${hidden.length} extra .EXE (${hidden.join(', ')})`);
  }
  const kept = files.filter((f) => !isExe(f.name) || keepExe.has(f.name));
  kept.sort((a, b) => a.name.localeCompare(b.name));
  return { files: kept };
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
  // Games that read their screens/art from DOS data files (BAKKARA) ship them
  // inlined: retro/games/<DIR>/data/* becomes window.__retroFiles, a
  // {basename: [lines]} map the tpfiles shim resolves paths against (the
  // sandboxed iframe is opaque-origin — it cannot fetch, same as the font).
  // A game's DOS data files are inlined as window.__retroFiles (basename→lines).
  // Localised games add a sibling `data.en/` dir holding the English versions of
  // the text screens; those go into window.__retroFilesEn, and the tpfiles shim
  // returns the EN copy when window.__retroLang==='en'. `data/` stays the base
  // (Ukrainian) set, so language-neutral files (card art) need no EN override.
  const readDataDir = (dir: string): Record<string, string[]> => {
    const files: Record<string, string[]> = {};
    for (const name of fs.readdirSync(dir).sort()) {
      const body = fs.readFileSync(path.join(dir, name), 'utf8');
      // An empty file has ZERO lines (Eof at once), not one empty line.
      files[name.toLowerCase()] = body === '' ? [] : body.replace(/\n$/, '').split('\n');
    }
    return files;
  };
  const dataDir = path.join(REPO_ROOT, 'retro/games', def.dir, 'data');
  let dataScript = '';
  if (fs.existsSync(dataDir)) {
    const files = readDataDir(dataDir);
    const enDir = path.join(REPO_ROOT, 'retro/games', def.dir, 'data.en');
    const enScript = fs.existsSync(enDir)
      ? ` window.__retroFilesEn = ${JSON.stringify(readDataDir(enDir))};`
      : '';
    dataScript = `  <script>window.__retroSlug = ${JSON.stringify(port.slug)}; window.__retroFiles = ${JSON.stringify(files)};${enScript}</script>\n`;
  }
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
  <script>
    // The NC lab launches this frame as index.html?lang=en|ua; the nls shim
    // reads window.__retroLang to pick each game's language. Default 'ua' (the
    // site's default locale) when the param is absent.
    window.__retroLang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ua';
  </script>
${dataScript}  <script src="${port.slug}.js"></script>
  <script>
    // Wait for the embedded VGA face before the program draws: graph-mode text
    // rasterises through canvas fillText, and a first draw against the fallback
    // font leaves differently-shaped "ghost" pixels the game never overdraws.
    addEventListener('load', function () {
      document.fonts.load("16px 'IBM VGA'").then(function () { rtl.run(); }, function () { rtl.run(); });
    });
    // tpfiles' halt/RTE end the program by throwing through the async chain —
    // an INTENDED exit, not a bug; keep it out of the console.
    addEventListener('unhandledrejection', function (e) {
      var m = e.reason && e.reason.message || '';
      if (m === 'halt' || m.indexOf('TP runtime error') === 0) e.preventDefault();
    });
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
      // to their own port (incl. the synthesized CARS .EXEs, see scanFolder).
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
