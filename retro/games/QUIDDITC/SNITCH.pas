{ SNITCH (2008) — квідичний матч-симулятор (інтерактивний: a/s — голи команд, ловці полюють на снитч).
  Original: /Users/yarik/games/QUIDDITC/SNITCH.PAS.

  The diff against the original, in full:
  - the program body moved into `procedure Main; async;` + `await(Main)`;
  - readln(...) prompts → await(AskString/AskReal(...)) (no console to read
    from; names are text, numbers numeric);
  - `await(...)` around delay (JS cannot block);
  - the final blocking `ReadKey` → `await(WaitKey)` (the shim's ReadKey is
    non-blocking) — the victory beep now really lasts until a keypress.
  Everything else — the match logic, the timing via GetTime, Sound/NoSound —
  compiles as written in 2008. }
program snitch;
uses crt,dos,nls,hpteams;
const p=5000;
      q=5000;
var n,q1,q2,h,m,s,d,t,t0,s1,s2,r1,r2:word;
    t1,t2,p1,p2:string;
    ch:char;
    home:byte;
procedure Main; async;
begin
     NoSound;
     clrscr;
     s1:=0;
     s2:=0;
     randomize;
     { Пресет Гоґвортсу замість трьох питань на команду — див. hpteams.pas.
       Ярик 13.08.2026: «пресет із 3-4 команд як в футболі… щоб команди були
       із всесвіту Гаррі Поттера». Один вибір задає і назву, і ловця, і його
       реакцію; ручний ввід лишився п'ятим рядком меню. }
     HpHeader(Loc('match simulator  ·  a and s score goals',
                  'симулятор матчу  ·  a та s — голи'));
     await(ChooseHpTeam(Loc('Home team','Господарі поля'),0));
     home:=HpPick;
     if home=HpCustom then
        begin
             t1:=await(string, AskString(Loc('Team 1 name','Назва команди 1')));
             p1:=await(string, AskString(Loc('Team 1 seeker','Ловець команди 1')));
             r1:=trunc(await(double, AskReal(Loc('Seeker 1 reaction (number, e.g. 300)','Реакція ловця 1 (число, напр. 300)'))));
        end
     else
        begin
             t1:=HpName(home);
             p1:=HpSeeker(home);
             r1:=HpReaction(home);
        end;
     await(ChooseHpTeam(Loc('Away team','Гості'),home));
     if HpPick=HpCustom then
        begin
             t2:=await(string, AskString(Loc('Team 2 name','Назва команди 2')));
             p2:=await(string, AskString(Loc('Team 2 seeker','Ловець команди 2')));
             r2:=trunc(await(double, AskReal(Loc('Seeker 2 reaction (number, e.g. 300)','Реакція ловця 2 (число, напр. 300)'))));
        end
     else
        begin
             t2:=HpName(HpPick);
             p2:=HpSeeker(HpPick);
             r2:=HpReaction(HpPick);
        end;
     clrscr;
     n:=random(6*p);
     GetTime(h,m,s,d);
     t0:=h*3600+m*60+s;
     repeat
           q1:=random(6*p);
           q2:=random(6*p);
           GetTime(h,m,s,d);
           t:=h*3600+m*60+s;
           if (((t-t0) mod (random(5)+1)) = 0) and ((t-t0)<>0) then
              begin
                   ClrScr;
                   if (t-t0) mod 60<10 then Writeln((t-t0) div 60,':0',(t-t0) mod 60)
                                       else Writeln((t-t0) div 60,':',(t-t0) mod 60);
                   Writeln(t1);
                   Write(t2);
                   GotoXy(40,2);
                   Write(s1);
                   GotoXy(40,3);
                   Writeln(s2);
                   Write(Loc('Seeker of team ','Ловець команди '),t1,' ',p1);
                   case (abs(q1-n)) of
                   0..q div 100:Writeln(Loc(' is close to the snitch',' близький до снитча'));
                   q div 100 +1..q div 10:Writeln(Loc(' seems to have spotted the snitch',' схоже, помітив снитч'))
                   else Writeln(Loc(' is looking for the snitch',' шукає снитч'));
                   end;
                   Write(Loc('Seeker of team ','Ловець команди '),t2,' ',p2);
                   case (abs(q2-n)) of
                   0..1000:Writeln(Loc(' is close to the snitch',' близький до снитча'));
                   1001..10000:Writeln(Loc(' seems to have spotted the snitch',' схоже, помітив снитч'))
                   else Writeln(Loc(' is looking for the snitch',' шукає снитч'));
                   end;
              end;
           ch:=' ';
           if keypressed then ch:=ReadKey;
           await(delay(random(6)*q));
           if (ch='a') or (ch='A') then
              begin
                   ClrScr;
                   if (t-t0) mod 60<10 then Writeln((t-t0) div 60,':0',(t-t0) mod 60)
                                       else Writeln((t-t0) div 60,':',(t-t0) mod 60);
                   Writeln(t1);
                   Write(t2);
                   GotoXy(40,2);
                   s1:=s1+10;
                   Write(s1);
                   GotoXy(40,3);
                   Writeln(s2);
                   Writeln(Loc('Team ','Команда '),t1,Loc(' scores a goal',' забиває гол'));
              end;
           if (ch='s') or (ch='S') then
              begin
                   ClrScr;
                   if (t-t0) mod 60<10 then Writeln((t-t0) div 60,':0',(t-t0) mod 60)
                                       else Writeln((t-t0) div 60,':',(t-t0) mod 60);
                   Writeln(t1);
                   Write(t2);
                   GotoXy(40,2);
                   s2:=s2+10;
                   Write(s1);
                   GotoXy(40,3);
                   Writeln(s2);
                   Writeln(Loc('Team ','Команда '),t2,Loc(' scores a goal',' забиває гол'));
              end;
           if ((t-t0) div 60>5) then
              begin
                   n:=random(r1+r2);
                   if (n>r1) then q2:=n
                             else q1:=n;
              end;
           await(delay(60000));
     until (abs(q1-n)<=r1) or (abs(q2-n)<=r2);
     if (abs(q1-n)<=r1) and (abs(q2-n)<=r2) then
        begin
            if (abs(q1-n)>abs(q2-n))
               then q1:=n
               else q2:=n;
        end
        else
            if (abs(q1-n)<=r1) then q1:=n else q2:=n;
     if (q1=n) then
        begin
                   ClrScr;
                   Writeln((t-t0) div 60,':',(t-t0) mod 60);
                   Writeln(t1);
                   Write(t2);
                   GotoXy(40,2);
                   s1:=s1+150;
                   Write(s1);
                   GotoXy(40,3);
                   Writeln(s2);
                   Writeln(Loc('Seeker of team ','Ловець команди '),t1,' ',p1,Loc(' caught the snitch!',' спіймав снитч!'));
                   Write(Loc('Seeker of team ','Ловець команди '),t2,' ',p2,Loc(' looks disappointed',' виглядає розчарованим'));
        end;
     if (q2=n) then
        begin
                   ClrScr;
                   Writeln((t-t0) div 60,':',(t-t0) mod 60);
                   Writeln(t1);
                   Write(t2);
                   GotoXy(40,2);
                   s2:=s2+150;
                   Write(s1);
                   GotoXy(40,3);
                   Writeln(s2);
                   Writeln(Loc('Seeker of team ','Ловець команди '),t2,' ',p2,Loc(' caught the snitch!',' спіймав снитч!'));
                   Write(Loc('Seeker of team ','Ловець команди '),t1,' ',p1,Loc(' looks disappointed',' виглядає розчарованим'));
        end;
     Sound(5000);
     await(WaitKey);
     NoSound;
end;

begin
Main;
end.
