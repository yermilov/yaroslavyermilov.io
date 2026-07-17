unit EMatch;

interface

const Monthes : array [1..12] of string =
              ('Январь','Февраль','Март','Апрель','Май','Июнь','Июль',
               'Август','Сентябрь','Октябрь','Ноябрь','Декабрь');

type
    FallType = (NoFall,Yellow,Red);

    DateType = record
     date:1..31;
     month:1..12;
     year:word;
    end;

    StateType = record
     name:string[15];
    end;

    FootBaller = record
     name,surname:string[15];
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
     name:string[15];
     state:statetype;
    end;

    FootBallTeam = record
     name:string[15];
     footballers:array[1..30] of footballer;
     state:statetype;
     stadium:stadiumtype;
     MarkA : array [1..4] of byte;
     Mark:byte;
     tiredness,mood:shortint;
    end;

    MatchType = record
     Stadium:StadiumType;
     Ft:array [1..2] of footballteam;
     OnLooker:longint;
     Score:array [1..2] of byte;
     HalfEnd:byte;
     Date:DateType;
     FileCom:string;
    end;

procedure EmulMatch (var Match:MatchType);

implementation

uses HelpUnit;

procedure EmulMatch (var Match:MatchType);
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

   procedure Comments;
   begin
        Writeln(St);
        Duration(1);
   end;

   procedure HelpPr1;
   begin
        St:='Мы приветствуем вас на стадионе ' + Match.Stadium.Name;
        Comments;
   end;


begin
     Randomize;
     Match.Score[1]:=0;
     Match.Score[2]:=0;
     Half:=0;
     At:=2;
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
           HelpPr1;
           repeat
                 If MinNow mod 15 = 0  then DoTeamP;
                 {case n of
                 1:EPr1;
                 end;}
           until MinEnd=MinNow;
     until (MinNow=MinEnd) and (Half=Match.HalfEnd);
end;
