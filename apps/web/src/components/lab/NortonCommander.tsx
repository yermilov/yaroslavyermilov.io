/**
 * Norton Commander — the retro-games lab (Tier 2 island hosting Tier-3 iframes).
 *
 * Renders a full-area NC screen below the site header: two blue panels over the
 * real file system of my 2005–2009 Turbo Pascal games (manifest.json is
 * generated from the original folders by retro/build.ts — real names, byte
 * sizes and dates). F3 views the CP866-decoded sources; Enter on a .EXE runs
 * the pas2js-ported game inside a sandboxed <iframe> (the Tier-3 boundary:
 * global key handlers and rtl.js state die with the iframe on exit).
 *
 * Keyboard-first like the original: ↑↓ move, Tab switches panels, Enter
 * opens/runs, F3 views, F1 help, F10 quit (with the classic dialog).
 *
 * DEEP LINKS (2026-08-09). A URL can name a game:
 * /{locale}/lab/retro-games/FOOTBALL/MATCH.EXE/ opens the NC with Football
 * already running. `autorun` carries that (folder, file) pair in; the address
 * bar is then kept in sync BOTH ways, so launching a game by hand rewrites the
 * URL to its own deep link and quitting rewrites it back. That is what makes
 * the links discoverable — you copy the address of the thing you are looking at
 * rather than having to know the scheme. It is replaceState, never pushState:
 * Back should leave the lab, not walk the games you opened.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Manifest shape + runSlugFor live in @lib/retro-manifest so the deep-link
// route resolves runnable rows through exactly the same rule this panel does.
import {
  runSlugFor,
  type Manifest,
  type ManifestFile,
  type ManifestFolder,
} from '@lib/retro-manifest';

type Overlay =
  | { kind: 'help' }
  | { kind: 'quit' }
  | { kind: 'msg'; title: string; lines: string[] }
  | { kind: 'view'; dir: string; file: string; text: string }
  // dir/file are carried alongside the port slug purely so the address bar can
  // show this game's deep link while it runs (see the URL-sync effect).
  | { kind: 'run'; slug: string; title: string; controls?: string; dir: string; file: string };

// Classic NC 16-colour roles.
const C = {
  panelBg: '#0000a8',
  frame: '#00a8a8', // cyan lines + file names
  dir: '#ffffff',
  text: '#00a8a8',
  open: '#54fcfc', // bright cyan — F3-viewable source files
  run: '#54fc54', // bright green — the runnable .exe (a pas2js port), sorted first
  dim: '#545454', // dark gray — inert files (binary assets), not selectable
  hi: '#ffff54', // yellow — column titles
  cursorBg: '#00a8a8',
  cursorFg: '#000000',
  barBg: '#00a8a8',
  barFg: '#000000',
  keyFg: '#ffffff',
  screenBg: '#000000',
  dlgBg: '#a8a8a8',
  dlgFg: '#000000',
  viewBg: '#0000a8',
} as const;

const FONT = '"IBM VGA", ui-monospace, Menlo, monospace';

function fmtSize(f: ManifestFile): string {
  return String(f.size);
}

// Folders render oldest→newest by year (Yarik). `year` is either a single "2005"
// or a range "2005–2009" written with a Unicode EN DASH (U+2013). Sort by the
// range's END year — Yarik: «бери другий 4-значний рядок» — so a folder worked
// through 2009 lands after the 2005–2008 ones; a single year uses its only value.
// Ties fall back to folder name. Sorting the manifest once (here, not at render)
// keeps folderIdx indexing consistent.
function folderSortYear(year: string): number {
  const matches = year.match(/\d{4}/g);
  if (!matches || matches.length === 0) return Number.POSITIVE_INFINITY;
  return Number(matches[1] ?? matches[0]);
}
function sortFoldersByYear(manifest: Manifest): Manifest {
  const folders = [...manifest.folders].sort(
    (a, b) => folderSortYear(a.year) - folderSortYear(b.year) || a.dir.localeCompare(b.dir),
  );
  return { ...manifest, folders };
}

// A file "opens" if it launches a port OR its source is viewable (F3). Inert
// binary assets (.CHR/.BGI, exes in un-ported folders) do neither — the panel
// dims them and the cursor skips over them.
function isOpenable(folder: ManifestFolder, file: ManifestFile): boolean {
  // .bak (editor backups) and .bat (DOS batch) are build noise, not artefacts
  // worth reading — keep them inert (dimmed + cursor-skipped, no F3) even though
  // the build decoded them to text (Yarik: "don't make bak and bat readable").
  if (/\.(bak|bat)$/i.test(file.name)) return false;
  return Boolean(runSlugFor(folder, file)) || file.view;
}

export default function NortonCommander({
  locale = 'ua',
  autorun,
}: {
  locale?: 'en' | 'ua';
  /** Manifest (folder, file) pair to launch on load — set by the deep-link route. */
  autorun?: { dir: string; file: string };
}) {
  // The site locale drives every NC string; games get it via ?lang= on the iframe.
  const t = (ua: string, en: string) => (locale === 'ua' ? ua : en);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState(false);
  const [panel, setPanel] = useState<0 | 1>(0);
  const [folderIdx, setFolderIdx] = useState(0);
  const [fileIdx, setFileIdx] = useState(0);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  // The currently-highlighted file row — kept scrolled into view because the
  // cursor can jump across a long run of dimmed files (FOOTBALL's 283 data
  // files) that the panel isn't scrolled to.
  const cursorRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/retro/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : Promise.reject(new Error(String(r.status)))))
      .then((m) => setManifest(sortFoldersByYear(m)))
      .catch(() => setError(true));
  }, []);

  const folder = manifest?.folders[folderIdx];
  // Runnable .exe files sort to the top (Yarik's request) — the thing you came
  // to do is first. Array.sort is stable, so each group keeps its manifest
  // order; a folder with no port keeps its files as-is.
  const files = useMemo(() => {
    const raw = folder?.files ?? [];
    if (!folder) return raw;
    return [...raw].sort((a, b) => (runSlugFor(folder, b) ? 1 : 0) - (runSlugFor(folder, a) ? 1 : 0));
  }, [folder]);
  const runnable = useMemo(
    () => files.map((f) => (folder ? Boolean(runSlugFor(folder, f)) : false)),
    [files, folder],
  );
  // Which files open — used to dim the rest AND to skip them while navigating.
  const openable = useMemo(
    () => files.map((f) => (folder ? isOpenable(folder, f) : false)),
    [files, folder],
  );
  const firstOpenable = useMemo(() => {
    const i = openable.indexOf(true);
    return i === -1 ? 0 : i;
  }, [openable]);
  const lastOpenable = useMemo(() => {
    const i = openable.lastIndexOf(true);
    return i === -1 ? 0 : i;
  }, [openable]);
  // Next openable index in `dir` from `from` (inclusive of neither end); stays
  // put when there is none, so the cursor never lands on a dimmed row.
  const stepOpenable = useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from + dir; i >= 0 && i < files.length; i += dir) if (openable[i]) return i;
      return from;
    },
    [files.length, openable],
  );

  const openView = useCallback(
    (dir: string, file: ManifestFile) => {
      if (!file.view) {
        setOverlay({
          kind: 'msg',
          title: file.name,
          lines: [
            t('Двійковий файл — перегляд недоступний.', 'Binary file — preview unavailable.'),
            t('F3 працює для .PAS/.TXT/.BAT/.CPP.', 'F3 works for .PAS/.TXT/.BAT/.CPP.'),
          ],
        });
        return;
      }
      fetch(`/retro/src/${dir}/${file.name}`)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
        .then((text) => setOverlay({ kind: 'view', dir, file: file.name, text }))
        .catch(() => setOverlay({ kind: 'msg', title: file.name, lines: [t('Не вдалося прочитати файл.', 'Could not read the file.')] }));
    },
    [],
  );

  const tryRun = useCallback(
    (f: ManifestFolder, file?: ManifestFile) => {
      const slug = (file && f.runs?.[file.name]) || f.run;
      if (slug) {
        // Name the row this launch corresponds to, so the deep link in the address
        // bar matches what is on screen. Without an explicit file (the "6 Run" on
        // an empty panel) fall back to the folder's own runnable row.
        const named = file?.name ?? f.files.find((x) => runSlugFor(f, x) === slug)?.name;
        setOverlay({
          kind: 'run',
          slug,
          title: f.title,
          controls: f.controls?.[locale],
          dir: f.dir,
          file: named ?? '',
        });
        return;
      }
      setOverlay({
        kind: 'msg',
        title: file?.name ?? f.dir,
        lines: [
          f.dir === 'SAPER'
            ? t('Сорс лише C++ — pas2js не застосовний.', 'Source is C++ only — pas2js N/A.')
            : f.dir === 'game'
              ? t('Це олімпіадна задачка з file I/O, не гра.', 'An olympiad file-I/O exercise, not a game.')
              : t('Ще не портовано. Портуються по одній,', 'Not ported yet. Ported one by one,'),
          f.dir === 'SAPER' || f.dir === 'game'
            ? t('Кинь F3 на сорс — він читається.', 'Hit F3 on the source — it reads fine.')
            : t('від простіших до складніших (F1 — черга).', 'from simplest to hardest (F1 — the queue).'),
        ],
      });
    },
    [],
  );

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (!manifest) return;
      // A running game owns the keyboard. Keys that land on the PARENT (focus
      // outside the canvas, or input layers that don't route into a sandboxed
      // frame) are RELAYED into the bundle via retro:key; Esc closes here
      // directly (from inside the iframe the bundle posts retro:quit instead).
      if (overlay?.kind === 'run') {
        if (e.key === 'Escape') {
          setOverlay(null);
        } else {
          frameRef.current?.contentWindow?.postMessage({ type: 'retro:key', key: e.key }, '*');
        }
        e.preventDefault();
        return;
      }
      if (overlay) {
        if (e.key === 'Escape' || e.key === 'F10' || (overlay.kind === 'quit' && e.key === 'n')) setOverlay(null);
        if (overlay.kind === 'quit' && (e.key === 'y' || e.key === 'Enter'))
          window.location.assign(`/${locale}/lab/`);
        if (overlay.kind === 'view' && viewRef.current) {
          const el = viewRef.current;
          if (e.key === 'ArrowDown') el.scrollBy(0, 32);
          if (e.key === 'ArrowUp') el.scrollBy(0, -32);
          if (e.key === 'PageDown') el.scrollBy(0, el.clientHeight - 32);
          if (e.key === 'PageUp') el.scrollBy(0, -(el.clientHeight - 32));
        }
        e.preventDefault();
        return;
      }
      const inFolders = panel === 0;
      switch (e.key) {
        case 'Tab':
          setPanel((p) => (p === 0 ? 1 : 0));
          break;
        case 'ArrowDown':
          if (inFolders) setFolderIdx((i) => Math.min(i + 1, manifest.folders.length - 1));
          else setFileIdx((i) => stepOpenable(i, 1));
          break;
        case 'ArrowUp':
          if (inFolders) setFolderIdx((i) => Math.max(i - 1, 0));
          else setFileIdx((i) => stepOpenable(i, -1));
          break;
        case 'Home':
          inFolders ? setFolderIdx(0) : setFileIdx(firstOpenable);
          break;
        case 'End':
          inFolders ? setFolderIdx(manifest.folders.length - 1) : setFileIdx(lastOpenable);
          break;
        case 'Enter': {
          if (!folder) break;
          if (inFolders) {
            setPanel(1);
            setFileIdx(firstOpenable);
            break;
          }
          const file = files[fileIdx];
          if (!file || !openable[fileIdx]) break;
          if (/\.exe$/i.test(file.name) || folder.runs?.[file.name]) tryRun(folder, file);
          else openView(folder.dir, file);
          break;
        }
        case 'F1':
          setOverlay({ kind: 'help' });
          break;
        case 'F3': {
          if (!folder) break;
          const file = inFolders || !openable[fileIdx] ? undefined : files[fileIdx];
          if (file) openView(folder.dir, file);
          break;
        }
        case 'F10':
          setOverlay({ kind: 'quit' });
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [manifest, overlay, panel, folder, files, fileIdx, locale, openView, tryRun, stepOpenable, firstOpenable, lastOpenable, openable],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onKey]);

  // The running game quits by posting retro:quit (Esc inside the bundle).
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === 'retro:quit') setOverlay(null);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);

  useEffect(() => {
    if (overlay?.kind === 'run') frameRef.current?.focus();
  }, [overlay]);

  // ── Deep links ──────────────────────────────────────────────────────────
  // Launch the pair the URL named, once, as soon as the manifest is in. Setting
  // the folder also moves the cursor to its runnable row (the folderIdx effect
  // lands on firstOpenable, and runnable rows sort first), so quitting the game
  // leaves you where the link pointed rather than at the top of the first folder.
  //
  // `settled` gates the URL sync below: until the autorun has had its turn, the
  // overlay is still null and syncing would strip the very deep link we are
  // about to honour — a visible flicker, and a silent loss of the URL if the
  // launch were slower than the first paint.
  const [autorunSettled, setAutorunSettled] = useState(!autorun);
  const autorunDone = useRef(false);
  useEffect(() => {
    if (!manifest || !autorun || autorunDone.current) return;
    autorunDone.current = true;
    const fi = manifest.folders.findIndex((f) => f.dir.toLowerCase() === autorun.dir.toLowerCase());
    const f = manifest.folders[fi];
    const file = f?.files.find((x) => x.name.toLowerCase() === autorun.file.toLowerCase());
    // An unresolvable pair is not an error worth a dialog — the lab still works,
    // so fall through to the plain file manager and let the sync drop the URL.
    if (f && file && runSlugFor(f, file)) {
      setFolderIdx(fi);
      setPanel(1);
      tryRun(f, file);
    }
    setAutorunSettled(true);
  }, [manifest, autorun, tryRun]);

  // Keep the address bar showing whatever is on screen: a game's own deep link
  // while it runs, the plain lab URL otherwise. replaceState (never push) so the
  // Back button still leaves the lab in one press rather than replaying games.
  useEffect(() => {
    if (!manifest || !autorunSettled) return;
    const base = `/${locale}/lab/retro-games/`;
    const want =
      overlay?.kind === 'run' && overlay.file ? `${base}${overlay.dir}/${overlay.file}/` : base;
    if (window.location.pathname !== want) window.history.replaceState(null, '', want);
  }, [overlay, locale, manifest, autorunSettled]);

  // On folder change, land the cursor on the first file that actually opens.
  useEffect(() => {
    setFileIdx(firstOpenable);
  }, [folderIdx, firstOpenable]);

  // Keep the highlighted file row visible — a cursor jump over a long dimmed
  // block would otherwise leave the selection scrolled out of the panel.
  useEffect(() => {
    if (panel === 1) cursorRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [fileIdx, folderIdx, panel]);

  const fullscreen = () => rootRef.current?.requestFullscreen?.().catch(() => undefined);

  const fkeys: Array<[string, string, () => void]> = [
    ['1', 'Help', () => setOverlay({ kind: 'help' })],
    ['3', 'View', () => folder && files[fileIdx] && openView(folder.dir, files[fileIdx]!)],
    // Run the CURRENTLY-HIGHLIGHTED file, not the folder default — otherwise
    // selecting RANDOM.EXE and pressing "6 Run" launched SNITCH (the default),
    // contradicting the highlight. tryRun resolves the file's own port via
    // `runs`, falling back to the folder default only for a non-mapped row.
    ['6', 'Run', () => folder && tryRun(folder, files[fileIdx])],
    ['9', 'Full', fullscreen],
    ['10', 'Quit', () => setOverlay({ kind: 'quit' })],
  ];

  const row = (
    cols: [string, string, string],
    opts: { cursor?: boolean; dir?: boolean; dim?: boolean; run?: boolean; key: string; onClick: () => void; onOpen: () => void },
  ) => (
    <div
      key={opts.key}
      ref={opts.cursor ? cursorRowRef : undefined}
      onClick={opts.dim ? undefined : opts.onClick}
      onDoubleClick={opts.dim ? undefined : opts.onOpen}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 8ch 11ch',
        gap: '1ch',
        padding: '0 1ch',
        cursor: opts.dim ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        background: opts.cursor ? C.cursorBg : 'transparent',
        // Runnable .exe = bright green (run me!); F3-viewable = bright cyan;
        // inert = gray and cursor-less. Folders stay white; the bar overrides.
        color: opts.cursor ? C.cursorFg : opts.dim ? C.dim : opts.run ? C.run : opts.dir ? C.dir : C.open,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cols[0]}</span>
      <span style={{ textAlign: 'right' }}>{cols[1]}</span>
      <span style={{ textAlign: 'right' }}>{cols[2]}</span>
    </div>
  );

  const panelBox = (title: string, active: boolean, body: React.ReactNode, footer: string) => (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        // min-width:0 is load-bearing: as a `1fr 1fr` grid item the section's
        // default min-width is min-content, and the long nowrap FOOTER (game
        // blurb) then forces this panel wider than its half — squeezing the
        // other panel until its file names truncate to 4 chars. Pinning it to 0
        // keeps both panels a true 50/50 and lets the footer's overflow:hidden clip.
        minWidth: 0,
        border: `2px double ${C.frame}`,
        background: C.panelBg,
        margin: '2px',
      }}
    >
      <header style={{ textAlign: 'center', marginTop: '-1px' }}>
        <span style={{ background: active ? C.cursorBg : C.panelBg, color: active ? C.cursorFg : C.dir, padding: '0 1ch' }}>
          {title}
        </span>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 8ch 11ch',
          gap: '1ch',
          padding: '0 1ch',
          color: C.hi,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ textAlign: 'center' }}>{locale === 'ua' ? 'Імʼя' : 'Name'}</span>
        <span style={{ textAlign: 'center' }}>{locale === 'ua' ? 'Розмір' : 'Size'}</span>
        <span style={{ textAlign: 'center' }}>{locale === 'ua' ? 'Дата' : 'Date'}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{body}</div>
      <footer style={{ borderTop: `1px solid ${C.frame}`, color: C.text, padding: '0 1ch', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {footer}
      </footer>
    </section>
  );

  if (error)
    return (
      <div style={{ fontFamily: FONT, background: C.screenBg, color: C.text, padding: '2ch', minHeight: '24rem' }}>
        manifest.json: read error. Abort, Retry, Ignore?
      </div>
    );

  return (
    <div
      ref={rootRef}
      style={{
        fontFamily: FONT,
        fontSize: '16px',
        lineHeight: '20px',
        height: 'calc(100vh - 9rem)',
        minHeight: '30rem',
        display: 'flex',
        flexDirection: 'column',
        background: C.screenBg,
        userSelect: 'none',
        // Overlays (viewer / game / dialogs) anchor HERE — the site header above
        // must stay visible and untouched (explicit review feedback).
        position: 'relative',
      }}
    >
      <style>{`
        @font-face { font-family: 'IBM VGA'; src: url('/retro/fonts/WebPlus_IBM_VGA_8x16.woff') format('woff'); font-display: swap; }
        /* One panel on narrow screens (the active one), the classic pair from
           768px. !important: the sections carry an inline display:flex. */
        .nc-panels { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr; }
        .nc-panels.nc-active-0 > section:nth-of-type(2) { display: none !important; }
        .nc-panels.nc-active-1 > section:nth-of-type(1) { display: none !important; }
        @media (min-width: 768px) {
          .nc-panels { grid-template-columns: 1fr 1fr; }
          .nc-panels.nc-active-0 > section:nth-of-type(2),
          .nc-panels.nc-active-1 > section:nth-of-type(1) { display: flex !important; }
        }
      `}</style>

      {/* the two panels */}
      <div className={`nc-panels nc-active-${panel}`}>
        {panelBox(
            'C:\\GAMES',
            panel === 0,
            manifest
              ? manifest.folders.map((f, i) =>
                  row([f.dir, t('▸ПАПКА◂', '▸DIR◂'), f.year], {
                    key: f.dir,
                    cursor: i === folderIdx && panel === 0,
                    dir: true,
                    onClick: () => {
                      setPanel(0);
                      setFolderIdx(i);
                    },
                    onOpen: () => {
                      setFolderIdx(i);
                      setPanel(1);
                    },
                  }),
                )
              : ((<div style={{ color: C.text, padding: '0 1ch' }}>Читаю диск…</div>) as React.ReactNode),
            folder ? `${folder.title} · ${folder.note[locale]}` : '',
          )}
        {panelBox(
            folder ? `C:\\GAMES\\${folder.dir}` : 'C:\\GAMES\\…',
            panel === 1,
            files.map((f, i) =>
              row([f.name, fmtSize(f), f.mtime], {
                key: f.name,
                cursor: i === fileIdx && panel === 1 && openable[i],
                dir: false,
                dim: !openable[i],
                run: runnable[i],
                onClick: () => {
                  setPanel(1);
                  setFileIdx(i);
                },
                onOpen: () =>
                  /\.exe$/i.test(f.name) || folder?.runs?.[f.name]
                    ? folder && tryRun(folder, f)
                    : folder && openView(folder.dir, f),
              }),
            ),
            folder?.run
              ? locale === 'ua'
                ? 'Enter на .EXE — грати (порт pas2js)'
                : 'Enter on a .EXE runs the pas2js port'
              : locale === 'ua'
                ? 'F3 — дивитись сорси'
                : 'F3 views the sources',
          )}
      </div>

      {/* function-key bar */}
      <div style={{ display: 'flex', gap: '1ch', background: C.screenBg, padding: '0 1ch', whiteSpace: 'nowrap', overflowX: 'auto' }}>
        {fkeys.map(([n, label, fn]) => (
          <button
            key={n}
            onClick={fn}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <span style={{ color: C.keyFg }}>{n}</span>
            <span style={{ background: C.barBg, color: C.barFg, padding: '0 1ch', minWidth: '6ch' }}>{label}</span>
          </button>
        ))}
        <span style={{ color: C.text, marginLeft: 'auto' }}>{manifest ? `${manifest.folders.length} dirs` : ''}</span>
      </div>

      {/* overlays */}
      {overlay?.kind === 'view' && (
        <div style={{ position: 'absolute', inset: 0, background: C.viewBg, display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <header style={{ background: C.barBg, color: C.barFg, padding: '0 1ch', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {overlay.dir}\{overlay.file}
            </span>
            <span>{t('Esc — назад', 'Esc — back')}</span>
          </header>
          <div ref={viewRef} style={{ flex: 1, overflow: 'auto', padding: '1ch' }}>
            {/* explicit colors: the site's prose CSS styles bare <pre> (paper bg) */}
            <pre style={{ margin: 0, fontFamily: FONT, whiteSpace: 'pre', background: 'transparent', color: C.dir, fontSize: 'inherit', lineHeight: 'inherit' }}>
              {overlay.text}
            </pre>
          </div>
        </div>
      )}
      {overlay?.kind === 'run' && (
        <div style={{ position: 'absolute', inset: 0, background: C.screenBg, display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          {/* gap is load-bearing: the two spans are flex siblings, so a long
              controls line butted straight against the title and rendered as
              "Quidditch.EXEобери дві команди…" (reported 13.08.2026 with a
              screenshot). space-between alone only separates them while there
              is slack left. */}
          <header style={{ background: C.barBg, color: C.barFg, padding: '0 1ch', display: 'flex', justifyContent: 'space-between', gap: '2ch' }}>
            <span style={{ flex: '0 0 auto' }}>{overlay.title}.EXE</span>
            <span style={{ textAlign: 'right' }}>{overlay.controls ?? ''} · {t('Esc — назад до NC', 'Esc — back to NC')}</span>
          </header>
          {/* Tier-3 boundary: the game runs in its own browsing context; closing
              the overlay destroys the iframe and with it every rtl.js global. */}
          <iframe
            ref={frameRef}
            src={`/retro/games/${overlay.slug}/index.html?lang=${locale}`}
            sandbox="allow-scripts"
            title={overlay.title}
            style={{ flex: 1, border: 0, width: '100%' }}
          />
        </div>
      )}
      {(overlay?.kind === 'help' || overlay?.kind === 'quit' || overlay?.kind === 'msg') && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 10 }} onClick={() => setOverlay(null)}>
          <div
            style={{
              background: C.dlgBg,
              color: C.dlgFg,
              border: `2px double ${C.dlgFg}`,
              padding: '1ch 2ch',
              maxWidth: 'min(64ch, 92%)',
              maxHeight: '80%',
              overflowY: 'auto',
              boxShadow: '1ch 1ch 0 rgba(0,0,0,.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {overlay.kind === 'quit' ? (
              <>
                <p style={{ margin: 0, textAlign: 'center' }}>Do you want to quit Norton Commander?</p>
                <p style={{ margin: '1ch 0 0', textAlign: 'center', display: 'flex', gap: '2ch', justifyContent: 'center' }}>
                  <button style={{ all: 'unset', cursor: 'pointer', background: C.cursorBg, padding: '0 2ch' }} onClick={() => window.location.assign(`/${locale}/lab/`)}>
                    Yes
                  </button>
                  <button style={{ all: 'unset', cursor: 'pointer', padding: '0 2ch' }} onClick={() => setOverlay(null)}>
                    No
                  </button>
                </p>
              </>
            ) : overlay.kind === 'msg' ? (
              <>
                <p style={{ margin: 0, textAlign: 'center', fontWeight: 'bold' }}>{overlay.title}</p>
                {overlay.lines.map((l) => (
                  <p key={l} style={{ margin: 0, textAlign: 'center' }}>
                    {l}
                  </p>
                ))}
                <p style={{ margin: '1ch 0 0', textAlign: 'center', color: '#545454' }}>Esc</p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
                  {locale === 'ua' ? 'Мої ігри на Turbo Pascal, 2005–2009' : 'My Turbo Pascal games, 2005–2009'}
                </p>
                <p style={{ margin: '1ch 0 0' }}>
                  {locale === 'ua'
                    ? 'Оригінальні сорси зі шкільних дискет. Портуються в браузер через pas2js — без емулятора, без переписування: чотири рядки діфу на гру.'
                    : 'The original sources from my school floppies, recompiled for the browser with pas2js — no emulator, no rewrite: a four-line diff per game.'}
                </p>
                <ul style={{ margin: '1ch 0 0', paddingLeft: '3ch' }}>
                  {manifest?.folders.map((f) => (
                    <li key={f.dir}>
                      {f.dir} — {f.note[locale]} {f.run ? t('· ГОТОВО, Enter на .EXE', '· READY, Enter on the .EXE') : ''}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: '1ch 0 0' }}>↑↓ / Tab / Enter · F3 View · F9 Fullscreen · F10 Quit</p>
                <p style={{ margin: '1ch 0 0', color: '#545454' }}>Шрифт: IBM VGA 8x16 © VileR (int10h.org), CC BY-SA 4.0</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
