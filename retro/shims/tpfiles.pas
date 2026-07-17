{ tpfiles — Turbo Pascal Text-file semantics over an in-bundle file map.

  pas2js's browser System unit has no `text` type at all (verified: `var t:
  text` is a compile error), so DOS ports that read their screens/art from
  data files use this unit instead. The API mirrors TP's: Assign/Reset/
  Append, plus ReadlnT/WritelnT/EofT in place of the readln/writeln/eof
  intrinsics (those are compiler magic in TP and cannot be overloaded for a
  user-defined Text — the port renames the call sites, one mechanical class
  of diff).

  Storage: read-only files come from `window.__retroFiles` — a
  {basename: [lines]} map the game bundle inlines at build time (the sandbox
  is opaque-origin, it cannot fetch; same trick as the VGA font). Files the
  game WRITES (savegames) go to localStorage under retro:<game>:<name> WHERE
  AVAILABLE — i.e. on the game's direct page. Inside the Norton Commander's
  sandboxed iframe the opaque origin makes localStorage THROW, so there
  writes land only in the in-memory map and live until the game window
  closes. A deliberate, documented trade-off: BAKKARA's load path crashes
  with the author's own Runtime error 100 anyway, so a cross-frame
  persistence bridge would serve a feature that cannot read its data back.
  DOS paths are normalized to their lowercase basename, so
  'C:\cash\bakkara\textbak.txt' and 'textbak.txt' are the same file.

  Error semantics are TP's, bug-for-bug: Reset/Append on a missing file dies
  with runtime error 2, reading past EOF with 100, writing to a file not
  opened for append with 105, a non-numeric line read into a number with 106.
  RTE prints the DOS-style «Runtime error NNN.» through the crt text engine
  and unwinds — a 2005 program that crashed on DOS crashes the same way here. }
unit tpfiles;

interface

type
  Text = record
    name: string;   // normalized basename
    cursor: integer;
    mode: integer;  // 0 closed, 1 reading, 2 appending
  end;

procedure Assign(var f: Text; const path: string);
procedure Reset(var f: Text);
procedure Append(var f: Text);
procedure ReadlnT(var f: Text; var s: string);
procedure ReadlnLong(var f: Text; var n: longint);
procedure WritelnT(var f: Text; const s: string);
procedure WritelnLong(var f: Text; n: longint);
function EofT(var f: Text): boolean;
{ TP's parameterless Eof means Eof(Input) — the DOS console, which never
  reaches EOF while a program waits on the keyboard. Always false. }
function Eof: boolean;
{ pas2js has no System.Halt in the browser; here halt = leave the game the
  DOS way — back to the Norton Commander (retro:quit to the parent). }
procedure Halt;

implementation

uses crt;

procedure RTE(code: integer);
begin
  Writeln;
  Writeln('Runtime error ', code, '.');
  asm
    throw new Error('TP runtime error ' + code);
  end;
end;

function NormName(const path: string): string;
begin
  Result := path;
  asm
    var p = path.toLowerCase();
    var i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    Result = p.substring(i + 1);
  end;
end;

{ Returns the current line array for a file: localStorage shadow first
  (games' own writes), then the build-time map. null when absent. }
function GetLines(const name: string): JSValue;
begin
  Result := nil;
  asm
    var ls = null;
    try { ls = localStorage.getItem('retro:' + (window.__retroSlug || 'game') + ':' + name); } catch (e) {}
    if (ls != null) { Result = JSON.parse(ls); return Result; }
    var m = window.__retroFiles || {};
    Result = Object.prototype.hasOwnProperty.call(m, name) ? m[name] : null;
  end;
end;

procedure PutLines(const name: string; lines: JSValue);
begin
  asm
    try { localStorage.setItem('retro:' + (window.__retroSlug || 'game') + ':' + name, JSON.stringify(lines)); } catch (e) {}
  end;
end;

procedure Assign(var f: Text; const path: string);
begin
  f.name := NormName(path);
  f.cursor := 0;
  f.mode := 0;
end;

procedure Reset(var f: Text);
begin
  if GetLines(f.name) = nil then RTE(2);
  f.cursor := 0;
  f.mode := 1;
end;

procedure Append(var f: Text);
begin
  if GetLines(f.name) = nil then RTE(2);
  f.mode := 2;
end;

procedure ReadlnT(var f: Text; var s: string);
var
  lines: JSValue;
begin
  if f.mode <> 1 then RTE(104); // not open for input
  lines := GetLines(f.name);
  if lines = nil then RTE(2);
  asm
    if (f.cursor >= lines.length) { $impl.RTE(100); }
    s.set(lines[f.cursor]);
  end;
  f.cursor := f.cursor + 1;
end;

procedure ReadlnLong(var f: Text; var n: longint);
var
  s: string;
  v: double;
begin
  ReadlnT(f, s);
  asm
    var t = s.trim();
    v = t === '' ? NaN : Number(t);
  end;
  if not (v = v) then RTE(106); // NaN check: invalid numeric format
  n := trunc(v);
end;

procedure WritelnT(var f: Text; const s: string);
var
  lines: JSValue;
begin
  if f.mode <> 2 then RTE(105); // not open for output
  lines := GetLines(f.name);
  if lines = nil then RTE(2);
  asm
    lines.push(s);
  end;
  PutLines(f.name, lines);
end;

procedure WritelnLong(var f: Text; n: longint);
var
  s: string;
begin
  asm
    s = String(n);
  end;
  WritelnT(f, s);
end;

function EofT(var f: Text): boolean;
var
  lines: JSValue;
begin
  lines := GetLines(f.name);
  Result := true;
  asm
    Result = (lines == null) || (f.cursor >= lines.length);
  end;
end;

function Eof: boolean;
begin
  Result := false;
end;

procedure Halt;
begin
  asm
    try { parent.postMessage({ type: 'retro:quit' }, '*'); } catch (e) {}
    throw new Error('halt');
  end;
end;

end.
