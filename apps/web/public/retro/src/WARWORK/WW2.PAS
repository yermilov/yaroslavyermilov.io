program GraphWarWork; {5.04.2005 19:17 - 5.04.2005 21:27 |2:10| }
uses graph,crt,jarik,mouse;
const duration=500;
      zenitka=2;
      plane=1;
var pmx,pmy,bx,by,rx,ry:integer;
    height:string;
    bomb,raket:boolean;
    score:longint;
    zx,zry,zrx:array [1..zenitka] of integer;
    z,zr:array[1..zenitka] of boolean;
    phx,phy,prx,pry:array [1..plane] of integer;
    p,pr:array[1..plane] of boolean;
    arrx,arry:array[1..1000] of integer;

procedure Quit;
var s:string;
    i:byte;
begin
     i:=ord(Inkey);
     ClearDevice;
     SetColor(8);
     SetFillstyle(1,8);
     SetTextStyle(4,HorizDir,35);
     str(score,s);
     Rectangle(10,300,240,425);
     FloodFill(11,301,8);
     SetColor(7);
     OutTextXy(21,275,'Exit');
     ShowMouse;
     repeat
           SetColor(random(14)+1);
           OutTextXy(1,25,'Game Over');
           OutTextXy(1,135,'Score -');
           OutTextXy(250,240,s);
           delay(1000);
     until (MouseX>10) and (MouseX<240) and (MouseY>300) and (MouseY<425) and (LeftButton);
     Delay(50000);
     Halt;
end;

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

procedure MakeHisPlane(i,color:byte);
begin
     SetColor(color);
     SetFillStyle(1,color);
     Line(phx[i]+3,phy[i]-3,phx[i]-3,phy[i]+3);
     Line(phx[i]-3,phy[i]+3,phx[i]+3,phy[i]+3);
     Line(phx[i]+3,phy[i]-3,phx[i]+23,phy[i]-3);
     Line(phx[i]+23,phy[i]-3,phx[i]+23,phy[i]+3);
     Line(phx[i]-3,phy[i]+3,phx[i]+23,phy[i]+3);
     Line(phx[i]+17,phy[i]-3,phx[i]+20,phy[i]-10);
     Line(phx[i]+20,phy[i]-10,phx[i]+23,phy[i]-10);
     Line(phx[i]+23,phy[i]-10,phx[i]+23,phy[i]-3);
     Line(phx[i]+7,phy[i],phx[i]+15,phy[i]+7);
     Line(phx[i]+15,phy[i]+7,phx[i]+20,phy[i]+7);
     Line(phx[i]+20,phy[i]+7,phx[i]+12,phy[i]);
     FloodFill(phx[i]+16,phy[i]+5,color);
     FloodFill(phx[i]+21,phy[i]-9,color);
     FloodFill(phx[i]+4,phy[i]-2,color);
end;

procedure NewBehind;
var i:byte;
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
     for i:=1 to zenitka do
     begin
     z[i]:=true;
     zx[i]:=random(600)+1;
     end;
     raket:=false;
     bomb:=false;
     for i:=1 to plane do
      begin
         pr[i]:=false;
         phy[i]:=200;
         phx[i]:=600;
         if p[i]=false then
            begin
                 p[i]:=true;
                 phx[i]:=random(400)+1;
                 phy[i]:=random(250)+1;
            end;
      end;
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
    i,j:integer;
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
           Circle(pmx+10,pmy,25);
           SetFillStyle(1,col);
           FloodFill(pmx-14,pmy,col);
           FloodFill(pmx+34,pmy,col);
           SetColor(2);
           Rectangle(1,300,640,400);
           SetFillStyle(1,2);
           FloodFill(pmx+1,301,2);
           FloodFill(pmx+49,301,2);
           SetColor(2);
           Circle(pmx+10,pmy,25);
           Delay(500);
     until keypressed;
     for i:=1 to 640 do
         for j:=250 to 299 do
             PutPixel(i,j,1);
     SetColor(Blue);
     Circle(pmx,310,25);
     SetFillStyle(1,1);
     FloodFill(pmx,310,1);
     Delay(50000);
     Quit;
end;

procedure PlaneSkyFire;
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
           Circle(pmx+10,pmy,25);
           SetFillStyle(1,col);
           FloodFill(pmx-14,pmy,col);
           FloodFill(pmx+34,pmy,col);
           If pmy>275 then begin
           SetColor(2);
           Rectangle(1,300,640,400);
           SetFillStyle(1,2);
           FloodFill(pmx+1,301,2);
           FloodFill(pmx+49,301,2);
           SetColor(2);
           Circle(pmx+10,pmy,25);
           end;
           Delay(500);
     until keypressed;
     For pmy:=pmy to 300 do
         begin
              MakePlane(1);
              dec(pmx);
              MakePlane(0);
         end;
     PlaneFire;
     Delay(50000);
     Quit;
end;

procedure PlaneHisSkyFire(i:byte);
var c,col:byte;
    a:integer;
    k,j:integer;
begin
     for a:=1 to 100 do begin
           c:=random(5)+1;
           case c of
           1:col:=4;
           2:col:=5;
           3:col:=12;
           4:col:=13;
           5:col:=14;
           end;
           SetColor(col);
           Circle(phx[i]+10,phy[i],25);
           SetFillStyle(1,col);
           FloodFill(phx[i]-14,phy[i],col);
           FloodFill(phx[i]+34,phy[i],col);
           If phy[i]>275 then begin
           SetColor(2);
           Rectangle(1,300,640,400);
           SetFillStyle(1,2);
           FloodFill(phx[i]+1,301,2);
           FloodFill(phx[i]+49,301,2);
           SetColor(2);
           Circle(phx[i]+10,phy[i],25);
           end;
           Delay(500);
     end;
     For a:=phy[i] to 300 do
         begin
              phy[i]:=a;
              MakeHisPlane(i,1);
              dec(phx[i]);
              MakeHisPlane(i,0);
         end;
     for k:=1 to 640 do
         for j:=250 to 299 do
             PutPixel(k,j,1);
     SetColor(Blue);
     Circle(phx[i],310,25);
     SetFillStyle(1,1);
     FloodFill(phx[i],310,1);
     Delay(50000);
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
           Circle(bx+10,by,25);
           SetFillStyle(1,col);
           FloodFill(bx-14,by,col);
           FloodFill(bx+34,by,col);
           SetColor(2);
           Rectangle(1,300,640,400);
           SetFillStyle(1,2);
           FloodFill(bx+1,301,2);
           FloodFill(bx+39,301,2);
           SetColor(2);
           Circle(bx+10,by,25);
           Delay(500);
       end;
     Bomb:=false;
     for i:=1 to 640 do
         for j:=250 to 299 do
             PutPixel(i,j,1);
     SetColor(Blue);
     Circle(bx,310,25);
     SetFillStyle(1,1);
     FloodFill(bx,310,1);
end;

procedure BombMaker(color:byte);
begin
     SetColor(color);
     SetFillStyle(1,color);
     Circle(bx,by,3);
     FloodFill(bx,by,color);
end;

procedure RaketMaker(Color:byte);
begin
     SetColor(Color);
     Line(rx,ry,rx-5,ry);
end;

procedure MakeRaket(i,Color:byte);
begin
     SetColor(Color);
     Line(prx[i],pry[i],prx[i]-5,pry[i]);
end;

procedure ZenitkaRaket(i:byte);
var n1,n2:integer;
    j,k,l:integer;
begin
if zr[i]=false then
   begin
     n1:=abs(zx[i]-pmx) div 2;
     n2:=abs(301-pmy) div 7;
     If (N1=N2) then
        begin
             SetColor(0);
             Line(zx[i],301,pmx,pmy);
             For j:=pmy to 301 do
                 begin
                      If GetPixel(zx[i],j)=0 then
                         begin
                              ArrX[j-pmy+1]:=zx[i];
                              ArrY[j-pmy+1]:=i;
                         end;
                 end;
             zr[i]:=true;
             zrx[i]:=zx[i];
             zry[i]:=300;
        end;
     If (n1>n2) then
        begin
             SetColor(0);
             Line(zx[i],301,pmx-(n1-n2),pmy);
             L:=1;
             For j:=pmy to 301 do
                 for k:=zx[i] to pmx do
                     begin
                          If GetPixel(k,j)=0 then
                             begin
                                  ArrX[l]:=k;
                                  ArrY[l]:=j;
                             end;
                             inc(l);
                     end;
                     zr[i]:=true;
                     zrx[i]:=zx[i];
                     zry[i]:=300;
        end;
        If (n1<n2) then
        begin
             SetColor(0);
             Line(zx[i],301,pmx+(n1-n2),pmy);
             L:=1;
             For j:=pmy to 301 do
                 for k:=pmx to zx[i] do
                     begin
                          If GetPixel(k,j)=0 then
                             begin
                                  ArrX[l]:=k;
                                  ArrY[l]:=j;
                             end;
                             inc(l);
                     end;
                     zr[i]:=true;
                     zrx[i]:=zx[i];
                     zry[i]:=300;
        end;
     end
        else
            begin

            end;
end;


procedure MakeZenitka(i:byte);
begin
     SetColor(4);
     Line(zx[i],301,zx[i]-10,315);
     Line(zx[i],301,zx[i]+10,315);
     Line(zx[i]-10,315,zx[i]+10,315);
     SetFillStyle(1,4);
     FloodFill(zx[i],302,4);
end;

procedure Game;
var key:char;
    i,j,k:integer;
    speed:string;
    s:string;
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
    'R':If raket=false then
           begin
           rx:=pmx-10;
           ry:=pmy-3;
           raket:=true;
           end;
    end;
    If pmx<=1 then
    begin
    MakePlane(1);
    NewBehind;
    Score:=Score+100;
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
    Dec(pmx);
    MakePlane(0);
    If bomb then
    begin
    BombMaker(1);
    inc(by);
    BombMaker(0);
    end;
    If raket then
    begin
    RaketMaker(1);
    rx:=rx-7;
    RaketMaker(0);
    end;
    If (rx<=1) and (raket=true) then
    begin
    RaketMaker(1);
    raket:=false;
    end;
    For i:=100 to 164 do
        For j:=425 to 450 do
            PutPixel(i,j,0);
    SetColor(15);
    SetTextStyle(1,HorizDir,1);
    Str((300-pmy)*50,height);
    OutTextXy(10,425,'Height - ');
    OutTextXy(100,425,height);
    OutTextXy(165,425,' metres');
    OutTextXy(350,425,'Score - ');
    str(score,s);
    OutTextXy(500,425,s);
    For i:=1 to Zenitka do
        begin
             If (z[i]=true) and (bomb=true) and (abs(bx-zx[i])<=25) and (by>=295) then
                begin
                     For k:=500 to 640 do
                         For j:=425 to 480 do
                             PutPixel(k,j,0);
                     Score:=Score+250;
                     z[i]:=false;
                end;
             if z[i] then MakeZenitka(i);
             ZenitkaRaket(i);
        end;
    if (GetPixel(bx,by+4)=Green) and (bomb=true) then BombFire;
    If (300-pmy)*50<500 then PlaneFire;
    For i:=1 to plane do
        begin
             if p[i] then
                begin
                     MakeHisPlane(i,1);
                     if random>0.5 then
                     begin
                     if phx[i]<pmx then inc(phx[i]);
                     if phy[i]>pmy then dec(phy[i]);
                     if phy[i]<pmy then inc(phy[i]);
                     if abs(phx[i]-pmx)<=5 then phx[i]:=phx[i]+random(75)+50;
                     If ((-1)*(phy[i]-pmy)=random(25)) and (pr[i]=false) then
                        begin
                             prx[i]:=phx[i]-5;
                             pry[i]:=phy[i];
                             pr[i]:=true;
                        end;
                     If pr[i] then
                        begin
                             MakeRaket(i,1);
                             prx[i]:=prx[i]-7;
                             MakeRaket(i,0);
                             If (abs(prx[i]-pmx)<=5) and (abs(pry[i]-pmy)<=5)
                                                     then PlaneSkyFire;
                             If prx[i]<=1 then pr[i]:=false;
                        end;
                     end;
                     case random(5)+1 of
                     1:Inc(phx[i]);
                     2:Dec(phx[i]);
                     3:Inc(phy[i]);
                     4:Dec(phy[i]);
                     end;
                     if pmx=10 then
                        begin
                             MakeHisPlane(i,1);
                             phx[i]:=600;
                             MakeHisPlane(i,4);
                        end;
                     {dec(phx[i]);
                     Dec(Phx[i]);}
                     Phx[i]:=phx[i]-2;
                     if phx[i]=1 then
                        begin
                             MakeHisPlane(i,1);
                             phx[i]:=600;
                             MakeHisPlane(i,4);
                        end;
                     If (300-phy[i])*50<500 then
                        begin
                        PlaneHisSkyFire(i);
                        For k:=500 to 640 do
                                    For j:=425 to 480 do
                                        PutPixel(k,j,0);
                        Score:=Score+500;
                        p[i]:=false;
                        end;
                     If (abs(phx[i]-pmx)<=5) and (abs(phy[i]-pmy)<=5) then PlaneSkyFire;
                     If raket then
                        begin
                             If (abs(phx[i]-rx)<=5) and (abs(phy[i]-ry)<=5) then
                                begin
                                PlaneHisSkyFire(i);
                                score:=score+1000;
                                p[i]:=false;
                                Behind;
                                For k:=500 to 640 do
                                    For j:=425 to 480 do
                                        PutPixel(k,j,0);
                                end;
                        end;
                     if p[i] then MakeHisPlane(i,4);
                end;
        end;
    Delay(Duration Div 10);
    until Key=#27;
end;

procedure StartGame;
var i:byte;
begin
     score:=0;
     pmx:=500;
     pmy:=250;
     raket:=false;
     bomb:=false;
     randomize;
     for i:=1 to zenitka do
     begin
     z[i]:=true;
     zx[i]:=random(640)+1;
     end;
     for i:=1 to plane do
     begin
     p[i]:=true;
     phx[i]:=random(400)+1;
     phy[i]:=random(250)+1;
     pr[i]:=false;
     end;
     SetColor(LightGray);
     SetFillStyle(1,LightGray);
     Rectangle(80,400,480,450);
     FloodFill(181,401,LightGray);
     InitMouse;
     ShowMouse;
     repeat
     SetColor(random(15)+1);
     SetTextStyle(4,HorizDir,15);
     OutTextXY(75,25,'WarWork');
     SetTextStyle(5,HorizDir,5);
     OutTextXy(10,200,'CopyRight By Yermilov Yaroslav');
     OutTextXy(75,300,'Version 1.0 April 2005');
     SetTextStyle(8,HorizDir,5);
     OutTextXy(140,385,'START GAME');
     Delay(Duration*3);
     If Inkey=#27 then Quit;
     until (LeftButton) and (MouseX>80) and (MouseX<480) and (MouseY>400) and (MouseY<450);
     HideMouse;
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