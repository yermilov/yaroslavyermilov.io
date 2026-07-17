program PingPong;
uses crt,graph,mouse,dos,shifr,keys;
type coordinates = record
     x,y:integer;
     end;
     player = record
     name:string[15];
     score,time:longint;
     level:byte;
     end;
const pi180 = pi/180;
      by=7;
      bx=8;
      Colors: array [0..15] of string =
              ('Чёрный','Синий','Зелёный','Бирюзовый','Красный','Розовый',
              'Коричневый','Светло-серый','Тёмно-серый','Светло-синий',
              'Светло-зелёный','Светло-бирюзовый','Светло-красный',
              'Светло-розовый','Желтый','Белый');

var ball,fly,ud:coordinates;
    alfa,c:integer;
    right1,left1,right2,left2:boolean;
    n0:byte;
    ng,nv:shortint;
    key:char;
    radian:real;
    ColorBall,ColorHero,ColorFon,ColorMenuFon,ColorButton,ColorGameMenu,
    ColorMenuText,ColorGameText,ColorClock,ColorSelect:byte;
    BallSpeed,HeroSpeed,HeroB,Duration:integer;
    Score1,Score2:byte;
    FirstTime,NowTime,Time:longint;
    Level:Integer;
    ArrBP:array [1..10] of player;
    ArrNBP:array [1..11] of player;
    Jump1,Jump2:boolean;
    Sx,Sy:integer;
    Line:byte;
    HeroX1,HeroY1,HeroX2,HeroY2:integer;
    TimeJ1,TimeJ2:real;

    function InKey:char;
    begin
         If Keypressed then InKey:=ReadKey;
    end;

    procedure Clean(x1,y1,x2,y2:integer;Color:byte);
    var i,j:integer;
    begin
         for i:=x1 to x2 do
             for j:=y1 to y2 do
                 PutPixel(i,j,Color);
    end;

    {procedure Sortirovka;
    var i,j:byte;
        st:string;
        max:real;
        m:word;
    begin
         for i:=1 to 11 do
             begin
                  max:=0;
                  for j:=i to 11 do
                      begin
                           if ArrNBp[j].Score>max then
                              begin
                                   max:=ArrNBp[j].Score;
                                   m:=ArrNBp[i].Score;
                                   ArrNBp[i].Score:=ArrNBp[j].Score;
                                   ArrNBp[j].Score:=m;
                                   st:=ArrNBp[i].Name;
                                   ArrNBp[i].Name:=ArrNBp[j].Name;
                                   ArrNBp[j].Name:=st;
                                   m:=ArrNBp[i].Level;
                                   ArrNBp[i].Level:=ArrNBp[j].Level;
                                   ArrNBp[j].Level:=m;
                                   m:=ArrNBp[i].Time;
                                   ArrNBp[i].Time:=ArrNBp[j].Time;
                                   ArrNBp[j].Time:=m;
                              end;
                      end;
                  end;
         for i:=1 to 10 do
             begin
                  ArrBp[i].Name:=ArrNBp[i].Name;
                  ArrBp[i].Score:=ArrNBp[i].Score;
                  ArrBp[i].Level:=ArrNBp[i].Level;
                  ArrBp[i].Time:=ArrNBp[i].Time;
             end;
    end;

    procedure BestPlayers;
    var f:text;
        i,j:byte;
        s:string;
     begin
         Sortirovka;
         ClearDevice;
         SetColor(ColorMenuFon);
         SetFillStyle(1,ColorMenuFon);
         Bar(0,0,641,481);
         SetColor(ColorMenuText);
         SetTextStyle(1,HorizDir,4);
         OutTextXy(195,1,'Best Players');
         DeShifrovka('best.cod','best.scr');
         assign(f,'best.scr');
         reset(f);
         for i:=1 to 10 do
             for j:=1 to 4 do
                      case j of
                      1:Readln(f,ArrBp[i].Name);
                      2:Readln(f,ArrBp[i].Score);
                      3:Readln(f,ArrBp[i].Level);
                      4:Readln(f,ArrBp[i].Time);
                      end;
         Erase(f);
         Close(f);
         SetTextStyle(1,HorizDir,1);
         OutTextXy(50,40,'Name');
         OutTextXy(250,40,'Score');
         OutTextXy(350,40,'Level');
         OutTextXy(450,40,'Time');
         for i:=1 to 10 do
             begin
                  Str(i,s);
                  OutTextXy(25,i*40+30,s);
                  OutTextXy(50,i*40+30,ArrBp[i].Name);
                  Str(ArrBp[i].Score,s);
                  OutTextXy(250,i*40+30,s);
                  Str(ArrBp[i].Level,s);
                  OutTextXy(350,i*40+30,s);
                  Str(ArrBp[i].Time,s);
                  OutTextXy(450,i*40+30,s);
             end;
         repeat
               if Inkey=#8 then
                  begin
                       Assign(f,'best.scr');
                       Rewrite(f);
                       Close(F);
                       Shifrovka('best.scr','best.cod');
                       BestPlayers;
                  end;
         until Inkey=#27;
    end;

    function Input:string;
    var key:char;
        n:byte;
        st:string;
        flag:boolean;
    begin
         ClearDevice;
         SetColor(ColorMenuFon);
         SetFillStyle(1,ColorMenuFon);
         Bar(0,0,641,481);
         SetColor(ColorMenuText);
         SetTextStyle(1,HorizDir,4);
         OutTextXy(175,10,'Congretulations!');
         OutTextXy(10,60,'Your name goes to the "Best Scores"');
         OutTextXy(100,110,'Please enter your name');
         OutTextXy(80,160,'Please not more 15 leters');
         st:='';
         for n:=1 to 255 do
             begin
             end;
         SetFillStyle(1,ColorMenuText);
         n:=0;
         Repeat
               key:=ExReadkey(flag);
               case key of
               #8:if not (n=0) then begin
                       Delete(st,n,1);
                       dec(n);
                       Clean(150+n*15,210,175+n*15,250,ColorMenuFon);
                   end;
               #48..#57,#65..#90,#97..#122:if (not(n=15)) and (not(flag))
                                               then begin
                                                st:=st+key;
                                                OutTextXy(150+n*15,210,key);
                                                inc(n);
                                           end;
               end;
         until key=#13;
         Input:=st;
    end;

    procedure NewBestPlayer;
    var i,j:byte;
        f:text;
        n:string;
        s,t:longint;
        l:byte;
    begin
         DeShifrovka('best.cod','best.scr');
         assign(f,'best.scr');
         reset(f);
         for i:=1 to 10 do
             for j:=1 to 4 do
                      case j of
                      1:Readln(f,ArrBp[i].Name);
                      2:Readln(f,ArrBp[i].Score);
                      3:Readln(f,ArrBp[i].Level);
                      4:Readln(f,ArrBp[i].Time);
                      end;
         Erase(f);
         Close(f);
         for i:=1 to 10 do
             begin
                  ArrNBp[i].Name:=ArrBp[i].name;
                  ArrNBp[i].Score:=ArrBp[i].score;
                  ArrNBp[i].Level:=ArrBp[i].level;
                  ArrNBp[i].Time:=ArrBp[i].time;
             end;
         if Score>ArrNBp[10].Score then
            begin
                 ArrNBp[11].name:=Input;
                 ArrNBp[11].score:=score;
                 ArrNBp[11].level:=level;
                 ArrNBp[11].time:=time;
                 Sortirovka;
            end;
         for i:=1 to 10 do
             begin
                  ArrBp[i].Name:=ArrNBp[i].Name;
                  ArrBp[i].Score:=ArrNBp[i].Score;
                  ArrBp[i].Level:=ArrNBp[i].Level;
                  ArrBp[i].Time:=ArrNBp[i].Time;
             end;
         assign(f,'best.scr');
         rewrite(f);
         for i:=1 to 10 do
             begin
              n:=ArrBp[i].name;
              s:=ArrBp[i].score;
              l:=ArrBp[i].level;
              t:=ArrBp[i].time;
             for j:=1 to 4 do
                      case j of
                      1:Writeln(f,n);
                      2:Writeln(f,s);
                      3:Writeln(f,l);
                      4:Writeln(f,t);
                      end;
             end;
         Close(f);
         Shifrovka('best.scr','best.cod');
         Assign(f,'best.scr');
         Reset(f);
         Erase(f);
         Close(f);
         BestPlayers;
    end;}

    {procedure GameOver;
    var s:string;
    begin
         ClearDevice;
         SetColor(ColorMenuFon);
         SetFillStyle(1,ColorMenuFon);
         Bar(0,0,641,481);
         SetColor(ColorMenuText);
         SetTextStyle(1,HorizDir,7);
         OutTextXy(135,1,'Game Over');
         SetTextStyle(1,HorizDir,5);
         OutTextXy(50,100,'Your score -');
         str(score,s);
         OutTextXy(350,100,s);
         OutTextXy(50,200,'Your level -');
         str(level,s);
         OutTextXy(350,200,s);
         OutTextXy(50,300,'Your time -');
         str(time,s);
         OutTextXy(350,300,s);
         delay(duration*500);
         NewBestPlayer;
    end;}

    procedure MakeBall(x,y:integer; radius,color:byte);
{Рисует мяч с координатами центра (x;y) радиусом radius и цветом color}
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Circle(x,y,radius);
         FloodFill(x,y,color);
    end;

    procedure MakeHero(color:byte);
{Рисует доску цветом color и с координатами левого верхнего края (HeroX;HeroY)}
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Bar(HeroX1,HeroY1,HeroX1+15,HeroY1+HeroB);
         Bar(HeroX2,HeroY2,HeroX2+15,HeroY2+HeroB);
    end;

    function udar:boolean;
{Проверяет был ли удар со стенкой и доской. Результаты:
 *true* - удар состоялся; *false* - удара не было}
    var x:shortint;
        s:string;
        flag:boolean;
    begin
         Udar:=false;
         if ball.x<=7 then {Left}
            begin
                 Udar:=true;
                 ng:=1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.x:=8;
                 Inc(Score2);
                 Clean(250,435,290,480,ColorGameMenu);
            end;
         if ball.x>=633 then {Right}
            begin
                 Udar:=true;
                 ng:=-1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.x:=632;
                 Inc(Score1);
                 Clean(160,435,200,480,ColorGameMenu);
            end;
         if ball.y<=7 then   {Up}
            begin
                 Udar:=true;
                 nv:=1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.y:=8;
            end;
         if ball.y>=415 then {Down}
            begin
                 Udar:=true;
                 nv:=-1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.y:=414;
                 Clean(105,435,125,480,ColorGameMenu);
            end;
 {Doska1} if (ball.x>=HeroX1-10) and (ball.y>=heroy1) and (ball.y<=heroy1+Herob) then
            begin
                 Udar:=true;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ng:=-1;
                 ball.x:=HeroX1-11;
             if Jump1 then
                begin
                     alfa:=alfa * 2;
                end else
                 if ((ball.y-heroy1<=10) or (heroy1-ball.y<=10)) then
                    begin
                         if Left1 then
                            if nv=1 then nv:=-1
                                    else alfa:=alfa div 2;
                         If Right1 then
                            if nv=-1 then nv:=1
                                    else alfa:=alfa div 2;
                    end
                  else
                    begin
                 If Left1 then
                    if nv=1 then alfa:=alfa+3
                            else alfa:=alfa-3;
                 If Right1 then
                    if nv=-1 then alfa:=alfa+3
                             else alfa:=alfa-3;
                    end;
            end;
 {Doska2} if (ball.x<=HeroX2+25) and (ball.y>=heroy2) and (ball.y<=heroy2+Herob) then
            begin
                 Udar:=true;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ng:=1;
                 ball.x:=HeroX2+26;
             if Jump2 then
                begin
                     alfa:=alfa * 2;
                end else
                 if ((ball.y-heroy2<=10) or (heroy2-ball.y<=10)) then
                    begin
                         if Left2 then
                            if nv=1 then nv:=-1
                                    else alfa:=alfa div 2;
                         If Right2 then
                            if nv=-1 then nv:=1
                                    else alfa:=alfa div 2;
                    end
                  else
                    begin
                 If Left2 then
                    if nv=1 then alfa:=alfa+3
                            else alfa:=alfa-3;
                 If Right2 then
                    if nv=-1 then alfa:=alfa+3
                             else alfa:=alfa-3;
                    end;
            end;
    end;

    procedure GameText;
    var s:string;
        h,m,sec,d:word;
        i,j:integer;
    begin
         SetColor(ColorGameText);
         SetTextStyle(10,HorizDir,100);
         OutTextXy(210,435,':');
         Str(score1,s);
         OutTextXy(160,435,s);
         Str(Score2,s);
         OutTextXy(250,435,s);
         OutTextXy(370,435,'Time -');
         GetTime(h,m,sec,d);
         NowTime:=sec+m*60+h*3600;
         if NowTime-FirstTime>Time then
            begin
                 Time:=NowTime-FirstTime;
                 str(NowTime-FirstTime,s);
                 Clean(475,435,640,460,ColorGameMenu);
                 OutTextXy(475,435,s);
            end;
    end;

    procedure BallWalking(var flag,f:boolean);
    var h,m,s,d:word;
        T:real;
    begin
         Time:=0;
         SetColor(0);
         SetFillStyle(1,0);
         Bar(145,160,465,310);
         repeat
               c:=1;
               MakeBall(ball.x,ball.y,5,0);
               if alfa>90 then begin alfa:=alfa-90; ng:=-ng; end;
               if alfa<1 then begin alfa:=180-alfa; nv:=-nv; end;
               ud.x:=ball.x;
               ud.y:=ball.y;
               repeat
                     MakeBall(ball.x,ball.y,5,ColorFon);
                     radian:=pi180*alfa;
                     fly.y:=trunc(c*sin(radian));
                     fly.x:=trunc(c*cos(radian));
                     ball.x:=ud.x+fly.x*ng;
                     ball.y:=ud.y+fly.y*nv;
                     c:=c+ballspeed;
                     key:=InKey;
                     case key of
                     #72:begin
                              Left1:=true;
                              Right1:=false;
                         end;
                     #80:begin
                              Right1:=true;
                              Left1:=false;
                         end;
                     #87,#119:begin
                              Left2:=true;
                              Right2:=false;
                         end;
                     #83,#115:begin
                              Right2:=true;
                              Left2:=false;
                         end;
                     #32:begin
                              MakeHero(ColorFon);
                              Jump1:=true;
                              HeroX1:=heroX1-5;
                              GetTime(h,m,s,d);
                              TimeJ1:=s+m*60+h*3600+d/100;
                         end;
                     #81,#113:begin
                              MakeHero(ColorFon);
                              Jump2:=true;
                              HeroX2:=heroX2+5;
                              GetTime(h,m,s,d);
                              TimeJ2:=s+m*60+h*3600+d/100;
                         end;
                     end;
                     GetTime(h,m,s,d);
                     T:=s+m*60+h*3600+d/100;
                     if Jump1 then
                        begin
                             MakeHero(ColorFon);
                             HeroX1:=HeroX1-5;
                        end;
                     if (Jump1) and (T-TimeJ1>=0.25) then
                         begin
                              MakeHero(ColorFon);
                              Jump1:=false;
                         end;
                     if (Jump1=false) and (HeroX1<600) then
                        begin
                             MakeHero(ColorFon);
                             HeroX1:=HeroX1+5;
                        end;
                     if Jump2 then
                        begin
                             MakeHero(ColorFon);
                             HeroX2:=HeroX2+5;
                        end;
                     if (Jump2) and (T-TimeJ2>=0.25) then
                         begin
                              MakeHero(ColorFon);
                              Jump2:=false;
                         end;
                     if (Jump2=false) and (HeroX2>40) then
                        begin
                             MakeHero(ColorFon);
                             HeroX2:=HeroX2-5;
                        end;
                     MakeHero(ColorFon);
                     If Left1 then heroy1:=heroy1-herospeed;
                     if Right1 then heroy1:=heroy1+herospeed;
                     If HeroY1<=1 then Heroy1:=1;
                     If HeroY1>=425-herob then HeroY1:=425-herob;
                     If (HeroY1<=1) or (HeroY1>=425-HeroB) then
                        begin
                             Left1:=false;
                             Right1:=false;
                        end;
                     If Left2 then heroy2:=heroy2-herospeed;
                     if Right2 then heroy2:=heroy2+herospeed;
                     If HeroY2<=1 then Heroy2:=1;
                     If HeroY2>=425-herob then HeroY2:=425-herob;
                     If (HeroY2<=1) or (HeroY2>=425-HeroB) then
                        begin
                             Left2:=false;
                             Right2:=false;
                        end;
                     MakeHero(ColorHero);
                     MakeBall(ball.x,ball.y,5,ColorBall);
                     delay(duration*2);
                     GameText;
               until (Udar) or (Key=#27) or (f);
         until (key=#27) or (f);
         {GameOver;}
         flag:=false;
         if key=#27 then flag:=true;
    end;

function SureLeave:boolean;
var number,num,choice:byte;
    x:integer;
    key:char;
begin
     HideMouse;
     SetColor(4);
     SetFillStyle(1,7);
     Rectangle(145,160,465,310);
     FloodFill(146,161,4);
     SetTextStyle(2,HorizDir,8);
     OutTextXy(175,175,'Are you sure want');
     OutTextXy(170,210,'to leave this game?');
     SetFillStyle(1,4);
     Bar(185,265,260,295);
     Bar(320,265,395,295);
     SetColor(15);
     OutTextXy(202,265,'Yes');
     OutTextXy(345,265,'No');
     number:=1;
     Choice:=0;
     ShowMouse;
     ShowMouse;
     repeat
           num:=number;
           SetColor(ColorSelect);
           case number of
           1:x:=185;
           2:x:=320;
           end;
           Rectangle(x,265,x+75,295);
           num:=number;
           if (MouseX>185) and (MouseX<260) and (MouseY>265) and (MouseY<295) then
              case LeftButton of
              True:choice:=number;
              False:num:=1;
              end;
           if (MouseX>320) and (MouseX<395) and (MouseY>265) and (MouseY<295) then
              case LeftButton of
              True:choice:=number;
              False:num:=2;
              end;
           key:=Inkey;
           case key of
           #75:dec(num);
           #77:inc(num);
           end;
           if num=0 then num:=2;
           if num=3 then num:=1;
           if num<>number then
              begin
                   SetColor(7);
                   Rectangle(x,265,x+75,295);
                   number:=num;
              end;
           if Key=#13 then choice:=number;
     until choice<>0;
     if choice=1 then SureLeave:=true
                 else SureLeave:=false;
end;


    procedure Game;
    var h,m,s,d:word;
        f:text;
        flag,esc,nl:boolean;
        ran:byte;
{Процедура, отвечающая за основную игру}
    begin
     ClearDevice;
     Assign(f,'options.opt');
     Reset(f);
     Readln(f,ColorBall);
     Readln(f,ColorHero);
     Readln(f,ColorFon);
     Readln(f,ColorMenuFon);
     Readln(f,ColorButton);
     Readln(f,ColorGameMenu);
     Readln(f,ColorMenuText);
     Readln(f,ColorGameText);
     Readln(f,ColorClock);
     Readln(f,ColorSelect);
     Readln(f,BallSpeed);
     Readln(f,HeroSpeed);
     Readln(f,HeroB);
     Readln(f,Duration);
     Close(f);
     Jump1:=false;
     Jump2:=false;
     HeroY1:=100;
     HeroY2:=100;
         SetColor(ColorFon);
         SetFillStyle(1,ColorFon);
         Bar(0,0,641,425);
         SetColor(ColorGameMenu);
         SetFillStyle(1,ColorGameMenu);
         Bar(0,426,641,481);
         HeroX1:=600;
         HeroX2:=25;
         ran:=random(100)+1;
         case ran of
         1..50:ng:=1
         else ng:=-1;
         end;
         ran:=random(100)+1;
         case ran of
         1..50:nv:=1
         else nv:=-1;
         end;
         alfa:=random(50)+1;
         ball.x:=275;
         ball.y:=200;
         right1:=false;
         left1:=false;
         right2:=false;
         left2:=false;
         flag:=false;
         repeat
               Time:=0;
               nl:=false;
               BallWalking(esc,nl);
               if nl then Game;
               if esc then flag:=SureLeave;
         until (flag) or (not(esc));
     Assign(f,'options.opt');
     Reset(f);
     Readln(f,ColorBall);
     Readln(f,ColorHero);
     Readln(f,ColorFon);
     Readln(f,ColorMenuFon);
     Readln(f,ColorButton);
     Readln(f,ColorGameMenu);
     Readln(f,ColorMenuText);
     Readln(f,ColorGameText);
     Readln(f,ColorClock);
     Readln(f,ColorSelect);
     Readln(f,BallSpeed);
     Readln(f,HeroSpeed);
     Readln(f,HeroB);
     Readln(f,Duration);
     Close(f);
    end;

procedure Information;
var inffile:text;
    i:byte;
    str:string;
    gd,gm,ErrorCode:integer;
begin
     CloseGraph;
     TextBackGround(ColorMenuFon);
     ClrScr;
     TextColor(ColorMenuText);
     assign(inffile,'readme.hlp');
     reset(infFile);
     For i:=1 to 24 do
         begin
              readln(inffile,str);
              if i<>4 then Writeln(str)
                      else write(str);
         end;
     Write('Нажмите Esc для возврата в меню');
     repeat until Readkey=#27;
     close(inffile);
     gd:=Detect;
     InitGraph(gd,gm,'');
     ErrorCode:=GraphResult;
     if ErrorCode<>0 then
         begin
              ClrScr;
              Writeln('Error:',GraphErrorMsg(ErrorCode));
              Readln;
         end;
end;

procedure OptionsText;
begin
     ClrScr;
     GotoXy(35,1);
     Write('Настройки');
     Gotoxy(1,3);
     Writeln('     Цвет мяча - ',Colors[ColorBall]);
     Writeln('     Цвет доски - ',Colors[ColorHero]);
     Writeln('     Цвет фона в игровом поле - ',Colors[ColorFon]);
     Writeln('     Цвет фона меню - ',Colors[ColorMenuFon]);
     Writeln('     Цвет кнопок - ',Colors[ColorButton]);
     Writeln('     Цвет фона меню в игре - ',Colors[ColorGameMenu]);
     Writeln('     Цвет текста в меню - ',Colors[ColorMenuText]);
     Writeln('     Цвет текста в игре - ',Colors[ColorGameText]);
     Writeln('     Цвет часов - ',Colors[ColorClock]);
     Writeln('     Цвет рамки выбора - ',Colors[ColorSelect]);
     Writeln('     Скорость мяча - ',BallSpeed,' пикселей за один ход');
     Writeln('     Скорость доски - ',HeroSpeed,' пикселей за один ход');
     Writeln('     Ширина доски - ',HeroB,' пикселей');
     Writeln('     Задержка - ',Duration,' милисекунд');
     Writeln('     Вернуть по умолчанию');
end;

procedure Change(n:byte);
var st,s:string;
    m:integer;
    f,fl:boolean;
begin
 f:=false;
 fl:=true;
 repeat
     if fl then begin
     gotoxy(15,20);
     Write('                                                  ');
     gotoxy(15,20);
     case n of
     1:st:='     Цвет мяча - '+Colors[ColorBall];
     2:st:='     Цвет доски - '+Colors[ColorHero];
     3:st:='     Цвет фона в игровом поле - '+Colors[ColorFon];
     4:st:='     Цвет фона меню - '+Colors[ColorMenuFon];
     5:st:='     Цвет кнопок - '+Colors[ColorButton];
     6:st:='     Цвет фона меню в игре - '+Colors[ColorGameMenu];
     7:st:='     Цвет текста в меню - '+Colors[ColorMenuText];
     8:st:='     Цвет текста в игре - '+Colors[ColorGameText];
     9:st:='     Цвет часов - '+Colors[ColorClock];
     10:st:='     Цвет рамки выбора - '+Colors[ColorSelect];
     11:begin str(BallSpeed,s);
              st:='     Скорость мяча - '+s+' пикселей за один ход';
        end;
     12:begin str(HeroSpeed,s);
              st:='     Скорость доски - '+s+' пикселей за один ход';
        end;
     13:begin str(HeroB,s);
              st:='     Ширина доски - '+s+' пикселей';
        end;
     14:begin str(Duration,s);
              st:='     Задержка - '+s+' милисекунд';
        end;
     end;
     Write(St);
     gotoxy(80,25);
     fl:=false;
     end;
     case n of
     1:m:=ColorBall;
     2:m:=ColorHero;
     3:m:=ColorFon;
     4:m:=ColorMenuFon;
     5:m:=ColorButton;
     6:m:=ColorGameMenu;
     7:m:=ColorMenuText;
     8:m:=ColorGameText;
     9:m:=ColorClock;
     10:m:=ColorSelect;
     11:m:=BallSpeed;
     12:m:=HeroSpeed;
     13:m:=HeroB;
     14:m:=Duration;
     end;
     Case Inkey of
     #72:begin inc(m); fl:=true; end;
     #80:begin dec(m); fl:=true; end;
     #13:f:=true;
     end;
     if n<=10 then
      begin
        if m=16 then m:=0;
        if m=-1 then m:=15;
      end
             else
             if m=0 then m:=1;
     if n=13 then if m>640 then m:=640;
     case n of
     1:ColorBall:=m;
     2:ColorHero:=m;
     3:ColorFon:=m;
     4:ColorMenuFon:=m;
     5:ColorButton:=m;
     6:ColorGameMenu:=m;
     7:ColorMenuText:=m;
     8:ColorGameText:=m;
     9:ColorClock:=m;
     10:ColorSelect:=m;
     11:BallSpeed:=m;
     12:HeroSpeed:=m;
     13:HeroB:=m;
     14:Duration:=m;
     end;
 until f;
 gotoxy(15,20);
 Write('                                                  ');
 TextBackGround(ColorMenuFon);
 TextColor(ColorMenuText);
 OptionsText;
end;

procedure Default;
var Fi : Text;
begin
     Deshifrovka('default.cod','default.opt');
     Assign(fi,'default.opt');
     Reset(fi);
     Readln(fi,ColorBall);
     Readln(fi,ColorHero);
     Readln(fi,ColorFon);
     Readln(fi,ColorMenuFon);
     Readln(fi,ColorButton);
     Readln(fi,ColorGameMenu);
     Readln(fi,ColorMenuText);
     Readln(fi,ColorGameText);
     Readln(fi,ColorClock);
     Readln(fi,ColorSelect);
     Readln(fi,BallSpeed);
     Readln(fi,HeroSpeed);
     Readln(fi,HeroB);
     Readln(fi,Duration);
     Erase(fi);
     Close(fi);
     OptionsText;
end;


procedure Options;
var fil:text;
    gd,gm,errorcode:integer;
    n:byte;
    flag:boolean;
begin
     CloseGraph;
     TextBackGround(ColorMenuFon);
     TextColor(ColorMenuText);
     OptionsText;
     n:=3;
     flag:=false;
     repeat
           Gotoxy(3,n);
           Write('*');
           Gotoxy(80,25);
           Case Readkey of
           #72:begin
                    Gotoxy(3,n);
                    Write(' ');
                    Dec(n);
               end;
           #80:begin
                    Gotoxy(3,n);
                    Writeln(' ');
                    Inc(n);
               end;
           #13:if n<>17 then Change(n-2)
                        else Default;
           #27:flag:=true;
           end;
           if n=2 then n:=17;
           if n=18 then n:=3;
     until flag;
     assign(fil,'options.opt');
     Rewrite(fil);
     Writeln(fil,ColorBall);
     Writeln (fil,ColorHero);
     Writeln (fil,ColorFon);
     Writeln (fil,ColorMenuFon);
     Writeln (fil,ColorButton);
     Writeln (fil,ColorGameMenu);
     Writeln (fil,ColorMenuText);
     Writeln (fil,ColorGameText);
     Writeln (fil,ColorClock);
     Writeln (fil,ColorSelect);
     Writeln (fil,BallSpeed);
     Writeln (fil,HeroSpeed);
     Writeln (fil,HeroB);
     Writeln (fil,Duration);
     Close(fil);
     gd:=Detect;
     InitGraph(gd,gm,'');
     ErrorCode:=GraphResult;
     if ErrorCode<>0 then
         begin
              ClrScr;
              Writeln('Error:',GraphErrorMsg(ErrorCode));
              Readln;
         end;
end;

procedure ButtonPress(n:byte);
var x,y:integer;
    s:string;
begin
     HideMouse;
     case n of
     1:y:=10;
     2:y:=110;
     3:y:=210;
     4:y:=310;
     5:y:=410;
     end;
     SetColor(ColorMenuFon);
     SetFillStyle(1,ColorMenuFon);
     Bar(100,y,300,y+50);
     SetColor(0);
     SetFillStyle(1,0);
     Bar(105,y+5,305,y+55);
     SetColor(15);
     SetTextStyle(3,HorizDir,4);
     case n of
     1:s:='Start game';
     2:s:='Best players';
     3:s:='Options';
     4:s:='Information';
     5:s:='Quit';
     end;
     case n of
     1,4:x:=125;
     2:x:=115;
     3:x:=155;
     5:x:=175;
     end;
     OutTextXy(x+5,y+5,s);
     ShowMouse;
     delay(duration*7);
end;

function SureExit:boolean;
var number,num,choice:byte;
    x:integer;
    key:char;
begin
     HideMouse;
     SetColor(4);
     SetFillStyle(1,7);
     Rectangle(145,160,465,310);
     FloodFill(146,161,4);
     SetTextStyle(2,HorizDir,8);
     OutTextXy(175,175,'Are you sure want');
     OutTextXy(175,210,'to quit this game?');
     SetFillStyle(1,4);
     Bar(185,265,260,295);
     Bar(320,265,395,295);
     SetColor(15);
     OutTextXy(202,265,'Yes');
     OutTextXy(345,265,'No');
     number:=1;
     Choice:=0;
     ShowMouse;
     ShowMouse;
     repeat
           num:=number;
           SetColor(ColorSelect);
           case number of
           1:x:=185;
           2:x:=320;
           end;
           Rectangle(x,265,x+75,295);
           num:=number;
           if (MouseX>185) and (MouseX<260) and (MouseY>265) and (MouseY<295) then
              case LeftButton of
              True:choice:=number;
              False:num:=1;
              end;
           if (MouseX>320) and (MouseX<395) and (MouseY>265) and (MouseY<295) then
              case LeftButton of
              True:choice:=number;
              False:num:=2;
              end;
           key:=Inkey;
           case key of
           #75:dec(num);
           #77:inc(num);
           end;
           if num=0 then num:=2;
           if num=3 then num:=1;
           if num<>number then
              begin
                   SetColor(7);
                   Rectangle(x,265,x+75,295);
                   number:=num;
              end;
           if Key=#13 then choice:=number;
     until choice<>0;
     if choice=1 then SureExit:=true
                 else SureExit:=false;
end;

function MainMenu:byte;
var color,choice:byte;
    radius:integer;
    n:shortint;
    flag:boolean;
    i,j:integer;
    h,m,s,d,sec:word;
    st:string;
    year,month,day,dayofweek,date:word;
    x:integer;
    number,num:byte;
begin
     HideMouse;
     ClearDevice;
     Color:=ColorMenuFon;
     SetColor(Color);
     SetFillStyle(1,Color);
     Bar(0,0,641,481);
     Color:=ColorButton;
     SetColor(Color);
     SetFillStyle(1,Color);
     Bar(100,10,300,60);
     Bar(100,110,300,160);
     Bar(100,210,300,260);
     Bar(100,310,300,360);
     Bar(100,410,300,460);
     Color:=ColorMenuText;
     SetColor(color);
     SetTextStyle(3,HorizDir,4);
     OutTextXy(120,10,'Start game');
     OutTextXy(110,110,'Best players');
     OutTextXy(150,210,'Options');
     OutTextXy(120,310,'Information');
     OutTextXy(170,410,'Quit');
     SetTextStyle(4,VertDir,7);
     OutTextXy(10,50,'PING PONG');
     OutTextXy(300,50,'PING PONG');
     SetTextStyle(7,HorizDir,1);
     OutTextXy(437,375,'Copyright by');
     OutTextXy(412,400,'Yermilov Yaroslav');
     Choice:=0;
     InitMouse;
     ShowMouse;
     Color:=0;
     Date:=0;
     number:=1;
     ShowMouse;
     ShowMouse;
 repeat
     Radius:=1;
     N:=1;
     repeat
     color:=random(16);
     until color<>ColorMenuFon;
     SetColor(Color);
     SetFillStyle(1,Color);
     repeat
           SetColor(ColorSelect);
           Rectangle(100,number*100-90,300,number*100-40);
           case Inkey of
           #72:begin
                    SetColor(ColorMenuFon);
                    Rectangle(100,number*100-90,300,number*100-40);
                    dec(number);
               end;
           #80:begin
                    SetColor(ColorMenuFon);
                    Rectangle(100,number*100-90,300,number*100-40);
                    inc(number);
               end;
           #13:Choice:=Number;
           end;
           if number=0 then number:=5;
           if number=6 then number:=1;
           num:=number;
           If (MouseX>100) and (MouseX<300) and (MouseY>10) and (MouseY<460) then
              begin
                   If (MouseY>10) and (MouseY<60) then num:=1;
                   If (MouseY>110) and (MouseY<160) then num:=2;
                   If (MouseY>210) and (MouseY<260) then num:=3;
                   if (MouseY>310) and (MouseY<360) then num:=4;
                   if (MouseY>410) and (MouseY<460) then num:=5;
              end;
           if num<>number then
               begin
                    SetColor(ColorMenuFon);
                    Rectangle(100,number*100-90,300,number*100-40);
                    number:=num;
               end;
           If (MouseX>100) and (MouseX<300) and (MouseY>10) and (MouseY<460) and (LeftButton) then
              begin
                   If (MouseY>10) and (MouseY<60) then choice:=1;
                   If (MouseY>110) and (MouseY<160) then choice:=2;
                   If (MouseY>210) and (MouseY<260) then choice:=3;
                   if (MouseY>310) and (MouseY<360) then choice:=4;
                   if (MouseY>410) and (MouseY<460) then choice:=5;
              end;
           if choice<>0 then ButtonPress(Choice);
           flag:=false;
           If ((MouseX>375) and (MouseX<625) and
           (MouseY>125) and (MouseY<375)) or
           ((MouseX>350) and (MouseX<460) and (MouseY>435) and
           (MouseY<480)) then flag:=true;
           if flag then HideMouse;
           SetColor(Color);
           Circle(500,250,radius);
           radius:=radius+n;
           If radius>125 then
              begin
                    Color:=ColorMenuFon;
                    n:=-1;
              end;
           if flag then ShowMouse;
           GetTime(h,m,s,d);
           if s+m*60+h*3600<>sec then Clean(440,435,550,480,ColorMenuFon);
           Sec:=S+M*60+H*3600;
           SetColor(ColorClock);
           SetTextStyle(3,HorizDir,3);
           Str(h,st);
           if h<10 then st:='0'+st;
           OutTextXy(440,435,st);
           OutTextXy(470,435,':');
           Str(m,st);
           if m<10 then st:='0'+st;
           OutTextXy(480,435,st);
           OutTextXy(510,435,':');
           Str(s,st);
           if s<10 then st:='0'+st;
           OutTextXy(520,435,st);
           GetDate(year,month,day,dayofweek);
           if day+month*31+year*365<>date then
              begin
                   date:=day+month*31+year*365;
                   Clean(420,40,640,150,ColorMenuFon);
              end;
           OutTextXy(450,10,'Today is');
           Case dayofweek of
           0:st:='Sunday';
           1:st:='Monday';
           2:st:='Tuesday';
           3:st:='Wednesday';
           4:st:='Thursday';
           5:st:='Friday';
           6:st:='Saturday';
           end;
           case dayofweek of
           0:x:=459;
           1:x:=459;
           2:x:=454;
           3:x:=440;
           4:x:=447;
           5:x:=465;
           6:x:=450;
           end;
           OutTextXy(x,40,st);
           Case month of
           1,10:x:=435;
           2,11,12:x:=430;
           3:x:=445;
           4:x:=450;
           5,7:x:=457;
           6:x:=453;
           8:x:=440;
           9:x:=420;
           end;
           str(day,st);
           OutTextXy(x,70,st);
           Case month of
           1:st:='January';
           2:st:='February';
           3:st:='March';
           4:st:='April';
           5:st:='May';
           6:st:='June';
           7:st:='July';
           8:st:='August';
           9:st:='September';
           10:st:='October';
           11:st:='November';
           12:st:='December';
           end;
           OutTextXy(x+40,70,st);
           str(year,st);
           OutTextXy(465,100,st);
           delay(duration div 2);
     until (radius<=0) or (choice<>0);
     inc(color);
     until (choice<>0);
     MainMenu:=choice;
     HideMouse;
end;


procedure InitPingPong;
{Инициализация графики и игры}
var errorcode,gd,gm:integer;
    result:byte;
    f:text;
    flag:boolean;
    h,m,s,d:word;
begin
     gd:=detect;
     randomize;
     InitGraph(gd,gm,'');
     ErrorCode:=GraphResult;
     DeShifrovka('options.cod','options.opt');
     Assign(f,'options.opt');
     Reset(f);
     Readln(f,ColorBall);
     Readln(f,ColorHero);
     Readln(f,ColorFon);
     Readln(f,ColorMenuFon);
     Readln(f,ColorButton);
     Readln(f,ColorGameMenu);
     Readln(f,ColorMenuText);
     Readln(f,ColorGameText);
     Readln(f,ColorClock);
     Readln(f,ColorSelect);
     Readln(f,BallSpeed);
     Readln(f,HeroSpeed);
     Readln(f,HeroB);
     Readln(f,Duration);
     Close(f);
     flag:=false;
     If ErrorCode=GrOk then
                           begin
                       repeat
                             delay(duration*40);
                             Result:=0;
                             Result:=MainMenu;
                             Case Result of
                             1:begin
                                    GetTime(h,m,s,d);
                                    FirstTime:=s+m*60+h*3600;
                                    Score1:=0;
                                    Score2:=0;
                                    Game;
                               end;
                             {2:BestPlayers;}
                             3:Options;
                             4:Information;
                             end;
                             if Result=5 then Flag:=SureExit;
                       until (Result=5) and (flag);
                       CloseGraph;
                       Shifrovka('options.opt','options.cod');
                       Assign(f,'options.opt');
                       Reset(f);
                       Erase(f);
                       Close(f);
                           end
                       else
                           begin
                       ClrScr;
                       Writeln('Error:',GraphErrorMsg(ErrorCode));
                       Readln;
                           end;
end;

begin
InitPingPong;
end.