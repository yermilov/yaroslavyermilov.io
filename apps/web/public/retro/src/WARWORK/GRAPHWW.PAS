program GraphWarWork; {5.04.2005 19:17 - 5.04.2005 21:27 |2:10| }
uses graph,crt,jarik;
const duration=1000;
var pmx,pmy,bx,by:integer;
    height:string;
    bomb:boolean;


procedure MakePlane(color:byte);
begin
     SetColor(color);
     SetFillStyle(1,color);
     Line(pmx+3,pmy-3,pmx-3,pmy+3);
     Line(pmx-3,pmy+3,pmx+3,pmy+3);
     Line(pmx+3,pmy-3,pmx+23,pmy-3);
     Line(pmx+23,pmy-3,pmx+23,pmy+3);
     Line(pmx-3,pmy+3,pmx+23,pmy+3);
     Line(pmx+17,pmy-3,pmx+20,pmy-10);
     Line(pmx+20,pmy-10,pmx+23,pmy-10);
     Line(pmx+23,pmy-10,pmx+23,pmy-3);
     Line(pmx+7,pmy,pmx+15,pmy+7);
     Line(pmx+15,pmy+7,pmx+20,pmy+7);
     Line(pmx+20,pmy+7,pmx+12,pmy);
     FloodFill(pmx+16,pmy+5,color);
     FloodFill(pmx+21,pmy-9,color);
     FloodFill(pmx+4,pmy-2,color);
end;

procedure Behind;
begin
     ClearDevice;
     SetColor(1);
     SetFillStyle(1,1);
     Rectangle(1,1,640,300);
     FloodFill(2,2,1);
     SetColor(2);
     SetFillStyle(1,2);
     Rectangle(1,301,640,400);
     FloodFill(2,302,2);
end;

procedure PlaneFire;
var c,col:byte;
begin
     Repeat
           c:=random(5)+1;
           case c of
           1:col:=4;
           2:col:=5;
           3:col:=12;
           4:col:=13;
           5:col:=14;
           end;
           SetColor(col);
           Circle(pmx+10,pmy,45);
           SetFillStyle(1,col);
           FloodFill(pmx-34,pmy,col);
           FloodFill(pmx+54,pmy,col);
           SetColor(2);
           Rectangle(1,300,640,400);
           SetFillStyle(1,2);
           FloodFill(pmx-19,301,2);
           FloodFill(pmx+69,301,2);
           SetColor(2);
           Circle(pmx+10,pmy,45);
           Delay(500);
     until keypressed;
     Delay(50000);
     Halt;
end;

procedure BombFire;
var c,col:byte;
    i,j:integer;
begin
     for i:=1 to 50 do
         begin
           c:=random(5)+1;
           case c of
           1:col:=4;
           2:col:=5;
           3:col:=12;
           4:col:=13;
           5:col:=14;
           end;
           SetColor(col);
           Circle(bx+10,by,45);
           SetFillStyle(1,col);
           FloodFill(bx-34,by,col);
           FloodFill(bx+54,by,col);
           SetColor(2);
           Rectangle(1,300,640,400);
           SetFillStyle(1,2);
           FloodFill(bx-19,301,2);
           FloodFill(bx+69,301,2);
           SetColor(2);
           Circle(bx+10,by,45);
           Delay(500);
       end;
     Bomb:=false;
     for i:=1 to 640 do
         for j:=250 to 299 do
             PutPixel(i,j,1);
end;

procedure BombMaker(color:byte);
begin
     SetColor(color);
     SetFillStyle(1,color);
     Circle(bx,by,4);
     FloodFill(bx,by,color);
end;

procedure Game;
var key:char;
    i,j:integer;
    speed:string;
begin
     Behind;
     MakePlane(0);
     repeat
     Key:=UpCase(InKey);
     case Key of
     #72:begin
              MakePlane(1);
              pmy:=pmy-1;
              MakePlane(0);
         end;
    #75:begin
              MakePlane(1);
              pmx:=pmx-1;
              MakePlane(0);
         end;
    #77:begin
              MakePlane(1);
              pmx:=pmx+1;
              MakePlane(0);
         end;
    #80:begin
              MakePlane(1);
              pmy:=pmy+1;
              MakePlane(0);
         end;
    'B':If bomb=false then
           begin
           bx:=pmx+15;
           by:=pmy+10;
           bomb:=true;
           end;
    end;
    If pmx<=1 then
    begin
    MakePlane(1);
    pmx:=614;
    MakePlane(0);
    end;
    If pmx>=615 then
    begin
    MakePlane(1);
    pmx:=2;
    MakePlane(0);
    end;
    If pmy<=10 then
    begin
    MakePlane(1);
    pmy:=10;
    MakePlane(0);
    end;
    If pmy>=295 then
    begin
    MakePlane(1);
    pmy:=290;
    MakePlane(0);
    end;
    MakePlane(1);
    dec(pmx);
    MakePlane(0);
    If bomb then
    begin
    BombMaker(1);
    inc(by);
    BombMaker(0);
    end;
    if (by=300) and (bomb=true) then BombFire;
    For i:=100 to 164 do
        For j:=425 to 450 do
            PutPixel(i,j,0);
    SetColor(15);
    SetTextStyle(1,HorizDir,1);
    Str((300-pmy)*50,height);
    OutTextXy(10,425,'Height - ');
    OutTextXy(100,425,height);
    OutTextXy(165,425,' metres');
    If (300-pmy)*50<500 then PlaneFire;
    Delay(Duration Div 10);
    until Key=#27;
end;

procedure StartGame;
begin
     pmx:=500;
     pmy:=250;
     bomb:=false;
     randomize;
     repeat
     SetColor(random(15)+1);
     SetTextStyle(4,HorizDir,15);
     OutTextXY(75,50,'WarWork');
     SetTextStyle(5,HorizDir,5);
     OutTextXy(10,250,'CopyRight By Yermilov Yaroslav');
     OutTextXy(75,350,'Version 1.0 April 2005');
     Delay(Duration*3);
     until keypressed;
     ClearDevice;
     Game;
end;

procedure InitGraphWarWork;
var Gd,Gm,ErrorCode:integer;
begin
Gd:=Detect;
InitGraph(Gd,Gm,'');
ErrorCode:=GraphResult;
If ErrorCode=GrOk then
   StartGame
                  else
   begin
        TextBackGround(0);
        TextColor(15);
        ClrScr;
        write('Error:',GraphErrorMsg(ErrorCode));
        readln;
   end;
   Delay(10000);
   CloseGraph;
end;

begin
InitGraphWarWork;
end.