{ MATCH (2005–2009) — футбольний симулятор, найбільш дата-повний проєкт
  колекції: 121 гравець, 8 команд (Dynamo, Milan, Arsenal, Niva, MU, Shahtar,
  Shpors, CSKA), 8 стадіонів, 4 країни — все у власному текстовому форматі
  (FBP/FBT/STD/STT), який ПОВНІСТЮ зберігся й вантажиться тут байт-у-байт.
  Original: /Users/yarik/games/FOOTBALL/MATCH.PAS.

  Двигун симуляції (unit EMatch) автор покинув посеред рефакторингу — див.
  реконструкцію і її дві ремонтні правки в EMATCH.pas поруч. Сам матч подій
  не має (не дописані) — чесний фінал завжди 0:0; справжнє видовище тут —
  завантаження бази і склади.

  The diff against the original, in full:
  - uses + JS, tpfiles (файлові операції через шим: readln(f,s)→ReadlnT,
    readln(f,n)→ReadLnNum, read(f,n)→ReadNum, close→Close);
  - програма стала async (Main + await);
  - paramstr(1)/paramstr(2) (команди з командного рядка DOS) →
    AskString-промпти — у браузера немає argv;
  - `readln;` на екрані підказки → очікування Enter через ReadKeyA;
  - GetDate у поля-піддіапазони DateType — через проміжні word-змінні
    (pas2js суворіший за TP щодо var-параметрів);
  - все інше — 1:1, включно з форматом виклику і текстами завантаження. }
program Match;
uses JS, EMatch, Dos, Crt, tpfiles, nls;

const t=8;
      p=120;
      s=8;
      c=4;
      TeamsName : array [1..t] of string = ('Dynamo', 'Milan', 'Arsenal', 'Niva', 'MU', 'Shahtar', 'Shpors', 'CSKA');
var Teams : array [1..t] of footballteam;
    Players : array [0..p] of footballer;
    Stadiums : array [1..s] of stadiumtype;
    Countries : array [1..c] of statetype;
    i,j:byte;
    st:string;
    Team1,Team2:footballteam;
    f:Text;
    m:word;
    t1,t2:boolean;
    NowMatch:MatchType;
    p1,p2:string;
    dy,dm,dd,dw:word;
procedure Main; async;
begin
     randomize;
     Writeln(Loc('Loading countries','Завантаження країн'));
     for i:=1 to c do
         begin
              str(i,st);
              Assign(f,'STT\'+st+'.stt');
              Reset(f);
              ReadlnT(f,Countries[i].Name);
              Close(f);
              writeln(i,Loc(' loaded',' завантажено'));
         end;
     Writeln(Loc('Loading stadiums','Завантаження стадіонів'));
     for i:=1 to s do
         begin
              str(i,st);
              Assign(f,'STD\'+st+'.std');
              Reset(f);
              Stadiums[i].Seats:=ReadLnNum(f);
              ReadlnT(f,Stadiums[i].Name);
              m:=ReadLnNum(f);
              Stadiums[i].State:=Countries[m];
              Close(f);
              writeln(i,Loc(' loaded',' завантажено'));
         end;
     Writeln(Loc('Loading players','Завантаження гравців'));
     for i:=0 to p do
         begin
              str(i,st);
              Assign(f,'FBP\'+st+'.fbp');
              Reset(f);
              ReadlnT(f,Players[i].Name);
              ReadlnT(f,Players[i].Surname);
              Players[i].Mark:=ReadLnNum(f);
              Players[i].Tiredness:=ReadLnNum(f);
              Players[i].Mood:=ReadLnNum(f);
              Players[i].Number:=ReadLnNum(f);
              m:=ReadLnNum(f);
              case m of
              0:Players[i].Here:=false
              else Players[i].Here:=true;
              end;
              m:=ReadLnNum(f);
              case m of
              0:Players[i].Play:=false
              else Players[i].Play:=true;
              end;
              m:=ReadLnNum(f);
              case m of
              0:Players[i].Fall:=NoFall;
              1:Players[i].Fall:=YellowCard
              else Players[i].Fall:=RedCard;
              end;
              Close(f);
              writeln(i,Loc(' loaded',' завантажено'));
         end;
     Writeln(Loc('Loading teams','Завантаження команд'));
     for i:=1 to t do
         begin
              str(i,st);
              Assign(f,'FBT\'+st+'.fbt');
              Reset(f);
              ReadlnT(f,Teams[i].name);
              for j:=1 to 30 do
                  begin
                       m:=ReadNum(f);
                       Teams[i].footballers[j]:=Players[m];
                  end;
              m:=ReadLnNum(f);
              Teams[i].State:=Countries[m];
              m:=ReadLnNum(f);
              Close(f);
              Teams[i].StadiumTeam:=Stadiums[m];
              Teams[i].Mark:=0;
              Teams[i].Tiredness:=0;
              teams[i].Mood:=0;
              for j:=1 to 11 do
                  begin
                       Teams[i].Mark:=Teams[i].footballers[j].mark+Teams[i].Mark;
                       Teams[i].tiredness:=Teams[i].footballers[j].tiredness+Teams[i].tiredness;
                       Teams[i].Mood:=Teams[i].footballers[j].mood+Teams[i].Mood;
                  end;
              Teams[i].Mark:=Teams[i].Mark div 11;
              Teams[i].Tiredness:=Teams[i].Tiredness div 11;
              Teams[i].mood:=Teams[i].Mood div 11;
              writeln(i,Loc(' loaded',' завантажено'));
         end;
     Writeln(Loc('Preparing for kickoff','Підготовка до початку матчу'));
     t1:=false;
     t2:=false;
     p1:=await(string, AskString(Loc('Team 1 (e.g. Dynamo)','Команда 1 (напр. Dynamo)')));
     p2:=await(string, AskString(Loc('Team 2 (e.g. Milan)','Команда 2 (напр. Milan)')));
     for i:=1 to t do
         begin
              if p1=teamsname[i] then
                 begin
                      Team1:=Teams[i];
                      t1:=true;
                 end;
              if p2=teamsname[i] then
                 begin
                      Team2:=Teams[i];
                      t2:=true;
                 end;
         end;
     if (t1=false) or (t2=false) then
        begin
             Writeln(Loc('Wrong teams','Неправильні команди'));
             Writeln(Loc('Call format:','Формат виклику:'));
             Writeln('match {team1} {team2}');
             Writeln(Loc('Available teams:','Доступні команди:'));
             for j:=1 to t do
                 writeln(TeamsName[j],' - ',Teams[j].Name);
             repeat until trunc(await(double, ReadKeyA))=13; { readln; }
             halt;
        end;
     with NowMatch do
          begin
               Stadium:=Team1.StadiumTeam;
               Ft[1]:=Team1;
               Ft[2]:=Team2;
               OnLooker:=random(Stadium.Seats)+1;
               Score[1]:=0;
               Score[2]:=0;
               HalfEnd:=2;
               GetDate(dy,dm,dd,dw);
               Date.Year:=dy;
               Date.Month:=dm;
               Date.Date:=dd;
               FileCom:='Match.txt';
          end;
     Writeln(Loc('Match start','Початок матчу'));
     await(EmulMatch(NowMatch));
end;

begin
Main;
end.
