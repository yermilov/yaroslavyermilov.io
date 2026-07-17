unit t_graph;
interface
uses crt;

procedure gorizontal(x1,y,x2,uc,dc:byte);
procedure vertical(y1,x,y2,uc,dc:byte);
procedure line(x1,y1,x2,y2,uc,dc:byte);
procedure box(x1,y1,x2,y2,uc,dc:byte);
procedure cleanbox(x1,y1,x2,y2:byte);
procedure ClrBox (x1,y1,x2,y2:byte);

implementation

procedure ClrBox (x1,y1,x2,y2:byte);
var x,y:byte;
begin
for y:=y1 to y2 do
    for x:=x1 to x2 do
        begin
             gotoxy (x,y);
             write (' ');
        end;
end;

procedure gorizontal(x1,y,x2,uc,dc:byte);
var n:byte;
begin
     textcolor(uc);
     textbackground(dc);
     gotoxy(x1,y);
     for n:=x1 to x2 do
         write('-');
end;

procedure vertical(y1,x,y2,uc,dc:byte);
var n:byte;
begin
     textcolor(uc);
     textbackground(dc);
     for n:=y1 to y2 do
               begin
                    gotoxy (x,n);
                    write('|');
               end;
end;

procedure line(x1,y1,x2,y2,uc,dc:byte);
begin
     textcolor(uc);
     textbackground(dc);
     if y1=y2 then
                  gorizontal(x1,y1,x2,uc,dc)
              else
                  if x1=x2 then
                               vertical(y1,x1,y2,uc,dc)
                           else
                               begin
                                    writeln('В текстовом режиме невозможно выводить косые линии');
                                    exit;
                               end;
end;

procedure box (x1,y1,x2,y2,uc,dc:byte);
var x,y:byte;
begin
     textcolor(uc);
     textbackground(0);
     line(x1,y1,x1,y2,uc,0);
     line(x1,y1,x2,y1,uc,0);
     line(x1,y2,x2,y2,uc,0);
     line(x2,y1,x2,y2,uc,0);
     gotoxy(x1,y1);
     write(#218);
     gotoxy(x2,y1);
     write(#191);
     gotoxy(x1,y2);
     write(#192);
     gotoxy(x2,y2);
     write(#217);
     textbackground(dc);
     for y:=y1 to y2 do
               for x:=x1 to x2 do
                         begin
                              gotoxy (x,y);
                              write (' ');
                         end;
end;

procedure cleanbox (x1,y1,x2,y2:byte);
begin
     line(x1,y1,x1,y2,15,0);
     line(x1,y1,x2,y1,15,0);
     line(x1,y2,x2,y2,15,0);
     line(x2,y1,x2,y2,15,0);
     gotoxy(x1,y1);
     write(#218);
     gotoxy(x2,y1);
     write(#191);
     gotoxy(x1,y2);
     write(#192);
     gotoxy(x2,y2);
     write(#217);
end;
end.

