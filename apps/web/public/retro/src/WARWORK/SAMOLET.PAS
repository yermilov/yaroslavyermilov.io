program VetGame1;
  uses crt;
  var x,y,x1,y1,x2,y2,z:integer;          c :char;
procedure sam1;
  begin
    window(1,12,10,12);
    textbackground(15);
    clrscr;
  end;
procedure text;
  begin
   textbackground(15);
   clrscr;
  end;
procedure rocket;
  begin
  window(10,12,13,12);
  textbackground(red);
  clrscr;
  end;
begin
  textbackground(0);
  clrscr;
  window(1,18,80,25);
  textbackground(green);
  clrscr;
  window(1,1,80,18);
  textbackground(blue);
  clrscr;
  x1:=1;
  y1:=12;
  x2:=10;
  y2:=12;
  {z:=5;}
  repeat
    window(x1,y1,x2,y2);
    sam1;
    c:=readkey;
    case c of
     #72: begin
           delay(15000);
           window(x1,y1,x2,y2);
           write(' ');
           x1:=x1+2;
           y1:=y1-1;
           x2:=x2+2;
           y2:=y2-1;
           window(x1,y1,x2,y2);
           sam1;
          end;
     #77: begin
           delay(15000);
           window(x1,y1,x2,y2);
           text;
           x1:=x1+5;
           x2:=x2+5;
           window(x1,y1,x2,y2);
           text;
           sam1;
          end;
     #80: begin
           delay(15000);
           {window(x1,y1,x2,y2);}
           sam1;
           text;
           x1:=x1+5;
           y1:=y1+1;
           x2:=x2+5;
           y2:=y2+1;
           window(x1,y1,x2,y2);
           sam1;
          end;
     #13:  begin

             gotoxy(10,12);
             x:=x+3;
             gotoxy(x,y);
             write('*');
            end;
            end;
    if y1 =18
     then begin
      window(1,1,80,25);
      sound(100);
      textbackground(red);
      clrscr;
      delay(60000);
      nosound;
      end;
until c=#27;
  readln;
end.