{ WW3 / WarWork v1.0 (квітень 2005) — граф. екшн: твій літак проти зеніток,
  танків і ворожого літака; бомби (b), ракети (r), стрілки — рух, Esc — вихід.
  Меню повністю на МИШІ (авторський unit mouse — INT 33h полінг).
  Original: /Users/yarik/games/WARWORK/WW3.PAS. Юніти jarik + mouse знайдені
  в games/_інше/UNITS/ (JARIK.pas поруч — скомпілювався БЕЗ ЖОДНОЇ правки;
  mouse реалізовано шимом поверх подій канваса з тим самим інтерфейсом).

  The diff against the original, in full:
  - uses + JS (await) + tpfiles (halt; pas2js його не має);
  - процедури з Delay стали async, `Delay(n)` → `await(Delay(n))`, виклики
    цих процедур — await (та сама механіка, що в усіх портах);
  - такт головного циклу гри — FrameDelay (реальні мс) замість Delay, бо
    спільний DelayScale не може обслужити і 100-мс кадр, і 50-с паузу;
  - у ДВОХ мишачих циклах меню (MainMenu, Information), які в DOS крутились
    без затримки проти апаратного драйвера, додано `await(Yield)` — у
    браузері безперервний цикл душить event loop і стан миші не оновлюється;
  - все інше — 1:1, включно з блимаючим титулом, Sound-какофонією і
    Game Over-екраном на 50 ітерацій. }
program GraphWarWork; {5.04.2005 19:17 - 5.04.2005 21:27 |2:10| }
uses JS,graph,crt,jarik,mouse,tpfiles,nls;
const duration=1000;
      { Frame period of the main loop. The source paces at `duration div 10` =
        100 ms (10 fps); this is 83 ms — 20% quicker, at Yarik's request after
        playing the real-time-paced build.
        83, not 80: the game advances a fixed amount per iteration, so "20%
        faster" is 20% more FRAMES (10 -> 12 fps => 1000/12 = 83.3 ms), not 20%
        off the period. Cutting the period to 80 would be 12.5 fps, i.e. 25%.
        Deliberately a constant HERE rather than a scale factor inside
        FrameDelay: FrameDelay's entire job is "real milliseconds, unscaled",
        and hiding a multiplier in it would rebuild the very coupling that made
        this game unplayable (see the comment above FrameDelay in crt.pas). }
      frameMs=83;
      zenitka=2;
      plane=1;
      tank=3;
var pmx,pmy,bx,by,rx,ry,bs,q,level:integer;
    height:string;
    bomb,raket,myplane:boolean;
    score:longint;
    zx,zry,zrx:array [1..zenitka] of integer;
    z,zr:array[1..zenitka] of boolean;
    phx,phy,prx,pry:array [1..plane] of integer;
    p,pr:array[1..plane] of boolean;
    tx:array [1..tank] of integer;
    t,tn:array [1..tank] of boolean;

procedure Quit; async;       {После проигрыша}
var s:string;
    i:byte;
begin
     NoSound;
     HideMouse;
     ClearDevice;
     str(score,s);
     SetTextStyle(4,HorizDir,35);
     inc(q);
     for i:=1 to 50 do begin
           ShowMouse;
           SetColor(random(14)+1);
           OutTextXy(1,25,Loc('Game Over','Гру закінчено'));
           OutTextXy(1,135,Loc('Your score','Твій рахунок'));
           OutTextXy(250,250,s);
           Sound(random(5000)+100);
           await(Delay(1000));
           NoSound;
      end;
     HideMouse;
     myplane:=false;
end;

procedure MakePlane(color:byte);    {Рисует твой самолёт}
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

procedure MakeHisPlane(i,color:byte);     {Рисует его самолёт}
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

procedure Behind;                           {Фон}
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
     SetColor(14);      {Солнце}
     Circle(580,50,40);
     SetFillStyle(1,14);
     FloodFill (550,50,14);
     SetColor(15);      {Тучи}
     SetFillStyle(1,15);
     Circle(50,50,40);
     FloodFill(50,50,15);
     Circle(90,55,40);
     FloodFill(90,65,15);
     Circle(130,45,40);
     FloodFill(130,45,15);
     Circle(250,50,40);
     FloodFill(250,50,15);
     Circle(290,45,40);
     FloodFill(290,25,15);
     Circle(330,55,40);
     FloodFill(330,55,15);
end;

procedure NewBehind;               {Рисунок после прохождения экрана}
var i:byte;
    j,k:integer;
begin
     Behind;
     inc(level);
     for j:=245 to 400 do
         For k:=450 to 480 do
             PutPixel(j,k,0);
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
                 phy[i]:=random(145)+150;
            end;
      end;
     for i:=1 to tank do
         begin
              tx[i]:=random(600)+40;
              t[i]:=true;
              if random>0.5 then tn[i]:=true
                   else tn[i]:=false;
         end;
end;


procedure PlaneFire; async;        {Падение своего самолёта}
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
           Sound(random(1000)+100);
           await(Delay(500));
     until keypressed;
     await(Delay(duration*50));
     for i:=1 to 640 do
                   for j:=pmy-25 to 299 do
                       PutPixel(i,j,1);
     SetColor(Blue);
     Circle(pmx,310,20);
     SetFillStyle(1,1);
     FloodFill(pmx,310,1);
     await(Delay(50000));
     await(Quit());
end;

procedure PlaneSkyFire; async;       {Взрыв своего самолёта}
var col:byte;
    i,j:integer;
begin
     Repeat
           case random(5)+1 of
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
           Sound(Random(1000)+100);
           await(Delay(500));
     until keypressed;
     SetColor(1);
     SetFillStyle(1,1);
     Circle(pmx+10,pmy,25);
     FloodFill(pmx+10,pmy,1);
     For pmy:=pmy to 300 do
         begin
              MakePlane(1);
              dec(pmx);
              MakePlane(0);
              Sound(Random(500)+100);
              await(Delay(duration));
         end;
     await(PlaneFire());
     await(Delay(50000));
     await(Quit());
end;

procedure PlaneHisSkyFire(i:byte); async;                  {Взрыв его самолёта}
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
           Sound(random(1000)+100);
           await(Delay(500));
     end;
     For a:=phy[i] to 300 do
         begin
              phy[i]:=a;
              MakeHisPlane(i,1);
              dec(phx[i]);
              MakeHisPlane(i,0);
              Sound(random(500)+100);
         end;
     for k:=1 to 640 do
         for j:=phy[i]-50 to 299 do
             PutPixel(k,j,1);
     SetColor(Blue);
     Circle(phx[i],310,20);
     SetFillStyle(1,1);
     FloodFill(phx[i],310,1);
end;


procedure BombFire; async;                              {Падение бомбы}
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
           Sound(Random(1000)+100);
           await(Delay(duration));
       end;
     Bomb:=false;
     for i:=1 to 640 do
         for j:=250 to 299 do
             PutPixel(i,j,1);
     SetColor(Blue);
     If by>310 then Circle(bx,by,20)
               else Circle(bx,310,20);
     SetFillStyle(1,1);
     FloodFill(bx,310,1);
end;

procedure BombMaker(color:byte);         {Рисовальщик бомбы}
begin
     SetColor(color);
     SetFillStyle(1,color);
     Circle(bx,by,3);
     FloodFill(bx,by,color);
end;

procedure RaketMaker(Color:byte);      {Рисовальщик ракеты своего самолёта}
begin
     SetColor(Color);
     Line(rx,ry,rx-5,ry);
end;

procedure MakeRaket(i,Color:byte);      {Рисовальщик ракеты чужого самолёта}
begin
     SetColor(Color);
     Line(prx[i],pry[i],prx[i]-5,pry[i]);
end;

procedure MakeZRaket(Color,i:byte);      {Рисовальщик ракеты зенитки}
begin
     SetColor(Color);
     Line(zrx[i],zry[i],zrx[i],zry[i]-5);
end;

procedure ZenitkaRaket(i:byte); async;{Процедура, отвечающая за выстрелы зенитки}
var n1,n2,j:integer;
begin
if (zr[i]=false) then
   begin
     n1:=abs(zx[i]-pmx) div 2;
     n2:=(301-pmy) div 7;
     If abs(n1-n2)<=random(10) then
        begin
             zr[i]:=true;
             zrx[i]:=zx[i];
             zry[i]:=295;
        end;
     end
        else
            begin
                 MakeZRaket(1,i);
                 zry[i]:=zry[i]-7;
                 MakeZRaket(0,i);
                 If (abs(zrx[i]-pmx)<=5) and (abs(zry[i]-pmy)<=5) then
                    begin
                         await(PlaneSkyFire());
                         zr[i]:=false;
                    end;
                 for j:=1 to plane do
                 If (abs(zrx[i]-phx[j])<=5) and (abs(zry[i]-phy[j])<=5) then
                    begin
                         await(PlaneHisSkyFire(j));
                         zr[i]:=false;
                    end;
                 if zry[i]<=105 then
                    begin
                         zr[i]:=false;
                         MakeZRaket(1,i);
                    end;
            end;
end;


procedure MakeZenitka(i:byte);            {Рисовальщик зенитки}
begin
     SetColor(LightRed);
     Line(zx[i],301,zx[i]-10,315);
     Line(zx[i],301,zx[i]+10,315);
     Line(zx[i]-10,315,zx[i]+10,315);
     SetFillStyle(1,lightred);
     FloodFill(zx[i],312,lightred);
     SetColor(4);
     Line(zx[i],301,zx[i]-10,315);
     Line(zx[i],301,zx[i]+10,315);
     Line(zx[i]-10,315,zx[i]+10,315);
     SetFillStyle(1,4);
     FloodFill(zx[i],312,4);
end;

Procedure MakeTank(i,c:Byte);           {Рисовальщик танка}
begin
     SetColor(c);
     Arc(tx[i],315,90,270,3);
     Arc(tx[i]+20,315,270,90,3);
     Line(tx[i],312,tx[i]+20,312);
     Line(tx[i],318,tx[i]+20,318);
     SetFillStyle(1,c);
     FloodFill(tx[i]+10,315,c);
     Bar(tx[i]+3,305,tx[i]+15,312);
     Bar(tx[i]+15,307,tx[i]+30,310);
end;

procedure Game; async;                      {Основной блок игры}
var key:char;
    i,j,k:integer;
    q:byte;
    speed:string;
    s:string;
begin
     score:=0;
     myplane:=true;
     pmx:=500;
     pmy:=150;
     NewBehind;
     HideMouse;
     Behind;
     MakePlane(0);
     repeat
     Key:=InKey;
     case Key of
     #72:begin
              MakePlane(1);
              dec(pmy);
              MakePlane(0);
         end;
    #75:begin
              MakePlane(1);
              dec(pmx);
              MakePlane(0);
         end;
    #77:begin
              MakePlane(1);
              inc(pmx);
              MakePlane(0);
         end;
    #80:begin
              MakePlane(1);
              inc(pmy);
              MakePlane(0);
         end;
    'B','b':If bomb=false then
           begin
           bx:=pmx+15;
           by:=pmy+10;
           bomb:=true;
           bs:=1;
           end;
    'R','r':If raket=false then
           begin
           rx:=pmx-10;
           ry:=pmy-3;
           raket:=true;
           end;
    end;
    Sound(250);
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
    If pmy<=110 then
    begin
    MakePlane(1);
    pmy:=110;
    MakePlane(0);
    end;
    If pmy>=295 then
    begin
    MakePlane(1);
    pmy:=290;
    MakePlane(0);
    end;
    MakePlane(1);
    pmx:=pmx-2;
    MakePlane(0);
    If bomb then
    begin
    BombMaker(1);
    by:=by+bs div 4;
    inc(bs);
    BombMaker(0);
    Sound(50);
    end;
    If raket then
    begin
    RaketMaker(1);
    rx:=rx-7;
    RaketMaker(0);
    Sound(1000);
    end;
    For q:=1 to tank do
    begin
        if t[q] then
            begin
                 MakeTank(q,2);
                 If tn[q] then dec(tx[q])
                          else inc(tx[q]);
                 If tx[q]<=5 then tn[q]:=false;
                 If tx[q]>=635 then tn[q]:=true;
                 if (GetPixel(tx[q]-10,305)=Blue) and (tn[q]) then tn[q]:=false;
                 If (GetPixel(tx[q]+35,305)=Blue) and (not(tn[q])) then tn[q]:=true;
                 MakeTank(q,8);
                 if (abs(tx[q]-bx)<=15) and (bomb) and (by>=295) then
                    begin
                    t[q]:=false;
                    For k:=500 to 640 do
                                    For j:=425 to 480 do
                                        PutPixel(k,j,0);
                    score:=score+500;
                    end;
            end;
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
    OutTextXy(10,425,Loc('Height - ','Висота - '));
    OutTextXy(100,425,height);
    OutTextXy(165,425,Loc(' metres',' метрів'));
    OutTextXy(350,425,Loc('Score - ','Рахунок - '));
    OutTextXy(245,450,Loc('Level - ','Рівень - '));
    str(score,s);
    OutTextXy(500,425,s);
    str(level,s);
    OutTextXy(345,450,s);
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
             if z[i] then begin
                MakeZenitka(i);
                await(ZenitkaRaket(i));
             end;
        end;
    if (by>=310) and (bomb=true) then await(BombFire());
    If (300-pmy)*50<500 then await(PlaneFire());
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
                                                     then await(PlaneSkyFire());
                             If prx[i]<=1 then pr[i]:=false;
                             Sound(1000);
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
                     Phx[i]:=phx[i]-2;
                     if phx[i]=1 then
                        begin
                             MakeHisPlane(i,1);
                             phx[i]:=600;
                             MakeHisPlane(i,4);
                        end;
                     If (300-phy[i])*50<500 then
                        begin
                        await(PlaneHisSkyFire(i));
                        For k:=500 to 640 do
                                    For j:=425 to 480 do
                                        PutPixel(k,j,0);
                        Score:=Score+500;
                        p[i]:=false;
                        end;
                     If (abs(phx[i]-pmx)<=5) and (abs(phy[i]-pmy)<=5) then await(PlaneSkyFire());
                     If raket then
                        begin
                             If (abs(phx[i]-rx)<=5) and (abs(phy[i]-ry)<=5) then
                                begin
                                await(PlaneHisSkyFire(i));
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
    { РЕМОНТ: цей Delay — не пауза, а ТАКТ гри (10 к/с). Через спільний
      DelayScale=0.004 (його тримає Delay(50000) у сценах загибелі) він
      округлявся до 0 мс і гра йшла ~в 14 разів швидше: ворожий літак
      підрівнювався по висоті й збивав тебе за ~1.5 с — «літак одразу
      падає». FrameDelay дає реальні мілісекунди, як і написано в оригіналі.
      frameMs=83 замість 100 — на прохання зробити на 20% швидше (це +20% до
      кадрів: 10 -> 12 к/с; 80 мс було б 12.5 к/с, тобто +25%). }
    await(FrameDelay(frameMs));
    NoSound;
    until (not (myplane)) or (key=#27);
end;

function MainMenu:byte; async;             {Главное меню}
var choice:byte;
begin
     HideMouse;
     SetColor(Brown);
     SetFillStyle(1,brown);
     Bar(1,1,640,480);
     SetColor(8);
     SetFillStyle(1,8);
     Bar(200,50,400,100);
     Bar(200,150,400,200);
     Bar(200,250,400,300);
     SetColor(7);
     SetTextStyle(3,HorizDir,4);
     OutTextXy(220,50,Loc('Start game','Почати гру'));
     OutTextXy(220,150,Loc('Information','Інформація'));
     OutTextXy(270,250,Loc('Quit','Вийти'));
     choice:=0;
     repeat
           await(Yield); { РЕМОНТ для браузера: без yield стан миші не оновиться }
           ShowMouse;
           If (MouseX>200) and (MouseX<400) and (MouseY>50) and (MouseY<400) and (LeftButton) then
              begin
                   If (MouseY>50) and (MouseY<100) then choice:=1;
                   If (MouseY>150) and (MouseY<200) then choice:=2;
                   If (MouseY>250) and (MouseY<300) then choice:=3;
              end;
     until choice<>0;
     MainMenu:=choice;
end;

Procedure Information; async;                {Меню информации}
var i:byte;
begin
     HideMouse;
     SetColor(Brown);
     SetFillStyle(1,brown);
     Bar(1,1,640,480);
     SetColor(7);
     SetTextStyle(4,HorizDir,15);
     OutTextXY(75,25,'WarWork');
     SetTextStyle(5,HorizDir,5);
     OutTextXy(10,200,'CopyRight By Yermilov Yaroslav');
     OutTextXy(75,300,'Version 1.0 April 2005');
     SetTextStyle(8,HorizDir,5);
     SetColor(LightGray);
     SetFillStyle(1,LightGray);
     Bar(80,400,480,450);
     SetColor(8);
     OutTextXy(140,385,Loc('MAIN MENU','ГОЛОВНЕ МЕНЮ'));
     ShowMouse;
     Repeat await(Yield); { РЕМОНТ для браузера — див. шапку }
     until (MouseX>80) and (MouseX<480) and (MouseY>400) and (MouseY<450) and (LeftButton);
     repeat
     i:=trunc(await(double, MainMenu()));
     Case i of
     1:await(Game());
     2:await(Information());
     3:Halt;
     end;
     until false;
end;


procedure StartGame; async;                {Предстартовая подготовка. Заставка}
var i:byte;
begin
     q:=0;
     score:=0;
     pmx:=500;
     pmy:=150;
     myplane:=true;
     raket:=false;
     bomb:=false;
     level:=0;
     randomize;
     for i:=1 to zenitka do
     begin
     z[i]:=true;
     zx[i]:=random(640)+1;
     zr[i]:=true;
     end;
     for i:=1 to plane do
     begin
     p[i]:=true;
     phx[i]:=random(400)+1;
     phy[i]:=random(145)+150;
     pr[i]:=false;
     end;
     for i:=1 to tank do
     begin
     t[i]:=true;
     tx[i]:=random(600)+40;
     if random>0.5 then tn[i]:=true
                   else tn[i]:=false;
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
     OutTextXy(140,385,Loc('MAIN MENU','ГОЛОВНЕ МЕНЮ'));
     Sound(Random(5000)+100);
     await(Delay(Duration*3));
     NoSound;
     If Inkey=#27 then await(Quit());
     until (LeftButton) and (MouseX>80) and (MouseX<480) and (MouseY>400) and (MouseY<450);
     HideMouse;
     ClearDevice;
     i:=trunc(await(double, MainMenu()));
     Case i of
     1:await(Game());
     2:await(Information());
     3:Halt;
     end;
end;

procedure InitGraphWarWork; async;                {Инициализация графики и игры}
var Gd,Gm,ErrorCode:integer;
    i:byte;
begin
Gd:=Detect;
InitGraph(Gd,Gm,'');
ErrorCode:=GraphResult;
If ErrorCode=GrOk then
 begin
   await(StartGame());
   repeat
     i:=trunc(await(double, MainMenu()));
     Case i of
     1:await(Game());
     2:await(Information());
     3:Halt;
     end;
     until false;
 end
                  else
   begin
        TextBackGround(0);
        TextColor(15);
        ClrScr;
        write(Loc('Error:','Помилка:'),GraphErrorMsg(ErrorCode));
        readln;
   end;
   await(Delay(10000));
   CloseGraph;
end;

begin
InitGraphWarWork;               {Основной блок программы}
end.