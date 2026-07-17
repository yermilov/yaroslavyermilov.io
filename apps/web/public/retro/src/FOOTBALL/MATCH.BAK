program Match;
uses EMatch, Dos, Crt;

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
    f:text;
    m:word;
    t1,t2:boolean;
    NowMatch:MatchType;
begin
     randomize;
     Writeln('Идёт загрузка стран');
     for i:=1 to c do
         begin
              str(i,st);
              assign(f,'STT\'+st+'.stt');
              reset(f);
              readln(f,Countries[i].Name);
              close(f);
              writeln(i,' загружено');
         end;
     Writeln('Идёт загрузка стадионов');
     for i:=1 to s do
         begin
              str(i,st);
              assign(f,'STD\'+st+'.std');
              reset(f);
              readln(f,Stadiums[i].Seats);
              readln(f,Stadiums[i].Name);
              readln(f,m);
              Stadiums[i].State:=Countries[m];
              Close(f);
              writeln(i,' загружено');
         end;
     Writeln('Идёт загрузка игроков');
     for i:=0 to p do
         begin
              str(i,st);
              assign(f,'FBP\'+st+'.fbp');
              reset(f);
              readln(f,Players[i].Name);
              readln(f,Players[i].Surname);
              readln(f,Players[i].Mark);
              readln(f,Players[i].Tiredness);
              readln(f,Players[i].Mood);
              readln(f,Players[i].Number);
              readln(f,m);
              case m of
              0:Players[i].Here:=false
              else Players[i].Here:=true;
              end;
              readln(f,m);
              case m of
              0:Players[i].Play:=false
              else Players[i].Play:=true;
              end;
              readln(f,m);
              case m of
              0:Players[i].Fall:=NoFall;
              1:Players[i].Fall:=YellowCard
              else Players[i].Fall:=RedCard;
              end;
              Close(f);
              writeln(i,' загружено');
         end;
     Writeln('Идёт загрузка команд');
     for i:=1 to t do
         begin
              str(i,st);
              assign(f,'FBT\'+st+'.fbt');
              reset(f);
              readln(f,Teams[i].name);
              for j:=1 to 30 do
                  begin
                       read(f,m);
                       Teams[i].footballers[j]:=Players[m];
                  end;
              readln(f,m);
              Teams[i].State:=Countries[m];
              readln(f,m);
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
              writeln(i,' загружено');
         end;
     Writeln('Подготовка к началу матча');
     t1:=false;
     t2:=false;
     for i:=1 to t do
         begin
              if paramstr(1)=teamsname[i] then
                 begin
                      Team1:=Teams[i];
                      t1:=true;
                 end;
              if paramstr(2)=teamsname[i] then
                 begin
                      Team2:=Teams[i];
                      t2:=true;
                 end;
         end;
     if (t1=false) or (t2=false) then
        begin
             Writeln('Неправильные команды');
             Writeln('Формат вызова:');
             Writeln('match {team1} {team2}');
             Writeln('Возможные команды:');
             for j:=1 to t do
                 writeln(TeamsName[j],' - ',Teams[j].Name);
             readln;
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
               GetDate(Date.Year,Date.Month,Date.Date,m);
               FileCom:='Match.txt';
          end;
     Writeln('Начало матча');
     EmulMatch(NowMatch);
end.

