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
- **Russian removed** from all playable text. The **original F3-viewable sources
  are left byte-for-byte** as the historical exhibit — only the ported/playable
  text is localised, and editing `retro/games/` gives that for free (the F3
  viewer is generated from the untouched originals in `RETRO_GAMES_DIR`).
  Verify a game by RUNNING it in both `?lang=en` and `?lang=ua`.
  ⚠️ This line used to claim the job was finished when it was not — on
  2026-08-01 an audit found **109** Russian literals still live in
  `FOOTBALL/EMATCH.pas` (the whole match commentary; the engine was ported on
  28.07 and never got `uses nls`) plus PINGPONG's Options/Information screens,
  colour names and `data/README.HLP`. Don't trust this paragraph — re-run the
  check: a literal is suspect if it holds `ё ы э ъ`, and every Cyrillic literal
  in a port should sit inside a `Loc(...)` call.
  **A `const` array of strings cannot be localised in place** — `Loc` is a
  function call and Pascal forbids that in a constant initialiser. `Colors`
  (PINGPONG) and `Monthes` (EMATCH) became `case` functions instead.
  **Watch the 80-column centring.** `EMatch.Comment` positions text with
  `GotoXY(40 - Length(St) div 2, 7)`; an English string longer than 78 chars
  yields a negative column, the crt shim ignores the move, and the commentary
  lands on the scoreboard. Keep localised literals short — codex review caught
  three at 78-88 chars before they shipped.

## An un-awaited `async` call forks a second game loop (2026-08-01)

PINGPONG's reported bug was cosmetic — "the playfield background only fills to
y≈300, the previous screen shows through below it". The cause was not: **two
calls to `async` procedures had no `await`**, and each left a concurrent loop
running.

- `BallWalking(esc,nl)` in `Game` returned instantly with `esc=nl=false`, so
  `until (flag) or (not(esc))` fired on the first pass — `Game` returned to the
  menu while `BallWalking` kept running detached, still drawing the paddle.
- `ButtonPress(Choice)` in `MainMenu` meant the menu never waited for the game,
  so its clock and button repaints ran *during* play.

That composition is the whole symptom: the menu repaints everything with
`Bar(0,0,641,481)`, the orphaned `MakeBlocks` repaints only `0..300`, and the
menu stays visible below y=300. Each new launch added another loop — every draw
call arrived twice, and the game got faster each time.

**Reading the Pascal cannot find this.** The source looks right, and
`Bar(0,0,641,HeroY+25)` really is called. What found it was instrumenting the
shim in the browser and reading the call ORDER:

```js
const g = window.pas.graph, o = g.Bar;
g.Bar = (a,b,c,d) => { log.push(`Bar(${a},${b},${c},${d})`); return o(a,b,c,d); };
```

Identical consecutive draws = a duplicated loop. Zero duplicates over 162 frames
is the fixed state. **Audit every port the same way**: grep each `async`
routine's call sites and confirm each is inside `await(...)`. pas2js does not
warn — a dropped `await` compiles clean and only shows up as "the graphics are
weird".

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
  the loop. `EMATCH.pas`. (This entry used to end "The `N loaded` progress is
  authentic 1:1 and kept" — that decision was reversed on 2026-08-05, see below.)
- **SNITCH — "Team 1 black-on-black" (Medium): did NOT reproduce.** All three
  render paths (periodic status, goal, end-of-match) show Team 1's name + seeker
  line in normal lightgray; the text shim uses a uniform `fg=7`. Left unchanged
  rather than risk regressing a correct render — flagged back to Yarik.

## FOOTBALL's intro: where "authentic 1:1" was the wrong call (2026-08-05)

Yarik: *"intro screen for football is completely not user friendly can we re-do
it so it is more intuitive?"* — with a screenshot of `120 loaded` / `Preparing
for kickoff` and a bare `Team 1 (e.g. Dynamo)` box.

What he was looking at was **faithful**, and that is exactly why it was bad:

- **141 lines of `N loaded`.** 4 countries + 8 stadiums + **121 players** + 8
  teams, one `writeln` each, scrolling a 80×25 console for the whole load. The
  QA pass had explicitly kept this as authentic.
- **Two blind prompts.** The DOS original read the teams from `paramstr(1)` /
  `paramstr(2)`; the browser has no argv, so the port replaced them with
  `AskString`. That inherited the command line's one real flaw — you had to know
  the answer before you were asked — with **no list shown anywhere**, matching on
  the Latin code (`Dynamo`) rather than the name the game itself displays
  (`Динамо Київ`), case-sensitively.
- **A typo ended the run.** Any mismatch printed the DOS usage banner
  (`match {team1} {team2}`), listed the teams *then*, and `halt`ed — so the only
  way to see the valid answers was to get it wrong and relaunch the bundle.

Replaced in `games/FOOTBALL/MATCH.pas` with: a titled frame, **four progress
bars** in place of the 141 lines, and a **team menu** — 8 rows of
`code · display name · country`, arrows + Enter or a digit 1-8, with the home
team greyed out and skipped when picking the away side. Invalid input no longer
exists, so the `halt` branch went with it; a kickoff card (teams, stadium,
attendance) holds for a real 1.4 s before `EmulMatch` takes the screen.

Two mechanics worth reusing:

- **Bars are spaces with a background colour, not `█`.** `HandleWrite` paints a
  cell's background unconditionally and skips `fillText` for `' '`, so a bar
  drawn this way cannot depend on whether the IBM VGA font has a given block
  glyph. Box-drawing is the opposite case — `HighGlyph` maps only
  `179/191/192/196/217/218`, but a **literal** `┌ ─ ┐ │ └ ┘` in the UTF-8 source
  passes straight through (`chr(code)`), which is also why Cyrillic works.
- **The pause before kickoff is `FrameDelay`, not `Delay`.** A `Delay` there
  would be multiplied by `DelayScale` and lengthen every time Yarik asks for
  "slower" — the intro is chrome, not gameplay, and should not answer to the
  speed knobs at all.

This is the one place a port deliberately diverges from the original by more
than async/await. Note it is a **playability** decision, not a rewrite of the
exhibit: the F3 viewer is generated from the untouched originals in
`RETRO_GAMES_DIR`, so `~/games/FOOTBALL/MATCH.PAS` still shows the 2005 source
byte-for-byte.

## DelayScale is one linear knob — it breaks when a game's Delays span decades

WARWORK (2026-07-26, "any button I click my plane immediately crashes"): the
keypress was a red herring — the plane died ~1.5 s in with **no input at all**.
Its loop paces frames with `Delay(duration div 10)` = 100 ms (10 fps, the game's
real speed) while its death sequence waits `Delay(50000)`. At the DelayScale of
0.004 that keeps the 50-second wait bearable, the frame delay rounds to **0 ms**
and the loop free-runs at ~140 fps: the enemy plane matches your altitude and
fires before a human can react. Scaling *up* instead would make Game Over 20 s.

So one scale cannot serve a 500× spread. `crt.FrameDelay(ms)` is the way out — a
wall-clock delay DelayScale does not touch, for the ONE Delay in a game that is
its frame clock rather than a pause. Measured after: 9.4 fps, survives >28 s with
no input. **Check any other port whose per-frame Delay argument is small relative
to its longest one — the same trap is silent, it just looks like "hard game".**

Slowing a loop to authentic speed exposes a second thing: the shim's key queue was
unbounded, and the browser auto-repeats a held key at ~30/s (60 queued entries)
against 10 consumed per second — a 1-second hold became ~5 seconds of plane still
climbing after release. `Push` now caps the queue at 16 like the BIOS type-ahead
buffer did; the overhang is back under half a second.

## The three pacing knobs, and which game answers to which

Every wait a port takes is `max(round(ms * crt.DelayScale), crt.MinDelayMs)`,
**except** `crt.FrameDelay(ms)`, which is real milliseconds and answers to
neither. So there are exactly three knobs, and a speed request has to be aimed:

| knob | where | now | governs |
|---|---|---|---|
| `MinDelayMs` | `shims/crt.pas` | 80 ms | every wait that rounds *below* the floor — i.e. the frame tick of PINGPONG, CARS1, CARS2, FOOTBALL |
| `DelayScale` | `shims/crt.pas` | 0.016 | every wait *above* the floor — the long pauses, and QUIDDITC's per-iteration `Delay(60000)` |
| `frameMs` | `games/WARWORK/WW3.pas` | 45 ms | WARWORK's speed, and nothing else |

**Reaching for the floor alone is the trap.** 2026-08-02, "всіх інших ще в два
рази повільніше": doubling `MinDelayMs` 20 → 40 makes PINGPONG/CARS1/CARS2/
FOOTBALL exactly 2× slower, because for them the floor *is* the frame period —
but QUIDDITC (SNITCH, RANDOM) spends `Delay(60000)` **every iteration**, which is
240 ms at 0.004 and never touches any plausible floor. Floor-only would have
slowed those two bundles by **2%**. Doubling *both* numbers is what makes the 2×
uniform, since doubling the scale and the floor together doubles both branches of
that `max`. Measured, per call site: PINGPONG frame 20 → 40, CARS1 20 → 40,
CARS2 20 → 40, FOOTBALL commentary 20 → 40, QUIDDITC per iteration 293 → 587 ms
— all ×2.00. **BAKKARA has no `Delay` call site at all**, so no global knob can
slow it; it is turn-based on `readln` and there is nothing to pace.

**2026-08-05 — the identical request a second time** ("can we make all games
(except for warwork) 2x slower?"), answered with the identical two-number edit:
40 → **80** ms and 0.008 → **0.016**. WARWORK untouched (`frameMs` stays 45, and
its own pin keeps it out of both globals), BAKKARA again unreachable. Two things
worth carrying forward:

- **This request repeats; expect it to.** Yarik has now asked for a 2× slowdown
  twice in four days, so the next report may be a third. Don't re-derive the
  aiming each time — turn both numbers together and say up front that BAKKARA
  will not change, because it never does.
- **80 ms is where "slower" starts costing smoothness.** 12.5 fps is below the
  ~15 fps at which motion reads as continuous, so if the next feedback is
  *jerky* rather than *fast*, the fix is to lower `MinDelayMs` alone and leave
  `DelayScale` where it is — that slows the pauses and QUIDDITC without stepping
  the frame-paced games. Verified in the browser after the change: PINGPONG's
  menu, WARWORK's intro and a FOOTBALL match all still run.

**WARWORK pins both globals back to 0.004/20 in its own program body** (they are
typed constants, i.e. assignable `var`s, and `Delay` reads them per call — not
captured at init). Same request asked for WARWORK to get *faster*, so leaving it
in the global slowdown would have doubled the very scene pauses of the one game
being sped up. Its speed is `frameMs` alone: 100 → 83 → 50 → 45 ms. Note a
speed-up is the period **divided**, not multiplied — +10% is 50/1.1 = 45.45 → 45.

The IBM VGA web font under `apps/web/public/retro/fonts/` is from The Ultimate
Oldschool PC Font Pack v2.2 by VileR (int10h.org), CC BY-SA 4.0.
