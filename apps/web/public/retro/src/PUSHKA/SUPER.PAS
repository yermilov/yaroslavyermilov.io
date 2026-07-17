uses crt,graph,dos;
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

begin
     clrscr;
     writeln('Print alfa');
     readln(alfa);
     alfa:=alfa*pi/180;
     writeln('Print speed');
     readln(v);
     writeln('Print coordinates');
     readln(x0,y0);
     t:=0;
     Gd:=Detect;
     InitGraph(Gd,Gm,'');
     SetColor(15);
     Assign(output,'coord.txt');
     rewrite(output);
     repeat
           x:=trunc(x0+v*t*cos(alfa));
           y:=trunc(y0+v*t*sin(alfa)-9.81*t*t/2);
           y:=480-y;
           writeln(x,' ',y);
           Circle(x,y,5);
           t:=t+0.0001;
     until (keypressed);
     readkey;
     close(output);
end.




