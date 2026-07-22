{ mouse — the author's own INT 33h wrapper unit (games/_інше/UNITS/mouse.pas),
  reimplemented over canvas events with the SAME polling interface: the games
  spin on MouseX/MouseY/LeftButton exactly like they polled the DOS driver.

  Coordinates map browser clientX/Y into the 640×480 BGI space through the
  canvas's object-fit:contain letterboxing (the canvas element stretches to
  the viewport, the drawing keeps its aspect — the same math the eye does).
  ShowMouse/HideMouse toggle the OS cursor over the canvas: DOS drew its own
  arrow when "shown"; here the browser's arrow plays that part.

  ⚠️ The DOS games poll these in delay-less `repeat until` loops (WW3's menus).
  That was fine against a hardware interrupt driver, but in a browser a tight
  loop starves the event loop — the PORT must put an await(Yield) (or Delay)
  inside such loops or the mouse state never updates. }
unit mouse;

interface

function  InitMouse: boolean;
procedure ShowMouse;
procedure HideMouse;
function  MouseX: word;
function  MouseY: word;
function  LeftButton: boolean;
function  RightButton: boolean;
function  CenterButton: boolean;

implementation

uses Web;

var
  Installed: boolean = false;
  MX: integer = 320;
  MY: integer = 240;
  BL: boolean = false;
  BR: boolean = false;
  BC: boolean = false;

procedure Install;
begin
  if Installed then exit;
  Installed := true;
  asm
    var canvas = document.getElementById('screen');
    if (!canvas) return;
    var track = function (e) {
      var r = canvas.getBoundingClientRect();
      // object-fit:contain: the 640×480 drawing is centered at uniform scale.
      var scale = Math.min(r.width / 640, r.height / 480);
      if (scale <= 0) return;
      var ox = (r.width - 640 * scale) / 2;
      var oy = (r.height - 480 * scale) / 2;
      var x = Math.round((e.clientX - r.left - ox) / scale);
      var y = Math.round((e.clientY - r.top - oy) / scale);
      $impl.MX = Math.max(0, Math.min(639, x));
      $impl.MY = Math.max(0, Math.min(479, y));
    };
    // The DOS games sample LeftButton at discrete poll points in their menu
    // loops (await(Yield) between checks). Two failure modes had to be closed:
    //   (1) many synthetic click injectors leave e.buttons === 0 on mousedown,
    //       so the old bitmask-only read NEVER saw the press — the WARWORK menu
    //       could not be left with a programmatic click;
    //   (2) a fast/synthetic click's pressed window can fall entirely BETWEEN
    //       two polls and be missed.
    // Fix: latch by button INDEX on down/up (the index is set even when the
    // bitmask is not), and hold the button "down" for a short grace after
    // release so at least one poll observes every click.
    var GRACE = 140;
    var relTimer = { 0: 0, 1: 0, 2: 0 };
    var slot = { 0: 'BL', 1: 'BC', 2: 'BR' }; // DOM button index → shim field
    var press = function (b) {
      var f = slot[b];
      if (f === undefined) return;
      clearTimeout(relTimer[b]);
      $impl[f] = true;
    };
    var release = function (b) {
      var f = slot[b];
      if (f === undefined) return;
      clearTimeout(relTimer[b]);
      relTimer[b] = setTimeout(function () { $impl[f] = false; }, GRACE);
    };
    document.addEventListener('mousemove', function (e) {
      track(e);
      // Keep a held button latched while dragging (real hardware sets the mask).
      if (e.buttons & 1) $impl.BL = true;
      if (e.buttons & 2) $impl.BR = true;
      if (e.buttons & 4) $impl.BC = true;
    });
    document.addEventListener('mousedown', function (e) { track(e); press(e.button); });
    document.addEventListener('mouseup', function (e) { track(e); release(e.button); });
    // The games poll LeftButton to "click" menu buttons — context menu on
    // right-click would steal the RightButton presses.
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  end;
end;

function InitMouse: boolean;
begin
  Install;
  Result := true;
end;

procedure ShowMouse;
begin
  Install;
  asm
    var c = document.getElementById('screen');
    if (c) c.style.cursor = 'default';
  end;
end;

procedure HideMouse;
begin
  Install;
  asm
    var c = document.getElementById('screen');
    if (c) c.style.cursor = 'none';
  end;
end;

function MouseX: word;
begin
  Install;
  Result := MX;
end;

function MouseY: word;
begin
  Install;
  Result := MY;
end;

function LeftButton: boolean;
begin
  Result := BL;
end;

function RightButton: boolean;
begin
  Result := BR;
end;

function CenterButton: boolean;
begin
  Result := BC;
end;

end.
