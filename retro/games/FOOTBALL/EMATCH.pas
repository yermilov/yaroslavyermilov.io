{ EMatch (2005–2009) — двигун симуляції футбольного матчу. РЕКОНСТРУКЦІЯ
  покинутої версії: оригінальний EMATCH.PAS зберігся ПОСЕРЕД рефакторингу
  (і .PAS, і .BAK ідентично незавершені) — MATCH.PAS посилається на поля й
  імена, яких у вцілілій версії немає, а сам цикл симуляції не рухає час.
  Original: /Users/yarik/games/FOOTBALL/EMATCH.PAS.

  Що реконструйовано відносно вцілілого файла:
  - FallType: (NoFall,Yellow,Red) → (NoFall,YellowCard,RedCard) — саме ці
    імена вживає MATCH.PAS (вцілілий юніт із ними не компілюється; MATCH.EXE
    2005 року доводить, що узгоджена версія існувала);
  - FootBallTeam.stadium → StadiumTeam:StadiumType — знову за вживанням у
    MATCH.PAS/MATCH1.PAS;
  - uses HelpUnit (Duration — busy-wait на GetTime, який у браузері заморозив
    би вкладку) → await(Delay(...)) прямо тут;
  - ДВІ РЕМОНТНІ ПРАВКИ незавершеного EmulMatch (вимога плану «можна
    пограти»): (1) внутрішній цикл тепер РУХАЄ ЧАС (Inc(MinNow)) — в
    оригіналі хвилини не йшли і матч зависав назавжди (машинерія подій EPr1
    лишилась закоментованою і не збереглась); (2) після фінального свистка
    друкується рахунок — інакше «матч» закінчувався без жодного сліду.
    Голів двигун не забиває — автор не дописав події: кожен матч чесно
    завершується 0:0, як і залишив його 2005 рік. }
unit EMatch;

interface

uses JS;

type
    FallType = (NoFall,YellowCard,RedCard);

    DateType = record
     date:1..31;
     month:1..12;
     year:word;
    end;

    StateType = record
     name:string { pas2js: короткі рядки string не підтримуються };
    end;

    FootBaller = record
     name,surname:string;
     mark:byte;
     tiredness,mood:shortint;
     number:byte;
     state:statetype;
     here:boolean;
     play:boolean;
     fall:falltype;
    end;

    StadiumType = record
     Seats:longint;
     name:string;
     state:statetype;
    end;

    { pas2js не клонує записи з АНОНІМНИМИ статичними масивами — типи масивів
      названо; семантика та сама }
    TFootballers = array[1..30] of FootBaller;
    TMarkA = array[1..4] of byte;

    FootBallTeam = record
     name:string;
     footballers:TFootballers;
     state:statetype;
     StadiumTeam:stadiumtype;
     MarkA : TMarkA;
     Mark:byte;
     tiredness,mood:shortint;
    end;

    TTeamPair = array[1..2] of FootBallTeam;
    TScorePair = array[1..2] of byte;

    MatchType = record
     Stadium:StadiumType;
     Ft:TTeamPair;
     OnLooker:longint;
     Score:TScorePair;
     HalfEnd:byte;
     Date:DateType;
     FileCom:string;
    end;

function EmulMatch (var Match:MatchType): TJSPromise; async;

implementation

uses crt, nls;

function EmulMatch (var Match:MatchType): TJSPromise; async;
var
   MinNow,MinEnd,EStrength,ERandom,EMood,ETiredness,N,n0,At:byte;
   Half:0..5;
   TeamP,PlayerP:array [1..2] of byte;
   St:String;
   Player1,Player2:footballer;

   procedure DoTeamP;
   var i:byte;
   begin
        With Match do
             For i:=1 to 2 do
                 begin
                      EStrength:=Ft[i].Mark;
                      ERandom:=Random(51)-25;
                      EMood:=Ft[i].Mood;
                      ETiredNess:=Ft[i].TiredNess;
                      TeamP[i]:=EStrength+ERandom+EMood+ETiredness;
                 end;
   end;

   procedure ChAt;
   begin
        case At of
        1:At:=2;
        2:At:=1;
        end;
   end;

begin
     Randomize;
     Match.Score[1]:=0;
     Match.Score[2]:=0;
     Half:=0;
     At:=2;
     { РЕМОНТ: вітання стадіону друкувалось ВСЕРЕДИНІ циклу таймів (HalfEnd=2),
       тож виводилось двічі поспіль. Винесено сюди — один раз на початку матчу. }
     St:=Loc('Welcome to the stadium ','Вітаємо вас на стадіоні ') + Match.Stadium.Name;
     Writeln(St);
     await(Delay(1000)); { HelpUnit.Duration(1) — тут awaitable }
     repeat
           DoTeamP;
           Inc(Half);
           case half of
           1:begin MinNow:=0; MinEnd:=45; end;
           2:begin MinNow:=45; MinEnd:=90; end;
           3:begin MinNow:=90; MinEnd:=105; end;
           4:begin MinNow:=105; MinEnd:=120; end;
           {5:HelpPr;}
           end;
           N:=1;
           ChAt;
           repeat
                 If MinNow mod 15 = 0  then DoTeamP;
                 {case n of
                 1:EPr1;
                 end;}
                 Inc(MinNow); { РЕМОНТ: в оригіналі час не рухався — вічний цикл }
           until MinEnd=MinNow;
     until (MinNow=MinEnd) and (Half=Match.HalfEnd);
     { РЕМОНТ: фінальний рахунок — інакше матч закінчувався без сліду }
     Writeln;
     Writeln(Loc('Final whistle! ','Фінальний свисток! '), Match.Ft[1].Name, ' - ', Match.Ft[2].Name,
             '  ', Match.Score[1], ':', Match.Score[2]);
end;

end.
