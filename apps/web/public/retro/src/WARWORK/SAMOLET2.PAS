program Vgame1;
  uses crt;
  var x,y,z:integer;       c:char;
begin
  textbackground(0);
  clrscr;
  window(1,18,80,25);
  textbackground(green);
  clrscr;
  window(1,1,80,18);
  textbackground(blue);
  clrscr;
  x:=1;
  y:=12;
  repeat
   gotoxy(x,y);
   window(1,12,10,12);
   textbackground(15);
   c:=Upcase(readkey);
   case c of
    #72: begin
          gotoxy(x,y);
          write(' ');
          y:=y-1;
          gotoxy(x,y);
          window(1,12,10,12);
         end;
    end;
  until c=#27;
  readln;
end.
