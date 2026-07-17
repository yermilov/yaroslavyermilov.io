unit HelpUnit;

interface

procedure Duration(n:real);

implementation

uses dos;

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

end.