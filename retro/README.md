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

## Deep links: a URL that IS a game (2026-08-09)

Yarik: *"давай ще зробимо стабільні посилання типу щоб
…/retro-games/FOOTBALL/MATCH.EXE зразу запускало футбол"*.

`/{locale}/lab/retro-games/{DIR}/{FILE}/` opens the lab with that port already
running — 12 prerendered pages (6 runnable rows × 2 locales), from
`apps/web/src/pages/[locale]/lab/retro-games/[dir]/[...file].astro`. The island
takes an `autorun` pair and launches it once the manifest is in.

- **The segments are the REAL manifest names**, the same DOS folder and file you
  would select in the panels, so there is no second slug vocabulary to keep in
  sync and the URL reads like the thing it runs.
- **`[...file]` is a rest param on purpose:** ANIMGAME's runnable row is
  `CARS/CARS2.EXE`, i.e. one of the six names contains a slash.
- **The route and the panel share `runSlugFor`** (`@lib/retro-manifest`), so a
  link exists for exactly the rows the panel calls runnable. It was briefly
  duplicated in both files — don't reintroduce that; port a game, rebuild, and
  its link appears on its own.
- **The address bar is synced both ways** — launching a game by hand rewrites the
  URL to its deep link, quitting rewrites it back. That is what makes the links
  discoverable (you copy what you're looking at). Always `replaceState`, never
  `push`, so Back leaves the lab instead of replaying every game you opened.
- **Unlisted like the lab itself:** these pages pass `draft`, so they are
  `noindex` and out of the sitemap. Shareable by link, not discoverable.
- **`trailingSlash: 'always'`,** so the bare `…/MATCH.EXE` Yarik wrote is a 301
  to `…/MATCH.EXE/`. His link works; the address bar just gains one character.

⚠️ **Two traps if you touch this route**, both of which broke the build first:

1. **`getStaticPaths` is hoisted into its own module.** Helpers declared in the
   frontmatter are NOT in scope inside it — the build dies with a bare
   `X is not defined`. Everything it needs must be an import or inline.
2. **Do not resolve files via `import.meta.url` there.** The hoisted module runs
   from `dist/`, so a source-relative URL points at `dist/public/...` and throws
   ENOENT. Anchor on `process.cwd()` (the Astro project root under `pnpm build`).

## CSKA removed from the FOOTBALL roster (2026-08-08)

Yarik: *"remove cska russia from roster completely"*. The playable roster is now
**7 teams / 105 players / 7 stadiums / 3 countries**.

It removed cleanly because CSKA sat entirely at the **tail of every numbering**,
so nothing had to be renumbered — team **8**, stadium **8**, country **4**
(«Росія», used by no other club — the rest sit in countries 1-3), squad **106..120**
(referenced by no other `.fbt`, verified before deleting). The edit is therefore
four constants in `games/FOOTBALL/MATCH.pas` (`t/p/s/c`) plus 36 deleted data
files, 18 per language — `8.fbt`, `8.std`, `4.stt` and `106..120.fbp` in both
`data/` and `data.en/`.

- **Check the tail assumption before trusting it next time.** Dropping any team
  that is *not* last would require renumbering the `.fbp` files AND rewriting the
  player-index lists inside every surviving `.fbt` — a different job entirely.
- **The intro menu needs no layout work**, because its geometry is already
  `t`-driven: rows `RowOf+1..RowOf+t`, the hint at `RowOf+t+2`, the digit guard
  `code<=48+t`, and both arrow walks skip the excluded team. Only the two
  human-readable strings are hardcoded — the `1-8`→`1-7` hint and the header's
  team/player counts — plus the same two in `build.ts`'s `GameDef` (`note`,
  `controls`), which feed the NC's F1 panel.
- **The counts in that header were off by one before this change** and are now
  literal: it said "121 players" for `p+1`, which counts `0.fbp`, the empty
  placeholder the `.fbt` slots use for "no player". Real players were 120 (8×15);
  they are now 105 (7×15).
- **The F3 exhibit still contains CSKA, deliberately.** It is generated from the
  untouched originals in `RETRO_GAMES_DIR`, per Yarik's standing rule that the
  original sources stay byte-for-byte as the museum piece — the removal is from
  the *playable* roster.

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
| `MinDelayMs` | `shims/crt.pas` | 213 ms | every wait that rounds *below* the floor — i.e. the frame tick of CARS1, CARS2 (PINGPONG and FOOTBALL pin their own) |
| `DelayScale` | `shims/crt.pas` | 0.042667 | every wait *above* the floor — the long pauses, and QUIDDITC's per-iteration `Delay(60000)` |
| `frameMs` | `games/WARWORK/WW3.pas` | 45 ms | WARWORK's speed, and nothing else |
| per-game **pin** | that game's program body | WARWORK 0.004/20, FOOTBALL 0.216/1080, PINGPONG 0.028444/142 | overrides both globals for one bundle (see below) |

⚠️ **Three of the eight bundles are pinned, so "the globals" means the other
five** — `cars1`, `cars2`, `snitch`, `randommatch`, and `bakkara` (which has no
`Delay` call site at all and answers to nothing). Check with
`grep -o 'DelayScale = [0-9.]*' apps/web/public/retro/games/<g>/<g>.js`: a pinned
bundle prints the shim default *and then* its own pin, in that order.

⚠️ **PINGPONG's pin must move whenever the globals move.** It is deliberately one
1.5× step ahead of them, so if the globals are turned and the pin is left behind
the two silently converge and PINGPONG stops being faster than the rest. This
nearly happened on 2026-08-13, when one request moved the globals *and* named
PINGPONG in the same sentence. Invariant: **pin = globals ÷ 1.5.**

**A per-game pin is the fourth knob, and it is how a single game moves now.**
`DelayScale`/`MinDelayMs` are *typed constants* in `crt`, i.e. assignable `var`s
that `Delay` re-reads on every call — so assigning them in a program's own body
overrides the globals for that bundle alone, without touching the other seven.
WARWORK has done this since 2026-08-02 (pinning itself *out* of the global
slowdown); FOOTBALL joined on 2026-08-10 (pinning itself *further down* than the
global); PINGPONG joined on 2026-08-13 (pinning itself *up*, i.e. faster). Reach
for this whenever a request names one game.

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

**2026-08-08 — the third one, and it did arrive** ("make all games (except for
warwork) 2x more slower"), same two-number edit: 80 → **160** ms and 0.016 →
**0.032**. Measured live in the page rather than inferred — `max(ms*scale,floor)`
over the known call sites gave PINGPONG/CARS1/CARS2/FOOTBALL 160 ms and
QUIDDITC 1920 ms, i.e. exactly 2× the previous 80/960. WARWORK read back
0.004/20 at runtime (its own pin), BAKKARA still has zero `Delay` call sites.
The prediction above held, so treat a fourth request as likely.

The smoothness warning is now spent: **6.3 fps is not a frame rate**, and the
frame-paced games visibly step. That is the request honoured, not a defect — but
it means the NEXT complaint is more likely to be "jerky" than "fast", and the
answer to that one is `MinDelayMs` alone (see the note in `crt.pas`).

**2026-08-09 — the fourth** ("Зроби ще в два рази повільніше"), 160 → **320** ms
and 0.032 → **0.064**; measured 320 ms per frame tick and 3840 ms per QUIDDITC
iteration, again exactly 2×. Two things about this one:

- **It did NOT repeat "except for warwork".** Read as excluding WARWORK anyway —
  every earlier instruction puts it on the opposite side (it is the one game
  asked to get *faster*) and nothing said to reverse that. Flagged in the report
  rather than silently decided.
- **Doubling has now run out of road, and it is worth knowing why before doing
  it a fifth time.** For the frame-paced games one number is *both* "how slow"
  and "how often it draws" — they advance one step per frame — so this knob can
  only ever buy slowness by removing frames. At 320 ms PINGPONG's ball crosses a
  third of the playfield between draws, which is not slow motion, it is a
  slideshow, and it makes the game unplayable rather than easy. If "still too
  fast" comes back for those games specifically, the real fix is a smaller step
  per frame (fractional movement) in the game itself — a per-game gameplay edit,
  not a shim constant.

**2026-08-10 — the fifth request, and the first aimed at ONE game** («треба
зробити футбол ще на 50% повільнішим»). Not a fifth doubling, and deliberately
not the global knob: `MATCH.pas`'s program body now pins `MinDelayMs := 480` and
`DelayScale := 0.096` for its own bundle, 1.5× the globals, which stay 320/0.064
for everyone else.

- **FOOTBALL's tempo is `MinDelayMs` and nothing else.** Every `Delay` it takes
  is small — the commentary is `EMatch.Comment`'s `dur` of 0.75/0.85/0.95/1 s,
  the line-ups 1.5 s, two odd pauses of 1 s and 2 s — so at 0.064 they land on
  48…128 ms and *all* of them floor. The floor therefore IS the tempo, and +50%
  is exactly 320 → 480. `DelayScale` is scaled by the same 1.5 for completeness
  but is inert at these call sites (2000 × 0.096 = 192 < 480); it only matters if
  a longer pause is ever added.
- **The intro does not slow down, by design** — it runs on `FrameDelay` (real
  milliseconds, past both knobs), so the kick-off card still holds 1.4 s.
- **Why a pin and not the global:** 320 ms is already 3.1 fps, and for the
  frame-paced games (PINGPONG, both CARS) that number is *also* their draw rate,
  so moving it further makes them a slideshow. FOOTBALL is a text commentary the
  player only watches — it has no such ceiling, which is precisely why a
  game-specific request could be honoured when a global one could not.

**2026-08-11 — the same aim again** («все одно занадто швидко, зроби ще на 50%
повільніше»), so the pin goes 480 → **720** ms and 0.096 → **0.144**. Globals
untouched at 320/0.064 for the other seven bundles; `match.js` was the only
bundle whose emitted JS changed, which is the cheapest proof the aim held.

- **The request named no game, and was still read as FOOTBALL.** «Все одно»
  points at the thing last changed, and the three turns before it — Yarik's
  «зробити футбол ще на 50% повільнішим», the report, the match screenshot —
  are all football. Worth stating explicitly in the report rather than
  silently, because the same words would have meant the globals a week earlier.
- **A third turn of this knob is still free here, and that is a fact about
  FOOTBALL, not about the knob.** 720 ms is "how long a commentary line hangs",
  not a draw rate — nothing animates between lines. The frame-paced games have
  no such headroom and are why the globals must not follow.
- **Measured, not assumed:** a live Dynamo–Shakhtar match counted **16 waits
  locally and 35 on prod, every one 720 ms**, via the counted-timeout recipe
  below; PINGPONG reported 320/0.064 as the control on both. Read the pin out of
  the **running** bundle (`pas.crt.MinDelayMs`), not just the source — `build.ts`
  silently keeps the committed bundles when `PAS2JS_RTL` is unset, and that is
  the failure mode this check exists to catch.

**2026-08-13 — one sentence, two games, opposite directions** («тепер давай
зробимо футбол ще на 50% повільніше, а пінпонг - на 50% швидше»). FOOTBALL
720 → **1080** ms / 0.144 → **0.216**; PINGPONG takes its first pin, the globals
divided by the same 1.5 → **213** ms / **0.042667**. `match.js` and `pingpong.js`
were the only two bundles whose emitted JS changed.

- **This is the cleanest argument for pins there will ever be.** A single
  request moved two games in *opposite* directions, so no shared knob could have
  served it under any setting. When a request names games, the pins are not a
  stylistic preference — they are the only representable answer.
- **PINGPONG's tempo was also purely the floor.** Its one pacing call is
  `await(delay(duration*2))` in `BallWalking`, and `duration` = 15 (the 14th
  value in `data/OPTIONS.COD`), i.e. `delay(30)` → `round(30 × 0.064)` = 2 ms,
  far under the floor. So the floor *was* the frame period, and "50% faster" is
  320 / 1.5 = 213 ms — 3.1 → **4.7 fps**. Unlike FOOTBALL, the scale is *not*
  inert here: `delay(duration*500)` = 7500 on the Game Over screen cleared the
  floor at 480 ms, and now reads 320, so the whole game speeds up rather than
  just the frame.
- **Speeding a frame-paced game up is the safe direction, and the old warning
  does not apply to it.** Everything above about "3.1 fps is a slideshow" is
  about *slowing* PINGPONG/CARS: one number is both tempo and draw rate, so
  slowness can only be bought by dropping frames. Run the same knob the other
  way and both improve together — the ball moves less between draws *and* the
  draws come more often. The eventual floor is from below (`BallSpeed` = 30 px
  per frame is a coarse step to subdivide), not from here.
- ⚠️ **PINGPONG IS NO LONGER A VALID 320 ms CONTROL.** Every prior measurement
  in this file used it as the untouched baseline; it now reads 213/0.042667. Use
  **`snitch` or `cars1`** instead — both still on the globals, verified in the
  emitted JS. Using PINGPONG now would produce a plausible wrong number, which
  is exactly the failure this section keeps warning about.
  *(Superseded hours later — see the next entry. `snitch`/`cars1` moved too.)*

**2026-08-13, later the same day — the globals go DOWN for the first time**
(«чудово! тепер cars, pingpong, quiditch на 50% швидше»; the «чудово» is his
verdict on the 213 ms PINGPONG above). Globals 320/0.064 → **213/0.042667**, and
PINGPONG's pin 213/0.042667 → **142/0.028444**.

- **Here the shared knob WAS the right tool, and it is worth being precise about
  why that does not contradict the aim-the-request rule.** The named set — both
  CARS, both QUIDDITCH — is *exactly* the population still answering to the
  globals, because FOOTBALL, PINGPONG and WARWORK pin themselves and BAKKARA has
  no `Delay` call site. So turning the globals touched precisely the games that
  were named and nothing else. Pinning all four to identical values would have
  been the same edit written four times, leaving the globals serving nobody.
- **Dividing BOTH numbers is what makes it uniform, because the two named
  families sit on opposite branches of the `max`.** CARS floors (CARS1 is
  `delay(3000)` → 128 at the new scale, CARS2 is `delay(5000)` → 213, so both
  land on 213), while QUIDDITCH rides the scale (`delay(60000)`: 3840 → **2560**,
  and SNITCH's `delay(random(6)*5000)` straddles both). Halving the floor alone
  would have moved CARS and left QUIDDITCH at 3840 — the 2026-08-02 trap in
  reverse.
- ⚠️ **PINGPONG had to move in the same commit or the request would have been
  half-honoured, silently.** Its pin was 213 — the globals' *new* value. Left
  alone it would have converged with them and PINGPONG would not have sped up at
  all, while CARS and QUIDDITCH did. Two of three games would have changed and
  nothing would have looked wrong. Hence the invariant now stated at the top:
  **pin = globals ÷ 1.5.**
- **Measured locally:** CARS1 40 waits and CARS2 28 waits, **all 213 ms**;
  PINGPONG 37 waits **all 142 ms**; SNITCH 8 waits over two matches reading
  {213, 427, 640, 1067, 2560×4} — every value in the predicted set, with the
  per-iteration `Delay(60000)` at **2560 ms** (was 3840). Each is exactly 1.5×
  faster than the previous entry. Controls `warwork` (20/0.004) and `match`
  (1080/0.216) read unchanged.
- ⚠️ **Seven of eight bundles changed bytes, but only five changed BEHAVIOUR** —
  `match.js` and `warwork.js` differ solely in the shim default they embed, which
  their own pins immediately override. So "which bundles changed" stopped being
  the cheap proof it was in earlier entries; the runtime read (`pas.crt.*` on the
  live page) is what actually distinguishes them. Both were re-read to confirm
  their effective values did not move.
- **Two counted ZEROS this round, both genuine missing input, both diagnosed by
  one screenshot** — and one of them is a permanent property worth knowing:
  **CARS1's `delay(duration*3)` sits INSIDE `if (ch=75) or (ch=77)`**, i.e. it
  only fires while an arrow key is arriving, so an idle CARS1 counts nothing no
  matter how long you wait. SNITCH's zero was the `readln` prompt chain (two team
  names, then catcher-reaction numbers) blocking before any `Delay` ran.
- **QUIDDITCH matches can end in seconds**, as soon as a catcher takes the snitch
  — two runs here ended 150:0 and 0:150 almost immediately. A small sample there
  is the game being short, not the instrument failing; check the final line on
  screen before assuming a stall.

### The counted-timeout recipe (how to measure tempo at all)

⚠️ **Do NOT time a wait with a stopwatch.** A hidden tab clamps every timer to
~1000 ms and hands you a plausible wrong number. Measure the value the game
*asks for* instead, by counting it at the source. Paste this on the bundle's own
page — `/retro/games/<game>/index.html?lang=ua`, **not** the lab, which holds the
game in a sandboxed iframe the parent cannot reach (`SecurityError`):

```js
window.__c = []; let inD = false;
const oST = window.setTimeout, oD = pas.crt.Delay;
pas.crt.Delay = function (ms) { inD = true; const p = oD.call(this, ms); inD = false; return p; };
window.setTimeout = function (f, d, ...r) { if (inD) window.__c.push(d); return oST.call(window, f, d, ...r); };
// …play for a while, then:
// new Set(window.__c)  → should be exactly the pinned floor
```

Then read the pin out of the **running** bundle (`pas.crt.MinDelayMs`,
`pas.crt.DelayScale`) rather than the source, and **always take a control** — a
bundle you did *not* touch this round, measured in the same session, whose value
differs from the one you are claiming.

⚠️ **The control has to be re-picked every time, and it moved twice in one day.**
It was PINGPONG (320) for weeks; the first 2026-08-13 change pinned PINGPONG, so
it became `snitch`/`cars1`; the second change moved `snitch` and `cars1` too.
**There is no longer any bundle sitting at 320 at all.** The current stable
controls are the two nobody has asked to change: **`warwork` (20 ms)** and
**`match` (1080 ms)** — far apart, so a stuck reading is obvious. Before quoting
a control, confirm it is genuinely untouched by *this* round rather than
inherited from the last note.

⚠️ **A count of ZERO means your INPUT never landed — check the screen before you
believe it.** Measuring on prod, `computer`-driven keypresses did not reach the
game while the Chrome window was backgrounded (`visibilityState: 'hidden'`, even
though `document.hasFocus()` was `true`), so the team-select screen was still up
and there was nothing to count. The instrument was fine; the match had never
started. A screenshot said so in one step. The fix is to dispatch the keys in the
page instead — `document.dispatchEvent(new KeyboardEvent('keydown', {key, code,
keyCode, which, bubbles: true}))`, all three of keydown/keypress/keyup, which the
bundle's own `document` listener takes. Note this is the *opposite* failure to
the wall-clock trap below: hidden-tab clamping corrupts a *timing* reading but
leaves the counted value exact, so the recipe stays valid in a hidden tab — it is
only the keyboard that needs the workaround.

⚠️ **Measuring "did the animation stop?" — do NOT poll `getImageData`.** Two
traps cost a full investigation here. A sum-based pixel hash is blind to a
sprite *moving*, because translating the same pixels preserves the sum; and
polling `getImageData` over the whole 640×400 canvas in a tight loop starves the
render loop badly enough that the canvas really does freeze and the CDP eval
times out — you then "measure" a stall you caused. CARS2 was briefly, wrongly
suspected of hanging on both counts. **Two screenshots seconds apart** settled it
in one step: the sprites had moved. Use screenshots for liveness.

**WARWORK pins both globals back to 0.004/20 in its own program body** (they are
typed constants, i.e. assignable `var`s, and `Delay` reads them per call — not
captured at init). Same request asked for WARWORK to get *faster*, so leaving it
in the global slowdown would have doubled the very scene pauses of the one game
being sped up. Its speed is `frameMs` alone: 100 → 83 → 50 → 45 ms. Note a
speed-up is the period **divided**, not multiplied — +10% is 50/1.1 = 45.45 → 45.

The IBM VGA web font under `apps/web/public/retro/fonts/` is from The Ultimate
Oldschool PC Font Pack v2.2 by VileR (int10h.org), CC BY-SA 4.0.
