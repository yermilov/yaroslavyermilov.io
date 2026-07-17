program FirstMatch;
uses EMatch,crt,dos;
var Match1 : MatchType;
    Ukraine,Italy : StateType;
    FBP:array [1..31] of footballer;
    i : word;
begin
     Randomize;
     Ukraine.Name:='Украина';
     Italy.Name:='Италия';
     With FBP[1] do
          begin
               Name:='Олександр';
               Surname:='Шовковский';
               Mark:=75;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=1;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[2] do
          begin
               Name:='Горан';
               Surname:='Гавранчич';
               Mark:=2;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=32;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[3] do
          begin
               Name:='';
               Surname:='Родольфо';
               Mark:=87;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=4;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[4] do
          begin
               Name:='Йерко';
               Surname:='Леко';
               Mark:=73;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=18;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[5] do
          begin
               Name:='Олег';
               Surname:='Гусев';
               Mark:=89;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=20;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[6] do
          begin
               Name:='Луциан';
               Surname:='Чернат';
               Mark:=85;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=10;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[7] do
          begin
               Name:='Валентин';
               Surname:='Белькевич';
               Mark:=87;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=8;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[8] do
          begin
               Name:='Сергей';
               Surname:='Ребров';
               Mark:=85;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=5;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[9] do
          begin
               Name:='Руслан';
               Surname:='Ротань';
               Mark:=89;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=14;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[10] do
          begin
               Name:='';
               Surname:='Клебер';
               Mark:=90;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=9;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[11] do
          begin
               Name:='Марис';
               Surname:='Верпаковскис';
               Mark:=87;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=23;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[14] do
          begin
               Name:='Айила';
               Surname:='Юсуф';
               Mark:=85;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=37;
               Here:=true;
               Play:=not true;
               Fall:=NoFall;
          end;
     With FBP[13] do
          begin
               Name:='Фабрицио';
               Surname:='Гиоане';
               Mark:=75;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=17;
               Here:=true;
               Play:=not true;
               Fall:=NoFall;
          end;
     With FBP[12] do
          begin
               Name:='Виталий';
               Surname:='Рева';
               Mark:=60;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=12;
               Here:=true;
               Play:=not true;
               Fall:=NoFall;
          end;
     With FBP[15] do
          begin
               Name:='Андрей';
               Surname:='Несмачный';
               Mark:=80;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=26;
               Here:=true;
               Play:=not true;
               Fall:=NoFall;
          end;
     With FBP[16] do
          begin
               Name:='';
               Surname:='Дида';
               Mark:=80;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=1;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[17] do
          begin
               Name:='';
               Surname:='Кафу';
               Mark:=87;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=2;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[18] do
          begin
               Name:='Яб';
               Surname:='Стам';
               Mark:=89;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=31;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[19] do
          begin
               Name:='Паоло';
               Surname:='Мальдини';
               Mark:=93;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=3;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[20] do
          begin
               Name:='Каха';
               Surname:='Каладзе';
               Mark:=83;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=4;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[21] do
          begin
               Name:='Андреа';
               Surname:='Пирло';
               Mark:=89;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=21;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[22] do
          begin
               Name:='Дженерал';
               Surname:='Гаттузо';
               Mark:=91;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=8;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[23] do
          begin
               Name:='Кларенс';
               Surname:='Зеедорф';
               Mark:=89;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=20;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[24] do
          begin
               Name:='';
               Surname:='Кака';
               Mark:=95;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=22;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[25] do
          begin
               Name:='Альберто';
               Surname:='Джилардино';
               Mark:=95;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=27;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[26] do
          begin
               Name:='Андрей';
               Surname:='Шевченко';
               Mark:=97;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=7;
               Here:=true;
               Play:=true;
               Fall:=NoFall;
          end;
     With FBP[27] do
          begin
               Name:='Кристиан';
               Surname:='Аббиати';
               Mark:=60;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=17;
               Here:=true;
               Play:=false;
               Fall:=NoFall;
          end;
     With FBP[28] do
          begin
               Name:='Йон Даль';
               Surname:='Томассон';
               Mark:=85;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=15;
               Here:=true;
               Play:=false;
               Fall:=NoFall;
          end;
     With FBP[29] do
          begin
               Name:='Филиппо';
               Surname:='Инзаги';
               Mark:=80;
               TiredNess
               :=random(11)-5;
               Mood:=random(11)-5;
               Number:=9;
               Here:=true;
               Play:=false;
               Fall:=NoFall;
          end;
     With FBP[30] do
          begin
               Name:='';
               Surname:='Руи Кошта';
               Mark:=75;
               TiredNess:=random(11)-5;
               Mood:=random(11)-5;
               Number:=10;
               Here:=true;
               Play:=false;
               Fall:=NoFall;
          end;
     With FBP[31] do
          begin
               Name:='Дуратино';
               Surname:='Недоделаный';
               Mark:=0;
               TiredNess:=-5;
               Mood:=-5;
               Number:=247;
               Here:=false;
               Play:=false;
               Fall:=NoFall;
          end;
     With Match1 do
          begin
               Stadium.Seats:=25000;
               Stadium.Name:='им. Лобановского';
               Stadium.State:=Ukraine;
               Ft[1].Name:='Динамо Киев';
               Ft[1].State:=Ukraine;
               Ft[1].Mark:=85;
               for i:=1 to 30 do
                   begin
                        case i of
                        1..15:Ft[1].FootBallers[i]:=FBP[i];
                        16..30:Ft[1].FootBallers[i]:=FBP[31];
                        end;
                        case i of
                        1..11:begin
                                   Ft[1].TiredNess:=Ft[1].TiredNess+Ft[1].FootBallers[i].Tiredness;
                                   Ft[1].Mood:=Ft[1].Mood+Ft[1].FootBallers[i].Mood;
                              end;
                        end;
                   end;
              Ft[1].TiredNess:=Ft[1].Tiredness div 11;
              Ft[1].Mood:=Ft[1].Mood div 11;
              Match1.Ft[1].StadiumTeam.Name:='им. Лобановского';
              Match1.Ft[1].StadiumTeam.Seats:=25000;
              Match1.Ft[1].StadiumTeam.State:=Ukraine;
              Match1.Ft[1].StadiumTeam.Name:='Сан Сиро';
              Match1.Ft[1].StadiumTeam.Seats:=50000;
              Match1.Ft[1].StadiumTeam.State:=Italy;
              Ft[2].Name:='АС Милан';
               Ft[2].State:=Italy;
               Ft[2].Mark:=93;
               for i:=1 to 30 do
                   begin
                        case i of
                        1..15:Ft[2].FootBallers[i]:=FBP[i+15];
                        16..30:Ft[2].FootBallers[i]:=FBP[31];
                        end;
                        case i of
                        1..11:begin
                                   Ft[2].TiredNess:=Ft[2].TiredNess+Ft[2].FootBallers[i+15].Tiredness;
                                   Ft[2].Mood:=Ft[2].Mood+Ft[2].FootBallers[i+15].Mood;
                              end;
                        end;
                   end;
              Ft[2].TiredNess:=Ft[2].Tiredness div 11;
              Ft[2].Mood:=Ft[2].Mood div 11;
              OnLooker:=random(Stadium.Seats);
              Score[1]:=0;
              Score[2]:=0;
              HalfEnd:=2;
              GetDate(Date.Year,Date.Month,Date.Date,i);
              FileCom:='M1.txt';
          end;
     ClrScr;
     EmulMatch(Match1);
end.



