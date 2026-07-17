program randommatch;
uses crt,dos;
const p=5000;
      q=5000;
      g=1000;
var n,q1,q2,h,m,s,d,t,t0,s1,s2,r1,r2,g1,g2,h1,h2:word;
    t1,t2,p1,p2:string;
    ch:char;
begin
     NoSound;
     clrscr;
     s1:=0;
     s2:=0;
     randomize;
     readln(t1);
     readln(p1);
     readln(r1);
     readln(h1);
     readln(t2);
     readln(p2);
     readln(r2);
     readln(h2);
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
                   Write('Ловец команды ',t1,' ',p1);
                   case (abs(q1-n)) of
                   0..q div 100:Writeln(' близок к снитчу');
                   q div 100 +1..q div 10:Writeln(' похоже заметил снитч')
                   else Writeln(' ищет снитч');
                   end;
                   Write('Ловец команды ',t2,' ',p2);
                   case (abs(q2-n)) of
                   0..1000:Writeln(' близок к снитчу');
                   1001..10000:Writeln(' похоже заметил снитч')
                   else Writeln(' ищет снитч');
                   end;
              end;
           delay(random(6)*q);
           g1:=n-random(g-h1)+random(g-h1);
           g2:=n-random(g-h2)+random(g-h2);
           if (abs(n-g1)<=h1) then
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
                   Writeln('Команда ',t1,' забивает гол');
              end;
           if (abs(n-g2)<=h2) then
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
                   Writeln('Команда ',t2,' забивает гол');
              end;
           delay(60000);
           if ((t-t0) div 60>=2) then
              begin
                   n:=random(r1+r2);
                   if (n>r1) then q2:=n
                             else q1:=n;
              end;
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
                   Writeln('Ловец команды ',t1,' ',p1,' словил снитч!');
                   Write('Ловец команды ',t2,' ',p2,' выглядет разочарованым');
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
                   Writeln('Ловец команды ',t2,' ',p2,' словил снитч!');
                   Write('Ловец команды ',t1,' ',p1,' выглядет разочарованым');
        end;
     Sound(5000);
     ReadKey;
     NoSound;
end.