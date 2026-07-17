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
  було сміття стека, тут — стабільний 0); random(55) інколи здає неіснуючу
  «карту 0» → Runtime error і в DOS, і тут (~кожен десятий кін); меню
  диспатчиться один раз (після підменю гра завершується — goto, що мав би
  повертати, був мертвим кодом і в оригіналі); Save's «m» — глухий кут;
  load падає з Runtime error 100; «g» після сейву виходить із гри (halt
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
     writeln(bal); { авторський баг: друкує неініціалізовану bal, не bals }
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
     ch:=chr(trunc(await(double, ReadKeyA)));
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
random_kart:=random(55);
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
     x:=1 + num*12;
     kart:=random_kart;
     num_kart:=kart;
              gotoxy(x,9);
              nf:=name_of_files[kart];
              Assign(fk,'c:\cash\bakkara\'+nf);
              Reset(fk);
              for h2:=1 to 17 do
                  begin
                       ReadlnT(fk,str);
                       writeln(str);
                  end;
end;

procedure palka;
var y,h3:byte;
begin
     y:=9;
     for h3:=1 to  16 do
         begin
              gotoxy(38,y);
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
    flag:boolean;
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
           gotoxy(12,24);
           writeln(Loc('Player 1','Гравець 1'));
           gotoxy(52,24);
           writeln(Loc('Player 2','Гравець 2'));
           palka;
           flag:=false;
           repeat
                 chord:=trunc(await(double, ReadKeyA));
                 if chord=13 then flag:=true;
           until flag; { оригінал: until false — другий вічний цикл, ремонт (див. шапку) }

           flag:=win(pl,number_of_karts);
           if flag then
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
           writeln(Loc('y-yes            n-no','y-так            n-ні'));
           repeat
                 ch:=chr(trunc(await(double, ReadKeyA)));
                 case ch of
                 'y','Y','n','N':flag:=true;
                 end;
           until flag;
           if (ch='y') or (ch='Y') then await(Save());
     until flag;
end;

procedure load; async;
var fs:Text;
    str,st:string;
    flag:boolean;
    ch:char;
    n:byte;
begin
     ClrScr;
     Assign(fs,'c:\cash\bakkara\saves.txt');
     Reset(fs);
     writeln(Loc('The save list follows: line 1 is the name, line 2 the balance','Зараз зʼявиться список збережень: рядок 1 — назва, рядок 2 — баланс'));
     while (not Eof) do
           begin
                for n:=1 to 23 do
                    begin
                         ReadlnT(fs,str);
                         writeln(str);
                    end;
                repeat until trunc(await(double, ReadKeyA))=13; { readln; — чекання Enter }
           end;
     writeln(Loc('Enter your save name, or "Exit" to quit','Введіть імʼя збереження, або «Вихід» щоб вийти'));
     str:=await(string, AskString(Loc('Save name','Імʼя збереження')));
     if (str=Loc('Exit','Вихід')) then await(choice());
     while (not Eof) do
           begin
                st:=await(string, AskString(''));
                if st=str then
                              begin
                                   writeln(Loc('Save found','Збереження знайдено'));
                                   ReadlnLong(fs,balans);
                                   writeln(Loc('Press Esc to start, or n to search again','Натисніть Esc, щоб почати, або n для повторного пошуку'));
                                   repeat
                                         ch:=chr(trunc(await(double, ReadKeyA)));
                                         case ch of
                                         #27:await(start(balans));
                                         'n','N':await(load());
                                         end;
                                   until false;
                              end;
           end;
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
