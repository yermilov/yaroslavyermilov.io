{ CARS1 (2005) — text-mode: drive the ▲ car along the bottom of a Box frame
  with ← →. Original: /Users/yarik/games/ANIMGAME/CARS/CARS1.PAS.

  The diff against the original, in full:
  - the program body moved into `procedure Main; async;` + `await(Main)`;
  - `await(...)` around delay (JS cannot block);
  - `await(Yield);` added at the top of the loop: the original blocks inside
    readkey until a key arrives — the browser shim's ReadKey is non-blocking
    (returns #0 when the queue is empty), so without a yield the repeat would
    spin the tab dead and no key could ever arrive.
  Everything else compiles as written in 2005 (t_graph is the original unit,
  verbatim). }
program cars1;
uses t_graph,crt;
const duration=1000;
var cx:byte;
    ch:byte;

procedure Main; async;
begin
textbackground(0);
ClrScr;
cx:=40;
Box(20,1,60,24,15,10);
textcolor(0);
repeat
         await(Yield);
         textbackground(10);
         ch:=ord(readkey);
         if (ch=75) or (ch=77) then
         begin
         gotoxy(cx,23);
         write(' ');
         case ch of
         75:cx:=cx-1;
         77:cx:=cx+1;
         end;
         await(delay(duration*3));
         end;
         if cx=20 then cx:=21;
         if cx=60 then cx:=59;
         gotoxy(cx,23);
         write(#30);
         gotoxy(1,1);
         textbackground(0);
         until ch=27;
end;

begin
Main;
end.
