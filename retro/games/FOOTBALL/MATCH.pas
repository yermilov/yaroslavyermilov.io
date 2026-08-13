{ MATCH (2005–2009) — футбольний симулятор, найбільш дата-повний проєкт
  колекції: 105 гравців, 7 команд (Dynamo, Milan, Arsenal, Niva, MU, Shahtar,
  Shpors), 7 стадіонів, 3 країни — все у власному текстовому форматі
  (FBP/FBT/STD/STT), який зберігся й вантажиться тут байт-у-байт.
  Original: /Users/yarik/games/FOOTBALL/MATCH.PAS.

  ЦСКА ВИЛУЧЕНО З РОСТЕРУ (08.08.2026, на прохання Yarik: "remove cska russia
  from roster completely"). Це єдине місце, де дані порту відходять від
  оригінального набору. Вилучення виявилось чистим зрізом хвоста нумерації, без
  жодного перенумерування: ЦСКА був командою №8 (остання), його стадіон —
  №8 (останній), його країна «Росія» — №4 (остання й ніким більше не вживана:
  решта клубів сидять у країнах 1-3), а його склад — гравці 106..120 (останній
  блок; жоден інший .fbt на них не посилається). Тому знято рівно чотири
  константи нижче (t/p/s/c) і 36 файлів даних (по 18 на кожну мову), і жоден
  індекс, що лишився, не зсунувся. Оригінальний набір даних у ~/games/FOOTBALL
  не чіпано — F3-переглядач і далі показує музейний експонат повністю.

  Двигун симуляції — unit EMatch. Оригінальний EMATCH.PAS у папці FOOTBALL
  автор покинув посеред рефакторингу (нуль `inc(Score)`, нуль `inc(MinNow)` —
  матч закінчувався 0:0 миттєво); справжній робочий двигун знайшовся за
  вмістом, а не за іменем, у ~/games/_інше/UNITS/EM.PAS — саме він і портований
  (голи, картки, коментар). Ця преамбула раніше стверджувала «чесний фінал
  завжди 0:0» — це вже неправда з 28.07.2026.

  The diff against the original, in full:
  - uses + JS, tpfiles (файлові операції через шим: readln(f,s)→ReadlnT,
    readln(f,n)→ReadLnNum, read(f,n)→ReadNum, close→Close);
  - програма стала async (Main + await);
  - ЗАСТАВКА ПЕРЕПИСАНА (05.08.2026, на прохання Yarik: "intro screen for
    football is completely not user friendly can we re-do it so it is more
    intuitive?"). Що було: 141 рядок `N завантажено`, який прокручував увесь
    80×25 екран, потім два сліпі текстові промпти без жодного списку — ввід мав
    ТОЧНО збігтися з латинським кодом команди ('Dynamo'), а не з тим іменем, що
    гра показує ('Динамо Київ'); будь-яка помилка друкувала DOS-івську довідку
    `match {team1} {team2}` і робила halt, тобто гру треба було перезапускати.
    Що стало: рамка з назвою, чотири прогрес-смуги замість 141 рядка, і меню
    вибору команди — t рядків «код · назва · країна» (нині 7), стрілки/Enter
    або цифра 1-7, друга команда не може збігтися з першою (рядок гасне).
    Невалідного вводу більше не існує, тож і halt-гілка зникла разом із ним.
    Уся геометрія меню тримається на константі t, тож зміна ростеру її не
    ламає: рядки RowOf+1..RowOf+t, підказка на RowOf+t+2, перевірка цифри
    code<=48+t, і обидва обходи стрілками перестрибують зайняту команду.
    Це єдине місце, де порт свідомо відходить від оригіналу далі, ніж
    async/await: у DOS команди приходили з paramstr(1)/paramstr(2), у браузера
    argv немає, і промпти-заміна успадкували від командного рядка найгірше —
    треба було знати відповідь наперед.
  - `readln;` на екрані підказки → очікування Enter через ReadKeyA;
  - GetDate у поля-піддіапазони DateType — через проміжні word-змінні
    (pas2js суворіший за TP щодо var-параметрів);
  - все інше — 1:1. }
program Match;
uses JS, EMatch, Dos, Crt, tpfiles, nls;

const t=7;
      p=105;
      s=7;
      c=3;
      TeamsName : array [1..t] of string = ('Dynamo', 'Milan', 'Arsenal', 'Niva', 'MU', 'Shahtar', 'Shpors');
      { Рамка заставки: колонки BoxL..BoxL+BoxW-1 у 80-колонковому екрані. }
      BoxL=11;
      BoxW=60;
      { Рядок меню для команди i. }
      RowOf=8;
var Teams : array [1..t] of footballteam;
    Players : array [0..p] of footballer;
    Stadiums : array [1..s] of stadiumtype;
    Countries : array [1..c] of statetype;
    i,j:byte;
    st:string;
    Team1,Team2:footballteam;
    f:Text;
    m:word;
    NowMatch:MatchType;
    dy,dm,dd,dw:word;
    Pick,home:byte;

{ ── заставка ─────────────────────────────────────────────────────────────
  Малюється звичайним crt-шимом: GotoXY/TextColor/TextBackground у текстовому
  режимі 80×25. Смуга прогресу — це ПРОБІЛИ з різним тлом, а не символи
  псевдографіки: HandleWrite фарбує клітинку тлом завжди, а гліф ' ' не
  малюється взагалі, тож смуга не залежить від того, чи є в шрифті █. }

function Fit(const src:string; n:byte):string;
var r:string;
begin
     r:=src;
     while Length(r)<n do r:=r+' ';
     if Length(r)>n then r:=Copy(r,1,n);
     Fit:=r;
end;

procedure Rule(row:byte; const l,mid,r:string);
var k:byte;
begin
     GotoXY(BoxL,row);
     Write(l);
     for k:=1 to BoxW-2 do Write(mid);
     Write(r);
end;

procedure Centre(row:byte; const s1:string);
begin
     GotoXY(BoxL+1+(BoxW-2-Length(s1)) div 2,row);
     Write(s1);
end;

procedure Header;
begin
     TextBackground(Black);
     TextColor(LightGray);
     ClrScr;
     TextColor(Cyan);
     Rule(2,'┌','─','┐');
     GotoXY(BoxL,3); Write('│'); GotoXY(BoxL+BoxW-1,3); Write('│');
     GotoXY(BoxL,4); Write('│'); GotoXY(BoxL+BoxW-1,4); Write('│');
     Rule(5,'└','─','┘');
     TextColor(Yellow);
     Centre(3,'F O O T B A L L');
     TextColor(DarkGray);
     Centre(4,Loc('match simulator  ·  7 teams  ·  105 players',
                  'симулятор матчу  ·  7 команд  ·  105 гравців'));
     TextColor(LightGray);
end;

{ Одна смуга: підпис (16), 24 клітинки прогресу, лічильник. }
procedure Progress(row:byte; const caption:string; done,total:integer);
var k,fill:integer;
    a,b:string;
begin
     TextBackground(Black);
     TextColor(LightGray);
     GotoXY(BoxL+1,row);
     Write(Fit(caption,16));
     fill:=0;
     if total>0 then fill:=(done*24) div total;
     for k:=1 to 24 do
         begin
              if k<=fill then TextBackground(Green) else TextBackground(DarkGray);
              Write(' ');
         end;
     TextBackground(Black);
     TextColor(White);
     str(done,a);
     str(total,b);
     Write(' '+Fit(a+'/'+b,9));
     TextColor(LightGray);
end;

{ Рядок меню команд: код (як його очікував DOS-виклик), показова назва, країна.
  taken — команда вже зайнята першим вибором: гасне і пропускається. }
procedure TeamRow(k:byte; current,taken:boolean);
var a:string;
begin
     str(k,a);
     if current then
        begin
             TextBackground(Blue);
             TextColor(Yellow);
        end
     else
        begin
             TextBackground(Black);
             if taken then TextColor(DarkGray) else TextColor(LightGray);
        end;
     GotoXY(BoxL+1,RowOf+k);
     Write(Fit(' '+a+'  '+Fit(TeamsName[k],10)+Fit(Teams[k].Name,20)+Teams[k].State.Name,BoxW-2));
     TextBackground(Black);
     TextColor(LightGray);
end;

{ Вибір однієї команди. Результат — у Pick. exclude=0 для першої команди.
  Стрілки #0/#72/#80 приходять двома викликами ReadKey — це DOS-протокол
  розширених клавіш, який шим відтворює навмисно (див. crt.pas). }
procedure ChooseTeam(const heading:string; exclude:byte); async;
var cur,k:byte;
    code:integer;
begin
     cur:=1;
     if cur=exclude then cur:=2;
     TextBackground(Black);
     TextColor(White);
     GotoXY(BoxL+1,7);
     Write(Fit(heading,BoxW-2));
     TextColor(DarkGray);
     GotoXY(BoxL+1,RowOf+t+2);
     Write(Fit(Loc('up/down + Enter, or press 1-7',
                   'вгору/вниз + Enter, або цифра 1-7'),BoxW-2));
     TextColor(LightGray);
     code:=0;
     repeat
        for k:=1 to t do TeamRow(k,k=cur,k=exclude);
        code:=trunc(await(double, ReadKeyA));
        if code=0 then
           begin
                code:=trunc(await(double, ReadKeyA));
                if code=72 then
                   repeat
                      if cur=1 then cur:=t else dec(cur);
                   until cur<>exclude;
                if code=80 then
                   repeat
                      if cur=t then cur:=1 else inc(cur);
                   until cur<>exclude;
                code:=0;
           end
        else if (code>=49) and (code<=48+t) then
           begin
                { Цифра — це і переміщення, і підтвердження: класичне DOS-меню.
                  Зайняту команду вона не бере, лише блимає рядком. }
                if (code-48)<>exclude then
                   begin
                        cur:=code-48;
                        code:=13;
                   end
                else code:=0;
           end;
     until code=13;
     for k:=1 to t do TeamRow(k,false,(k=exclude) or (k=cur));
     Pick:=cur;
end;

procedure Main; async;
begin
     randomize;
     Header;
     Progress(7,Loc('Countries','Країни'),0,c);
     Progress(9,Loc('Stadiums','Стадіони'),0,s);
     Progress(11,Loc('Players','Гравці'),0,p+1);
     Progress(13,Loc('Teams','Команди'),0,t);
     for i:=1 to c do
         begin
              str(i,st);
              Assign(f,'STT\'+st+'.stt');
              Reset(f);
              ReadlnT(f,Countries[i].Name);
              Close(f);
              Progress(7,Loc('Countries','Країни'),i,c);
         end;
     await(FrameDelay(120));
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
              Progress(9,Loc('Stadiums','Стадіони'),i,s);
         end;
     await(FrameDelay(120));
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
              Progress(11,Loc('Players','Гравці'),i+1,p+1);
         end;
     await(FrameDelay(120));
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
              Progress(13,Loc('Teams','Команди'),i,t);
         end;
     await(FrameDelay(260));

     { Вибір команд. Той самий Header перемальовує екран, тож смуги прогресу
       зникають і меню займає їхнє місце. }
     Header;
     await(ChooseTeam(Loc('Home team','Господарі поля'),0));
     home:=Pick;
     Team1:=Teams[home];
     await(ChooseTeam(Loc('Away team','Гості'),home));
     Team2:=Teams[Pick];

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
     { Картка матчу замість голого `Writeln('Match start')` у випадковій позиції
       курсора: гравець бачить, ЩО саме він щойно обрав, перш ніж EMatch забере
       екран собі (перший же Comment робить ClrScr). Пауза — FrameDelay, тобто
       реальні мілісекунди: інакше DelayScale розтягнув би її разом з усім. }
     Header;
     TextColor(White);
     Centre(8,Team1.Name+'   —   '+Team2.Name);
     TextColor(LightGray);
     Centre(10,NowMatch.Stadium.Name+'  ·  '+NowMatch.Stadium.State.Name);
     str(NowMatch.OnLooker,st);
     Centre(11,st+Loc(' spectators',' глядачів'));
     TextColor(Green);
     Centre(13,Loc('Kick-off','Початок матчу'));
     TextColor(LightGray);
     await(FrameDelay(1400));
     await(EmulMatch(NowMatch));
end;

begin
{ РЕМОНТ: ФУТБОЛ ПОВІЛЬНІШИЙ ЗА РЕШТУ — власний пін, не глобальна ручка.
  10.08.2026 Ярик попросив адресно: «треба зробити футбол ще на 50% повільнішим»
  (320 -> 480). 11.08.2026, зігравши цю збірку: «все одно занадто швидко, зроби
  ще на 50% повільніше» — тож 480 -> 720. Прохання не назвало гру, але це пряме
  продовження футбольної гілки: попереднє прохання, звіт і скріншот усі про
  футбол, тож «все одно» стосується саме того, що змінили останнім.
  13.08.2026, зігравши й ЦЮ збірку: «тепер давай зробимо футбол ще на 50%
  повільніше, а пінпонг — на 50% швидше» — тепер гру названо прямо, тож 720 ->
  1080. Це ЧЕТВЕРТИЙ оберт цієї ручки, і попередня сесія його передбачила саме
  тут («підняти його втретє можна без шкоди» — див. нижче про відсутність стелі).
  Друга половина того ж речення поїхала у власний пін PINGPONG.pas — вона про
  іншу гру й у протилежний бік, тож у спільній ручці її бути не може.
  Глобальні crt.MinDelayMs=320 / crt.DelayScale=0.064 обслуговують сім інших
  бандлів, і крутити їх заради однієї гри не можна — тим паче що для кадрових
  ігор (PINGPONG, обидві CARS) 320 мс це вже 3.1 к/с, тобто слайдшоу, і подальше
  сповільнення там ламає гру. Тому та сама механіка, що в WARWORK: у crt це
  типізовані константи (var), а Delay читає їх ПРИ КОЖНОМУ виклику, тож
  присвоєння тут перекриває глобальні числа рівно для цього бандла.

  Чому саме ці числа: кожне очікування — max(round(ms*DelayScale), MinDelayMs).
  УСІ Delay футболу малі — коментар 750..1000 мс (EMatch.Comment, dur 0.75..1),
  склади 1500, дрібні паузи 1000 і 2000 — тож навіть при 0.216 вони дають
  162..432 мс і всі до одного лягають НА ПІДЛОГУ. Отже темп футболу — це рівно
  MinDelayMs, і +50% це 720 -> 1080 мс. DelayScale множимо на ті самі 1.5 для
  повноти піна: за теперішніх викликів він інертний (2000*0.216 = 432 < 1080), але
  якщо колись з'явиться довга пауза, вона поїде разом з рештою.

  ⚠️ ЦЕ ТЕКСТОВА ГРА, І САМЕ ТОМУ СТЕЛІ ТУТ НЕМАЄ. Футбол не малює кадри — він
  друкує рядки коментаря, які читають очима, тож MinDelayMs тут це «скільки
  висить рядок», а не «як рідко перемальовується поле». Підняти його вчетверте
  можна без шкоди для гри; для PINGPONG/CARS такий самий крок був би фатальним.
  Межа тут не технічна, а читацька: 1080 мс — це вже приблизно стільки, скільки
  рядок коментаря читають, тож наступний оберт варто робити, лише якщо Ярик
  скаже це п'ятий раз — і тоді чесніше питати, чи не хоче він паузи МІЖ подіями,
  а не довший показ кожного рядка.

  Заставки це НЕ стосується: вона тримається на FrameDelay (реальні мілісекунди
  повз обидві ручки) — очікування перед стартовим свистком лишається 1.4 с. }
DelayScale := 0.216;
MinDelayMs := 1080;
Main;
end.
