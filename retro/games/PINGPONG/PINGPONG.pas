{ PING-PONG (2005) — арканоїд: платформа, мʼяч, стіна блоків, бонуси,
  таблиця рекордів і екран опцій.
  Original: /Users/yarik/games/PINGPONG/PP.PAS (1779 рядків, program PingPong).

  ЧОМУ САМЕ ЦЕЙ ФАЙЛ: у теці лежать ШІСТЬ варіантів, і попередній порт узяв
  найменший — PINGPONG.PAS на 245 рядків (`program PingPong0`, рання чернетка
  без опцій, бонусів і рекордів). Це повна версія.

  Дифф проти оригіналу, повністю:
  - 13 процедур стали `async` — ті, що прямо чи транзитивно доходять до Delay
    або до блокуючого читання клавіші. Решта 20 лишилися синхронними; зокрема
    InKey, бо він читає під `if KeyPressed` — це опитування, а не очікування.
  - `delay(n)` → `await(delay(n))`.
  - Блокуючі `ReadKey` → `chr(trunc(await(double, ReadKeyA)))`. Синхронний
    ReadKey шима не блокує (повертає #0 на порожній черзі), тож у циклі
    очікування він крутив би вкладку намертво.
  - Єдиний `ExReadKey(flag)` розгорнуто на місці — шим crt уже віддає розширені
    клавіші двома читаннями (#0, потім скан-код), рівно як INT 16h.
  - Файлові операції → шим tpfiles: `Readln(f,…)` → `ReadlnT`/`ReadLnNum`
    (саме функція, а не `ReadlnLong`: у записі гравця Score/Time — longint, а
    Level — byte, і var-параметр вимагав би точного збігу типів),
    `Writeln(f,…)` → `WritelnT`/`WritelnLong`; `Rewrite`/`Erase` дописано в шим.
  - `string[N]` → `string` — pas2js не має коротких рядків.
  - `uses` втратив `keys`, отримав `JS` і `tpfiles`. `shifr` — локальний шим:
    розшифровку .COD зроблено на етапі збірки (плейнтекст у data/), але копію
    .cod→.scr/.opt шим таки робить. Без неї гра стирає (Erase) плейнтекст після
    першого читання, і таблиця рекордів з другого заходу порожня.
  - П'ять циклів опитування Inkey отримали `await(Delay(15))`: без нього вкладка
    зависає намертво — Inkey не блокує, тож цикл крутиться, не віддаючи керування
    браузеру, і KeyPressed ніколи не стане true. Через це BestPlayers і Change
    теж стали async (разом 15).

  РЕМОНТ (01.08.2026) — «фон поля малюється тільки до y≈300, під ним видно
  попередній екран». Симптом косметичний, причина — ні: ДВА виклики async-
  процедур лишились БЕЗ `await`, і кожен породжував паралельний цикл.
  - `BallWalking(esc,nl)` у Game: без await він віддавав керування миттєво з
    esc=nl=false, тож `until (flag) or (not(esc))` спрацьовував ОДРАЗУ, Game
    поверталася в меню, а сам BallWalking лишався жити відчепленим і далі
    малював платформу поверх меню.
  - `ButtonPress(Choice)` у MainMenu: без await меню не чекало на гру, тож його
    власний цикл (годинник, перемальовування кнопок) крутився ОДНОЧАСНО з грою.
  Разом це й давало «до 300»: меню перемальовувало весь екран (Bar 0,0,641,481),
  а відчеплений MakeBlocks зафарбовував лише 0..300 — нижче лишалося меню.
  Кожен новий запуск додавав ще один цикл: малювання дублювалося (виміряно —
  кожен Bar у логу двічі), і гра ставала дедалі швидшою.
  ⚠️ Джерело читати марно — воно виглядає правильним (Bar(0,0,641,HeroY+25) на
  місці й СПРАВДІ викликається). Діагноз дав лише лог викликів у браузері.
}

program PingPong;
uses JS, crt, graph, mouse, dos, tpfiles, shifr, nls;
type coordinates = record
     x,y:integer;
     end;
     block = record
     color,nx,ny,sort:byte;
     x,y,balls:integer;
     here:boolean;
     end;
     player = record
     name:string { pas2js: короткі рядки не підтримуються };
     score,time:longint;
     level:byte;
     end;
const pi180 = pi/180;
      by=7;
      bx=8;


var ball,fly,ud:coordinates;
    alfa,c,HeroX:integer;
    right,left:boolean;
    n0:byte;
    ng,nv:shortint;
    key:char;
    radian:real;
    ColorBall,ColorHero,ColorFon,ColorMenuFon,ColorButton,ColorGameMenu,
    ColorMenuText,ColorGameText,ColorClock,ColorSelect:byte;
    BallSpeed,HeroSpeed,HeroB,Duration:integer;
    Score:longint;
    FirstTime,NowTime,Time:longint;
    Lives : 1..3;
    Level:Integer;
    blocks:array [1..by, 1..bx] of block;
    ArrBP:array [1..10] of player;
    ArrNBP:array [1..11] of player;
    HighSpeedBall,SmallSpeedHero,SmallHero,BigHero,
    SmallSpeedBall,HighSpeedHero,Shleyf,ShleyfNow,Pushka,Snaryad,Jump:boolean;
    TimeHSB,TimeSSH,TimeSH,TimeHS,TimeBH,TimeSSB,TimeHSH,TimeS,TimeP:word;
    Sx,Sy:integer;
    Line:byte;
    HeroY:integer;
    TimeJ:real;
    SnSp:shortint;

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

    procedure Sortirovka;
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

    procedure BestPlayers; async;
    var f:text;
        i,j:byte;
        s:string;
        k:char;
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
                      1:ReadlnT(f, ArrBp[i].Name);
                      2:ArrBp[i].Score := ReadLnNum(f);
                      3:ArrBp[i].Level := ReadLnNum(f);
                      4:ArrBp[i].Time := ReadLnNum(f);
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
               await(Delay(15));  { поступитися циклу подій — інакше опитування Inkey крутить вкладку намертво }
               k:=Inkey;
               if k=#8 then
                  begin
                       Assign(f,'best.scr');
                       Rewrite(f);
                       Close(F);
                       Shifrovka('best.scr','best.cod');
                       await(BestPlayers);
                       exit;
                  end;
         until k=#27;
    end;

    function Input:string; async;
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
               key := chr(trunc(await(double, ReadKeyA)));
               flag := key = #0;
               if flag then key := chr(trunc(await(double, ReadKeyA)));
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

    procedure NewBestPlayer; async;
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
                      1:ReadlnT(f, ArrBp[i].Name);
                      2:ArrBp[i].Score := ReadLnNum(f);
                      3:ArrBp[i].Level := ReadLnNum(f);
                      4:ArrBp[i].Time := ReadLnNum(f);
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
                 ArrNBp[11].name:=await(Input);
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
                      1:WritelnT(f, n);
                      2:WritelnLong(f, s);
                      3:WritelnLong(f, l);
                      4:WritelnLong(f, t);
                      end;
             end;
         Close(f);
         Shifrovka('best.scr','best.cod');
         Assign(f,'best.scr');
         Reset(f);
         Erase(f);
         Close(f);
         await(BestPlayers);
    end;

    procedure GameOver; async;
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
         await(delay(duration*500));
         await(NewBestPlayer);
    end;

    procedure MakeBall(x,y:integer; radius,color:byte);
{Рисует мяч с координатами центра (x;y) радиусом radius и цветом color}
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Circle(x,y,radius);
         FloodFill(x,y,color);
    end;

{ Назви кольорів були const-масивом; Loc не можна викликати в ініціалізаторі
  константи, тож масив став функцією. Індекси — ті самі 0..15 BGI-кольори. }
function ColorName(i:byte):string;
begin
     case i of
     0:ColorName:=Loc('Black','Чорний');
     1:ColorName:=Loc('Blue','Синій');
     2:ColorName:=Loc('Green','Зелений');
     3:ColorName:=Loc('Cyan','Бірюзовий');
     4:ColorName:=Loc('Red','Червоний');
     5:ColorName:=Loc('Magenta','Рожевий');
     6:ColorName:=Loc('Brown','Коричневий');
     7:ColorName:=Loc('Light gray','Світло-сірий');
     8:ColorName:=Loc('Dark gray','Темно-сірий');
     9:ColorName:=Loc('Light blue','Світло-синій');
     10:ColorName:=Loc('Light green','Світло-зелений');
     11:ColorName:=Loc('Light cyan','Світло-бірюзовий');
     12:ColorName:=Loc('Light red','Світло-червоний');
     13:ColorName:=Loc('Light magenta','Світло-рожевий');
     14:ColorName:=Loc('Yellow','Жовтий');
     15:ColorName:=Loc('White','Білий');
     else ColorName:='';
     end;
end;

    procedure MakeSnaryad(color:byte);
    const r=3;
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Circle(Sx,Sy,r);
         FloodFill(Sx,Sy,color);
    end;

    procedure MakeHero(color:byte);
{Рисует доску цветом color и с координатами левого верхнего края (HeroX;HeroY)}
    var HC{HeroCenter}:word;
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Bar(HeroX,HeroY,HeroX+HeroB,HeroY+15);
         HC:=HeroX+HeroB div 2;
         if Pushka then
            Bar(HC-10,HeroY-25,HC+10,HeroY);
         If Pushka and Snaryad then
            begin
                 MakeSnaryad(ColorFon);
                 Sy:=Sy-SnSp;
                 MakeSnaryad(ColorBall);
            end;
    end;

    procedure MakeBlocks;
    var i,j:byte;
    begin
         SetColor(ColorFon);
         SetFillStyle(1,ColorFon);
         Bar(0,0,640,300);
         for i:=1 to by do
             for j:=1 to bx do
                 with blocks[i,j] do
                 if here then
                   begin
                      SetColor(15);
                      SetFillStyle(1,Color);
                      Rectangle(x,y,x+79,y+19);
                      FloodFill(x+1,y+1,15);
                   end;
    end;


    procedure LinePlus;
    var i,j:byte;
    begin
         inc(line);
         for i:=1 to by do
             for j:=1 to bx do
                 begin
                      if i=line then blocks[i,j].here:=true;
                 end;
         MakeBlocks;
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
            end;
         if ball.x>=633 then {Right}
            begin
                 Udar:=true;
                 ng:=-1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.x:=632;
            end;
         if ball.y<=7 then   {Up}
            begin
                 Udar:=true;
                 nv:=1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.y:=8;
            end;
         if ball.y>=heroy+10 then {Down}
            begin
                 Udar:=true;
                 nv:=-1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.y:=heroy+9;
                 Dec(Lives);
                 Clean(105,435,125,480,ColorGameMenu);
                 LinePlus;
            end;
 {Doska} if (abs(ball.y-heroy)<=5) and (ball.x>=herox) and (ball.x<=herox+Herob) then
            begin
                 Udar:=true;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 nv:=-1;
                 ball.y:=Heroy-6;
             if Jump then
                begin
                     alfa:=alfa * 2;
                end else
                 if ((ball.x-herox<=10) or (herox-ball.x<=10)) and (not(ShleyfNow)) then
                    begin
                         if Left then
                            if ng=1 then ng:=-1
                                    else alfa:=alfa div 2;
                         If Right then
                            if ng=-1 then ng:=1
                                    else alfa:=alfa div 2;
                    end
                  else
                    begin
                 If Left then
                    if ng=1 then alfa:=alfa+3
                            else alfa:=alfa-3;
                 If Right then
                    if ng=-1 then alfa:=alfa+3
                             else alfa:=alfa-3;
                    end;
            end;
 if Shleyf then
   begin
        if Left then
           begin
                if (abs(heroy-ball.y)<=20) and (ball.x>=herox+herob) and (ball.x<=herox+Herob+herospeed) then
                   begin
                 Udar:=true;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 nv:=-1;
                 ball.y:=Heroy-21;
                 if ((ball.x-herox<=10) or (herox-ball.x<=10)) then
                    begin
                         if ng=1 then ng:=-1
                                    else alfa:=alfa div 2;
                    end
                  else
                    begin
                         if ng=1 then alfa:=alfa+3
                            else alfa:=alfa-3;
                    end;
                   end;
           end;
 if Right then
    begin
         if (abs(ball.y-heroy)<=20) and (ball.x>=herox-herospeed) and (ball.x<=herox) then
            begin
                 Udar:=true;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 nv:=-1;
                 ball.y:=Heroy-21;
                 if ((ball.x-herox<=10) or (herox-ball.x<=10)) then
                    begin
                         if ng=-1 then ng:=1
                            else alfa:=alfa div 2;
                    end
                  else
                    begin
                         if ng=-1 then alfa:=alfa+3
                            else alfa:=alfa-3;
                    end;
            end;
    end;
    end;
    end;

    procedure GameText;
    var s:string;
        h,m,sec,d:word;
        i,j:integer;
    begin
         SetColor(ColorGameText);
         SetTextStyle(7,HorizDir,3);
         OutTextXy(10,435,'Lives - ');
         Str(lives,s);
         OutTextXy(105,435,s);
         OutTextXy(125,435,'Level -');
         Str(level,s);
         OutTextXy(220,435,s);
         OutTextXy(240,435,'Score -');
         str(score,s);
         OutTextXy(335,435,s);
         OutTextXy(450,435,'Time -');
         GetTime(h,m,sec,d);
         NowTime:=sec+m*60+h*3600;
         if NowTime-FirstTime>Time then
            begin
                 Time:=NowTime-FirstTime;
                 str(NowTime-FirstTime,s);
                 Clean(550,435,640,460,ColorGameMenu);
                 OutTextXy(550,435,s);
            end;
    end;

    procedure InitBlocks;
    var i,j:byte;
    begin
         for i:=1 to by do
             for j:=1 to bx do
                 with blocks[i,j] do
                  begin
                      sort:=random(14)+1;
                      case sort of
                      1:color:=0;
                      2:color:=4;
                      3:color:=5;
                      4:color:=12;
                      5:color:=13;
                      6:color:=6;
                      7:color:=7;
                      8:color:=1;
                      9:color:=2;
                      10:color:=9;
                      11:color:=10;
                      12:color:=14;
                      13:color:=15;
                      end;
                      case sort of
                      1..10:balls:=sort*100;
                      11:balls:=1500;
                      12:balls:=2500;
                      13:balls:=5000;
                      end;
                      if i=1 then here:=true
                             else here:=false;
                      Line:=1;
                      nx:=j;
                      ny:=i;
                      x:=(j-1)*80;
                      y:=(i-1)*20;
                  end;
    end;

    function BlockUdar:boolean;
    const a0=50;
    var i,j:byte;
        u:boolean;
        h,m,s,d:word;
        iu,ju:integer;
        x,y:integer;
    begin
         u:=false;
         for i:=1 to by do
             for j:=1 to bx do
                      if (blocks[i,j].here) and (not(u)) then
                         begin
                              if ((Sx>blocks[i,j].x) and
                                 (Sx<blocks[i,j].x+78) and
                                 (abs(Sy-(blocks[i,j].y+19))<=10))
                                 and (Snaryad) and (Pushka) then
                                       begin
                                            x:=blocks[i,j].x;
                                            y:=blocks[i,j].y;
                                            SetColor(ColorFon);
                                            SetFillStyle(1,ColorFon);
                                            Rectangle(x,y,x+79,y+20);
                                            FloodFill(x+1,y+1,ColorFon);
                                            if blocks[i,j].sort=1 then
                                               Clean(x,y,x+79,y+a0,ColorFon);
                                            blocks[i,j].here:=false;
                                            score:=score+blocks[i,j].balls;
                                            Clean(335,435,449,480,ColorGameMenu);
                                            Snaryad:=false;
                                            MakeSnaryad(ColorFon);
                                            iu:=i;
                                            ju:=j;
                                       end;
                              if ((Ball.x>blocks[i,j].x) and
                                 (Ball.x<blocks[i,j].x+78) and
                                 (abs(Ball.y-(blocks[i,j].y+19))<=10))
                                 and (not(u)) then
                                       begin
                                            x:=blocks[i,j].x;
                                            y:=blocks[i,j].y;
                                            SetColor(ColorFon);
                                            SetFillStyle(1,ColorFon);
                                            Rectangle(x,y,x+79,y+20);
                                            FloodFill(x+1,y+1,ColorFon);
                                            if blocks[i,j].sort=1 then
                                               Clean(x,y,x+79,y+a0,ColorFon);
                                            blocks[i,j].here:=false;
                                            score:=score+blocks[i,j].balls;
                                            Clean(335,435,449,480,ColorGameMenu);
                                            nv:=1;
                                            MakeBall(ball.x,ball.y,5,ColorFon);
                                            Ball.y:=Blocks[i,j].y+11;
                                            u:=true;
                                            ball.y:=blocks[i,j].y+30;
                                            iu:=i;
                                            ju:=j;
                                       end;
                              if (Ball.x>blocks[i,j].x) and
                                 (Ball.x<blocks[i,j].x+78) and
                                 (abs(Ball.y-(blocks[i,j].y))<=10)
                                 and (not(u))then
                                       begin
                                            x:=blocks[i,j].x;
                                            y:=blocks[i,j].y;
                                            SetColor(ColorFon);
                                            SetFillStyle(1,ColorFon);
                                            Rectangle(x,y,x+79,y+20);
                                            FloodFill(x+1,y+1,ColorFon);
                                            if blocks[i,j].sort=1 then
                                               Clean(x,y,x+79,y+a0,ColorFon);
                                            blocks[i,j].here:=false;
                                            score:=score+blocks[i,j].balls;
                                            Clean(335,435,449,480,ColorGameMenu);
                                            nv:=-1;
                                            MakeBall(ball.x,ball.y,5,ColorFon);
                                            Ball.y:=Blocks[i,j].y+11;
                                            u:=true;
                                            ball.y:=blocks[i,j].y-10;
                                            iu:=i;
                                            ju:=j;
                                       end;
                              if (Ball.y>blocks[i,j].y) and
                                 (Ball.y<blocks[i,j].y+19) and
                                 (abs(Ball.x-(blocks[i,j].x))<=10)
                                 and (not(u)) then
                                       begin
                                            x:=blocks[i,j].x;
                                            y:=blocks[i,j].y;
                                            SetColor(ColorFon);
                                            SetFillStyle(1,ColorFon);
                                            Rectangle(x,y,x+79,y+20);
                                            FloodFill(x+1,y+1,ColorFon);
                                            if blocks[i,j].sort=1 then
                                               Clean(x,y,x+79,y+a0,ColorFon);
                                            blocks[i,j].here:=false;
                                            score:=score+blocks[i,j].balls;
                                            Clean(335,435,449,480,ColorGameMenu);
                                            ng:=-1;
                                            MakeBall(ball.x,ball.y,5,ColorFon);
                                            Ball.y:=Blocks[i,j].y+11;
                                            u:=true;
                                            ball.x:=blocks[i,j].x-10;
                                            iu:=i;
                                            ju:=j;
                                       end;
                              if (Ball.y>blocks[i,j].y) and
                                 (Ball.y<blocks[i,j].y+19) and
                                 (abs(Ball.x-(blocks[i,j].x+78))<=10)
                                 and (not(u)) then
                                       begin
                                            x:=blocks[i,j].x;
                                            y:=blocks[i,j].y;
                                            SetColor(ColorFon);
                                            SetFillStyle(1,ColorFon);
                                            Rectangle(x,y,x+79,y+20);
                                            FloodFill(x+1,y+1,ColorFon);
                                            if blocks[i,j].sort=1 then
                                               Clean(x,y,x+79,y+a0,ColorFon);
                                            blocks[i,j].here:=false;
                                            score:=score+blocks[i,j].balls;
                                            Clean(335,435,449,480,ColorGameMenu);
                                            ng:=1;
                                            MakeBall(ball.x,ball.y,5,ColorFon);
                                            Ball.y:=Blocks[i,j].y+11;
                                            u:=true;
                                            ball.x:=blocks[i,j].x+90;
                                            iu:=i;
                                            ju:=j;
                                       end;
                         end;
         BlockUdar:=u;
         MakeHero(ColorFon);
                      if u then
                                case blocks[iu,ju].sort of
                                            1:begin
                                              end;
                                            2:begin
                                                   HighSpeedBall:=true;
                                                   GetTime(h,m,s,d);
                                                   TimeHSB:=s+m*60+h*3600;
                                                   BallSpeed:=BallSpeed*5 div 4;
                                              end;
                                            3:begin
                                                   SmallSpeedHero:=true;
                                                   GetTime(h,m,s,d);
                                                   TimeSSH:=s+m*60+h*3600;
                                                   HeroSpeed:=HeroSpeed * 2 div 3;
                                              end;
                                            4:begin
                                                   SmallHero:=true;
                                                   GetTime(h,m,s,d);
                                                   TimeSH:=s+m*60+h*3600;
                                                   SetColor(ColorFon);
                                                   SetFillStyle(1,ColorFon);
                                                   Bar(HeroX,HeroY,HeroX+HeroB,HeroY+25);
                                                   HeroB:=HeroB* 2 div 3;
                                              end;
                                            5:begin
                                              end;
                                            6:begin
                                              end;
                                            7:begin
                                                   BigHero:=true;
                                                   GetTime(h,m,s,d);
                                                   TimeBH:=s+m*60+h*3600;
                                                   HeroB:=HeroB*3 div 2;
                                               end;
                                            8:begin
                                                   SmallSpeedBall:=true;
                                                   GetTime(h,m,s,d);
                                                   TimeSSB:=s+m*60+h*3600;
                                                   BallSpeed:=BallSpeed * 4 div 5;
                                              end;
                                            9:begin
                                                   HighSpeedHero:=true;
                                                   GetTime(h,m,s,d);
                                                   TimeHSH:=s+m*60+h*3600;
                                                   HeroSpeed:=HeroSpeed * 3 div 2;
                                              end;
                                            10:begin
                                                    Shleyf:=true;
                                                    GetTime(h,m,s,d);
                                                    TimeS:=s+m*60+h*3600;
                                               end;
                                            11:begin
                                                    Pushka:=true;
                                                    GetTime(h,m,s,d);
                                                    TimeP:=s+m*60+h*3600;
                                               end;
                                            12:begin
                                               end;
                                            13:begin
                                                    Clean(105,435,125,480,ColorGameMenu);
                                                    inc(lives);
                                               end;
                                            end;
         MakeHero(ColorHero);
    end;

    procedure Bonus; async;
    const b=7;
    var h,m,s,d,time:word;
        f:text;
    begin
         MakeHero(ColorFon);
         if HighSpeedBall then
            begin
                 GetTime(h,m,s,d);
                 Time:=s+m*60+h*3600;
                 if Time-TimeHSB>=b then
                    begin
                         HighSpeedBall:=false;
                         assign(f,'options.opt');
                         reset(f);
                         for h:=1 to 11 do
                             BallSpeed := ReadLnNum(f);
                         Close(f);
                    end;
            end;
         if SmallSpeedHero then
            begin
                 GetTime(h,m,s,d);
                 Time:=s+m*60+h*3600;
                 if Time-TimeSSH>=b then
                    begin
                         SmallSpeedHero:=false;
                         assign(f,'options.opt');
                         reset(f);
                         for h:=1 to 12 do
                             if h=12 then HeroSpeed := ReadLnNum(f);
                         Close(f);
                    end;
            end;
         if SmallHero then
            begin
                 GetTime(h,m,s,d);
                 Time:=s+m*60+h*3600;
                 if Time-TimeSH>=b then
                    begin
                         SmallHero:=false;
                         assign(f,'options.opt');
                         reset(f);
                         for h:=1 to 13 do
                             HeroB := ReadLnNum(f);
                         Close(f);
                    end;
            end;
         if BigHero then
            begin
                 GetTime(h,m,s,d);
                 Time:=s+m*60+h*3600;
                 if Time-TimeBH>=b then
                    begin
                         BigHero:=false;
                         SetColor(ColorFon);
                         SetFillStyle(1,ColorFon);
                         Bar(HeroX,HeroY,HeroX+HeroB,HeroY+25);
                         assign(f,'options.opt');
                         reset(f);
                         for h:=1 to 13 do
                             HeroB := ReadLnNum(f);
                         Close(f);
                    end;
            end;
         if SmallSpeedBall then
            begin
                 GetTime(h,m,s,d);
                 Time:=s+m*60+h*3600;
                 if Time-TimeSSB>=b then
                    begin
                         SmallSpeedBall:=false;
                         assign(f,'options.opt');
                         reset(f);
                         for h:=1 to 11 do
                             BallSpeed := ReadLnNum(f);
                         Close(f);
                    end;
            end;
         if HighSpeedHero then
            begin
                 GetTime(h,m,s,d);
                 Time:=s+m*60+h*3600;
                 if Time-TimeSSH>=b then
                    begin
                         HighSpeedHero:=false;
                         assign(f,'options.opt');
                         reset(f);
                         for h:=1 to 12 do
                             HeroSpeed := ReadLnNum(f);
                         Close(f);
                    end;
            end;
        if Shleyf then
           begin
                GetTime(H,m,s,d);
                Time:=s+m*60+h*3600;
                if Time-TimeS>=b then
                   begin
                        Shleyf:=false;
                        SetColor(0);
                        SetFillStyle(1,0);
                        Bar(0,HeroY,641,HeroY+15);
                   end;
           end;
        if Pushka then
           begin
                GetTime(h,m,s,d);
                Time:=s+m*60+h*3600;
                if Time-TimeP>=b then
                   begin
                        Pushka:=false;
                        Snaryad:=false;
                        SetColor(0);
                        SetFillStyle(1,0);
                        Bar(0,HeroY-50,641,HeroY+15);
                        MakeSnaryad(ColorFon);
                        MakeHero(ColorFon);
                   end;
           end;
           MakeHero(ColorHero);
    end;

    Procedure Pause;
    begin
     HideMouse;
     SetColor(4);
     SetFillStyle(1,7);
     Rectangle(205,200,405,270);
     FloodFill(206,201,4);
     SetTextStyle(2,HorizDir,10);
     OutTextXy(245,208,'Pause');
     ShowMouse;
    end;

    Procedure NoPause;
    begin
     HideMouse;
     SetColor(0);
     SetFillStyle(1,0);
     Bar(205,200,405,270);
     ShowMouse;
    end;

    procedure LineWork(var newlevel:boolean);
    var flag:boolean;
        i,j:byte;
    begin
         flag:=true;
         for i:=1 to by do
             for j:=1 to bx do
                 flag:=flag and (not(blocks[i,j].here));
         newlevel:=false;
         if flag then
            begin
                 Clean(220,435,240,450,ColorGameMenu);
                 inc(level);
                 newlevel:=true;
                 for i:=1 to level do
                     for j:=1 to bx do
                         blocks[i,j].here:=true;
            end;
    end;

    procedure SWork;
    begin
         if (abs(sx-ball.x)<=10) and (abs(sy-ball.y)<=10) then
            begin
                 alfa:=90;
                 nv:=-1;
                 SnSp:=-5;
            end;
         if Sy-HeroY>=25 then
            begin
                 Snaryad:=false;
                 MakeSnaryad(ColorFon);
            end;
    end;

    procedure BallWalking(var flag,f:boolean); async;
    var h,m,s,d:word;
        T:real;
    begin
         Time:=0;
         SetColor(0);
         SetFillStyle(1,0);
         Bar(145,160,465,310);
         MakeBlocks;
         repeat
               c:=1;
               MakeBall(ball.x,ball.y,5,0);
               if alfa>90 then begin alfa:=alfa-90; ng:=-ng; end;
               if alfa<1 then begin alfa:=180-alfa; nv:=-nv; end;
               ud.x:=ball.x;
               ud.y:=ball.y;
               repeat
                     MakeBall(ball.x,ball.y,5,ColorFon);
                     if BlockUdar then MakeBlocks;
                     radian:=pi180*alfa;
                     fly.y:=trunc(c*sin(radian));
                     fly.x:=trunc(c*cos(radian));
                     ball.x:=ud.x+fly.x*ng;
                     ball.y:=ud.y+fly.y*nv;
                     c:=c+ballspeed;
                     key:=inkey;
                     case key of
                     #75:begin
                              Left:=true;
                              Right:=false;
                         end;
                     #77:begin
                              Right:=true;
                              Left:=false;
                         end;
                     'P','p':begin
                                  Pause;
                                  repeat until keypressed;
                                  NoPause;
                             end;
                     'B','b':if (Pushka) and not (Snaryad) then begin
                                  Snaryad:=true;
                                  Sy:=HeroY-5;
                                  Sx:=HeroX+HeroB div 2;
                                  SnSp:=5;
                             end;
                     #32:begin
                              MakeHero(ColorFon);
                              Jump:=true;
                              Heroy:=heroy-5;
                              GetTime(h,m,s,d);
                              TimeJ:=s+m*60+h*3600+d/100;
                         end;
                     end;
                     GetTime(h,m,s,d);
                     T:=s+m*60+h*3600+d/100;
                     if Jump then
                        begin
                             MakeHero(ColorFon);
                             HeroY:=Heroy-5;
                        end;
                     if (Jump) and (T-TimeJ>=0.25) then
                         begin
                              MakeHero(ColorFon);
                              Jump:=false;
                              HeroY:=400;
                         end;
                     if Pushka and Snaryad then SWork;
                     MakeHero(ColorFon);
                     If Left then herox:=herox-herospeed;
                     if Right then herox:=herox+herospeed;
                     If HeroX<=1 then HeroX:=1;
                     If HeroX>=640-herob then HeroX:=641-herob;
                     If (HeroX<=1) or (HeroX>=540) then
                        begin
                             Left:=false;
                             Right:=false;
                        end;
                     if (Shleyf) then
                        begin
                             ShleyfNow:=false;
                             SetColor(ColorFon);
                             SetFillStyle(1,ColorFon);
                             Bar(0,HeroY,641,HeroY+15);
                             if Left then
                                begin
                                     ShleyfNow:=true;
                                     SetColor(ColorHero);
                                     SetFillStyle(9,ColorHero);
                                     Bar(HeroX+HeroB,HeroY,HeroX+HeroB+HeroSpeed*7,HeroY+15);
                                end;
                             if Right then
                                begin
                                     ShleyfNow:=true;
                                     SetColor(ColorHero);
                                     SetFillStyle(9,ColorHero);
                                     Bar(HeroX-HeroSpeed*7,HeroY,HeroX,HeroY+15);
                                end;
                        end;
                     MakeHero(ColorHero);
                     MakeBall(ball.x,ball.y,5,ColorBall);
                     await(delay(duration*2));
                     await(Bonus);
                     LineWork(f);
                     GameText;
               until (Udar) or (Key=#27) or (BlockUdar) or (f);
         until (key=#27) or (lives=0) or (f);
         if lives=0 then await(GameOver);
         flag:=false;
         if key=#27 then flag:=true;
    end;

function SureLeave:boolean; async;
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
           await(Delay(15));  { поступитися циклу подій — інакше опитування Inkey крутить вкладку намертво }
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


    procedure Game; async;
    var h,m,s,d:word;
        f:text;
        flag,esc,nl:boolean;
        ran:byte;
{Процедура, отвечающая за основную игру}
    begin
     ClearDevice;
     ShleyfNow:=false;
     Assign(f,'options.opt');
     Reset(f);
     ColorBall := ReadLnNum(f);
     ColorHero := ReadLnNum(f);
     ColorFon := ReadLnNum(f);
     ColorMenuFon := ReadLnNum(f);
     ColorButton := ReadLnNum(f);
     ColorGameMenu := ReadLnNum(f);
     ColorMenuText := ReadLnNum(f);
     ColorGameText := ReadLnNum(f);
     ColorClock := ReadLnNum(f);
     ColorSelect := ReadLnNum(f);
     BallSpeed := ReadLnNum(f);
     HeroSpeed := ReadLnNum(f);
     HeroB := ReadLnNum(f);
     Duration := ReadLnNum(f);
     Close(f);
     HighSpeedBall:=false;
     SmallSpeedHero:=false;
     SmallHero:=false;
     BigHero:=false;
     SmallSpeedBall:=false;
     HighSpeedHero:=false;
     Shleyf:=false;
     Jump:=false;
     Pushka:=false;
     Snaryad:=false;
     HeroY:=400;
         SetColor(ColorFon);
         SetFillStyle(1,ColorFon);
         Bar(0,0,641,Heroy+25);
         SetColor(ColorGameMenu);
         SetFillStyle(1,ColorGameMenu);
         Bar(0,Heroy+26,641,481);
         HeroX:=100;
         nv:=-1;
         ran:=random(100)+1;
         case ran of
         1..50:ng:=1
         else ng:=-1;
         end;
         alfa:=random(56)+30;
         ball.x:=150;
         ball.y:=350;
         herox:=100;
         right:=false;
         left:=false;
         flag:=false;
         repeat
               Time:=0;
               nl:=false;
               await(BallWalking(esc,nl));
               if nl then await(Game);
               if esc then flag:=await(SureLeave);
         until (flag) or (not(esc));
     Assign(f,'options.opt');
     Reset(f);
     ColorBall := ReadLnNum(f);
     ColorHero := ReadLnNum(f);
     ColorFon := ReadLnNum(f);
     ColorMenuFon := ReadLnNum(f);
     ColorButton := ReadLnNum(f);
     ColorGameMenu := ReadLnNum(f);
     ColorMenuText := ReadLnNum(f);
     ColorGameText := ReadLnNum(f);
     ColorClock := ReadLnNum(f);
     ColorSelect := ReadLnNum(f);
     BallSpeed := ReadLnNum(f);
     HeroSpeed := ReadLnNum(f);
     HeroB := ReadLnNum(f);
     Duration := ReadLnNum(f);
     Close(f);
    end;

procedure Information; async;
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
              ReadlnT(inffile, str);
              if i<>4 then Writeln(str)
                      else write(str);
         end;
     Write(Loc('Press Esc to return to the menu','Натисни Esc, щоб повернутися в меню'));
     repeat until chr(trunc(await(double, ReadKeyA)))=#27;
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
     Write(Loc('Options','Налаштування'));
     Gotoxy(1,3);
     Writeln(Loc('     Ball colour - ','     Колір мʼяча - '),ColorName(ColorBall));
     Writeln(Loc('     Paddle colour - ','     Колір платформи - '),ColorName(ColorHero));
     Writeln(Loc('     Playfield background - ','     Колір фону поля - '),ColorName(ColorFon));
     Writeln(Loc('     Menu background - ','     Колір фону меню - '),ColorName(ColorMenuFon));
     Writeln(Loc('     Button colour - ','     Колір кнопок - '),ColorName(ColorButton));
     Writeln(Loc('     In-game menu background - ','     Колір фону меню у грі - '),ColorName(ColorGameMenu));
     Writeln(Loc('     Menu text colour - ','     Колір тексту в меню - '),ColorName(ColorMenuText));
     Writeln(Loc('     In-game text colour - ','     Колір тексту у грі - '),ColorName(ColorGameText));
     Writeln(Loc('     Clock colour - ','     Колір годинника - '),ColorName(ColorClock));
     Writeln(Loc('     Selection frame colour - ','     Колір рамки вибору - '),ColorName(ColorSelect));
     Writeln(Loc('     Ball speed - ','     Швидкість мʼяча - '),BallSpeed,Loc(' pixels per step',' пікселів за один хід'));
     Writeln(Loc('     Paddle speed - ','     Швидкість платформи - '),HeroSpeed,Loc(' pixels per step',' пікселів за один хід'));
     Writeln(Loc('     Paddle width - ','     Ширина платформи - '),HeroB,Loc(' pixels',' пікселів'));
     Writeln(Loc('     Delay - ','     Затримка - '),Duration,Loc(' milliseconds',' мілісекунд'));
     Writeln(Loc('     Restore defaults','     Повернути за замовчуванням'));
end;

procedure Change(n:byte); async;
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
     1:st:=Loc('     Ball colour - ','     Колір мʼяча - ')+ColorName(ColorBall);
     2:st:=Loc('     Paddle colour - ','     Колір платформи - ')+ColorName(ColorHero);
     3:st:=Loc('     Playfield background - ','     Колір фону поля - ')+ColorName(ColorFon);
     4:st:=Loc('     Menu background - ','     Колір фону меню - ')+ColorName(ColorMenuFon);
     5:st:=Loc('     Button colour - ','     Колір кнопок - ')+ColorName(ColorButton);
     6:st:=Loc('     In-game menu background - ','     Колір фону меню у грі - ')+ColorName(ColorGameMenu);
     7:st:=Loc('     Menu text colour - ','     Колір тексту в меню - ')+ColorName(ColorMenuText);
     8:st:=Loc('     In-game text colour - ','     Колір тексту у грі - ')+ColorName(ColorGameText);
     9:st:=Loc('     Clock colour - ','     Колір годинника - ')+ColorName(ColorClock);
     10:st:=Loc('     Selection frame colour - ','     Колір рамки вибору - ')+ColorName(ColorSelect);
     11:begin str(BallSpeed,s);
              st:=Loc('     Ball speed - ','     Швидкість мʼяча - ')+s+Loc(' pixels per step',' пікселів за один хід');
        end;
     12:begin str(HeroSpeed,s);
              st:=Loc('     Paddle speed - ','     Швидкість платформи - ')+s+Loc(' pixels per step',' пікселів за один хід');
        end;
     13:begin str(HeroB,s);
              st:=Loc('     Paddle width - ','     Ширина платформи - ')+s+Loc(' pixels',' пікселів');
        end;
     14:begin str(Duration,s);
              st:=Loc('     Delay - ','     Затримка - ')+s+Loc(' milliseconds',' мілісекунд');
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
     await(Delay(15));  { поступитися циклу подій — інакше опитування Inkey крутить вкладку намертво }
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
     ColorBall := ReadLnNum(fi);
     ColorHero := ReadLnNum(fi);
     ColorFon := ReadLnNum(fi);
     ColorMenuFon := ReadLnNum(fi);
     ColorButton := ReadLnNum(fi);
     ColorGameMenu := ReadLnNum(fi);
     ColorMenuText := ReadLnNum(fi);
     ColorGameText := ReadLnNum(fi);
     ColorClock := ReadLnNum(fi);
     ColorSelect := ReadLnNum(fi);
     BallSpeed := ReadLnNum(fi);
     HeroSpeed := ReadLnNum(fi);
     HeroB := ReadLnNum(fi);
     Duration := ReadLnNum(fi);
     Erase(fi);
     Close(fi);
     OptionsText;
end;


procedure Options; async;
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
           Case chr(trunc(await(double, ReadKeyA))) of
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
           #13:if n<>17 then await(Change(n-2))
                        else Default;
           #27:flag:=true;
           end;
           if n=2 then n:=17;
           if n=18 then n:=3;
     until flag;
     assign(fil,'options.opt');
     Rewrite(fil);
     WritelnLong(fil, ColorBall);
     WritelnLong(fil, ColorHero);
     WritelnLong(fil, ColorFon);
     WritelnLong(fil, ColorMenuFon);
     WritelnLong(fil, ColorButton);
     WritelnLong(fil, ColorGameMenu);
     WritelnLong(fil, ColorMenuText);
     WritelnLong(fil, ColorGameText);
     WritelnLong(fil, ColorClock);
     WritelnLong(fil, ColorSelect);
     WritelnLong(fil, BallSpeed);
     WritelnLong(fil, HeroSpeed);
     WritelnLong(fil, HeroB);
     WritelnLong(fil, Duration);
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

procedure ButtonPress(n:byte); async;
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
     await(delay(duration*7));
end;

function SureExit:boolean; async;
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
           await(Delay(15));  { поступитися циклу подій — інакше опитування Inkey крутить вкладку намертво }
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

function MainMenu:byte; async;
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
     OutTextXy(10,20,'B L O C K S');
     OutTextXy(300,20,'B L O C K S');
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
           await(Delay(15));  { поступитися циклу подій — інакше опитування Inkey крутить вкладку намертво }
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
           if choice<>0 then await(ButtonPress(Choice));
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
           await(delay(duration div 2));
     until (radius<=0) or (choice<>0);
     inc(color);
     until (choice<>0);
     MainMenu:=choice;
     HideMouse;
end;


procedure InitPingPong; async;
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
     ColorBall := ReadLnNum(f);
     ColorHero := ReadLnNum(f);
     ColorFon := ReadLnNum(f);
     ColorMenuFon := ReadLnNum(f);
     ColorButton := ReadLnNum(f);
     ColorGameMenu := ReadLnNum(f);
     ColorMenuText := ReadLnNum(f);
     ColorGameText := ReadLnNum(f);
     ColorClock := ReadLnNum(f);
     ColorSelect := ReadLnNum(f);
     BallSpeed := ReadLnNum(f);
     HeroSpeed := ReadLnNum(f);
     HeroB := ReadLnNum(f);
     Duration := ReadLnNum(f);
     Close(f);
     HighSpeedBall:=false;
     SmallSpeedHero:=false;
     SmallHero:=false;
     BigHero:=false;
     SmallSpeedBall:=false;
     HighSpeedHero:=false;
     Pushka:=false;
     Snaryad:=false;
     flag:=false;
     HeroY:=400;
     If ErrorCode=GrOk then
                           begin
                       repeat
                             await(delay(duration*40));
                             Result:=0;
                             Result:=await(MainMenu);
                             Case Result of
                             1:begin
                                    InitBlocks;
                                    GetTime(h,m,s,d);
                                    FirstTime:=s+m*60+h*3600;
                                    Level:=1;
                                    Lives:=3;
                                    Score:=0;
                                    await(Game);
                               end;
                             2:await(BestPlayers);
                             3:await(Options);
                             4:await(Information);
                             end;
                             if Result=5 then Flag:=await(SureExit);
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

{ Тіло програми не може бути async, а InitPingPong — може і мусить. Та сама
  обгортка, що в BAKKARA: один async-вхід, який тіло просто запускає. }
procedure Main; async;
begin
await(InitPingPong);
end;

begin
Main;
end.
