{ CARS2 (2005) — text-mode: two * stars fall inside the Box frame while the
  ▲ car dodges along the bottom with ← →.
  Original: /Users/yarik/games/ANIMGAME/CARS/CARS2.PAS.

  The diff against the original, in full:
  - the program body moved into `procedure Main; async;` + `await(Main)`;
  - `await(...)` around delay (JS cannot block) — this is also the frame
    pacing, exactly as in the original polling loop (InKey is non-blocking by
    design there, so no extra yield is needed).
  Everything else — including the InKey helper and t_graph — compiles as
  written in 2005, with ONE deliberate exception, reported as a bug from the
  lab (23.07.2026) and fixed rather than preserved:

  - `if y2=24` → `if y2>=24` (star 2's reset).

  The 2005 logic loses the equality. When star 1 wraps, its reset block runs
  `y2:=y1` BEFORE `y1:=1`, so y2 becomes 24. The next time `y1>3` opens the
  star-2 block, that block draws at row 24 and then `inc(y2)` lands on 25 —
  the `=24` test never fires again and y2 climbs forever. From then on every
  frame calls gotoxy with a row past the screen; Turbo Pascal ignored
  out-of-range coordinates (crt.pas reproduces that faithfully and must keep
  doing so), so the two writes per frame land wherever the cursor happened to
  stop — after the car, at row 24. They march across the line, wrap, and
  scroll the frame, which is what put loose '*' below the box on black and
  filled the field with columns of stars.

  `>=` restores the intended wrap. It is a change to the original source, so
  it is called out here rather than hidden: bug-for-bug fidelity is the rule
  everywhere else in this folder, but a self-flooding screen is not a
  playable exhibit.

  ⚠️ ДРУГЕ СВІДОМЕ ВІДХИЛЕННЯ (13.08.2026). Ярик спитав: «чому в cars машини
  не зіштовхуються з перешкодами?» Відповідь — бо в джерелі 2005 року ЗІТКНЕНЬ
  НЕМАЄ ВЗАГАЛІ: цикл малює зірки, рухає машинку і крутиться `until ch=27`,
  жодної перевірки координат у ньому немає ніколи не було. (У CARS1 немає навіть
  перешкод — там сама лише машинка в рамці, і це вся програма.) Тобто це не
  регресія, а те, чого гра не вміла.
  Додано мінімальну перевірку: якщо зірка опинилась у 24-му рядку — тому
  самому, де їде машинка — і в тій самій колонці, це зіткнення, і партія
  закінчується. Перевірка стоїть у місці, де зірку МАЛЮЮТЬ, бо блоки скидання
  нижче одразу переставляють x1/x2, і після них порівнювати вже нема з чим.
  Одна деталь чесності: cx у цей момент — позиція машинки з ПОПЕРЕДНЬОГО
  кадру, тобто зірка влучає туди, де машинка щойно була; на ~5 к/с це
  непомітно і радше на користь гравцеві. }
program cars2;
uses t_graph,crt,nls;
var x1,hy,hx,i,y1,x2,y2,cx,cy:byte;
    ch:byte;
    hit:boolean;
const duration=5000;

function InKey:char;
begin
     if keypressed then
             InKey:=Readkey;
end;

procedure Main; async;
begin
textbackground(0);
ClrScr;
Box(20,1,60,24,15,10);
textcolor(4);
randomize;
y1:=1;
y2:=1;
cx:=40;
hit:=false;
x1:=random(40)+20;
x2:=random(40)+20;
repeat
         inc(y1);
         randomize;
         textbackground(10);
         textcolor(0);
         gotoxy(x1,y1-1);
         write(' ');
         gotoxy(x1,y1);
         write('*');
         if (y1=24) and (x1=cx) then hit:=true;
         if y1=24 then
         begin
         gotoxy(x1,24);
         write(' ');
         gotoxy(x2,y2-1);
         write(' ');
         y2:=y1;
         y1:=1;
         x1:=x2;
         x2:=random(40)+20;
         end;
         if y1>3 then begin
         gotoxy(x2,y2-1);
         write(' ');
         gotoxy(x2,y2);
         write('*');
         if (y2=24) and (x2=cx) then hit:=true;
         inc(y2);
         if y2>=24 then   { was `=24` — see the 2005-bug note in the header }
         begin
         y2:=1;
         gotoxy(x2,24);
         write(' ');
         x2:=x1;
         end;
         end;
         ch:=ord(inkey);
         if (ch=75) or (ch=77) then
         begin
         gotoxy(cx,24);
         write(' ');
         case ch of
         75:cx:=cx-1;
         77:cx:=cx+1;
         end;
         end;
         if cx=20 then cx:=21;
         if cx=60 then cx:=59;
         gotoxy(cx,24);
         textcolor(0);
         write(#30);
         textcolor(green);
         await(delay(duration));
         if y2=24 then x2:=random(40)+20;
until (ch=27) or hit;
if hit then
   begin
        textbackground(0);
        textcolor(white);
        gotoxy(26,12);
        write(Loc('*** CRASH ***','*** АВАРІЯ ***'));
        gotoxy(24,13);
        write(Loc('any key to leave','будь-яка клавіша — вихід'));
        textcolor(green);
        await(WaitKey);
   end;
end;

begin
Main;
end.
