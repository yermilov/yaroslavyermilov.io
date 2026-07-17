program Flags;
uses graph,mouse,crt;
const fx:array [1..10] of integer = (165,166,167,168,169,170,171,172,173,174);
      fy:array [1..10] of integer = (9,8,7,6,5,5,6,7,8,9);
      fs:array [1..10] of integer = (292,293,294,295,296,297,298,299,300,301);
var Gd,Gm,ErrorCode:integer;

function FindMouse:byte;
begin
     FindMouse:=0;
     If (MouseX>5) and (MouseX<200) and (MouseY>350) and (MouseY<450) and (leftButton) then FindMouse:=2;
     If (MouseX>400) and (MouseX<620) and (MouseY>200) and (MouseY<300) and (LeftButton) then FindMouse:=1;
     If (MouseX>250) and (MouseX<445) and (MouseY>350) and (MouseY<450) and (LeftButton) then FindMouse:=3;
end;

procedure Device;
begin
     HideMouse;
     ClearDevice;
     ShowMouse;
     SetColor(8);
     SetFillStyle(1,8);
     Bar(5,350,200,450);
     Bar(400,200,620,300);
     SetTextStyle(4,HorizDir,50);
     SetColor(7);
     OutTextXy(401,161,'Exit');
     SetTextStyle(4,HorizDir,7);
     OutTextXy(7,350,'Ukraine');
end;

Procedure Ukraine;
var y:integer;
begin
     SetColor(0);
     SetFillStyle(1,0);
     Bar(1,1,301,350);
     SetColor(7);
     SetFillStyle(1,7);
     Bar(100,10,115,350);
     For y:=250 downto 10 do
         begin
              HideMouse;
              If FindMouse=1 then Halt;
              SetColor(0);
              SetFillStyle(1,0);
              Bar(115,y+1,301,y+51);
              SetColor(1);
              SetFillStyle(1,1);
              Bar(115,y,301,y+50);
              SetColor(0);
              SetFillStyle(1,0);
              Bar(115,y+51,301,y+101);
              SetColor(14);
              SetFillStyle(1,14);
              Bar(115,y+50,301,y+100);
              ShowMouse;
              delay(1500);
         end;
     y:=151;
     repeat
           HideMouse;
           SetColor(0);
           SetFillStyle(1,0);
           Bar(115,1,640,150);
           SetColor(1);
           Ellipse(y,10,180,0,30,20);
           Ellipse(y,60,180,0,30,20);
           SetColor(14);
           Ellipse(y,63,180,0,31,21);
           Ellipse(y,110,180,0,30,20);
           If y>150 then
              begin
                   SetColor(1);
                   Line(115,10,y-30,10);
                   Line(115,60,y-30,60);
                   SetColor(14);
                   Line(115,62,y-31,62);
                   Line(115,110,y-30,110);
              end;
           if y<281 then
              begin
                   SetColor(1);
                   Line(y+30,10,305,10);
                   Line(y+30,60,305,60);
                   SetColor(14);
                   Line(y+32,62,301,62);
                   Line(y+30,110,301,110);
              end;
           SetColor(1);
           Line(301,10,301,60);
           Line(116,10,116,60);
           SetColor(14);
           Line(301,62,301,110);
           Line(116,62,116,110);
           SetFillStyle(1,1);
           FloodFill(200,35,1);
           SetFillStyle(1,14);
           FloodFill(250,95,14);
           ShowMouse;
           delay(50);
           inc(y);
           If y>=265 then
              begin
              y:=151;
              delay(25000);
              end;
     until FindMouse<>0;
end;

Procedure Poland;
var y:integer;
begin
     SetColor(0);
     SetFillStyle(1,0);
     Bar(1,1,301,350);
     SetColor(7);
     SetFillStyle(1,7);
     Bar(100,10,115,350);
     For y:=250 downto 10 do
         begin
              HideMouse;
              If FindMouse=1 then Halt;
              SetColor(0);
              SetFillStyle(1,0);
              Bar(115,y+1,301,y+51);
              SetColor(15);
              SetFillStyle(1,15);
              Bar(115,y,301,y+50);
              SetColor(0);
              SetFillStyle(1,0);
              Bar(115,y+51,301,y+101);
              SetColor(4);
              SetFillStyle(1,4);
              Bar(115,y+50,301,y+100);
              ShowMouse;
              delay(1500);
         end;
     y:=151;
     repeat
           HideMouse;
           SetColor(0);
           SetFillStyle(1,0);
           Bar(115,1,640,150);
           SetColor(15);
           Ellipse(y,10,180,0,30,20);
           Ellipse(y,60,180,0,30,20);
           SetColor(4);
           Ellipse(y,63,180,0,31,21);
           Ellipse(y,110,180,0,30,20);
           If y>150 then
              begin
                   SetColor(15);
                   Line(115,10,y-30,10);
                   Line(115,60,y-30,60);
                   SetColor(4);
                   Line(115,62,y-31,62);
                   Line(115,110,y-30,110);
              end;
           if y<281 then
              begin
                   SetColor(15);
                   Line(y+30,10,305,10);
                   Line(y+30,60,305,60);
                   SetColor(4);
                   Line(y+32,62,301,62);
                   Line(y+30,110,301,110);
              end;
           SetColor(15);
           Line(301,10,301,60);
           Line(116,10,116,60);
           SetColor(4);
           Line(301,62,301,110);
           Line(116,62,116,110);
           SetFillStyle(1,15);
           FloodFill(200,35,15);
           SetFillStyle(1,4);
           FloodFill(250,95,4);
           ShowMouse;
           delay(50);
           inc(y);
           If y>=265 then
              begin
              y:=151;
              delay(25000);
              end;
     until FindMouse<>0;
end;

begin
     Gd:=Detect;
     InitGraph(Gd,Gm,'');
     ErrorCode:=GraphResult;
     If ErrorCode=GrOk then
        begin
             InitMouse;
             SetColor(LightGray);
             Rectangle(100,300,500,400);
             SetFillStyle(1,LightGray);
             FloodFill(101,301,LightGray);
             ShowMouse;
             randomize;
             SetTextStyle(4,HorizDir,50);
             Repeat
                   SetColor(random(15)+1);
                   HideMouse;
                   OutTextXy(150,100,'Flags');
                   OutTextXy(176,261,'Start');
                   ShowMouse;
                   Delay(1000);
             until ((MouseX>100) and (MouseX<500) and (MouseY>300) and (MouseY<400) and (LeftButton));
             HideMouse;
             ClearDevice;
             SetColor(8);
             SetFillStyle(1,8);
             Bar(5,350,200,450);
             Bar(400,200,620,300);
             Bar(250,350,445,450);
             SetTextStyle(4,HorizDir,50);
             SetColor(7);
             OutTextXy(401,161,'Exit');
             SetTextStyle(4,HorizDir,7);
             OutTextXy(7,350,'Ukraine');
             OutTextXy(257,350,'Poland');
             ShowMouse;
             repeat
             case FindMouse of
             2:Ukraine;
             3:Poland;
             end;
             until FindMouse=1;
        end
                        else
        begin
             ClrScr;
             Writeln('Error:',GraphErrorMsg(ErrorCode));
             Readln;
        end;
end.