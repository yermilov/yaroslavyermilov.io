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

## Porting order (simplest → hardest)

PINGPONG ✓ → PUSHKA ✓ → ANIMGAME/CARS ✓ → SUPER ✓ → QUIDDITC → BAKKARA → FOOTBALL →
WARWORK → STARWARS. Not portable: SAPER (source is C++), game/GAME.PAS (an
olympiad exercise, not a game) — both still browsable in the NC.

The IBM VGA web font under `apps/web/public/retro/fonts/` is from The Ultimate
Oldschool PC Font Pack v2.2 by VileR (int10h.org), CC BY-SA 4.0.
