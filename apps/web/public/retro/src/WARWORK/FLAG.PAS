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
              delay(750);
         end;
     repeat
           for y:=1 to 10 do
               begin
                    SetColor(0);
                    SetFillStyle(1,0);
                    Bar(115,1,301,110);
                    SetColor(1);
                    Line(208,10,fx[y],fy[y]);
                    Line(fx[y],fy[y],fx[y],10);
                    SetFillStyle(1,1);
                    Line(fx[y],fy[y],fs[y],10);
                    Line(fs[y],10,fs[y],60);
                    Line(fx[y],fy[y]+50,fs[y],60);
                    Line(fx[y],fy[y],fx[y],fy[y]+50);
                    FloodFill(290,30,1);
                    SetColor(14);
                    SetFillStyle(1,14);
                    Line(fx[y],fy[y]+50,fs[y],60);
                    Line(fs[y],60,fs[y],110);
                    Line(fx[y],fy[y]+100,fs[y],110);
                    Line(fx[y],fy[y]+50,fx[y],fy[y]+100);
                    FloodFill(290,80,14);
                    SetColor(1);
                    SetFillStyle(1,1);
                    Bar(115,10,208,60);
                    SetColor(14);
                    SetFillStyle(1,14);
                    Bar(115,61,208,110);
                    delay(2000);
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
             until (MouseX>100) and (MouseX<500) and (MouseY>300) and (MouseY<400) and (LeftButton);
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
             repeat
             case FindMouse of
             2:Ukraine;
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