{ PUSHKA (2008) — ballistics: plot a projectile's flight for a given angle,
  speed and start point. Original: /Users/yarik/games/PUSHKA/SUPER.PAS.

  The diff against the original, in full (see also retro/README.md):
  - the program body moved into `procedure Main; async;` + `await(Main)` — the
    standard pas2js concession (JS cannot block);
  - `writeln(...); readln(...)` prompts → `await(AskReal(...))` (a browser has
    no console to ReadLn from; the crt shim renders the DOS-style prompt).
    readln(x0,y0) read two numbers on one line — split into two prompts;
  - the coord.txt trace (Assign/rewrite/writeln(x,' ',y)/close) is removed —
    no file system in the browser, and without the redirect the writeln would
    just flood the console;
  - `await(Yield)` added in the plot loop — the original busy-loops until
    keypressed, which in a browser would freeze the tab and the keypress could
    never arrive; Yield is a fast MessageChannel yield (paint + input).
  Everything else — the physics, the flow, Duration (declared, never called,
  kept verbatim) — compiles as written in 2008. }
uses crt,graph,dos,nls;
var y,x,v,x0,y0:word;
    alfa,t:real;
    Gd,Gm:integer;

    procedure Duration(n:real);
var h,m,s,d:word;
    TimeNow,TimeEnd:real;
begin
     GetTime(h,m,s,d);
     TimeNow:=h*3600+m*60+s+d/100;
     TimeEnd:=TimeNow+n;
     repeat
           GetTime(h,m,s,d);
           TimeNow:=h*3600+m*60+s+d/100;
     until TimeNow>=TimeEnd;
end;

procedure Main; async;
begin
     clrscr;
     alfa:=await(double, AskReal(Loc('Angle (deg)','Кут (градуси)')));
     alfa:=alfa*pi/180;
     v:=trunc(await(double, AskReal(Loc('Speed','Швидкість'))));
     x0:=trunc(await(double, AskReal(Loc('Start X','Координата X'))));
     y0:=trunc(await(double, AskReal(Loc('Start Y','Координата Y'))));
     t:=0;
     Gd:=Detect;
     InitGraph(Gd,Gm,'');
     SetColor(15);
     repeat
           x:=trunc(x0+v*t*cos(alfa));
           y:=trunc(y0+v*t*sin(alfa)-9.81*t*t/2);
           y:=480-y;
           Circle(x,y,5);
           t:=t+0.0001;
           await(Yield);
     until (keypressed);
     readkey;
end;

begin
     Main;
end.
