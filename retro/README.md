# retro/ — the Turbo Pascal games toolchain

My 2005–2009 school games, recompiled to JavaScript with **pas2js** (no
emulator) and served by the Norton Commander lab page
(`/{locale}/lab/retro-games/`, unlisted).

## Layout

- `shims/` — browser implementations of the DOS units the games use.
  `graph.pas` is a real palette-indexed 640×480 framebuffer with integer
  rasterisers (the games read pixels back for collisions and erase sprites via
  FloodFill — Canvas2D anti-aliasing would break them). `crt.pas` makes `Delay`
  awaitable (JS cannot block) and reproduces DOS's two-call extended-key
  protocol for ReadKey.
- `games/<DIR>/` — the ported main source per game. The diff against the
  original is kept to async/await annotations around the busy-wait loop
  (PINGPONG: four lines).
- `build.ts` — `node retro/build.ts` regenerates everything under
  `apps/web/public/retro/`: the NC manifest (real file names/sizes/dates from
  the original folders), the CP866→UTF-8 decoded sources for the F3 viewer,
  and the per-game runnable bundles.
- `rtl.js` — the canonical pas2js RUNTIME (protocol 10501, from the FPC 3.2.2
  tree, `utils/pas2js/dist/rtl.js`). build.ts INLINES it into every game
  bundle via `-Ji` by absolute path — never let the compiler find one by
  search, or it silently picks the RTL checkout's own rtl.js (protocol 30200)
  and the bundle dies at load with a null 'DoClassRef'.

## Rebuilding a game

`pas2js` is local-only (Railway just serves the committed artifacts). The
binary was compiled from FPC 3.2.2 sources (`utils/pas2js/pas2js.pp`) —
compiler version 1.5.1, RTL protocol 10501 — and lives at
`/opt/homebrew/bin/pas2js`. The RTL **.pas units** come from the pas2js 3.2.0
darwin release zip (they compile fine under the 1.5.1 compiler — the version
match only binds `rtl.js`):

    curl -sfL -o pas2js.zip https://getpas2js.freepascal.org/downloads/darwin/pas2js-darwin-aarch64-current.zip
    unzip -q pas2js.zip -d pas2js-rtl
    # units dir: pas2js-rtl/pas2js-darwin-aarch64-*/packages/rtl

    RETRO_GAMES_DIR=/Users/yarik/games \
    PAS2JS_RTL=<that packages/rtl dir> \
    node retro/build.ts

Without `PAS2JS_RTL` the script keeps the committed bundles and only refreshes
the manifest + decoded sources. ⚠️ Asymmetric match rule: the 3.2.0 zip's
SOURCE units are fine, but its `rtl.js` is NOT — the runtime must match the
compiler's protocol (1.5.1 → 10501; the canonical copy is `retro/rtl.js`,
inlined into bundles by build.ts). A mismatched rtl.js compiles clean and dies
at runtime (null `$impl` / null 'DoClassRef') — verify by RUNNING, compilation
proves nothing.

⚠️ pas2js dead-code elimination is PER-PROGRAM and cannot see `asm` blocks: a
shim function referenced only from asm (e.g. `pas.crt.KeyPressed` in a drain
loop) is silently stripped from any game that never calls it from Pascal, and
that bundle crashes at runtime while every other game works. Pin such symbols
with a real Pascal reference in the unit's `initialization` (see crt.pas), and
test EVERY port's bundle, not just the one you were working on — QUIDDITC's
RANDOM crashed at its first prompt while SNITCH ran fine, same crt unit.

## Bilingual EN/UA (localization)

Every game is bilingual, switched by the **site locale** (the NC gets `locale`
and launches each game as `index.html?lang=en|ua`; build.ts sets
`window.__retroLang` from that query param before the bundle runs).

- **Inline literals** → the `nls` shim: `Loc('English','Українською')` returns
  the string for the active language (`GameLang` is the raw `'en'`/`'ua'`). A
  game only `uses nls` when it shows text, so graphical-only ports stay
  byte-identical. NB: the selector is **`Loc`**, not `T` — a bare `T` parses as
  a generic type param in pas2js and won't compile.
- **Data-file games** (BAKKARA, FOOTBALL) → a sibling **`data.en/`** dir holds
  the English versions of the text screens; build.ts inlines it as
  `window.__retroFilesEn`, and the tpfiles shim returns the EN copy when
  `__retroLang==='en'`, else the base. `data/` is the **Ukrainian base**;
  language-neutral files (BAKKARA card art, FOOTBALL numeric stats) need no
  override. Keep the fixed line counts the read loops expect (BAKKARA screens
  23/5; FOOTBALL FBP/FBT/STD/STT layout).
- **NC chrome** (`NortonCommander.tsx`) uses a `t(ua, en)` helper; the F1
  `note`/`controls` are `{en, ua}` in build.ts's `GameDef` and flow through the
  manifest. Game **titles** stay as their proper names (WarWork, BAKKARA, Пушка).
- **Synthetic CARS .EXEs** — the CARS animations only ever existed as `.PAS`
  sources (never compiled), so ANIMGAME used to show a green `.PAS`. For visual
  consistency with the other folders (green `.EXE` runs, cyan `.PAS` views),
  build.ts's `scanFolder` mints cosmetic `CARS1.EXE`/`CARS2.EXE` rows for any
  port `file` absent from disk (`view:false`, size/date mirrored off the sibling
  `.PAS`); the `runs` map then launches those. Cosmetic-only — no real binary.
- **Russian removed** from all playable text (QUIDDITC commentary, BAKKARA,
  FOOTBALL were Russian; the rest were Ukrainian/English). The **original
  F3-viewable sources are left byte-for-byte** as the historical exhibit — only
  the ported/playable text is localised. Verify a game by RUNNING it in both
  `?lang=en` and `?lang=ua`.

## Porting order (simplest → hardest)

PINGPONG ✓ → PUSHKA ✓ → ANIMGAME/CARS ✓ → SUPER ✓ → QUIDDITC ✓ → BAKKARA ✓ → FOOTBALL ✓ →
WARWORK ✓ — the plan's port list is COMPLETE (8 runnable ports). Three source
folders were REMOVED from the lab at Yarik's request — none is his Pascal game /
none is portable — so they no longer appear in the NC (their rationale kept here):
- SAPER — the exe is Win32, the source is C++ (not a TP game at all);
- game/GAME.PAS — an olympiad exercise, not a game;
- STARWARS — not Yarik's game (its header credits Kostia Balitsky and Anton
  Yakovenko), and two of its units (MENU_KB — an OO menu framework the whole
  UI builds on — and ZASTAVA) survive only as compiled .TPUs in every copy
  incl. the Noah's Ark backup; it also targets 800×600 SVGA-256 via
  svga256m.bgi, beyond this shim's faithful 640×480×16 framebuffer.
  Reconstructing lost units of someone else's game is invention, not porting.
  (Removed 2026-07-20 at Yarik's request — "not mine".)

## QA pass (2026-07-22) — play-tested every game, fixed the bugs

A play-through of all 8 ports (Codex, via the Chrome controller) surfaced six
issues; five were real and are fixed (the per-file `РЕМОНТ` comments carry the
detail), one did not reproduce:

- **PINGPONG — top-wall deadlock (was: High).** `Udar` bounced the ball off the
  left/right/bottom walls but had **no top edge** — once a top-row block was
  knocked out, a ball climbing through the gap left `y<0`, no `Udar` condition
  ever fired again, and the game froze with the ball gone. Added the missing
  top wall (mirrors the bottom one). `PINGPONG.pas`.
- **BAKKARA — balance 0 + first bet key eaten (was: High).** `write_bal` printed
  an uninitialised local `bal` (always 0) instead of its `bals` param → fixed to
  show the real 500; and a stray `ReadKey` swallowed the first f/s/n keypress →
  removed. Now a fresh player sees 500 and can bet immediately. `BAKKARA.pas`.
  (These were preserved as "authentic quirks" before; Yarik's plan asks for
  *playable*, so they're now repaired — the byte-identical original stays the F3
  exhibit.)
- **WARWORK — mouse menu unreachable via click (was: High).** The `mouse` shim
  read only `e.buttons`, which synthetic click injectors leave `0`, and it
  sampled the button only at the menu loop's discrete poll points. Rewrote it to
  latch by button **index** on down/up with a ~140 ms release grace, so real and
  programmatic clicks are both caught. `shims/mouse.pas` (affects WARWORK only).
- **NC "6 Run" ran the folder default, not the selection (was: Medium).** The F6
  handler called `tryRun(folder)` with no file, so selecting RANDOM.EXE launched
  SNITCH. Now passes `files[fileIdx]`. `NortonCommander.tsx`.
- **FOOTBALL — duplicate stadium greeting (was: Low).** "Welcome to the stadium…"
  sat inside the per-half loop (`HalfEnd=2`) so it printed twice; moved it before
  the loop. The `N loaded` progress is authentic 1:1 and kept. `EMATCH.pas`.
- **SNITCH — "Team 1 black-on-black" (Medium): did NOT reproduce.** All three
  render paths (periodic status, goal, end-of-match) show Team 1's name + seeker
  line in normal lightgray; the text shim uses a uniform `fg=7`. Left unchanged
  rather than risk regressing a correct render — flagged back to Yarik.

The IBM VGA web font under `apps/web/public/retro/fonts/` is from The Ultimate
Oldschool PC Font Pack v2.2 by VileR (int10h.org), CC BY-SA 4.0.
