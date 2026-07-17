program cars1;
uses t_graph,crt;
const duration=1000;
var cx:byte;
    ch:byte;
begin
textbackground(0);
ClrScr;
cx:=40;
Box(20,1,60,24,15,10);
textcolor(0);
repeat
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
         delay(duration*3);
         end;
         if cx=20 then cx:=21;
         if cx=60 then cx:=59;
         gotoxy(cx,23);
         write(#30);
         gotoxy(1,1);
         textbackground(0);
         until ch=27;
end.
