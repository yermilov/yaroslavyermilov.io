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

function KeyPressed: boolean;
function ReadKey: char;
function Delay(ms: integer): TJSPromise;
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

procedure Push(c: char);
begin
  SetLength(Queue, Length(Queue) + 1);
  Queue[Length(Queue) - 1] := c;
end;

function OnKeyDown(aEvent: TJSKeyboardEvent): boolean;
begin
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
  Result := TJSPromise.New(
    procedure(resolve, reject: TJSPromiseResolver)
    begin
      window.setTimeout(procedure begin resolve(0); end, wait);
    end);
end;

procedure ClrScr;
begin
  ClearDevice;
end;

procedure Randomize;
begin
end;

procedure Readln;
begin
end;

end.
