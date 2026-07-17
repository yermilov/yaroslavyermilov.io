{ A `crt` shim for pas2js.

  Two things here are load-bearing.

  1. Delay returns a TJSPromise instead of being a procedure. JavaScript cannot
     block, and these games are built on a busy `repeat … Delay(n) … until`
     loop. Making Delay awaitable is what lets the ORIGINAL loop structure
     survive: the call site becomes `await(Delay(n))` and the enclosing routine
     is marked `async`. That is the entire concession the source has to make.

  2. ReadKey reproduces DOS's two-call extended-key protocol. An arrow key on
     DOS yields #0 first, then the scan code on the NEXT ReadKey. PINGPONG
     matches on #75/#77 directly and only works because its loop calls InKey
     again on the following iteration. Hand it a single #75 and the paddle
     never moves. }
unit crt;

{$mode objfpc}

interface

uses JS;

const
  { Turbo Pascal's crt colour constants — the games use them by name. }
  Black = 0; Blue = 1; Green = 2; Cyan = 3; Red = 4; Magenta = 5;
  Brown = 6; LightGray = 7; DarkGray = 8; LightBlue = 9; LightGreen = 10;
  LightCyan = 11; LightRed = 12; LightMagenta = 13; Yellow = 14; White = 15;

function KeyPressed: boolean;
function ReadKey: char;
function Delay(ms: integer): TJSPromise;
{ DOS-style numeric prompt for ports of programs that ReadLn from the console.
  Renders a white-on-black prompt line over the canvas and resolves with the
  typed number on Enter. Input is collected from DOCUMENT-level keydowns, so it
  works both with real keyboard focus and with the NC parent's retro:key relay
  (which synthesizes document events — a focused <input> would never see those). }
function AskReal(const prompt: string): TJSPromise;
{ Same prompt, but resolves with the typed TEXT (team names etc). }
function AskString(const prompt: string): TJSPromise;
{ Resolves when the NEXT key arrives (the key is consumed) — the blocking
  `ReadKey;` of DOS, awaitable. }
function WaitKey: TJSPromise;
{ Same, but resolves with the key's CHAR CODE (ord(ReadKey) of DOS) — for
  ports whose whole flow blocks on ReadKey (menus, y/n prompts). Extended
  keys deliver their #0 prefix and scan code as two resolutions, exactly
  like the two-call DOS protocol. }
function ReadKeyA: TJSPromise;
{ PC-speaker: a square-wave beep at hz until NoSound. Best-effort — browser
  autoplay policy may keep it silent until a real user gesture. }
procedure Sound(hz: word);
procedure NoSound;
{ Fast macrotask yield for busy compute loops — see the implementation note. }
function Yield: TJSPromise;
{ ---- DOS text mode (80×25) ----------------------------------------------
  The text-mode games (CARS, and later SUPER/QUIDDITC/BAKKARA/FOOTBALL) never
  call InitGraph: they paint with GotoXY/TextColor/TextBackground and plain
  Write. The shim keeps a real 80×25 cell buffer (char + fg + bg per cell,
  CP437-style glyphs) rendered to the same #screen canvas at 8×16 per cell
  (640×400 — authentic VGA text). System Write/Writeln is routed here through
  pas2js's SetWriteCallBack once any text op runs; graph.InitGraph hands the
  canvas back to graphics mode (see TextShutdown). }
procedure TextBackground(c: byte);
procedure TextColor(c: byte);
procedure GotoXY(x, y: byte);
{ Called by graph.InitGraph: stop the text renderer and release Write. }
procedure TextShutdown;
procedure ClrScr;
{ Not a crt routine on DOS — it lived in System, which pas2js does not provide.
  Absorbed here so the game's own source needs no further edits. JS's Math.random
  needs no seeding, so this is a no-op. }
procedure Randomize;
{ Only reached on the InitGraph-failed path, where DOS would wait for a keypress.
  There is nothing to wait for in a browser, so it is a no-op. }
procedure Readln;

var
  { The DOSBox-cycles knob. PINGPONG asks for Delay(3000) every frame — three
    SECONDS. It was never playable at that rate: Turbo Pascal 7's Delay was
    calibrated by a boot-time timing loop that overflowed on fast CPUs (the
    famous RTE 200 bug), so on the machine this was written for Delay returned
    almost immediately. Honouring the literal argument gives a technically
    faithful port that is unplayable, so the wall-clock delay is scaled here.
    1.0 = obey the source literally. }
  DelayScale: double = 0.004;

implementation

uses Web, graph;

var
  Queue: array of char;
  Installed: boolean = false;
  { True while an Ask* prompt owns the keyboard. The NC parent's retro:key
    relay dispatches synthetic keydowns ON document — the same EventTarget both
    the prompt listener and OnKeyDown are registered on — where stopPropagation
    cannot suppress fellow listeners. Without this flag every relayed prompt
    key would ALSO enter the queue and be replayed into the next prompt by the
    type-ahead drain. (DOS semantics agree: keys typed during readln go to
    readln, not to the type-ahead buffer.) }
  PromptActive: boolean = false;

procedure Push(c: char);
begin
  SetLength(Queue, Length(Queue) + 1);
  Queue[Length(Queue) - 1] := c;
end;

function OnKeyDown(aEvent: TJSKeyboardEvent): boolean;
begin
  if PromptActive then
  begin
    Result := true;
    exit;
  end;
  case aEvent.key of
    // Extended keys: #0 then the DOS scan code, exactly as INT 16h delivered them.
    'ArrowLeft':  begin Push(#0); Push(#75); end;
    'ArrowRight': begin Push(#0); Push(#77); end;
    'ArrowUp':    begin Push(#0); Push(#72); end;
    'ArrowDown':  begin Push(#0); Push(#80); end;
    'Escape':     Push(#27);
    'Enter':      Push(#13);
    ' ':          Push(#32);
  else
    if Length(aEvent.key) = 1 then
      Push(aEvent.key[1]);
  end;
  // The arrows scroll the page otherwise, which makes the game unplayable.
  if Copy(aEvent.key, 1, 5) = 'Arrow' then
    aEvent.preventDefault;
  Result := true;
end;

procedure Install;
begin
  if Installed then exit;
  Installed := true;
  document.addEventListener('keydown', @OnKeyDown);
end;

function KeyPressed: boolean;
begin
  Install;
  Result := Length(Queue) > 0;
end;

function ReadKey: char;
var
  i: integer;
begin
  Install;
  if Length(Queue) = 0 then
  begin
    Result := #0;
    exit;
  end;
  Result := Queue[0];
  for i := 0 to Length(Queue) - 2 do
    Queue[i] := Queue[i + 1];
  SetLength(Queue, Length(Queue) - 1);
end;

function Delay(ms: integer): TJSPromise;
var
  wait: integer;
begin
  Install;
  wait := Round(ms * DelayScale);
  { Deliberately setTimeout even when wait rounds to 0: the browser's ~4ms
    nested-timer clamp IS the effective frame pacing of the Delay-driven game
    loops (PINGPONG). Making this a fast yield once sent the game into warp
    speed — five block rows in two seconds. Tight compute loops that only need
    to stay responsive use Yield instead. }
  Result := TJSPromise.New(
    procedure(resolve, reject: TJSPromiseResolver)
    begin
      window.setTimeout(procedure begin resolve(0); end, wait);
    end);
end;

function Yield: TJSPromise;
begin
  Result := TJSPromise.New(
    procedure(resolve, reject: TJSPromiseResolver)
    begin
      { A real macrotask yield (paint + input reach the page) in microseconds —
        a MessageChannel round-trip dodges the setTimeout clamp. For busy
        compute loops (PUSHKA's plotter), NOT for game pacing — see Delay. }
      asm
        if (!window.__retroYield) {
          const ch = new MessageChannel();
          const q = [];
          ch.port1.onmessage = () => { const f = q.shift(); if (f) f(0); };
          window.__retroYield = (cb) => { q.push(cb); ch.port2.postMessage(0); };
        }
        window.__retroYield(resolve);
      end;
    end);
end;

function AskPrompt(const prompt: string; numeric: boolean): TJSPromise;
begin
  Install; // the queue collects keys typed BETWEEN prompts (DOS type-ahead)
  Result := TJSPromise.New(
    procedure(resolve, reject: TJSPromiseResolver)
    begin
      asm
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;inset:auto 0 40% 0;display:flex;justify-content:center;z-index:99;';
        const line = document.createElement('div');
        line.style.cssText = 'background:#000;color:#fff;font:16px/24px ui-monospace,Menlo,monospace;padding:8px 16px;border:1px solid #545454;white-space:pre;';
        box.appendChild(line);
        let buf = '';
        let done = false;
        const paint = () => { line.textContent = prompt + ' ' + buf + '▎'; };
        // feed() is shared by live keydowns and the type-ahead drain below.
        const feed = (key) => {
          if (key === 'Enter') {
            if (numeric) {
              const n = parseFloat(buf);
              if (!isFinite(n)) { buf = ''; paint(); return false; }
              done = true;
              $impl.PromptActive = false;
              document.removeEventListener('keydown', onKey, true);
              box.remove();
              resolve(n);
              return true;
            }
            done = true;
            $impl.PromptActive = false;
            document.removeEventListener('keydown', onKey, true);
            box.remove();
            resolve(buf);
            return true;
          }
          if (key === 'Backspace') { buf = buf.slice(0, -1); paint(); return false; }
          if (numeric ? /^[0-9.\-]$/.test(key) : key.length === 1) { buf += key; paint(); }
          return false;
        };
        const onKey = (e) => {
          // Esc must stay quittable mid-prompt: let it propagate to the
          // bundle's page-level listener (retro:quit to the NC parent).
          if (e.key === 'Escape') return;
          feed(e.key);
          e.stopPropagation();
        };
        paint();
        document.body.appendChild(box);
        // DOS type-ahead: keys typed before this prompt appeared are waiting in
        // the crt queue — drain them first (a fast typist never loses input).
        while (!done && pas.crt.KeyPressed()) {
          const c = pas.crt.ReadKey();
          const code = c.charCodeAt(0);
          if (code === 0) { if (pas.crt.KeyPressed()) pas.crt.ReadKey(); continue; } // ext scancode pair
          if (code === 27) continue; // a queued Esc quits (page listener), never joins a name
          feed(code === 13 ? 'Enter' : (code === 8 ? 'Backspace' : c));
        }
        if (!done) {
          $impl.PromptActive = true; // the queue must NOT also record prompt keys (see var)
          document.addEventListener('keydown', onKey, true); // capture: the prompt owns the keyboard
        }
      end;
    end);
end;

function AskReal(const prompt: string): TJSPromise;
begin
  Result := AskPrompt(prompt, true);
end;

function AskString(const prompt: string): TJSPromise;
begin
  Result := AskPrompt(prompt, false);
end;

function WaitKey: TJSPromise;
begin
  Install;
  Result := TJSPromise.New(
    procedure(resolve, reject: TJSPromiseResolver)
    begin
      asm
        const poll = () => {
          if (pas.crt.KeyPressed()) { pas.crt.ReadKey(); resolve(0); }
          else setTimeout(poll, 50);
        };
        poll();
      end;
    end);
end;

function ReadKeyA: TJSPromise;
begin
  Install;
  Result := TJSPromise.New(
    procedure(resolve, reject: TJSPromiseResolver)
    begin
      asm
        const poll = () => {
          if (pas.crt.KeyPressed()) { resolve(pas.crt.ReadKey().charCodeAt(0)); }
          else setTimeout(poll, 50);
        };
        poll();
      end;
    end);
end;

procedure Sound(hz: word);
begin
  asm
    try {
      if (!window.__retroAudio) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.gain.value = 0.04;
        gain.connect(ctx.destination);
        window.__retroAudio = { ctx, gain, osc: null };
      }
      const a = window.__retroAudio;
      if (a.osc) { a.osc.stop(); a.osc = null; }
      a.ctx.resume && a.ctx.resume();
      const osc = a.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = hz;
      osc.connect(a.gain);
      osc.start();
      a.osc = osc;
    } catch (e) { /* no audio — fine */ }
  end;
end;

procedure NoSound;
begin
  asm
    try {
      const a = window.__retroAudio;
      if (a && a.osc) { a.osc.stop(); a.osc = null; }
    } catch (e) {}
  end;
end;

{ ---- text mode ---------------------------------------------------------- }

const
  Cols = 80;
  Rows = 25;
  CellW = 8;
  CellH = 16;
  // The 16 DOS colours as CSS — same values as graph.pas's palette.
  Css: array[0..15] of string = (
    '#000000', '#0000a8', '#00a800', '#00a8a8', '#a80000', '#a800a8', '#a85400', '#a8a8a8',
    '#545454', '#5454ff', '#54ff54', '#54ffff', '#ff5454', '#ff54ff', '#ffff54', '#ffffff');

var
  TextActive: boolean = false;
  TextCanvas: TJSHTMLCanvasElement;
  TextCtx: TJSCanvasRenderingContext2D;
  CellCh: array of string; // Rows*Cols glyphs
  CellFg: array of byte;
  CellBg: array of byte;
  CurX: integer = 1; // 1-based, like Turbo Pascal
  CurY: integer = 1;
  CurFg: byte = 7;
  CurBg: byte = 0;

{ CP437's visible control glyphs (the games draw with them: #30 is the car). }
function CtrlGlyph(code: integer): string;
begin
  case code of
    16: Result := '►';
    17: Result := '◄';
    24: Result := '↑';
    25: Result := '↓';
    30: Result := '▲';
    31: Result := '▼';
  else
    Result := ' ';
  end;
end;

{ High-half CP437/CP866 shared box-drawing range used by t_graph's Box. }
function HighGlyph(code: integer): string;
begin
  case code of
    179: Result := '│';
    191: Result := '┐';
    192: Result := '└';
    196: Result := '─';
    217: Result := '┘';
    218: Result := '┌';
  else
    Result := chr(code);
  end;
end;

procedure TextPaint(aTime: TJSDOMHighResTimeStamp); forward;

procedure TextEnsure;
var
  i: integer;
begin
  if TextActive then exit;
  TextActive := true;
  TextCanvas := TJSHTMLCanvasElement(document.getElementById('screen'));
  if TextCanvas = nil then exit;
  TextCanvas.width := Cols * CellW;   // 640
  TextCanvas.height := Rows * CellH;  // 400 — real VGA text mode
  TextCtx := TJSCanvasRenderingContext2D(TextCanvas.getContext('2d'));
  SetLength(CellCh, Cols * Rows);
  SetLength(CellFg, Cols * Rows);
  SetLength(CellBg, Cols * Rows);
  for i := 0 to Cols * Rows - 1 do
  begin
    CellCh[i] := ' ';
    CellFg[i] := 7;
    CellBg[i] := 0;
  end;
  window.requestAnimationFrame(@TextPaint);
end;

{ The write-callback body — installed once at unit init (see initialization):
  pure-Write programs (SUPER) never call a text op first, so the FIRST Write
  itself must boot the text screen. }
procedure HandleWrite(S: JSValue; NewLine: boolean);
    var
      txt: string;
      k, code: integer;
      g: string;
    begin
      txt := String(S);
      for k := 1 to Length(txt) do
      begin
        code := ord(txt[k]);
        if code = 13 then begin CurX := 1; continue; end;
        if code = 10 then begin CurX := 1; Inc(CurY); continue; end;
        if code < 32 then g := CtrlGlyph(code)
        else if code > 126 then g := HighGlyph(code)
        else g := txt[k];
        if (CurX >= 1) and (CurX <= Cols) and (CurY >= 1) and (CurY <= Rows) then
        begin
          CellCh[(CurY - 1) * Cols + (CurX - 1)] := g;
          CellFg[(CurY - 1) * Cols + (CurX - 1)] := CurFg;
          CellBg[(CurY - 1) * Cols + (CurX - 1)] := CurBg;
        end;
        Inc(CurX);
        if CurX > Cols then begin CurX := 1; Inc(CurY); end;
      end;
      if NewLine then begin CurX := 1; Inc(CurY); end;
      // Bottom overflow scrolls, exactly like the DOS console did.
      while CurY > Rows do
      begin
        for k := 0 to (Rows - 1) * Cols - 1 do
        begin
          CellCh[k] := CellCh[k + Cols];
          CellFg[k] := CellFg[k + Cols];
          CellBg[k] := CellBg[k + Cols];
        end;
        for k := (Rows - 1) * Cols to Rows * Cols - 1 do
        begin
          CellCh[k] := ' ';
          CellFg[k] := 7;
          CellBg[k] := CurBg;
        end;
        Dec(CurY);
      end;
end;

procedure TextPaint(aTime: TJSDOMHighResTimeStamp);
var
  x, y, i: integer;
begin
  if not TextActive then exit;
  if TextCtx <> nil then
  begin
    TextCtx.font := '16px "IBM VGA", ui-monospace, Menlo, monospace';
    TextCtx.textBaseline := 'top';
    for y := 0 to Rows - 1 do
      for x := 0 to Cols - 1 do
      begin
        i := y * Cols + x;
        TJSObject(TextCtx)['fillStyle'] := Css[CellBg[i] and 15];
        TextCtx.fillRect(x * CellW, y * CellH, CellW, CellH);
        if CellCh[i] <> ' ' then
        begin
          TJSObject(TextCtx)['fillStyle'] := Css[CellFg[i] and 15];
          TextCtx.fillText(CellCh[i], x * CellW, y * CellH);
        end;
      end;
  end;
  window.requestAnimationFrame(@TextPaint);
end;

procedure TextShutdown;
begin
  if not TextActive then exit;
  TextActive := false; // the paint loop sees this and stops re-queueing
end;

procedure TextBackground(c: byte);
begin
  TextEnsure;
  CurBg := c and 15;
end;

procedure TextColor(c: byte);
begin
  TextEnsure;
  CurFg := c and 15;
end;

procedure GotoXY(x, y: byte);
begin
  TextEnsure;
  // Turbo Pascal IGNORED out-of-range coordinates (the cursor stayed put) —
  // and that semantics is load-bearing: CARS2 has a latent bug where a star's
  // row counter grows past 25 forever (inc lands on 25, the =24 reset never
  // fires). On DOS the bad GotoXY was a no-op and the stray writes hit the
  // stale cursor — accepting the row instead made every frame SCROLL, flooding
  // the screen green. Bug-for-bug fidelity requires the ignore.
  if (x < 1) or (x > Cols) or (y < 1) or (y > Rows) then exit;
  CurX := x;
  CurY := y;
end;

procedure ClrScr;
var
  i: integer;
begin
  if GraphActive then
  begin
    ClearDevice;
    exit;
  end;
  // Text-mode clear: fill with the current background and home the cursor,
  // exactly what Turbo Pascal's ClrScr did.
  TextEnsure;
  for i := 0 to Cols * Rows - 1 do
  begin
    CellCh[i] := ' ';
    CellFg[i] := CurFg;
    CellBg[i] := CurBg;
  end;
  CurX := 1;
  CurY := 1;
end;

procedure Randomize;
begin
end;

procedure Readln;
begin
end;

initialization
  // Pin KeyPressed/ReadKey against pas2js dead-code elimination: AskPrompt's
  // type-ahead drain and WaitKey call them from asm blocks only, which DCE
  // cannot see — a program that never calls keypressed from Pascal (RANDOM)
  // otherwise ships without them and crashes at the first prompt.
  if KeyPressed then ReadKey;
  // Writes boot the text screen unless graphics owns the canvas — this is what
  // makes pure-Write programs (SUPER) render without any prior crt call.
  SetWriteCallBack(
    procedure(S: JSValue; NewLine: boolean)
    begin
      if GraphActive then exit;
      TextEnsure;
      HandleWrite(S, NewLine);
    end);
end.
