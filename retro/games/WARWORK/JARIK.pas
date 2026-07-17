unit jarik;

interface

procedure VerticalText(x,y:byte;str:string);
function InKey:char;

implementation

uses crt;

procedure VerticalText(x,y:byte;str:string);
var i:byte;
    s:string;
begin
     s:=str;
     for i:=1 to length(str) do
         begin
              gotoxy(x,y);
              write(s[i]);
              y:=y+1;
         end;
end;

function InKey:char;
begin
if keypressed then Inkey:=Readkey;
end;

end.
