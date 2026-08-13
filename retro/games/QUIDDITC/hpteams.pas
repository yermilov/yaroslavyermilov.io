{ hpteams — пресет команд Гоґвортсу для обох квідичних портів.

  ЧОМУ ЦЕ ОКРЕМИЙ ЮНІТ, А НЕ КОПІПАСТА В ДВІ ГРИ: SNITCH і RANDOM — це той
  самий матч-симулятор, у якого RANDOM просто без гравця (17 різних рядків зі
  ~140), і обидва починались з ланцюжка readln. Ярик 13.08.2026: «Можемо ще
  зробити в квідічі пресет із 3-4 команд як в футболі зроблено щоб не вводити
  самому? щоб команди були із всесвіту Гаррі Поттера». Пресет однаковий для
  обох, тож він живе тут; build.ts компілює кожен порт з -Fu на теку гри, тому
  цей юніт видно і SNITCH.pas, і RANDOM.pas без жодних змін у збірці.

  Меню зроблено за зразком футбольного (ChooseTeam у MATCH.pas): та сама
  рамка-заголовок, той самий підсвічений рядок, ті самі клавіші — вгору/вниз +
  Enter або цифра. Друга команда не може збігтися з першою: її рядок гасне і
  стрілки його перестрибують.

  ⚠️ РЯДОК «свої назви» ЗАЛИШЕНО НАВМИСНО. Прохання було «щоб не вводити
  самому», а не «щоб не можна було вводити»: у футболі ручного вводу ніколи й
  не було (там фіксований довідник команд), а тут він БУВ від 2008 року і є
  єдиним способом зіграти, скажімо, Ірландія — Болгарія з фіналу Кубка світу.
  Пресет робить швидкий шлях типовим, а не єдиним. HpPick=0 означає саме його,
  і гра тоді питає все, як питала раніше.

  Числа. Реакція ловця (r) — це поріг у `abs(q-n)<=r`, де q і n рівномірні на
  0..30000, тобто ЙМОВІРНІСТЬ упіймати снитч за один оберт циклу; влучність (h,
  лише в RANDOM) так само керує голами. Дефолт гри 2008-го — 300, тож 300
  лишається серединою шкали, а не мінімумом: Гаррі 420 (у каноні він ловить
  снитч у більшості матчів, і в першому ж — ротом), Седрик 360 (єдиний, хто
  обіграв Гаррі чесно), Чо 320, Драко 260 (ловить лише коли Гаррі зайнятий).
  Влучність — навпаки за складом мисливців: Ґрифіндор 520, Гафелпаф 430. }
unit hpteams;

interface

uses crt, nls;

const
  { Чотири гуртожитки. 3-4 і просив Ярик — узято 4, бо саме стільки їх у
    каноні, і будь-яка трійця виглядала б як довільно викинутий гуртожиток. }
  HpCount = 4;
  { Псевдо-індекс «свої назви»: HpPick=0 після ChooseHpTeam. }
  HpCustom = 0;

var
  { Результат ChooseHpTeam: 1..HpCount або HpCustom. }
  HpPick: byte;

function HpName(k: byte): string;
function HpSeeker(k: byte): string;
function HpReaction(k: byte): word;
function HpAccuracy(k: byte): word;

{ Рамка-заголовок гри. subtitle — рядок під назвою. }
procedure HpHeader(const subtitle: string);
{ Вибір однієї команди; exclude=0 для першої. Результат — у HpPick. }
procedure ChooseHpTeam(const heading: string; exclude: byte); async;

implementation

const
  BoxL = 11;
  BoxW = 60;
  RowOf = 8;

{ Рядки віддаються case-функціями, а не типізованими константами-масивами:
  у pas2js масив рядків у const — це та сама пастка, через яку в EMATCH
  `Monthes` теж став case-функцією. }
function HpName(k: byte): string;
begin
  case k of
    1: HpName := Loc('Gryffindor', 'Ґрифіндор');
    2: HpName := Loc('Slytherin', 'Слизерин');
    3: HpName := Loc('Ravenclaw', 'Рейвенклов');
    4: HpName := Loc('Hufflepuff', 'Гафелпаф');
  else
    HpName := '';
  end;
end;

function HpSeeker(k: byte): string;
begin
  case k of
    1: HpSeeker := Loc('Harry Potter', 'Гаррі Поттер');
    2: HpSeeker := Loc('Draco Malfoy', 'Драко Мелфой');
    3: HpSeeker := Loc('Cho Chang', 'Чо Чанґ');
    4: HpSeeker := Loc('Cedric Diggory', 'Седрик Діґорі');
  else
    HpSeeker := '';
  end;
end;

function HpReaction(k: byte): word;
begin
  case k of
    1: HpReaction := 420;
    2: HpReaction := 260;
    3: HpReaction := 320;
    4: HpReaction := 360;
  else
    HpReaction := 300;
  end;
end;

function HpAccuracy(k: byte): word;
begin
  case k of
    1: HpAccuracy := 520;
    2: HpAccuracy := 480;
    3: HpAccuracy := 460;
    4: HpAccuracy := 430;
  else
    HpAccuracy := 500;
  end;
end;

function Fit(const src: string; n: byte): string;
var r: string;
begin
  r := src;
  while Length(r) < n do r := r + ' ';
  if Length(r) > n then r := Copy(r, 1, n);
  Fit := r;
end;

procedure Rule(row: byte; const l, mid, r: string);
var k: byte;
begin
  GotoXY(BoxL, row);
  Write(l);
  for k := 1 to BoxW - 2 do Write(mid);
  Write(r);
end;

{ ⚠️ Обрізаємо по ширині рамки. Футбольний Centre цього не робить, бо там
  підзаголовок підібраний під 58 колонок вручну; тут довший рядок ПЕРШОЮ Ж
  спробою виліз за обидві межі рамки (Length > BoxW-2 дає від'ємний відступ). }
procedure Centre(row: byte; const s1: string);
var s2: string;
begin
  s2 := s1;
  if Length(s2) > BoxW - 2 then s2 := Copy(s2, 1, BoxW - 2);
  GotoXY(BoxL + 1 + (BoxW - 2 - Length(s2)) div 2, row);
  Write(s2);
end;

procedure HpHeader(const subtitle: string);
begin
  TextBackground(Black);
  TextColor(LightGray);
  ClrScr;
  TextColor(Cyan);
  Rule(2, '┌', '─', '┐');
  GotoXY(BoxL, 3); Write('│'); GotoXY(BoxL + BoxW - 1, 3); Write('│');
  GotoXY(BoxL, 4); Write('│'); GotoXY(BoxL + BoxW - 1, 4); Write('│');
  Rule(5, '└', '─', '┘');
  TextColor(Yellow);
  Centre(3, 'Q U I D D I T C H');
  TextColor(DarkGray);
  Centre(4, subtitle);
  TextColor(LightGray);
end;

{ Один рядок меню. k=HpCount+1 — це «свої назви», його не можна зайняти. }
procedure TeamRow(k: byte; current, taken: boolean);
var a, body, rs: string;
begin
  str(k, a);
  str(HpReaction(k), rs);
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
  GotoXY(BoxL + 1, RowOf + k);
  if k > HpCount then
    body := Loc('own names (type them yourself)', 'свої назви (ввести самому)')
  else
    body := Fit(HpName(k), 14) + Fit(HpSeeker(k), 18) +
            Loc('reaction ', 'реакція ') + rs;
  Write(Fit(' ' + a + '  ' + body, BoxW - 2));
  TextBackground(Black);
  TextColor(LightGray);
end;

procedure ChooseHpTeam(const heading: string; exclude: byte); async;
var cur, k, last: byte;
    code: integer;
begin
  last := HpCount + 1;
  cur := 1;
  if cur = exclude then cur := 2;
  TextBackground(Black);
  TextColor(White);
  GotoXY(BoxL + 1, 7);
  Write(Fit(heading, BoxW - 2));
  TextColor(DarkGray);
  GotoXY(BoxL + 1, RowOf + last + 2);
  Write(Fit(Loc('up/down + Enter, or press 1-5',
                'вгору/вниз + Enter, або цифра 1-5'), BoxW - 2));
  TextColor(LightGray);
  code := 0;
  { Стрілки #0/#72/#80 приходять двома викликами ReadKey — це DOS-протокол
    розширених клавіш, який шим відтворює навмисно (див. crt.pas). }
  repeat
    for k := 1 to last do TeamRow(k, k = cur, k = exclude);
    code := trunc(await(double, ReadKeyA));
    if code = 0 then
      begin
        code := trunc(await(double, ReadKeyA));
        if code = 72 then
          repeat
            if cur = 1 then cur := last else dec(cur);
          until cur <> exclude;
        if code = 80 then
          repeat
            if cur = last then cur := 1 else inc(cur);
          until cur <> exclude;
        code := 0;
      end
    else if (code >= 49) and (code <= 48 + last) then
      begin
        { Цифра — це і переміщення, і підтвердження, як у футболі. Зайняту
          команду вона не бере, лише лишає рядок згаслим. }
        if (code - 48) <> exclude then
          begin
            cur := code - 48;
            code := 13;
          end
        else code := 0;
      end;
  until code = 13;
  for k := 1 to last do TeamRow(k, false, (k = exclude) or (k = cur));
  if cur > HpCount then HpPick := HpCustom else HpPick := cur;
end;

end.
