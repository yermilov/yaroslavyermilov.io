{ A BGI-compatible `graph` unit for pas2js.

  The original Turbo Pascal games read the framebuffer back: PINGPONG does its
  collision detection with GetPixel(x, y-6) <> 0 and erases sprites by drawing
  them in colour 0 and FloodFill-ing. That only behaves correctly on a
  PALETTE-INDEXED surface with no anti-aliasing — if we drew with Canvas2D
  primitives, the AA fringe on a circle would leave non-black pixels behind and
  the ball would collide with its own ghost.

  So we keep BGI's actual model: a 640x480 byte framebuffer of colour indices,
  integer rasterisers (Bresenham line, midpoint circle, scanline flood), and a
  requestAnimationFrame loop that blits it to a canvas. GetPixel then returns a
  real colour index, exactly as on DOS. }
unit graph;

{$mode objfpc}

interface

const
  Detect = 0;
  GrOk = 0;
  grNotDetected = -2;

  SolidFill = 1;

  { BGI text direction + a handful of font ids — WW3 selects stroked fonts by
    number; the shim renders them all with the one embedded VGA face. }
  HorizDir = 0;
  VertDir = 1;

  ScreenW = 640;
  ScreenH = 480;

procedure InitGraph(var gd, gm: integer; const path: string);
procedure CloseGraph;
{ True once InitGraph has taken the canvas — crt.ClrScr dispatches on this. }
function GraphActive: boolean;
function GraphResult: integer;
function GraphErrorMsg(code: integer): string;

procedure SetColor(c: word);
procedure SetFillStyle(pattern, c: word);
function GetMaxX: integer;
function GetMaxY: integer;

procedure PutPixel(x, y: integer; c: word);
function GetPixel(x, y: integer): word;
procedure Line(x1, y1, x2, y2: integer);
procedure Rectangle(x1, y1, x2, y2: integer);
procedure Bar(x1, y1, x2, y2: integer);
procedure Circle(x, y: integer; r: word);
procedure Arc(x, y: integer; stAngle, endAngle, r: word);
procedure FloodFill(x, y: integer; border: word);
procedure ClearDevice;
{ BGI text in graph mode. The framebuffer is palette-indexed and FloodFill/
  GetPixel READ it, so text cannot go through fillText on the visible canvas —
  OutTextXY rasterises glyphs on a scratch canvas and stamps opaque pixels into
  the framebuffer with the current colour. SetTextStyle keeps only the SIZE
  (approx. BGI charsize → pixel height); font id and direction are accepted and
  ignored (all text renders horizontally with the embedded VGA face — the
  games' four stroked fonts are beyond a faithful 16-colour raster shim). }
procedure SetTextStyle(font, direction, charsize: word);
procedure OutTextXY(x, y: integer; const s: string);

implementation

// crt is used at IMPLEMENTATION level only (crt's impl uses graph the same
// way) — InitGraph must shut the text renderer down when it takes the canvas.
uses JS, Web, WebOrWorker, SysUtils, crt;   // TJSImageData / the 2D context live in WebOrWorker

var
  FB: array of byte;          // colour index per pixel — the BGI surface
  CurColor: byte = 15;
  FillColor: byte = 15;
  LastResult: integer = grOk;
  Canvas: TJSHTMLCanvasElement;
  Ctx: TJSCanvasRenderingContext2D;
  Img: TJSImageData;

// EGA/VGA 16-colour palette, as BGI ordered it.
const
  PalR: array[0..15] of byte = (0,   0,   0,   0, 168, 168, 168, 168,  84,  84,  84,  84, 255, 255, 255, 255);
  PalG: array[0..15] of byte = (0,   0, 168, 168,   0,   0,  84, 168,  84,  84, 255, 255,  84,  84, 255, 255);
  PalB: array[0..15] of byte = (0, 168,   0, 168,   0, 168,   0, 168,  84, 255,  84, 255,  84, 255,  84, 255);

function GetMaxX: integer;
begin
  Result := ScreenW - 1;
end;

function GetMaxY: integer;
begin
  Result := ScreenH - 1;
end;

procedure Present;
var
  i, n: integer;
  d: TJSUint8ClampedArray;
  c: byte;
begin
  if Ctx = nil then exit;
  d := Img.data;
  n := ScreenW * ScreenH;
  for i := 0 to n - 1 do
  begin
    c := FB[i];
    d[i * 4    ] := PalR[c];
    d[i * 4 + 1] := PalG[c];
    d[i * 4 + 2] := PalB[c];
    d[i * 4 + 3] := 255;
  end;
  Ctx.putImageData(Img, 0, 0);
end;

procedure Frame(aTime: TJSDOMHighResTimeStamp);
begin
  Present;
  window.requestAnimationFrame(@Frame);
end;

function GraphActive: boolean;
begin
  Result := Ctx <> nil;
end;

procedure InitGraph(var gd, gm: integer; const path: string);
begin
  TextShutdown; // a ClrScr before InitGraph may have booted the text renderer
  Canvas := TJSHTMLCanvasElement(document.getElementById('screen'));
  if Canvas = nil then
  begin
    LastResult := grNotDetected;
    exit;
  end;
  Canvas.width := ScreenW;
  Canvas.height := ScreenH;
  Ctx := TJSCanvasRenderingContext2D(Canvas.getContext('2d'));
  Img := Ctx.createImageData(ScreenW, ScreenH);
  SetLength(FB, ScreenW * ScreenH);
  ClearDevice;
  LastResult := grOk;
  gm := 0;
  window.requestAnimationFrame(@Frame);
end;

procedure CloseGraph;
begin
  // Nothing to release: the canvas stays on the page.
end;

function GraphResult: integer;
begin
  Result := LastResult;
end;

function GraphErrorMsg(code: integer): string;
begin
  if code = grOk then Result := ''
  else Result := 'Graphics error ' + IntToStr(code);
end;

procedure SetColor(c: word);
begin
  CurColor := c and 15;
end;

procedure SetFillStyle(pattern, c: word);
begin
  // Only SolidFill is used by these games; the pattern is accepted and ignored.
  FillColor := c and 15;
end;

procedure PutPixel(x, y: integer; c: word);
begin
  if (x < 0) or (y < 0) or (x >= ScreenW) or (y >= ScreenH) then exit;
  FB[y * ScreenW + x] := c and 15;
end;

function GetPixel(x, y: integer): word;
begin
  if (x < 0) or (y < 0) or (x >= ScreenW) or (y >= ScreenH) then
    Result := 0
  else
    Result := FB[y * ScreenW + x];
end;

procedure ClearDevice;
var
  i: integer;
begin
  // A ClrScr before InitGraph (DOS text-mode clear — PUSHKA does this) must be
  // a no-op, not a crash: the framebuffer only exists after InitGraph.
  if Length(FB) = 0 then exit;
  for i := 0 to ScreenW * ScreenH - 1 do
    FB[i] := 0;
end;

// Bresenham — integer only, so no anti-aliased fringe.
procedure Line(x1, y1, x2, y2: integer);
var
  dx, dy, sx, sy, err, e2: integer;
begin
  dx := Abs(x2 - x1);
  dy := -Abs(y2 - y1);
  if x1 < x2 then sx := 1 else sx := -1;
  if y1 < y2 then sy := 1 else sy := -1;
  err := dx + dy;
  while true do
  begin
    PutPixel(x1, y1, CurColor);
    if (x1 = x2) and (y1 = y2) then break;
    e2 := 2 * err;
    if e2 >= dy then
    begin
      err := err + dy;
      x1 := x1 + sx;
    end;
    if e2 <= dx then
    begin
      err := err + dx;
      y1 := y1 + sy;
    end;
  end;
end;

procedure Rectangle(x1, y1, x2, y2: integer);
begin
  Line(x1, y1, x2, y1);
  Line(x2, y1, x2, y2);
  Line(x2, y2, x1, y2);
  Line(x1, y2, x1, y1);
end;

// BGI's Bar fills with the fill colour and draws no outline.
procedure Bar(x1, y1, x2, y2: integer);
var
  x, y, t: integer;
begin
  if x1 > x2 then begin t := x1; x1 := x2; x2 := t; end;
  if y1 > y2 then begin t := y1; y1 := y2; y2 := t; end;
  for y := y1 to y2 do
    for x := x1 to x2 do
      PutPixel(x, y, FillColor);
end;

// Midpoint circle, drawn in the current colour.
procedure Circle(x, y: integer; r: word);
var
  cx, cy, err: integer;
begin
  cx := r;
  cy := 0;
  err := 1 - cx;
  while cx >= cy do
  begin
    PutPixel(x + cx, y + cy, CurColor);
    PutPixel(x + cy, y + cx, CurColor);
    PutPixel(x - cy, y + cx, CurColor);
    PutPixel(x - cx, y + cy, CurColor);
    PutPixel(x - cx, y - cy, CurColor);
    PutPixel(x - cy, y - cx, CurColor);
    PutPixel(x + cy, y - cx, CurColor);
    PutPixel(x + cx, y - cy, CurColor);
    Inc(cy);
    if err < 0 then
      err := err + 2 * cy + 1
    else
    begin
      Dec(cx);
      err := err + 2 * (cy - cx) + 1;
    end;
  end;
end;

{ BGI FloodFill: starting at the seed, replace every connected pixel whose
  colour is NOT `border` with the current fill colour. If the seed itself is
  already the border colour, nothing happens — which is load-bearing: PINGPONG
  erases the ball with MakeBall(x, y, r, 0), i.e. a black circle plus
  FloodFill(x, y, 0), and that must be a no-op once the area is already black. }

procedure Arc(x, y: integer; stAngle, endAngle, r: word);
var
  a, endA: integer;
  rad: double;
begin
  { BGI angles: degrees, counter-clockwise, 0 = east; y grows downward.
    A wrapped arc (start > end, e.g. 270→90) passes through 0° — WarWork's
    tank halves are exactly that; skipping them leaves the outline open and
    the tank's FloodFill spills across the screen. }
  endA := endAngle;
  if endA < stAngle then endA := endA + 360;
  a := stAngle;
  while a <= endA do
  begin
    rad := a * 3.14159265358979 / 180.0;
    PutPixel(x + Round(r * cos(rad)), y - Round(r * sin(rad)), CurColor);
    a := a + 1;
  end;
end;

var
  TextPxH: integer = 16;

procedure SetTextStyle(font, direction, charsize: word);
begin
  { charsize 1..10+ → approx pixel height; BGI default (4) ≈ regular text. }
  if charsize < 1 then charsize := 1;
  TextPxH := 6 * charsize + 8;
end;

procedure OutTextXY(x, y: integer; const s: string);
var
  px: integer;
begin
  px := TextPxH;
  asm
    var scr = document.createElement('canvas');
    var w = Math.min(1024, Math.max(8, Math.ceil(s.length * px)));
    scr.width = w; scr.height = px + 8;
    var c2 = scr.getContext('2d', { willReadFrequently: true });
    c2.font = px + "px 'IBM VGA', monospace";
    c2.textBaseline = 'top';
    c2.fillStyle = '#fff';
    c2.fillText(s, 0, 0);
    var d = c2.getImageData(0, 0, scr.width, scr.height).data;
    for (var j = 0; j < scr.height; j++) {
      for (var i = 0; i < scr.width; i++) {
        if (d[(j * scr.width + i) * 4 + 3] > 128) {
          pas.graph.PutPixel(x + i, y + j, $impl.CurColor);
        }
      }
    }
  end;
end;

procedure FloodFill(x, y: integer; border: word);
var
  stack: array of integer;
  sp, p, px, py: integer;
  b, f: byte;

  procedure Push(idx: integer);
  begin
    if sp >= Length(stack) then
      SetLength(stack, Length(stack) * 2);
    stack[sp] := idx;
    Inc(sp);
  end;

begin
  b := border and 15;
  f := FillColor;
  if (x < 0) or (y < 0) or (x >= ScreenW) or (y >= ScreenH) then exit;
  if FB[y * ScreenW + x] = b then exit;

  { Note f may legitimately EQUAL b — the blocks are coloured random(15)+1, so a
    block can be colour 15 and get flood-filled with border 15. That still
    terminates: a pixel we fill becomes b, and b-coloured pixels are skipped. }

  SetLength(stack, 4096);
  sp := 0;
  Push(y * ScreenW + x);

  while sp > 0 do
  begin
    Dec(sp);
    p := stack[sp];
    if FB[p] = b then continue;   // border — and, when f=b, also "already filled"
    if FB[p] = f then continue;   // already filled — doubles as the visited mark
    FB[p] := f;
    px := p mod ScreenW;
    py := p div ScreenW;
    if px > 0           then Push(p - 1);
    if px < ScreenW - 1 then Push(p + 1);
    if py > 0           then Push(p - ScreenW);
    if py < ScreenH - 1 then Push(p + ScreenW);
  end;
end;

end.
