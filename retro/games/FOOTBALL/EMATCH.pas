{ EMatch — СПРАВЖНІЙ двигун футбольного матчу (1343 рядки).
  Original: /Users/yarik/games/_інше/UNITS/EM.PAS

  ЧОМУ ЦЕЙ ФАЙЛ: попередній порт був РЕКОНСТРУКЦІЄЮ покинутого
  ~/games/FOOTBALL/EMATCH.PAS на 159 рядків — там машинерія подій лишилась
  закоментованою, і, як чесно писав його ж заголовок, «кожен матч завершується
  0:0». Голів не було взагалі. Ось повна версія: EPr1..EPr25 — це саме ті
  процедури подій, яких там бракувало, разом із `inc(Match.Score[At])`.
  Знайдено пошуком ПО ВМІСТУ — за іменем файлу (ematch*) воно не знаходиться.

  Дифф проти оригіналу, повністю:
  - `unit EM` → `unit EMatch` — щоб MATCH.pas далі писав `uses EMatch`.
    Сигнатура `EmulMatch(var Match:MatchType)` збіглася без змін, як і типи:
    реконструкція вгадувала саме цю, узгоджену версію.
  - `uses HelpUnit,crt` → `uses JS, crt`. Уся залежність від HelpUnit — це одна
    процедура `Duration(n:real)`, busy-wait по GetTime. У браузері вона б
    намертво зависила вкладку, тож `Duration(x)` → `await(Delay(x*1000))`.
  - 38 із 46 процедур стали `async` — ті, що прямо чи транзитивно доходять до
    Duration. Решта 8 (ChAt, DoPlayerP, DoTeamP, EPr7, NewThing, WriteMinNow,
    WriteMinT) лишились синхронними: вони лише рахують і друкують.
  - `string[N]` → `string` — pas2js не має коротких рядків.
  Жодного ReadKey/KeyPressed у цьому юніті немає, тож циклів опитування, які
  зламали PINGPONG, тут не виникає. }

unit EMatch;

interface



type
    FallType = (NoFall,YellowCard,RedCard);

    DateType = record
     date:word;
     month:word;
     year:word;
    end;

    StateType = record
     name:string;
    end;

    FootBaller = record
     name,surname:string;
     mark:byte;
     tiredness,mood:shortint;
     number:byte;
     here:boolean;
     play:boolean;
     fall:falltype;
    end;

    StadiumType = record
     Seats:longint;
     name:string;
     state:statetype;
    end;

    { pas2js не вміє копіювати анонімний вкладений статичний масив усередині
      запису (footballer сам містить масиви), тож тип дістав імʼя. }
    FootballerArray = array[1..30] of footballer;

    FootBallTeam = record
     name:string;
     footballers:FootballerArray;
     state:statetype;
     Mark:byte;
     tiredness,mood:shortint;
     stadiumteam:stadiumtype
    end;

    { Іменовані, бо pas2js не копіює анонімний вкладений статичний масив у
      записі. Оголошені саме тут: footballteam мусить бути вже відомим. }
    FootballteamArr1 = array[1..2] of footballteam;
    ByteArr2 = array[1..2] of byte;

    MatchType = record
     Stadium:StadiumType;
     Ft:FootballteamArr1;
     OnLooker:longint;
     Score:ByteArr2;
     HalfEnd:byte;
     Date:DateType;
     FileCom:string;
    end;

procedure EmulMatch (var Match:MatchType); async;

implementation

uses JS, crt, nls;

procedure EmulMatch (var Match:MatchType); async;
type TTT = (g,y,r,t);
    { pas2js не приймає анонімний діапазон усередині типу масиву
      (`array [1..2] of 0..3`), тож діапазон дістав імʼя. }
    InOutRange = 0..3;
type Thing = record
     TT : TTT;
     Min : byte;
     Surname:string;
     flag : boolean;
     StPlus : string;
     HT:byte;
     end;
var
   MinNow,MinEnd,EStrength,ERandom,EMood,ETiredness,N,n0,n1,At,Pt:byte;
   Half:0..5;
   TeamP,PlayerP:array [1..2] of byte;
   St,St1,st2,st3:String;
   Player1,Player2,PlayerU:footballer;
   Things : array [1..2, 1..13] of Thing;
   i,j:byte;
   SP : string;
   flag:boolean;
   InOut : array [1..2] of InOutRange;

{ Назви місяців були const-масивом; Loc не викликати в ініціалізаторі константи,
  тож масив став функцією. Українські форми — родовий відмінок («5 січня»). }
function MonthName(i:byte):string;
begin
     case i of
     1:MonthName:=Loc('January','січня');
     2:MonthName:=Loc('February','лютого');
     3:MonthName:=Loc('March','березня');
     4:MonthName:=Loc('April','квітня');
     5:MonthName:=Loc('May','травня');
     6:MonthName:=Loc('June','червня');
     7:MonthName:=Loc('July','липня');
     8:MonthName:=Loc('August','серпня');
     9:MonthName:=Loc('September','вересня');
     10:MonthName:=Loc('October','жовтня');
     11:MonthName:=Loc('November','листопада');
     12:MonthName:=Loc('December','грудня');
     else MonthName:='';
     end;
end;

   procedure NewThing(i:byte;a:TTT;b,stp:string);
   var j:byte;
       abc:boolean;
   begin
        j:=0;
        abc:=false;
        repeat
                inc(j);
                 if not(Things[i,j].Flag) then
                    begin
                         Things[i,j].Flag:=True;
                         Things[i,j].TT:=a;
                         Things[i,j].Min:=MinNow;
                         Things[i,j].Surname:=b;
                         Things[i,j].StPlus:=stp;
                         Things[i,j].HT:=Half;
                         abc:=true;
                    end;
        until (abc) or (j=13);
   end;

   procedure DoTeamP;
   var i,j:byte;
   begin
        With Match do
             For i:=1 to 2 do
                 begin
                      EStrength:=Ft[i].Mark;
                      ERandom:=Random(51)-25;
                      if i=1 then ERandom:=ERandom+25;
                      for j:=1 to 11 do
                          if Match.Ft[i].FootBallers[j].Play=false then dec(ERandom);
                      EMood:=Ft[i].Mood;
                      ETiredNess:=Ft[i].TiredNess;
                      TeamP[i]:=EStrength+ERandom+EMood+ETiredness;
                 end;
   end;

   procedure DoPlayerP;
   var i:byte;
   begin
                      EStrength:=Player1.Mark;
                      ERandom:=Random(51)-25;
                      EMood:=Player1.Mood;
                      ETiredNess:=Player1.TiredNess;
                      PlayerP[1]:=EStrength+ERandom+EMood+ETiredness;
                     EStrength:=Player2.Mark;
                     ERandom:=Random(51)-25;
                     EMood:=Player2.Mood;
                     ETiredNess:=Player2.TiredNess;
                     PlayerP[2]:=EStrength+ERandom+EMood+ETiredness;
   end;

   procedure ChAt;
   begin
        case At of
        1:begin
               At:=2;
               Pt:=1;
          end;
        2:begin
               At:=1;
               Pt:=2;
          end;
        end;
   end;

   procedure WriteMinNow;
   var st1,st2:string;
       m:byte;
   begin
        Str(MinNow,st1);
        if (MinNow>45) and (Half=1) then
           begin
                Str(MinNow-45,st2);
                St1:='45+'+st2;
           end;
        if (MinNow>90) and (Half=2) then
           begin
                Str(MinNow-90,st2);
                St1:='90+'+st2;
           end;
        if (MinNow>115) and (Half=3) then
           begin
                Str(MinNow-115,st2);
                St1:='115+'+st2;
           end;
        if (MinNow>120) and (Half=4) then
           begin
                Str(MinNow-120,st2);
                St1:='120+'+st2;
           end;
        if Half<>5 then
           begin
                St:=st1 + Loc(' minute of the match',' хвилина матчу');
                m:=length(st);
                Gotoxy(40 - m div 2,9);
                Write(st);
           end
        else begin
                St:=Loc('Penalty shootout','Серія пенальті');
                m:=length(st);
                Gotoxy(40 - m div 2,9);
                Write(st);
             end
   end;

   procedure WriteMinT(M0,H0:byte);
   var st1,st2:string;
       m:byte;
   begin
        Str(M0,st1);
        if (M0>45) and (H0=1) then
           begin
                Str(M0-45,st2);
                St1:='45+'+st2;
           end;
        if (M0>90) and (H0=2) then
           begin
                Str(M0-90,st2);
                St1:='90+'+st2;
           end;
        if (M0>115) and (H0=3) then
           begin
                Str(M0-115,st2);
                St1:='115+'+st2;
           end;
        if (M0>120) and (H0=4) then
           begin
                Str(M0-120,st2);
                St1:='120+'+st2;
           end;
        if H0=5 then st1:='''''';
        St:=st1 + '''';
        Write(st);
   end;


   procedure Comment; async;
   var i,j,m,m1,m2:byte;
       st01,st02:string;
       dur:real;
   begin
        ClrScr;
        St01:=Match.Ft[1].Name + ' (' + Match.Ft[1].State.Name + ')';
        St02:=Match.Ft[2].Name + ' (' + Match.Ft[2].State.Name + ')';
        m:=length(st01);
        m:=35 - m;
        Gotoxy(m,2);
        Write(st01);
        m:=m+(length(st01) div 2);
        Gotoxy(m,4);
        Write(Match.Score[1]);
        m:=45;
        Gotoxy(m,2);
        Write(st02);
        Gotoxy(m+length(st02) div 2,4);
        Write(Match.Score[2]);
        m:=length(St);
        Gotoxy(40 - m div 2,7);
        Write(St);
        case m of
        1..10:dur:=0.75;
        11..20:dur:=0.85;
        21..40:dur:=0.95;
        else dur:=1;
        end;
        WriteMinNow;
        m1:=35-length(st01);
        m2:=45;
        for i:=1 to 2 do
            for j:=1 to 13 do
                begin
                     if Things[i,j].Flag then
                        begin
                             case i of
                             1:begin
                                    Case Things[i,j].tt of
                                    G:begin
                                              Gotoxy(m1,9+j);
                                              Write(#9,' ');
                                         end;
                                    Y:begin
                                                Gotoxy(m1,9+j);
                                                TextBackGround(14);
                                                Write(' ');
                                                TextBackGround(0);
                                                Write(' ');
                                           end;
                                    R:begin
                                             Gotoxy(m1,9+j);
                                             TextBackGround(4);
                                             Write(' ');
                                             TextBackGround(0);
                                             Write(' ');
                                        end;
                                    T:begin
                                                Gotoxy(m1,9+j);
                                                TextColor(4);
                                                Write('+ ');
                                                TextColor(15);
                                           end;
                                    end;
                                    WriteMinT(Things[i,j].Min,Things[i,j].HT);
                                    Write(' ',Things[i,j].Surname,' ',Things[i,j].StPlus);
                               end;
                             2:begin
                                    Case Things[i,j].tt of
                                    G:begin
                                              Gotoxy(m2,9+j);
                                              Write(#9,' ');
                                         end;
                                    Y:begin
                                                Gotoxy(m2,9+j);
                                                TextBackGround(14);
                                                Write(' ');
                                                TextBackGround(0);
                                                Write(' ');
                                           end;
                                    R:begin
                                             Gotoxy(m2,9+j);
                                             TextBackGround(4);
                                             Write(' ');
                                             TextBackGround(0);
                                             Write(' ');
                                        end;
                                    T:begin
                                                Gotoxy(m2,9+j);
                                                TextColor(4);
                                                Write('+ ');
                                                TextColor(15);
                                           end;
                                    end;
                                    WriteMinT(Things[i,j].Min,Things[i,j].HT);
                                    Write(' ',Things[i,j].Surname,' ',Things[i,j].StPlus);
                               end;
                             end;
                        end;
                end;
        await(Delay(round(dur * 1000)));
   end;

   procedure Sostav; async;
   var i,j,y,k,x1,x2:byte;
   begin
        gotoxy(1,10);
        for i:=10 to 24 do
            write('                                                           ');
        x1:=Length(Match.Ft[1].Name+' ('+Match.Ft[1].State.Name+')');
        x2:=Length(Match.Ft[2].Name+' ('+Match.Ft[2].State.Name+')');
        x1:=(30-x1) div 2 + 1;
        x2:=(30-x2) div 2 + 51;
        for i:=1 to 12 do
            begin
                 await(Delay(round(1.5 * 1000)));
                 Gotoxy(x1,13);
                 Write('                                              ');
                 Gotoxy(x2,13);
                 Write('                                              ');
                 Gotoxy(x1,13);
                 Write(Match.Ft[1].Name,' (',Match.Ft[1].State.Name,')');
                 Gotoxy(x2,13);
                 Write(Match.Ft[2].Name,' ('+Match.Ft[2].State.Name,')');
                 for j:=1 to i do
                     begin
                          for k:=1 to 2 do
                              begin
                                   y:=j+13;
                                   case k of
                                   1:Gotoxy(1,y);
                                   2:Gotoxy(50,y);
                                   end;
                                   case Match.Ft[k].FootBallers[j].Fall of
                                   YellowCard:begin
                                                   TextBackGround(14);
                                                   Write(' ');
                                                   TextBackGround(0);
                                              end;
                                   RedCard:begin
                                                TextBackGround(4);
                                                Write(' ');
                                                TextBackGround(0);
                                           end
                                   else Write(' ');
                                   end;
                                   Write(' № ',Match.Ft[k].FootBallers[j].Number,' ',Match.Ft[k].FootBallers[j].Name,' '+
                                           Match.Ft[k].FootBallers[j].Surname);
                              end;
                     end;
            end;
   end;

   procedure HelpPr2; async;
   var i:byte;
       st001,st002:string;
   begin
        Str(Match.Stadium.Seats,st1);
        St:=Loc('We welcome you back to the ','Ми знову вітаємо вас на стадіоні ') + Match.Stadium.Name + ' (' + st1 + Loc(' seats)',' місць)');
        await(Comment);
        Str(Match.Date.Date,st1);
        St2:=MonthName(Match.Date.Month);
        Str(Match.Date.Year,st3);
        St:=Loc('Today is ','Сьогодні ') + st1 + ' ' + st2 + ' ' + st3 + Loc('',' року');
        await(Comment);
        Str(Match.OnLooker,st1);
        St:=st1 + Loc(' spectators have gathered at the stadium to watch this match',' глядачів зібралися на стадіоні, щоб подивитися цей матч');
        await(Comment);
        St:=Loc('Playing:','Грають:');
        await(Comment);
        St:=Match.Ft[1].Name+' ('+Match.Ft[1].State.Name+')';
        await(Comment);
        St:=Loc('VERSUS','ПРОТИ');
        await(Comment);
        St:=Match.Ft[2].Name+' ('+Match.Ft[2].State.Name+')';
        await(Comment);
        St:=Loc('Line-ups','Склади команд');
        await(Comment);
        await(Sostav);
        n0:=random(100);
        case n0 of
        0..10:st3:=Loc('Snowing','Іде сніг');
        11..30:st3:=Loc('Raining','Іде дощ');
        31..60:st3:=Loc('Overcast','Хмарно')
        else st3:=Loc('Sunny','Сонячно');
        end;
        St:=Loc('Weather on the pitch:','Погода на полі:');
        await(Comment);
        St:=st3;
        await(Comment);
        Str(Half-1,st3);
        Str(Match.Score[1],st001);
        Str(Match.Score[2],st002);
        St:=Loc('A reminder, the score after ','Нагадуємо, рахунок після ')+st3+Loc(' half - ',' тайму - ')+st001+':'+st002;
        await(Comment);
        St:=Loc('The teams are ready for the next half. The referee whistles and ... ','Що ж, команди готові почати наступний тайм. Суддя дає свисток і ... ');
        await(Comment);
        St:='';
        await(Comment);
   end;

   procedure HelpPr3; async;
   var st001,st002:string;
   begin
        Str(Half,st);
        Str(Match.Score[1],st001);
        Str(Match.Score[2],st002);
        St:=Loc('So, ','Отже, ')+st+Loc(' half is over and the score is - ',' тайм завершено, рахунок - ')+st001+':'+st002;
        await(Comment);
   end;

   procedure HelpPr4; async;
   var st001,st002:string;
   begin
        Str(Match.Score[1],st001);
        Str(Match.Score[2],st002);
        St:=Loc('So, the match is over and the score is - ','Отже, матч завершено, рахунок - ')+st001+':'+st002;
        await(Comment);
   end;

   procedure HelpPr1; async;
   var i:byte;
   begin
        Str(Match.Stadium.Seats,st1);
        St:=Loc('We welcome you to the ','Ми вітаємо вас на стадіоні ') + Match.Stadium.Name + ' (' + st1 + Loc(' seats)',' місць)');
        await(Comment);
        Str(Match.Date.Date,st1);
        St2:=MonthName(Match.Date.Month);
        Str(Match.Date.Year,st3);
        St:=Loc('Today is ','Сьогодні ') + st1 + ' ' + st2 + ' ' + st3 + Loc('',' року');
        await(Comment);
        Str(Match.OnLooker,st1);
        St:=st1 + Loc(' spectators have gathered at the stadium to watch this match',' глядачів зібралися на стадіоні, щоб подивитися цей матч');
        await(Comment);
        St:=Loc('Playing:','Грають:');
        await(Comment);
        St:=Match.Ft[1].Name+' ('+Match.Ft[1].State.Name+')';
        await(Comment);
        St:=Loc('VERSUS','ПРОТИ');
        await(Comment);
        St:=Match.Ft[2].Name+' ('+Match.Ft[2].State.Name+')';
        await(Comment);
        St:=Loc('Line-ups','Склади команд');
        await(Comment);
        await(Sostav);
        n0:=random(100);
        case n0 of
        0..10:st3:=Loc('Snowing','Іде сніг');
        11..30:st3:=Loc('Raining','Іде дощ');
        31..60:st3:=Loc('Overcast','Хмарно')
        else st3:=Loc('Sunny','Сонячно');
        end;
        St:=Loc('Weather on the pitch:','Погода на полі:');
        await(Comment);
        St:=st3;
        await(Comment);
        St:=Loc('The teams are ready to start. The referee whistles and ... ','Що ж, команди готові почати матч. Суддя дає свисток і ... ');
        await(Comment);
        St:='';
        await(Comment);
   end;

   procedure HelpPr7(t,p1,p2:byte); async;
   var m:byte;
   begin
        if t=0 then t:=random(2)+1;
        if p1=0 then p1:=random(10)+2;
        if p2=0 then p2:=random(4)+12;
        St:=Loc('In the ','У команді ') + Match.Ft[t].Name + Loc(' squad, a substitution:',' заміна:');
        await(Comment);
        St:='';
        await(Comment);
        St:=#25 + ' ' + Match.Ft[t].FootBallers[p1].Name +  ' ' + Match.Ft[t].FootBallers[p1].SurName;
        m:=length(St);
        Gotoxy(40 - m div 2,7);
        TextColor(4);
        Write(#25);
        TextColor(15);
        Write(' ' + Match.Ft[t].FootBallers[p1].Name +  ' ' + Match.Ft[t].FootBallers[p1].SurName);
        await(Delay(round(1 * 1000)));
        St:='';
        await(Comment);
        St:=#24 + ' ' + Match.Ft[t].FootBallers[p2].Name +  ' ' + Match.Ft[t].FootBallers[p2].SurName;
        m:=length(St);
        Gotoxy(40 - m div 2,7);
        TextColor(Green);
        Write(#24);
        TextColor(15);
        Write(' ' + Match.Ft[t].FootBallers[p2].Name +  ' ' + Match.Ft[t].FootBallers[p2].SurName);
        await(Delay(round(1 * 1000)));
        Player1:=Match.Ft[t].FootBallers[p2];
        Match.Ft[t].FootBallers[p2]:=Match.Ft[t].FootBallers[p1];
        Match.Ft[t].FootBallers[p1]:=Player1;
        Match.Ft[t].FootBallers[p2].Here:=false;
        Match.Ft[t].FootBallers[p1].Play:=true;
        dec(InOut[t]);
   end;

   procedure HelpPr8(nt:byte); async;
   var p1:byte;
   begin
        repeat
              p1:=random(10)+2;
              Player1:=Match.Ft[nt].FootBallers[p1];
        until Player1.Play;
        St:=Loc('In the ','У команді ') + Match.Ft[nt].Name + Loc(' is injured ',' травмований ')+ Player1.name + ' ' + Player1.surname;
        NewThing(nt,t,Player1.surname,'');
        await(Comment);
        await(HelpPr7(nt,p1,0));
   end;

   procedure EPr1; async;
   begin
        St:=Loc('Team ','Команда ') + Match.Ft[At].name + Loc(' kicks off',' розігрує мʼяч');
        await(Comment);
        n0:=random(100)+1;
        case n0 of
        1..50:n:=2
        else n:=3;
        end;
   end;

   procedure EPr2; async;
   begin
        St:=Match.Ft[At].name + Loc(' knocks it around',' розпасовується');
        inc(MinNow);
        await(Comment);
        n0:= random(50) + TeamP[At] - TeamP[Pt];
        case n0 of
        0..25:n:=4;
        26..50:n:=3
        else n:=2;
        end;
   end;

   procedure EPr3; async;
   var n00:integer;
   begin
        inc(MinNow);
        St:=Match.Ft[At].name + Loc(' starts an attack',' починає свою атаку');
        await(Comment);
        n0:= random(50);
        n00:=n0 + TeamP[At] - TeamP[Pt];
        if (n00<=25) then n:=4
           else
               case n0 of
               0..10:n:=2;
               11..25:n:=5
               else n:=6;
               end;
   end;

   procedure EPr4; async;
   begin
        Inc(MinNow);
        St:=Match.Ft[Pt].Name + Loc(' intercepts the ball',' перехоплює мʼяч');
        await(Comment);
        n0:=random(100);
        case n0 of
        0..30:n:=22;
        31..50:n:=2
        else n:=3;
        end;
        if (n<>22) then ChAt;
   end;

   procedure EPr5; async;
   var n00:integer;
   begin
        inc(MinNow);
        repeat
        n0:=random(10)+2;
        Player1:=Match.Ft[At].FootBallers[n0];
        until Player1.Play=true;
        St:=Player1.name + ' ' + Player1.surname + Loc(' goes past on his own',' проходить сам');
        await(Comment);
        DoPlayerP;
        n00:=(PlayerP[1]+random(51)-25) div 10;
        if n00<2 then n:=4
        else begin
                  n0:=random(100);
                  case n0 of
                  0..15:n:=2;
                  16..45:n:=6;
                  46..65:n:=8
                  else n:=7;
                  end;
            end;
   end;

   procedure EPr6; async;
   var n00:integer;
   begin
        Inc(MinNow);
        repeat
        n0:=random(10)+2;
        Player2:=Match.Ft[At].FootBallers[n0];
        until Player2.play=true;
        DoPlayerP;
        n00:=(PlayerP[2]+random(51)-25) div 10;
        n0:=random(100)+1;
        case n0 of
        1..25:begin
                   St:=Loc('A pass to ','Пас на ') + Player2.surname;
                   await(Comment);
                   if n00<2 then n:=4
                   else begin
                             n0:=random(100);
                             case n0 of
                             0..15:n:=2;
                             16..45:n:=6;
                             46..65:n:=8
                             else n:=7;
                             end;
                        end;
              end;
        26..50:begin
                   St:=Player2.surname+Loc(' swings it in',' навішує');
                   await(Comment);
                   if n00<2 then n:=4
                            else n:=8;
               end;
        51..75:begin
                   St:=Player2.surname+Loc(' drills it into the box',' прострілює у штрафний майданчик');
                   await(Comment);
                   if n00<2 then n:=4
                            else n:=8;
               end
        else n:=24;
        end;
   end;

   procedure EPr7;
   begin
        n0:=random(100)+1;
        case n0 of
        1..50:n:=9
        else n:=22;
        end;
   end;

   procedure EPr8; async;
   begin
        repeat
        n0:=random(10)+2;
        Player1:=Match.Ft[At].FootBallers[n0];
        until Player1.Play=true;
        PlayerU:=Player1;
        inc(MinNow);
        St:=Player1.surname + Loc(' shoots!',' бʼє!');
        await(Comment);
        DoPlayerP;
        n0:=random(50)+PlayerP[1];
        case n0 of
        0..65,125..135:n:=12;
        { Оригінал: `66..125` — 125 накладалося на попередню гілку. Turbo Pascal
          брав ПЕРШУ, що збіглася, тож 125 давало 12; pas2js дублікат відхиляє.
          Звузив до 124, щоб зберегти поведінку 2005 року. }
        66..124:n:=13
        else n:=11;
        end;
   end;

   procedure Epr9; async;
   begin
        n0:=random(100);
        if n0<25 then
           await(HelpPr8(Pt));
        n0:=random(100);
        repeat
        n1:=random(10)+2;
        Player1:=Match.Ft[At].FootBallers[n1];
        until Player1.Play=true;
        case n0 of
        0..30:begin
                   n0:=random(100);
                   case n0 of
                   0..80:begin
                              St:=Player1.surname+Loc(' commits a foul and gets a yellow card',' порушує правила й отримує жовту картку');
                              NewThing(At,Y,Player1.surname,'');
                              await(Comment);
                              if Player1.Fall=YellowCard then
                                 begin
                                      Match.Ft[At].Footballers[n1].Fall:=RedCard;
                                      Match.Ft[At].Footballers[n1].Play:=False;
                                      St:=Player1.surname+Loc(' fouls again, earns a second yellow and walks off the pitch',' знову фолить, заробляє другу жовту картку й залишає поле');
                                      NewThing(At,R,Player1.surname,'');
                                      await(Comment);
                                 end;
                             Match.Ft[At].Footballers[n1].Fall:=YellowCard;
                         end
                 else begin
                           Match.Ft[At].Footballers[n1].Fall:=RedCard;
                           Match.Ft[At].Footballers[n1].Play:=False;
                           NewThing(At,R,Player1.surname,'');
                           St:=Player1.surname+Loc(' fouls brutally, earns a red card and walks off the pitch',' жорстоко фолить, заробляє червону картку й залишає поле');
                           await(Comment);
                     end;
             end;
             end
             else
               begin
                    St:=Player1.surname + Loc(' fouls while being taken on',' порушує правила під час проходу');
                    await(Comment);
               end;
        end;
        ChAt;
        inc(MinNow);
        St:=Match.Ft[At].name + Loc(' takes a free kick from his own half',' бʼє штрафний зі своєї половини поля');
        await(Comment);
        n0:=random(100);
        case n0 of
        0..50:n:=2
        else n:=3;
        end;
   end;

   procedure EPr10; async;
   begin
        repeat
        n0:=random(10)+2;
        Player1:=Match.Ft[At].FootBallers[n0];
        until Player1.Play=true;
        PlayerU:=Player1;
        inc(MinNow);
        St:=Player1.surname + Loc(' takes a free kick',' бʼє штрафний');
        await(Comment);
        St:=Loc('A SHOT!!!','УДАР!!!');
        await(Comment);
        DoPlayerP;
        n0:=random(50)+PlayerP[1];
        case n0 of
        0..75:n:=12;
        76..150:n:=13
        else n:=11;
        end;
   end;

   procedure EPr11; async;
   begin
        St:=Loc('The ball hits a player','Мʼяч влучає в гравця');
        Inc(MinNow);
        await(Comment);
        n0:=random(100)+1;
        case n0 of
        1..50:n:=14;
        51..100:n:=18;
        end;
   end;

   procedure Epr12; async;
   begin
        St:=Loc('WIDE! So dangerous, and yet ... wide!','ПОВЗ ВОРОТА! Як же було небезпечно, але ... повз!');
        inc(MinNow);
        await(Comment);
        ChAt;
        n:=16;
   end;

   procedure EPr13; async;
   var n00:integer;
   begin
        St:=Loc('DANGEROUS!!!','НЕБЕЗПЕЧНО!!!');
        await(Comment);
        Player1:=PlayerU;
        Player2:=Match.Ft[At].FootBallers[1];
        DoPlayerP;
        n00:=random(50)+PlayerP[1]-PlayerP[2];
        n0:=random(50)+PlayerP[1];
        if n00<25 then n:=20
                  else case n0 of
                       26..100:n:=21
                       else n:=19;
                       end;
   end;

   procedure EPr14; async;
   begin
        St:=Loc('The ball has gone out of play','Мʼяч вийшов за межі поля');
        await(Comment);
        n0:=random(100);
        case n0 of
        25..50:if InOut[1]<>0 then await(HelpPr7(1,0,0));
        51..75:if InOut[2]<>0 then await(HelpPr7(2,0,0));
        end;
        n0:=random(100)+1;
        case n0 of
        1..50:n:=141
        else n:=142;
        end;
   end;

   procedure EPr141; async;
   begin
        St:=Loc('The ball goes out off ','Мʼяч виходить від гравців ') + Match.Ft[At].Name;
        await(Comment);
        ChAt;
        n0:=random(100)+1;
        case n0 of
        1..50:n:=15
        else n:=16;
        end;
   end;

   procedure EPr142; async;
   begin
        St:=Loc('The ball goes out off ','Мʼяч виходить від гравців ') + Match.Ft[Pt].Name;
        await(Comment);
        n0:=random(100)+1;
        case n0 of
        1..50:n:=15
        else n:=17;
        end;
   end;

   procedure EPr15; async;
   var np1,np2:byte;
       n00:integer;
   begin
        inc(MinNow);
        St:=Loc('That''s a throw-in','Це аут');
        await(Comment);
        repeat
              np1:=random(10)+2;
              np2:=random(10)+2;
              Player1:=Match.Ft[At].FootBallers[np1];
              Player2:=Match.Ft[At].FootBallers[np2];
        until (np1<>np2) and (Player1.Play) and (Player2.Play);
        St:=Player1.name + ' ' + Player1.surname + Loc(' throws the ball to ',' викидає мʼяч на ') + Player2.Surname;
        await(Comment);
        DoPlayerP;
        n00:=random(50)+PlayerP[2];
        n0:=random(100);
        if n00<25 then n:=4
           else case n0 of
                0..50:n:=2
                else n:=3;
                end;
   end;

   procedure EPr16; async;
   var n00:integer;
   begin
        Player1:=Match.Ft[At].FootBallers[1];
        St:=Player1.Name + ' ' + Player1.surname + Loc(' takes the goal kick',' вибиває мʼяч від воріт');
        await(Comment);
        DoPlayerP;
        n00:=random(50)+PlayerP[1];
        n0:=random(100);
        if n00<25 then n:=4
           else case n0 of
                0..50:n:=2
                else n:=3;
                end;
   end;

   procedure EPr17; async;
   var n00:integer;
   begin
        repeat
              n0:=random(10)+2;
              Player1:=Match.Ft[At].FootBallers[n0];
        until Player1.Play;
        inc(MinNow);
        St:=Loc('That''s a corner','Це кутовий');
        await(Comment);
        St:=Player1.Name + ' ' + Player1.Surname + Loc(' swings it in',' навішує');
        await(Comment);
        DoPlayerP;
        n00:=random(50)+PlayerP[1];
        if n00<25 then n:=4
                  else n:=8;
   end;

   procedure EPr18; async;
   begin
        St:=Loc('The ball stays in play','Мʼяч залишається у грі');
        await(Comment);
        n0:=random(100);
        case n0 of
        0..31:n:=2;
        32..63:n:=3;
        64..94:n:=4
        else n:=25;
        end;
   end;

   procedure EPr19; async;
   begin
        n0:=random(100);
        case n0 of
        0..50:st:=Loc('Off the post!','Штанга!');
        51..90:st:=Loc('Off the bar!','Перекладина!')
        else st:=Loc('Off the angle!','Хрестовина!');
        end;
        await(Comment);
        n0:=random(100);
        case n0 of
        0..25:n:=21;
        26..40:n:=141;
        41..65:n:=2;
        66..80:n:=3
        else n:=4;
        end;
   end;

   procedure EPr20; async;
   begin
        inc(MinNow);
        n0:=random(100);
        case n0 of
        0..50:begin
                   St:=Loc('The keeper gathers it in his hands!','Воротар бере мʼяч у руки!');
                   await(Comment);
                   ChAt;
                   n:=16;
              end
        else begin
                  n0:=random(100);
                  case n0 of
                  0..50:begin
                             St:=Loc('The keeper tips it out for a corner!','Воротар відбиває мʼяч на кутовий!');
                             await(Comment);
                             n:=17;
                        end;
                  end;
                  if n0>50 then
                     begin
                          St:=Loc('The keeper parries it in front of himself','Воротар відбиває мʼяч перед собою');
                          await(Comment);
                          St:=Loc('Players rush in for the rebound!','Гравці біжать на добивання!');
                          await(Comment);
                          St:=Loc('THIS IS VERY DANGEROUS!!!','ЦЕ ДУЖЕ НЕБЕЗПЕЧНО!!!');
                          await(Comment);
                          repeat
                          n0:=random(10)+2;
                          PlayerU:=Match.Ft[At].FootBallers[n0];
                          until PlayerU.Play;
                          n0:=random(100);
                          case n0 of
                          0..50:n:=21
                          else n:=4;
                          end;
                     end;
             end;
        end;
   end;

   procedure EPr21; async;
   begin
        St:=Loc('GOAL!!!','ГОЛ!!!');
        await(Comment);
        St:=Loc('GOAL!!!','ГОЛ!!!');
        await(Comment);
        St:=Loc('GOAL!!!','ГОЛ!!!');
        await(Comment);
        St:=PlayerU.Name + ' ' + PlayerU.Surname + Loc(' scores it!!!',' забиває цей гол!!!');
        NewThing(At,G,PlayerU.Surname,sp);
        inc(Match.Score[At]);
        sp:='';
        await(Comment);
        ChAt;
        n:=1;
   end;

   procedure Epr22; async;
   begin
        n0:=random(100);
        if n0<25 then
           await(HelpPr8(At));
        n0:=random(100);
        repeat
        n1:=random(10)+2;
        Player1:=Match.Ft[Pt].FootBallers[n1];
        until Player1.Play=true;
        case n0 of
        0..30:begin
                   n0:=random(100);
                   case n0 of
                   0..80:begin
                              St:=Player1.surname+Loc(' commits a foul and gets a yellow card',' порушує правила й отримує жовту картку');
                              NewThing(Pt,Y,Player1.surname,'');
                              await(Comment);
                              if Player1.Fall=YellowCard then
                                 begin
                                      Match.Ft[Pt].Footballers[n1].Fall:=RedCard;
                                      Match.Ft[Pt].Footballers[n1].Play:=False;
                                      St:=Player1.surname+Loc(' fouls again, earns a second yellow and walks off the pitch',' знову фолить, заробляє другу жовту картку й залишає поле');
                                      NewThing(Pt,R,Player1.surname,'');
                                      await(Comment);
                                 end;
                             Match.Ft[Pt].Footballers[n1].Fall:=YellowCard;
                         end
                 else begin
                           Match.Ft[Pt].Footballers[n1].Fall:=RedCard;
                           Match.Ft[Pt].Footballers[n1].Play:=False;
                           NewThing(Pt,R,Player1.surname,'');
                           St:=Player1.surname+Loc(' fouls brutally, earns a red card and walks off the pitch',' жорстоко фолить, заробляє червону картку й залишає поле');
                           await(Comment);
                     end;
             end;
             end
             else
               begin
                    St:=Player1.surname + Loc(' fouls while tackling an opponent',' порушує правила під час відбору мʼяча');
                    await(Comment);
               end;
        end;
        inc(MinNow);
        n0:=random(100);
        case n0 of
        0..85:n:=10
        else n:=23;
        end;
   end;

   procedure EPr23; async;
   begin
        Inc(MinNow);
        St:=Loc('The referee points to the spot','Суддя вказує на «точку»');
        await(Comment);
        St:=Loc('Team ','Команді ') + Match.Ft[At].Name + Loc(' has been awarded a penalty!!!',' надається можливість пробити пенальті!!!');
        await(Comment);
        sp:=Loc('p','п');
        n0:=11;
        repeat
              PlayerU:=Match.Ft[At].FootBallers[n0];
              dec(n0);
        until PlayerU.Play;
        St:=Loc('Stepping up to the ball is ','До мʼяча підходить ') + PlayerU.name + ' ' + PlayerU.surname;
        await(Comment);
        St:=Loc('He shoots!!!','Він бʼє!!!');
        await(Comment);
        n0:=random(100)+1;
        case n0 of
        0..75:begin
                   St:=Loc('Keeper and ball fly into opposite corners!','Воротар і мʼяч розлітаються в різні кути!');
                   await(Comment);
                   n:=21;
              end;
        76..90:begin
                    St:=Loc('The keeper saves it!!!','Воротар ловить цей мʼяч!!!');
                    await(Comment);
                    ChAt;
                    n:=16;
               end
        else n:=12;
        end;
   end;

   procedure EPr24; async;
   var n1:byte;
   begin
        Inc(MinNow);
        St:=Loc('A stunning pass!','Приголомшливий пас!');
        await(Comment);
        repeat
        n0:=random(10)+2;
        PlayerU:=Match.Ft[At].FootBallers[n0];
        until PlayerU.Play=true;
        Player2:=Match.Ft[Pt].FootBallers[1];
        St:=PlayerU.name + ' ' + PlayerU.surname + Loc(' is through one on one with ',' виходить сам на сам з ') + Player2.name + ' ' + Player2.surname;
        await(Comment);
        n0:=random(100)+1;
        n1:=random(100)+1;
        case n0 of
        1..25:begin
                   St:=Loc('He shoots!!!','Він бʼє!!!');
                   await(Comment);
                   case n1 of
                   1..60:n:=21;
                   61..75:n:=20;
                   76..85:n:=19
                   else n:=12;
                   end;
              end;
        26..50:begin
                    St:=Loc('He goes to dribble round the keeper!!!','Він іде обігравати воротаря!!!');
                    await(Comment);
                    case n1 of
                    1..75:n:=21;
                    76..80:n:=12
                    else begin ChAt; n:=16; end;
                    end;
               end;
        51..75:begin
                    repeat
                    n0:=random(10)+2;
                    PlayerU:=Match.Ft[At].FootBallers[n0];
                    until PlayerU.Play=true;
                    St:=Loc('A pass past the keeper to ','Пас повз воротаря на ') + PlayerU.surname;
                    await(Comment);
                    case n1 of
                    1..75:n:=21;
                    76..85:n:=12;
                    86..90:n:=19
                    else begin ChAt; n:=16; end;
                    end;
               end
        else begin
                  St:=Loc('Unheard-of courage!!!','Нечувана сміливість!!!');
                  await(Comment);
                  repeat
                  n1:=random(10)+2;
                  Player2:=Match.Ft[Pt].FootBallers[n1];
                  until Player2.Play=true;
                  St:=Player2.name + ' ' + Player2.surname + Loc(' fouls ',' фолить на ') + PlayerU.surname;
                  await(Comment);
                  St:=Loc('The referee punishes the "hero" - a red card!!!','Суддя карає «героя» — червона картка!!!');
                  Match.Ft[Pt].Footballers[n1].Fall:=RedCard;
                  Match.Ft[Pt].Footballers[n1].Play:=False;
                  NewThing(Pt,R,Player2.surname,'');
                  await(Comment);
                  n:=23;
             end;
        end;
   end;

   procedure EPr25; async;
   var n00:byte;
   begin
        Inc(MinNow);
        repeat
              n00:=random(10)+2;
              PlayerU:=Match.Ft[Pt].FootBallers[n00];
        until PlayerU.Play;
        St:=Loc('The ball hits ','Мʼяч влучає в ') + PlayerU.surname + Loc(' and flies towards the goal!!!',' і летить у бік воріт!!!');
        await(Comment);
        n0:=random(100);
        if n0<90 then
           begin
                St:=Loc('The keeper can do nothing about it','Воротар уже нічого не може вдіяти');
                await(Comment);
                St:=Loc('An own goal!','Свій забив своїм!');
                await(Comment);
                St:=Loc('That is the last place the keeper expected a shot from!!!','Ось звідки воротар удару не чекав!!!');
                await(Comment);
                St:=Loc('What a disgrace!!!','Яка ганьба!!!');
                await(Comment);
                n0:=random(100);
                if (n0<75) and (InOut[Pt]<>0) then await(HelpPr7(Pt,n00,0));
                sp:=Loc('og','аг');
                n:=21;
           end
        else
            begin
                 St:=Loc('The keeper reaches his teammate''s ball and saves the day!!!','Воротар дістає свій же мʼяч і рятує команду від ганьби!!!');
                 await(Comment);
                 n:=16;
            end;
   end;

   procedure HelpPr5; async;
   begin
        n0:=random(5)+1;
        MinEnd:=MinEnd+n0;
        str(n0,st);
        St:=Loc('The referee has added to normal time ','Суддя додав до основного часу ')+st+Loc(' minutes',' хвилин');
        await(Comment);
   end;

   procedure HelpPr6; async;
   var j:byte;

             procedure Penalti(i,t:byte); async;
             var p:byte;
             begin
                  Half:=5;
                  sp:=Loc('so','сп');
                  str(i,st);
                  St:=Loc('Team ','Команда ') + Match.Ft[t].Name + Loc(' takes his ',' бʼє свій ') + st + Loc(' penalty',' пенальті');
                  await(Comment);
                  repeat
                        p:=12-i;
                        i:=i-11;
                  until (p>=1) and (p<=11);
                  repeat
                        PlayerU:=Match.Ft[t].FootBallers[p];
                        dec(p);
                  until PlayerU.Play;
                  St:=Loc('Stepping up to the ball is ','До мʼяча підходить ') + PlayerU.name + ' ' + PlayerU.surname;
                  await(Comment);
                  St:=Loc('He shoots!!!','Він бʼє!!!');
                  await(Comment);
                  n0:=random(100)+1;
                  case n0 of
                  0..75:begin
                             St:=Loc('Keeper and ball fly into opposite corners!','Воротар і мʼяч розлітаються в різні кути!');
                             await(Comment);
                             St:=Loc('GOAL!!!','ГОЛ!!!');
                             await(Comment);
                             St:=Loc('GOAL!!!','ГОЛ!!!');
                             await(Comment);
                             St:=Loc('GOAL!!!','ГОЛ!!!');
                             await(Comment);
                             St:=PlayerU.Name + ' ' + PlayerU.Surname + Loc(' scores it!!!',' забиває цей гол!!!');
                             NewThing(T,G,PlayerU.Surname,sp);
                             inc(Match.Score[t]);
                             end;
                  76..90:begin
                              St:=Loc('The keeper saves it!!!','Воротар ловить цей мʼяч!!!');
                              await(Comment);
                         end
                  else begin
                            St:=Loc('WIDE!!!','ПОВЗ ВОРОТА!!!');
                            await(Comment);
                       end;
                  end;
             end;
   begin
        Half:=5;
        St:=Loc('After 120 minutes it is a draw! It goes to a penalty shootout!','Після 120 хвилин — нічия! Результат — серія пенальті!');
        await(Comment);
        St:=Loc('First to shoot is ','Першою бʼє команда ') + Match.Ft[At].Name;
        await(Comment);
        j:=1;
        repeat
              await(Penalti(j,1));
              await(Penalti(j,2));
              inc(j);
        until j=6;
        while Match.score[1]=Match.score[2] do
              begin
                   await(Penalti(j,1));
                   await(Penalti(j,2));
                   inc(j);
              end;
   end;

   begin
     TextColor(15);
     Randomize;
     Match.Score[1]:=0;
     Match.Score[2]:=0;
     Half:=0;
     MinNow:=0;
     sp:='';
     for i:=1 to 2 do
         for j:=1 to 13 do
             begin
                  Things[i,j].Flag:=False;
                  Things[i,j].StPlus:='';
                  Things[i,j].Min:=0;
                  Things[i,j].HT:=0;
                  Things[i,j].Surname:='';
             end;
     await(HelpPr1);
     InOut[1]:=3;
     InOut[2]:=3;
     repeat
           DoTeamP;
           Inc(Half);
           case half of
           1:begin At:=1; Pt:=2; MinNow:=1; MinEnd:=45; end;
           2:begin At:=2; Pt:=1; MinNow:=45; MinEnd:=90; end;
           3:begin At:=1; Pt:=2; MinNow:=90; MinEnd:=105; end;
           4:begin At:=2; Pt:=1; MinNow:=105; MinEnd:=120; end;
           5:begin At:=1; Pt:=2; await(HelpPr6); end;
           end;
           if (half<>1) and (Half<>5) then
              begin
                   n0:=random(100);
                   case n0 of
                   25..50:if InOut[1]<>0 then await(HelpPr7(1,0,0));
                   51..75:if InOut[2]<>0 then await(HelpPr7(2,0,0));
                   end;
                   await(HelpPr2);
              end;
           if n<>5 then N:=1 else n:=0;
           repeat
                 If MinNow mod 15 = 0  then DoTeamP;
                 case n of
                 1:await(EPr1);
                 2:await(EPr2);
                 3:await(EPr3);
                 4:await(EPr4);
                 5:await(EPr5);
                 6:await(EPr6);
                 7:EPr7;
                 8:await(EPr8);
                 9:await(Epr9);
                 10:await(EPr10);
                 11:await(EPr11);
                 12:await(Epr12);
                 13:await(EPr13);
                 14:await(EPr14);
                 141:await(EPr141);
                 142:await(EPr142);
                 15:await(EPr15);
                 16:await(EPr16);
                 17:await(EPr17);
                 18:await(EPr18);
                 19:await(EPr19);
                 20:await(EPr20);
                 21:await(EPr21);
                 22:await(Epr22);
                 23:await(EPr23);
                 24:await(EPr24);
                 25:await(EPr25);
                 end;
                 if (MinNow=45) and (Half=1) then await(HelpPr5);
                 if (MinNow=90) and (Half=2) then await(HelpPr5);
                 if (MinNow=115) and (Half=3) then await(HelpPr5);
                 if (MinNow=120) and (Half=4) then await(HelpPr5);
           until MinNow=MinEnd;
           await(HelpPr3);
           flag:=Half=Match.HalfEnd;
           if (Match.HalfEnd=5) and (Match.Score[1]<>Match.Score[2]) and (Half<>1) and (Half<>3) then Flag:=true;
           if (Match.HalfEnd=5) and (Match.Score[1]=Match.Score[2]) and (Half=2) then
              begin
                   St:=Loc('The match ended in a draw!','Матч завершився внічию!');
                   await(Comment);
                   St:=Loc('Extra time will now be played','Зараз будуть зіграні додаткові тайми');
                   await(Comment);
              end;
           if Half=5 then flag:=true;
     until (flag) or (Half=5);
     await(HelpPr4);
     await(Delay(round(2 * 1000)));
  end;

  end.

