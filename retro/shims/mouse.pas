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
    var buttons = function (e) {
      $impl.BL = (e.buttons & 1) !== 0;
      $impl.BR = (e.buttons & 2) !== 0;
      $impl.BC = (e.buttons & 4) !== 0;
    };
    document.addEventListener('mousemove', function (e) { track(e); buttons(e); });
    document.addEventListener('mousedown', function (e) { track(e); buttons(e); });
    document.addEventListener('mouseup', function (e) { track(e); buttons(e); });
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
