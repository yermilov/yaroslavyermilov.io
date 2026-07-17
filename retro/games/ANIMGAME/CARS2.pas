{ CARS2 (2005) — text-mode: two * stars fall inside the Box frame while the
  ▲ car dodges along the bottom with ← →.
  Original: /Users/yarik/games/ANIMGAME/CARS/CARS2.PAS.

  The diff against the original, in full:
  - the program body moved into `procedure Main; async;` + `await(Main)`;
  - `await(...)` around delay (JS cannot block) — this is also the frame
    pacing, exactly as in the original polling loop (InKey is non-blocking by
    design there, so no extra yield is needed).
  Everything else — including the InKey helper and t_graph — compiles as
  written in 2005. }
program cars2;
uses t_graph,crt;
var x1,hy,hx,i,y1,x2,y2,cx,cy:byte;
    ch:byte;
const duration=5000;

function InKey:char;
begin
     if keypressed then
             InKey:=Readkey;
end;

procedure Main; async;
begin
textbackground(0);
ClrScr;
Box(20,1,60,24,15,10);
textcolor(4);
randomize;
y1:=1;
y2:=1;
cx:=40;
x1:=random(40)+20;
x2:=random(40)+20;
repeat
         inc(y1);
         randomize;
         textbackground(10);
         textcolor(0);
         gotoxy(x1,y1-1);
         write(' ');
         gotoxy(x1,y1);
         write('*');
         if y1=24 then
         begin
         gotoxy(x1,24);
         write(' ');
         gotoxy(x2,y2-1);
         write(' ');
         y2:=y1;
         y1:=1;
         x1:=x2;
         x2:=random(40)+20;
         end;
         if y1>3 then begin
         gotoxy(x2,y2-1);
         write(' ');
         gotoxy(x2,y2);
         write('*');
         inc(y2);
         if y2=24 then
         begin
         y2:=1;
         gotoxy(x2,24);
         write(' ');
         x2:=x1;
         end;
         end;
         ch:=ord(inkey);
         if (ch=75) or (ch=77) then
         begin
         gotoxy(cx,24);
         write(' ');
         case ch of
         75:cx:=cx-1;
         77:cx:=cx+1;
         end;
         end;
         if cx=20 then cx:=21;
         if cx=60 then cx:=59;
         gotoxy(cx,24);
         textcolor(0);
         write(#30);
         textcolor(green);
         await(delay(duration));
         if y2=24 then x2:=random(40)+20;
until ch=27;
end;

begin
Main;
end.
