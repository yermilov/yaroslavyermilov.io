program lighter;
uses graph,crt,mouse;
const duration=50;
      center:array [1..3] of integer = (80,195,310);
var errorcode,gd,gm:integer;
    number:1..3;
    color,i:byte;

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
             repeat
             SetTextStyle(4,HorizDir,50);
             SetColor(random(15)+1);
             OutTextXy(100,100,'Lighter');
             OutTextXy(176,261,'Start');
             until (MouseX>100) and (MouseX<500) and (MouseY>300) and (MouseY<400) and (LeftButton);
             HideMouse;
             ClearDevice;
             ShowMouse;
             SetColor(8);
             Rectangle(100,25,225,375);
             SetFillStyle(1,8);
             FloodFill(101,26,8);
             Rectangle(140,375,190,480);
             FloodFill(141,376,8);
             number:=1;
             SetColor(8);
             SetFillStyle(1,8);
             Rectangle(400,200,620,300);
             FloodFill(401,201,8);
             SetColor(7);
             OutTextXy(401,161,'Exit');
             repeat
             HideMouse;
             For i:=1 to 3 do
             begin
             If number<>i then Color:=7
                          Else case number of
                               1:Color:=4;
                               2:Color:=14;
                               3:Color:=2;
                               end;
             SetColor(color);
             Circle(162,center[i],50);
             SetFillStyle(1,color);
             FloodFill(162,center[i],color);
             end;                                 {80,195,310}
             ShowMouse;                           {100,25,225,375}
             If (MouseX>100) and (MouseX<225) and (MouseY>25) and (MouseY<375) and (LeftButton) then
                begin
                     If (MouseY>30) and (MouseY<130) then number:=1;
                     If (MouseY>145) and (MouseY<245) then number:=2;
                     If (MouseY>260) and (MouseY<375) then number:=3;
                end;
             delay(duration*10);
             until (MouseX>400) and (MouseX<620) and (MouseY>200) and (MouseY<300) and (LeftButton);
             CloseGraph;
        end
     else
         begin
              ClrScr;
              Write('Error: ',GraphErrorMsg(ErrorCode));
              Readln;
         end;
end.

