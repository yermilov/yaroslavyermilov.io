---
name: yaroslavyermilov.io — Tactile Workbench
description: Paper-and-ink editorial field journal — forest green + burnt orange, serif reading surface.
colors:
  paper: "#f7f3ea"
  elevated: "#fbf8f1"
  ink: "#10241b"
  ink-muted: "#516257"
  rule: "#dcd5c4"
  green-primary: "#1f5d3b"
  green-deep: "#0f3a23"
  green-soft: "#cfe2d4"
  orange-accent: "#d9621b"
  orange-bright: "#f08a3c"
  orange-soft: "#f6dac1"
typography:
  display:
    fontFamily: "Newsreader Variable, Newsreader, ui-serif, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Newsreader Variable, Newsreader, ui-serif, Georgia, serif"
    fontSize: "1.075rem"
    fontWeight: 400
    lineHeight: 1.65
  mono:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.92em"
    fontWeight: 400
rounded:
  focus: "2px"
  code: "6px"
spacing:
  s1: "0.5rem"
  s2: "0.75rem"
  s3: "1.25rem"
  s4: "2rem"
  s5: "3.25rem"
  s6: "5.25rem"
components:
  link:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  link-hover:
    backgroundColor: "{colors.orange-soft}"
    textColor: "{colors.green-deep}"
  code-inline:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.code}"
  code-block:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.code}"
    padding: "1.25rem"
---

## Overview

**The Tactile Workbench — a bound field journal, not a product page.** The system
reads like a well-made paper notebook: warm off-white stock, dark forest-ink text,
a burnt-orange pen for emphasis, and a mono hand for dates and machinery. The
design *is* the argument that the maker sweats details, so restraint and
craft outrank spectacle. Sustained reading is the primary act; interactivity earns
its place rather than crowding the page.

One identity spans every surface (blog, labs) via a single shared token set
(`@yermilov/shared-tokens`), so the site reads as one volume even where the lab
surface turns louder. Both light and dark are hand-tuned and driven by
`prefers-color-scheme` — light by day, a deeper palette by night; the `.theme-lab`
surface takes an even louder dark variant.

**Not** a generic dark-hero dev portfolio, a corporate SaaS landing (no all-caps
eyebrow kickers on every section, no feature grids), and never the saturated
purple/glassmorphism AI look. When in doubt: quieter and more editorial.

## Colors

Warm neutrals carry the page; two brand hues do the work. **Green is structural**
(primary voice, links-in-earnest, the «Є» identity); **orange is the accent** — the
pen you underline with, ≤10% of the surface.

- **paper `#f7f3ea` / elevated `#fbf8f1`** — the reading stock and a slightly
  lifted card/code surface.
- **ink `#10241b` / ink-muted `#516257`** — near-black forest ink for body; muted
  sage for secondary text, captions, mono date stamps.
- **rule `#dcd5c4`** — hairline rules, borders, the timeline spine.
- **green-primary `#1f5d3b` / green-deep `#0f3a23` / green-soft `#cfe2d4`** —
  primary brand green, its pressed/hover deepening, and a soft tint for fills.
- **orange-accent `#d9621b` / orange-bright `#f08a3c` / orange-soft `#f6dac1`** —
  link underlines, selection, focus ring; bright for hover life; soft for
  hover/selection wash.

**Dark mode** (`prefers-color-scheme: dark`) inverts to `paper #0f1410`,
`ink #e8e4d8`, and brighter, lower-saturation brand hues
(`green-primary #5fb682`, `orange-accent #ff9248`) so contrast holds on the deep
surface. The `.theme-lab` dark surface goes deeper still (`paper #0a120d`, neon-ish
`green-primary #7af0a3`). Hex above is the light-mode canonical value; dark values
live in `packages/shared-tokens/tokens.css`.

## Elevation

**Flat and paper-first — tonal layering, not shadows.** Depth comes from a single
step of surface tone (`paper` → `elevated`) plus `1px` hairline `rule` borders, not
from drop shadows. The one intentional glow is the **focus ring**
(`0 0 0 3px` orange-accent at ~55% via `color-mix`), which is functional, not
decorative. Radii stay minimal: `2px` on focus, `6px` on code blocks; the surface
otherwise favors crisp edges and rules over rounded cards.

## Components

- **Link** — inherits ink color, sits on a `1.5px` orange-accent bottom border with
  `4px` underline offset. **Hover** washes `orange-soft` behind it and shifts text
  to `green-deep` (in dark mode, to `ink`). Links are a deliberate, visible mark,
  not invisible-until-hover.
- **Selection & focus** — `::selection` uses `orange-soft` / `green-deep`;
  focus-visible on links, buttons, inputs, and `[tabindex]` shows the orange focus
  ring with a `2px` radius. Always-visible focus is a requirement, not an option.
- **Inline code / pre** — `JetBrains Mono` at `0.92em` on the `elevated` surface
  with a `rule` border; `pre` blocks add `6px` radius, `1.25rem` padding, and
  horizontal scroll. Code is the "machinery" voice alongside the serif reading hand.
- **Rules & timeline** — `hr` and the Timeline spine are `1px` `rule` lines; mono
  date stamps and serif year milestones structure the Field Journal "volumes".
- **Reading measure** — body text is capped at `~68ch` (`--measure`) at
  `1.075rem` / `1.65` line-height for comfortable long-form reading.
  ⚠️ `--measure` is in `ch`, and `ch` re-resolves against **each element's own
  font-size** — `max-width: var(--measure)` on an `h1` at `2.85rem` is ~1700px,
  i.e. no cap at all. Put it on a container that is in body type (that is what
  `.prose-column` is), or subtract from `100%` in the container's own units.
- **Companion figure** — a tall portrait image (a phone screenshot) that
  accompanies the text rather than illustrating the full measure. Marked
  `<figure class="post-aside">` in the post body; below `60rem` it stays in the
  flow, capped to phone width; from `60rem` the header and body widen by exactly
  one aside column (`19rem` + `--space-5`) and the figure **floats** into it. It
  floats rather than taking a grid column on purpose: a grid row ties the
  figure's height to whichever block shares its row, opening a screen of dead
  space under that block. Source order is never changed for it, so the stacked
  reading order — and what a screen reader hears — stays the author's.

## Do's and Don'ts

- **Do** lead with typography and the paper surface; let the serif and the measure
  do the work before reaching for color or motion.
- **Do** keep orange as a scarce accent (underlines, focus, selection) and green as
  the structural brand voice.
- **Do** honor `prefers-color-scheme` and `prefers-reduced-motion`; both light and
  dark are first-class, and motion is never load-bearing.
- **Do** keep one shared identity across blog and labs — reach for the
  `.theme-lab` louder variant only on lab surfaces.
- **Don't** introduce drop shadows, rounded "card" chrome, or a third brand hue;
  depth is tonal + hairline rules.
- **Don't** add all-caps tracked eyebrow kickers above every section, feature grids,
  or stock illustration — that's the SaaS/AI tell this identity rejects.
- **Don't** let interactivity crowd the reading surface; if a widget competes with
  the text, it's too loud.
