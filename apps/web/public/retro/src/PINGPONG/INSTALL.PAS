program Install;
uses mouse,graph,crt,dos;

procedure InitInstall;
var errorcode,gd,gm:integer;
begin
     gd:=Detect;
     InitGraph(gd,gm,'');
     ErrorCode:=GraphResult;
end;

begin
end.