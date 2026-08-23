{ BAKKARA (2005) — карткова гра: ставиш на гравця 1/2/нічию, обом здають по
  три карти (тузи=14, джокери=25), вгадав — ставка твоя.
  Original: /Users/yarik/games/BAKKARA/BAKKARA.PAS.

  ПРО ДАНІ: вся графіка гри читалась із файлів c:\cash\bakkara\* — з ~62
  файлів вижили лише титул і меню (знайдені у бекапі Noah's Ark → Museum/MIM:
  TEXTBAK.TXT, TEXTMENU.TXT — вони тут ОРИГІНАЛЬНІ, лише доповнені до 23
  рядків, які читає код). Решта — 54 карти k1..k54, info/quit/options,
  fsm1–3 — ВТРАЧЕНІ і реконструйовані в data/ у стилі епохи (рішення Yarik'а
  17.07.2026). saves.txt живе в localStorage через tpfiles.

  The diff against the original, in full:
  - `uses crt` → `uses JS, crt, tpfiles` (JS для await; pas2js не має типу text; файлові
    операції йдуть через шим: readln(f,s)→ReadlnT, writeln(f,x)→WritelnT/
    WritelnLong, eof(f)→EofT; Assign/Reset/Append/безаргументний Eof/halt
    зберігають імена);
  - процедури стали async, блокуючий `ReadKey` → `await(double, ReadKeyA)`
    (той самий двовикличний DOS-протокол);
  - readln з клавіатури → AskReal/AskString (немає консолі);
  - `label 1 / goto 1` прибрано: pas2js не підтримує goto, а ця мітка —
    мертвий код (guard `a=1` ставиться лише ПІСЛЯ halt і недосяжний);
  - ДВІ РЕМОНТНІ ПРАВКИ (єдине відхилення від bug-for-bug, вимога плану
    «кожну гру можна запустити і пограти»): в оригіналі цикли вибору гравця
    та очікування Enter після роздачі стояли на `until false` — гра НАЗАВЖДИ
    зависала на виборі ставки навіть під DOS (так і в .BAK). Обидва цикли
    завершуються тепер за призначеною умовою; оригінальні рядки збережені в
    коментарях поруч.
  Збережені автентичні дивацтва (все це так і поводилось у TP): write_bal
  друкує НЕініціалізовану локальну bal (буде 0); перший натиск на екрані
  ставки з'їдається зайвим ReadKey; win() читає karts[1..6] з 0-БАЗОВОГО
  відкритого масиву — перша карта не рахується, а сьомої не існує (у TP там
  було сміття стека, тут — стабільний 0). ПІДТВЕРДЖЕНО на живій партії
  26.07.2026: на столі K(13) 10(10) 8(8) | 9(9) Д(12) 7(7), гра показала 27 і
  19 — це рівно 10+8+9 і 12+7+0, тобто зсув на одну карту плюс читання за
  межами; чесні суми були б 31 і 28. Отже переможець майже не залежить від
  карт на столі. Лишено як автентичне (це не блокує гру), але винесено на
  рішення Yarik'а — фікс однорядковий: іменований тип array[1..6] замість
  відкритого масиву. Далі: меню
  диспатчиться один раз (після підменю гра завершується — goto, що мав би
  повертати, був мертвим кодом і в оригіналі); Save's «m» — глухий кут;
  «g» після сейву виходить із гри (halt
  перед a:=1); сейв пише ГЛОБАЛЬНИЙ balans=500, а не виграний локальний
  (start затіняє глобальну змінну). Esc завжди повертає в NC. }
program bakkara;
uses JS, crt, tpfiles, nls;
var sel:char;
    balans:longint;
    a:byte;
procedure first_picture; async;
var tb:Text;
    str:string;
    n,bk:byte;
    flag:boolean;
    begin
     ClrScr;
     flag:=false;
     Assign(tb, 'C:\cash\bakkara\textbak.txt');
     Reset(tb);
     for n:=1 to 23 do
           begin
                ReadlnT(tb,str);
                writeln(str);
           end;
     repeat
           bk:=trunc(await(double, ReadKeyA));
           if bk=13 then begin flag:=true; ClrScr; end;
     until flag;
end;

function choice:char; async;
var tm:Text;
    n:byte;
    bk:char;
    str:string;
    flag:boolean;
begin
     Assign(tm, 'C:\cash\bakkara\textmenu.txt');
     Reset(tm);
     for n:=1 to 23 do
              begin
                   ReadlnT(tm,str);
                   writeln(str);
              end;
     repeat
           bk:=chr(trunc(await(double, ReadKeyA)));
           case bk of
           's','S','o','O','i','I','q','Q':flag:=true;
           end;
           choice:=bk;
     until flag;
end;

procedure Informations; async;
var fi:Text;
    ch,n:byte;
    str:string;
    flag:boolean;
begin
     Assign(fi,'c:\cash\bakkara\info.txt');
     Reset(fi);
     for n:=1 to 23 do
               begin
                    ReadlnT(fi,str);
                    writeln(str);
               end;
     writeln (Loc('Press Esc to leave the info screen','Натисніть Esc, щоб вийти з інформації'));
     repeat
           ch:=trunc(await(double, ReadKeyA));
           if ch=27 then flag:=true;
     until flag;
     end;

procedure quit; async;
var fq:Text;
    str:string;
    n:byte;
    ch:char;
begin
     Assign (fq,'c:\cash\bakkara\quit.txt');
     Reset(fq);
     for n:=1 to 23 do
         begin
              ReadlnT(fq,str);
              writeln(str);
         end;
     repeat
           ch:=chr(trunc(await(double, ReadKeyA)));
           case ch of
                'y','Y':halt;
                'n','N':await(choice());
           end;
     until false;
end;

procedure write_bal(bals:longint);
var fsm:Text;
    n:byte;
    str:string;
    bal:longint;
begin
     Assign(fsm,'c:\cash\bakkara\fsm1.txt');
     Reset(fsm);
     for n:=1 to 5 do
         begin
              ReadlnT(fsm,str);
              writeln(str);
         end;
     gotoxy (33,4);
     writeln(bals); { РЕМОНТ: оригінал друкував неініціалізовану локальну bal
       (завжди 0) замість параметра bals — очевидна авторська одрук: write_bal
       існує саме щоб показати баланс. Виправлено на bals, щоб на старті гри
       видно було реальні 500 грн, а не 0. }
end;

function player:byte; async;
var n:byte;
    ch:char;
    fsm:Text;
    str:string;
    flag:boolean; { РЕМОНТ: доданий прапорець виходу (див. шапку) }
begin
     Assign(fsm,'c:\cash\bakkara\fsm2.txt');
     Reset(fsm);
     for n:=1 to 5 do
         begin
              ReadlnT(fsm,str);
              writeln(str);
         end;
     { РЕМОНТ: тут стояв зайвий `ReadKey`, який з'їдав ПЕРШЕ натискання на
       екрані вибору ставки — гравець тиснув f/s/n, а нічого не відбувалось
       (клавіша гинула). Прибрано, щоб перший же f/s/n працював. }
     flag:=false;
     repeat
           case chr(trunc(await(double, ReadKeyA))) of
           'f','F':begin player:=1; flag:=true; end;
           's','S':begin player:=2; flag:=true; end;
           'n','N':begin player:=0; flag:=true; end;
           end;
     until flag; { оригінал: until false — вічний цикл, гра тут зависала }
end;

function stavka:longint; async;
var n:byte;
    s:longint;
    fsm:Text;
    str:string;
begin
     Assign(fsm,'c:\cash\bakkara\fsm3.txt');
     Reset(fsm);
     for n:=1 to 5 do
         begin
              ReadlnT(fsm,str);
              writeln(str);
         end;
     s:=trunc(await(double, AskReal(Loc('Bet (hryvnias)','Ставка (гривень)'))));
     stavka:=s;
end;

function random_kart:byte;
begin
randomize;
{ РЕМОНТ: було random(55) → 0..54, а name_of_files індексується 1..54, тож
  індекс 0 не мав жодної картинки — приблизно кожна 55-та карта малювалася
  сміттям (у win() нуль ще й тихо рахувався як 14 очок через `0 mod 13`).
  random(54)+1 дає рівномірні 1..54 і завжди валідний файл. }
random_kart:=random(54)+1;
end;

function num_kart(num:byte):byte; async;
const name_of_files : array [1..54] of string =
      ('k1','k2','k3','k4','k5','k6','k7','k8','k9','k10',
      'k11','k12','k13','k14','k15','k16','k17','k18','k19','k20',
      'k21','k22','k23','k24','k25','k26','k27','k28','k29','k30',
      'k31','k32','k33','k34','k35','k36','k37','k38','k39','k40',
      'k41','k42','k43','k44','k45','k46','k47','k48','k49','k50',
      'k51','k52','k53','k54');
var x,h2:byte;
    fk:Text;
    kart:byte;
    str,nf:string;
begin
     { РЕМОНТ (горизонтальна розкладка): оригінал рахував x:=1+num*12, тобто для
       num=1..6 колонки 13,25,37,49,61,73. Карта завширшки 11 символів, екран —
       80 колонок, отже:
         • карта 6 (73..83) НЕ ВЛІЗАЛА. Шим переносить запис за 80-ту колонку на
           початок наступного рядка (crt.pas: `if CurX > Cols then begin CurX := 1;
           Inc(CurY); end;`) — тому в неї зрізало правий край, а «хвіст» із трьох
           колонок висипався біля ЛІВОГО краю рядком нижче. Один баг, видимий з
           обох боків — саме це й було видно на екрані;
         • карта 3 (37..47) налазила на роздільник palka в колонці 38, який
           малюється ПІСЛЯ карт і затирав її нутрощі (у «10» зникала одиниця).
       Нова розкладка на 80 колонок: рука = 3 карти по 11 з проміжком 1 = 35
       колонок; дві руки + 5 колонок під роздільник = 75, поля 2 зліва і 3 справа.
         рука 1: 3, 15, 27  (займає 3..37)
         роздільник: 40     (по три вільні колонки з кожного боку)
         рука 2: 43, 55, 67 (займає 43..77) }
     if num <= 3 then x := 3 + (num - 1) * 12
                 else x := 43 + (num - 4) * 12;
     kart:=random_kart;
     num_kart:=kart;
              nf:=name_of_files[kart];
              Assign(fk,'c:\cash\bakkara\'+nf);
              Reset(fk);
              { РЕМОНТ: оригінал робив gotoxy(x,9) ОДИН раз перед циклом і далі
                17 разів writeln. Але writeln повертає курсор у колонку 1 (це
                справжня семантика Turbo Pascal, і шим її відтворює — crt.pas:
                `if NewLine then begin CurX := 1; Inc(CurY); end;`). Тому на своєму
                x малювався лише верхній бордюр карти, а решта 16 рядків лягали
                впритул до лівого краю; до того ж 17 рядків від 9-го впиралися в
                25-й і скролили екран, через що кожна наступна карта з'їжджала
                нижче. Тепер позиціонуємо КОЖЕН рядок і пишемо через write —
                рівно так, як це вже робить сусідня `palka`. }
              for h2:=1 to 17 do
                  begin
                       ReadlnT(fk,str);
                       gotoxy(x, 8+h2);
                       write(str);
                  end;
end;

procedure palka;
var y,h3:byte;
begin
     y:=9;
     for h3:=1 to  16 do
         begin
              { 38 -> 40: колонка 38 лежала ВСЕРЕДИНІ третьої карти (37..47) і
                затирала її, бо palka малюється після карт. У новій розкладці 40 —
                це рівно середина проміжку між руками (37 | 40 | 43). }
              gotoxy(40,y);
              write('|');
              inc(y);
         end;
end;

function win(pl:byte;karts:array of byte ):boolean;
var n,sum1,sum2,sel:byte;
    b:array [1..6] of byte;
begin
     ClrScr;
     sum1:=0;
     sum2:=0;
     for n:=1 to 6 do
              case karts[n] of
              53,54:b[n]:=25;
              else case (karts[n] mod 13) of
                   0:b[n]:=14;
                   1:b[n]:=2;
                   2:b[n]:=3;
                   3:b[n]:=4;
                   4:b[n]:=5;
                   5:b[n]:=6;
                   6:b[n]:=7;
                   7:b[n]:=8;
                   8:b[n]:=9;
                   9:b[n]:=10;
                   10:b[n]:=11;
                   11:b[n]:=12;
                   12:b[n]:=13;
                   end;
              end;
     for n:=1 to 3 do
              sum1:=sum1+b[n];
     for n:=4 to 6 do
              sum2:=sum2+b[n];
     gotoxy (35,12);
     writeln (Loc('Player 1 scored ','Гравець 1 набрав '),sum1,Loc(' points',' балів'));
     writeln;
     writeln (Loc('Player 2 scored ','Гравець 2 набрав '),sum2,Loc(' points',' балів'));
     writeln;
     if sum1>sum2 then
                      begin
                           sel:=1;
                           writeln(Loc('Player 1 wins','Гравець 1 переміг'));
                      end
                  else
                      if sum1<sum2 then
                                       begin
                                            sel:=2;
                                            writeln(Loc('Player 2 wins','Гравець 2 переміг'));
                                       end
                                   else
                                       begin
                                            sel:=0;
                                            writeln(Loc('Draw','Нічия'));
                                       end;
     if sel=pl then win:=true
               else win:=false;
end;

procedure Save; async;
var fs:Text;
    ch:char;
    name_save:string;
begin
    ClrScr;
    gotoxy (35,3);
    Assign(fs,'c:\cash\bakkara\saves.txt');
    Append(fs);
                 writeln(Loc('Enter your save name','Введіть імʼя збереження'));
                 name_save:=await(string, AskString(Loc('Save name','Імʼя збереження')));
                 WritelnT(fs,name_save);
                 WritelnLong(fs,balans);
                 writeln(Loc('Your game has been saved','Гру збережено'));
    ClrScr;
    gotoxy(35,10);
    writeln(Loc('Back to game (g) or main menu (m)?','Повернутись у гру (g) чи в головне меню (m)?'));
    repeat
          ch:=chr(trunc(await(double, ReadKeyA)));
          case ch of
          'g','G':begin halt; a:=1; sel:='s'; ; end;
          'm','M':await(Choice());
          end;
    until false;
end;


procedure start(balan:longint); async;
var balans,post:longint;
    pl,n:byte;
    number_of_karts:array [1..6] of byte;
    flag,won:boolean;
    chord:byte;
    ch:char;
begin
     balans:=balan;
     repeat
           ClrScr;
           write_bal(balans);
           pl:=trunc(await(double, player()));
           post:=trunc(await(double, stavka()));
           ClrScr;
           for n:=1 to 6 do
                    number_of_karts[n]:=trunc(await(double, num_kart(n)));
           { Підписи стояли в рядку 24 — це рядок НИЖНЬОЇ РАМКИ карт (карта займає
             рядки 9..24), тож текст різав рамку. Тепер рядок 25, під картами, і
             по центру своєї руки: рука 1 — колонки 3..37 (центр 20), рука 2 —
             43..77 (центр 60); підпис 9 символів, отже 16 і 56.
             write, НЕ writeln: writeln у 25-му рядку зсунув би курсор на 26-й і
             шим проскролив би весь екран на рядок угору. }
           gotoxy(16,25);
           write(Loc('Player 1','Гравець 1'));
           gotoxy(56,25);
           write(Loc('Player 2','Гравець 2'));
           palka;
           flag:=false;
           repeat
                 chord:=trunc(await(double, ReadKeyA));
                 if chord=13 then flag:=true;
           until flag; { оригінал: until false — другий вічний цикл, ремонт (див. шапку) }

           { ⚠️ РЕМОНТ 13.08.2026 — «баккара не реагує на кнопки після оголошення
             результатів». Гра не зависала: вона ЗАКІНЧУВАЛАСЬ, а застиглий
             екран уже нікому було оновлювати.
             Причина — одна змінна `flag` на два різні сенси: спершу в неї
             клали результат win(), а потім нею ж керували виходом із циклу
             запиту «Зберегти гру?» І з зовнішнього циклу раунду. Тож коли
             гравець ВИГРАВАВ, flag уже був true: запит приймав БУДЬ-ЯКУ
             клавішу замість y/n, а зовнішній `until flag` одразу завершував
             `start` — програма закінчувалась після одного раунду, мовчки.
             Тепер результат живе у власній `won`, `flag` відповідає лише за
             валідний y/n, а раунди тривають, доки не натиснеш Esc. }
           won:=win(pl,number_of_karts);
           if won then
                       begin
                            writeln (Loc('You won','Ви виграли'));
                            writeln (Loc('You won ','Ви виграли '),post,Loc(' hryvnias',' гривень'));
                            balans:=balans+post;
                       end
                   else
                       begin
                            writeln (Loc('You lost','Ви програли'));
                            writeln (Loc('You lost ','Ви програли '),post,Loc(' hryvnias',' гривень'));
                            balans:=balans-post;
                       end;
           writeln;
           writeln(Loc('Save the game?','Зберегти гру?'));
           writeln(Loc('y-yes            n-no            Esc-quit',
                       'y-так            n-ні            Esc-вийти'));
           flag:=false;
           repeat
                 ch:=chr(trunc(await(double, ReadKeyA)));
                 case ch of
                 'y','Y','n','N',#27:flag:=true;
                 end;
           until flag;
           if (ch='y') or (ch='Y') then await(Save());
     { Раунди тривають, доки гравець не вийде сам. Баланс переноситься між
       раундами, тобто це вперше справді СЕРІЯ партій, а не одна. }
     until ch=#27;
end;

procedure load; async;
var fs:Text;
    str,st:string;
    ch:char;
begin
     ClrScr;
     Assign(fs,'c:\cash\bakkara\saves.txt');
     Reset(fs);
     writeln(Loc('The save list follows: line 1 is the name, line 2 the balance','Зараз зʼявиться список збережень: рядок 1 — назва, рядок 2 — баланс'));
     { РЕМОНТ 23.08.2026 — список збережень падав з Runtime error 100.
       Оригінал перевіряв безаргументний Eof (тобто консоль) і читав файл
       блоками рівно по 23 рядки. Після звичайного дворядкового збереження цикл
       тому гарантовано читав за кінцем файла. Тут показуємо фактичні рядки і
       перевіряємо EOF саме відкритого файла. }
     while (not EofT(fs)) do
           begin
                ReadlnT(fs,str);
                writeln(str);
           end;
     writeln(Loc('Enter your save name, or "Exit" to quit','Введіть імʼя збереження, або «Вихід» щоб вийти'));
     str:=await(string, AskString(Loc('Save name','Імʼя збереження')));
     if (str=Loc('Exit','Вихід')) then exit;

     { Listing consumed the file. Rewind it, then read each name/balance pair
       from the FILE — the original second loop accidentally read `st` from
       the keyboard and again checked console EOF, so it could never finish a
       real lookup even after the listing crash was removed. }
     Reset(fs);
     while (not EofT(fs)) do
           begin
                ReadlnT(fs,st);
                if EofT(fs) then break; { ignore an incomplete trailing record }
                ReadlnLong(fs,balans);
                if st=str then
                              begin
                                   writeln(Loc('Save found','Збереження знайдено'));
                                   { Esc belongs to the lab shell and closes the sandboxed game.
                                     Starting a save on Esc therefore worked only on the standalone
                                     bundle, not on the reported /lab/retro-games page. }
                                   writeln(Loc('Press Enter to start, n to search again, or Esc to quit',
                                               'Натисніть Enter, щоб почати, n для повторного пошуку, або Esc щоб вийти'));
                                   repeat
                                         ch:=chr(trunc(await(double, ReadKeyA)));
                                   until (ch=#13) or (ch=#27) or (ch='n') or (ch='N');
                                   if (ch='n') or (ch='N') then await(load())
                                   else if ch=#13 then await(start(balans));
                                   exit;
                              end;
           end;
     writeln(Loc('Save not found','Збереження не знайдено'));
     writeln(Loc('Press n to search again, or Esc to return','Натисніть n для повторного пошуку, або Esc щоб повернутися'));
     repeat
           ch:=chr(trunc(await(double, ReadKeyA)));
     until (ch=#27) or (ch='n') or (ch='N');
     if (ch='n') or (ch='N') then await(load());
end;

procedure options; async;
var fo:Text;
    n:byte;
    str:string;
    ch:char;
begin
     ClrScr;
     Assign(fo,'c:\cash\bakkara\options.txt');
     Reset(fo);
     for n:=1 to 23 do
         begin
              ReadlnT(fo,str);
              writeln(str);
         end;
     writeln(Loc('Press the submenu letter you want, or Esc to exit','Натисніть потрібну літеру підменю, або Esc щоб вийти'));
     repeat
           ch:=chr(trunc(await(double, ReadKeyA)));
           case ch of
           'l','L':await(Load());
           #27:await(choice());
           end;
     until false;
end;



procedure Main; async;
begin
await(first_picture());
sel:=await(char, choice());
balans:=500;
case sel of
's','S':await(Start(balans));
'o','O':await(Options());
'i','I':await(Informations());
'q','Q':await(Quit());
end;
{ оригінал: label 1/goto 1 з guard'ом a=1 — недосяжний мертвий код (a:=1
  стоїть ПІСЛЯ halt), а pas2js не підтримує goto; прибрано. }
end;

begin
Main;
end.
