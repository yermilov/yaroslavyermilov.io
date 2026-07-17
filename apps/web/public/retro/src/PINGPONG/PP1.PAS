program PingPong0;
uses crt,graph,mouse,dos;
type coordinates = record
     x,y:integer;
     end;
     block = record
     color,nx,ny,sort:byte;
     x,y,balls:integer;
     here:boolean;
     end;
const pi180 = pi/180;
      HeroY = 400;
      by=7;
      bx=8;
      Colors: array [0..15] of string =
              ('Чёрный','Синий','Зелёный','Бирюзовый','Красный','Розовый',
              'Коричневый','Светло-серый','Тёмно-серый','Светло-синий',
              'Светло-зелёный','Светло-бирюзовый','Светло-красный',
              'Светло-розовый','Желтый','Белый');

var ball,fly,ud:coordinates;
    alfa,c,HeroX:integer;
    right,left:boolean;
    n0:byte;
    ng,nv:shortint;
    key:char;
    radian:real;
    ColorBall,ColorHero,ColorFon,ColorMenuFon,ColorButton,ColorGameMenu,
    ColorMenuText,ColorGameText,ColorClock,ColorSelect:byte;
    BallSpeed,HeroSpeed,HeroB,Duration:integer;
    Score:longint;
    FirstTime,NowTime,Time:longint;
    Lives : 1..3;
    Level:Integer;
    blocks:array [1..by, 1..bx] of block;

    function InKey:char;
    begin
         If Keypressed then Inkey:=Readkey;
    end;

    procedure Clean(x1,y1,x2,y2:integer;Color:byte);
    var i,j:integer;
    begin
         for i:=x1 to x2 do
             for j:=y1 to y2 do
                 PutPixel(i,j,Color);
    end;

    procedure MakeBall(x,y:integer; radius,color:byte);
{Рисует мяч с координатами центра (x;y) радиусом radius и цветом color}
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Circle(x,y,radius);
         FloodFill(x,y,color);
    end;

    procedure MakeHero(color:byte);
{Рисует доску цветом color и с координатами левого верхнего края (HerroX;425}
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Bar(HeroX,HeroY,HeroX+HeroB,HeroY+15);
    end;

    function udar:boolean;
{Проверяет был ли удар со стенкой и доской. Результаты:
 *true* - удар состоялся; *false* - удара не было}
    var x:shortint;
        s:string;
        flag:boolean;
    begin
         Udar:=false;
         if ball.x<=7 then {Left}
            begin
                 Udar:=true;
                 ng:=1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.x:=8;
            end;
         if ball.x>=633 then {Right}
            begin
                 Udar:=true;
                 ng:=-1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.x:=632;
            end;
         if ball.y<=7 then   {Up}
            begin
                 Udar:=true;
                 nv:=1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.y:=11;
            end;
         if ball.y>=heroy+10 then {Down}
            begin
                 Udar:=true;
                 nv:=-1;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 ball.y:=heroy+9;
                 Dec(Lives);
                 Clean(105,435,125,480,ColorGameMenu);
            end;
 {Doska} if (abs(ball.y-heroy)<=5) and (ball.x>=herox) and (ball.x<=herox+Herob) then
            begin
                 Udar:=true;
                 MakeBall(ball.x,ball.y,5,ColorFon);
                 nv:=-1;
                 ball.y:=Heroy-6;
                 If Left then
                    if ng=1 then alfa:=alfa+5
                            else alfa:=alfa-5;
                 If Right then
                    if ng=-1 then alfa:=alfa+5
                             else alfa:=alfa-5;
            end;
    end;

    procedure GameText;
    var s:string;
        h,m,sec,d:word;
        i,j:integer;
    begin
         SetColor(ColorGameText);
         SetTextStyle(7,HorizDir,3);
         OutTextXy(10,435,'Lives - ');
         Str(lives,s);
         OutTextXy(105,435,s);
         OutTextXy(125,435,'Level -');
         Str(level,s);
         OutTextXy(220,435,s);
         OutTextXy(240,435,'Score -');
         str(score,s);
         OutTextXy(335,435,s);
         OutTextXy(450,435,'Time -');
         GetTime(h,m,sec,d);
         NowTime:=sec+m*60+h*3600;
         if NowTime-FirstTime>Time then
            begin
                 Time:=NowTime-FirstTime;
                 str(NowTime-FirstTime,s);
                 Clean(550,435,640,460,ColorGameMenu);
                 OutTextXy(550,435,s);
            end;
    end;

    procedure InitBlocks;
    var i,j:byte;
    begin
         for i:=1 to by do
             for j:=1 to bx do
                 with blocks[i,j] do
                  begin
                      sort:=random(14)+1;
                      case sort of
                      1:color:=0;
                      2:color:=4;
                      3:color:=5;
                      4:color:=12;
                      5:color:=13;
                      6:color:=6;
                      7:color:=7;
                      8:color:=1;
                      9:color:=2;
                      10:color:=9;
                      11:color:=10;
                      12:color:=14;
                      13:color:=15;
                      end;
                      case sort of
                      1..10:balls:=sort*100;
                      11:balls:=1500;
                      12:balls:=2500;
                      13:balls:=5000;
                      end;
                      if i=1 then here:=true
                             else here:=false;
                      nx:=j;
                      ny:=i;
                      x:=(j-1)*80;
                      y:=(i-1)*20;
                  end;
    end;

    procedure MakeBlocks;
    var i,j:byte;
    begin
         SetColor(ColorFon);
         SetFillStyle(1,ColorFon);
         Bar(0,0,640,300);
         for i:=1 to by do
             for j:=1 to bx do
                 with blocks[i,j] do
                 if here then
                   begin
                      SetColor(15);
                      SetFillStyle(1,Color);
                      Rectangle(x,y,x+79,y+19);
                      FloodFill(x+1,y+1,15);
                   end;
    end;

    function BlockUdar:boolean;
    var i,j:byte;
        u:boolean;
    begin
         u:=false;
         for i:=1 to by do
             for j:=1 to bx do
                      if blocks[i,j].here then
                         begin
                              if (Ball.x>blocks[i,j].x) and
                                 (Ball.x<blocks[i,j].x+78) and
                                 (abs(Ball.y-(blocks[i,j].y+19))<=10) then
                                       begin
                                            blocks[i,j].here:=false;
                                            score:=score+blocks[i,j].balls;
                                            SetColor(ColorFon);
                                            SetFillStyle(1,ColorFon);
                                            Rectangle(1,1,640,300);
                                            FloodFill(2,2,ColorFon);
                                            Clean(335,435,449,480,ColorGameMenu);
                                            nv:=1;
                                            MakeBall(ball.x,ball.y,5,ColorFon);
                                            Ball.y:=Blocks[i,j].y+11;
                                            u:=true;
                                       end;
                         end;
         BlockUdar:=u;
    end;

    procedure Game;
    var h,m,s,d:word;
{Процедура, отвечающая за основную игру}
    begin
         InitBlocks;
         SetColor(ColorFon);
         SetFillStyle(1,ColorFon);
         Bar(0,0,641,Heroy+25);
         SetColor(ColorGameMenu);
         SetFillStyle(1,ColorGameMenu);
         Bar(0,Heroy+26,641,481);
         Score:=0;
         Level:=1;
         HeroX:=100;
         nv:=-1;
         Lives:=3;
         alfa:=random(179)+1;
         if alfa>90 then begin alfa:=alfa-90; ng:=-1; end
                    else ng:=1;
         ball.x:=150;
         ball.y:=350;
         herox:=100;
         right:=false;
         left:=false;
         GetTime(h,m,s,d);
         FirstTime:=s+m*60+h*3600;
         repeat
               MakeBlocks;
               c:=1;
               MakeBall(ball.x,ball.y,5,0);
               if alfa>90 then begin alfa:=alfa-90; ng:=-ng; end;
               if alfa<1 then begin alfa:=180-alfa; nv:=-nv; end;
               ud.x:=ball.x;
               ud.y:=ball.y;
               repeat
                     MakeBall(ball.x,ball.y,5,ColorFon);
                     if BlockUdar then MakeBlocks;
                     radian:=pi180*alfa;
                     fly.y:=trunc(c*sin(radian));
                     fly.x:=trunc(c*cos(radian));
                     ball.x:=ud.x+fly.x*ng;
                     ball.y:=ud.y+fly.y*nv;
                     MakeBall(ball.x,ball.y,5,ColorBall);
                     c:=c+ballspeed;
                     key:=inkey;
                     case key of
                     #75:begin
                              Left:=true;
                              Right:=false;
                         end;
                     #77:begin
                              Right:=true;
                              Left:=false;
                         end;
                     'P','p':repeat until keypressed;
                     end;
                     MakeHero(ColorFon);
                     If Left then herox:=herox-herospeed;
                     if right then herox:=herox+herospeed;
                     If HeroX<=1 then HeroX:=1;
                     If HeroX>=640-herob then HeroX:=641-herob;
                     If (HeroX<=1) or (HeroX>=540) then
                        begin
                             Left:=false;
                             Right:=false;
                        end;
                     MakeHero(ColorHero);
                     delay(duration*2);
                     GameText;
               until (Udar) or (Key=#27) or (BlockUdar);
         until (key=#27) or (lives=0);
    end;

procedure Information;
var inffile:text;
    i:byte;
    str:string;
    gd,gm,ErrorCode:integer;
begin
     CloseGraph;
     TextBackGround(ColorMenuFon);
     ClrScr;
     TextColor(ColorMenuText);
     assign(inffile,'readme.hlp');
     reset(infFile);
     For i:=1 to 24 do
         begin
              readln(inffile,str);
              if i<>4 then Writeln(str)
                      else write(str);
         end;
     Write('Нажмите Esc для возврата в меню');
     repeat until Readkey=#27;
     &оy╛Bм!=B;╙Ъq(ъ[╜FR╟WГ:>╧5]сGмРГГ¤S╗"1▀H"┼>E╞ёOЯєЪ╔^■dЧяx#№з▌"╞Bm▀╚Ьo	WXnЦД°╪,ПгQъEе▀ (╗╜─?сь>ы№Ї╟┤■е.;о6УБu}║фй╢■°R└╞пЄs╖░ёХc"ПИl╣┤╦┤╖┌зYD#╒>cP8▓m(ИPu3╩=ЛЛЇ!J XVВцXnXиЧК*▒Сa╦в+^№ВlT╕кDд▓┴#╗▒! fРЪкY?g╝6j┼(aФjh┼№ёС&╒ЙКHlШ;8╫V`MфсОмЭ
ўЙ╡_Dи;└/2.└╞е╛t▀E═JGОДШЙ)Ъ¤ЁjЦ.Ъ┬rъ├n┐Лd╛L√"1╦цщў+ЮЄfIАЪуВ▒(·)i.░ЛS╢ЯЙ╥oЩ╔ЛЭRBdZиФK1ёЦ╤ъя~°■¤з $c;9╗m┘п╞▀j┤∙ьЁожшjР°├^MЖ╒0}2МV=Нъх▓
Q5EyЬeфЇЁ╘├6)ЛкдHР~:T╗°}3ё0лю╩х·Ц└╒№Е	%Wиlп.V\sM:H╡=│вc=hєт#I╟nАdWZЯkJu╪╜Х<╦жё╧е	t
д#ўtЕЄМ╧Z2ўм┐ХзzM_ozt6N5╧N▓йаКЩтС╝╞│ЬРI┼╘ЎтХў╖ў┘nекФUO&╥|J╨Г╕┘jЪYгУEв╘└б╣Аъ вV	C(Фш,EВёЭбD0атт╕f$ШН6%Ы$>Ынz│█║pyggiш9╤║╙╚I}~┌И4zЛ>э)hчСWеC░3Ьwч╔QдШ╧Vы╟┴∙ █ЙЧўvv││^╨Ю╘L}gФ¤ЗFхh~╣EM[╣РЪ5sTu├ьd┤qЫ-╩▌1lk~╓>;Ьg?Пg▐хМо_К^█╦nWrХtоVщ▓ЩTS│ЛkУ▌Э╩Л╧Fў7w_╣Э(SВ#!%f.╕Y┤╤╒g*QЄ╕╔I:▐НМgG┴уюфNs╘К─║6с╚n1╖_Эпo5J┴>iВ╜`Т ЫngЄрt╨" )╓'│я=ЪF/}s√╩нМf0╔Є■╠/єP'аGI╞ЩZ7i╡║╡Ы╟o╜ёўФ┌hHТхZцїg╫╛yг╢ЧCI╡WВ^Ч┘╞0·┘I■дўеZэK╖77/Uъй.¤╕фA╠Ш5┤мO╨щA&M╣╬┼ZЄте5ъ v/нW6r╘D!wж╤Ў<5┘╪╦с┘┐їs/ №Л╗┐r{э[╗k ъ┘g~¤Е▀╕~эЕэНїHcЇр■ тУ┐°ю∙▌f┤Б▄V╩Й│н:L╔┼e╘9Є╡┴YЩqе,ЯШ?нEфТ╘Ц3dй╢HB└Дb2м│W]L╦ы$┤╡эР╨С▀JЕ┴вGeХФB┌,╘╘ї▒fr|Ел2╙rnЛ╢QJ@%9╢kл│2ЦЎO°dHv╬L╗ЯК7P╪иE?xПqbЛ,хa╛l>mэъ╒╝╛7┘Жш[Ыш>мQ2)М╜─ЕеaPЪ├к}6ЛY&:┼·и▀жЭ#gB-#┌<yCУё▄Цц┬╙ХRх
╔ b╪┼м╧к2{уaW%Л╢ЩBLмсЙЎхpйdtЩIТ0┤У^{@Ц/~хЕxn<OБтC╝╔FHЬsC`8W"─┤{▐ДE&┤ГШAй▒дIbAcэ`а&|,\2jШ╤д3Mu
=;h░М16щjЧИ╪є,F°▒Иж■А╒┼01┴<f│r├▒R┼с╓_╬w
nf*Гя╛А2Э?]i╩╬ж║4▄¤░Х└фД7╕ЬлЫ█Ё▒1┬j╨е{c╧]7┴СPrЮ*╥Ў4Э.DЩ!LшНЇ°-▄B╠А2ьИ9ЪЄЗв?Ъ∙Н╞╢ЫXД╨l[aХ╒╛─ас─o╒XR^ю▒t╙ :║##эLЕЧS╚	zиЛ°%эщ*mТ6[нIФ╔F%eeyx┘╪RKZоY╡д#вaYJВК	;ыaн▌'ж╢╧╫в"3;T╚lФa#=б╚п╝╡ЕUo╡┘Ez═$фвщщ√░^э╣с^Ё▒~ЕVШ╪Г/Г=║сOl,Rqм&Фc Y ╨_jX}+ g└╘ўtc√Pзр╢Е(=y·┐ГBv░бdХa┘├У│їяBфаOW7Ї╡┌6°{-ЩCaЭс1√╚ b┴о'╠z█q№4д¤]V░нN╬╧4∙ъ П~нbсJб;l─з╚ї╩о%,М│s░dїЄTэГ,/fg%Ж┬yУ┌h|:Зыс╔Rц╨─╩Э,Я╟Чдя╓O.D█ж╬╫╗М╔╨m╒т√=[Иhч/td*e┐~▄ЮgёТSЫH>н╛RСZPої╫ мCm D■╘?├Е+u!(¤Yч8m!P╖$Пя~L}-уEе║P╕6╥"╗┤╨W?kЕ!Ф╗2╗└В╩]ЯKс'et╗╞ДW┌елвW*)┘ЕB▒TоKUЪу
╟А╔/6sVхH>_▌┘*фrp/p░kЫыд┘╓pп═╥8+ы█┤ U╧Ю▌╪	p▌е-О6цЯ$;xБN-QHoч│w▐{ў╧■№┐*Д]┼^zц8бфЙЭа ёe}5a┬ё╛ы>ЪW┘ щу╥Г╤╬6┘ТNBВ╓ЦTPИЖЕЮЦ┼ 2▓р·|▒л{х\Вgеlе╒Йrt▓e╝╠╪	Ж.CЎ\~°┐IhЭЛ-ЪмМ ИфЙN╙┤тH┼pб╓v БД№YїФ╒UКNЎp┴а?ьNЗЭ |мG(IУFGУ/╡║кiэ6ЛN╢bЪCKVЛжynn-Qиа<Лtэqз▀\Р┌▌╦dК╒щ·╩.╬│зшpHШSн▐iT-О╬ЖП╬·|├╡ЄРи@╥ГH╨GКv╣2Т╚тg╣2░F╟ЙOХТБ|в─S4pw╬FУ$dyA║?Я╡ЖЯ▌=:о╫УАxJ╧│Зїzwz:h╝[)$╟є╙╙╩p║╠#╗╣╬╔уУ?╛7°¤╖:;╧m=ў▀k_╝█г╝ф~М7э!k.JфО╬;?={ў▌У7ю┐█М╝ЧH┐9Л ╙yя╙Qч∙п▌^▀н╒Ўol<w+u¤Rятncн<┌.ч.lх*х,+ы╕szzФЧ╝р>aУДtS╫Дnc<шГЬ░яе╖EЗB╦	▌ГёNФgГj>╢ї╠v┤2эvжЯ}╪{°шЬ;ЗмiW")╚чwЛ│фNagcнRтЯ	3VИ #е:tucФ╞D√гВ~bХE╗u№├Я№ї$ш0,г┘ш┼╜Ї с█╫^оM╙A'=DВVпyYЮЩц:G¤t╖;5о\▀_▀Z-╬║C&+╬|╗OIHhа9BЖ^Н┼шеэ╥╦Ч╢Ю┘▀╜▓╣╛]АLП╫Кщ╡|d╖ЁтНэ_xцЄ/▐╝·ХKы╧gЩ╧юdяЮЦ;▌╪y╗JCХQ│y ф'▀yЇЎгy}@ЧьЩ╡tМв╡░ъa&)fpФDJнZ▐j╨─°J-н╢ ШеўЛj╗Нaлl═88&k╜╩┌мЯФ8:╔й┼ТaЧfЫ3O│8bb╘д0╢%С■╞╝V┼jJ√▒╥	ЫjYўWНЁмcВz ЛxсW╗2░╫P▒r╢░eИьЕ╦.б├╬й╢╦X{мзГ·░ЪE┐R┌Ъ}6ЫX╔▌pZj|у`еv╧r4zYк╦POў ╟╡╩ЬИЫCеFFЬ╣Вэ┬│ихk∙┬ОЁщX%╗▄0╘s╪f·тi┐qУ&'№ФЕТ┐wV╡├Vшl╕{	Сm╫&░Л-╢Ў╓о\_ж╜FзsУ║И1З╩ё■и╬А?ю#bwhу	АQЛЪ,`∙"QЕ\ш╠лoЩ╗sвЪ╜	¤Z=╝X°hВчP,╨_!)л\Е/ЧЙh╗▌"O4cc0ж║O3═╣@fRбэ┬╥д2yD▌MВ╘X6.е{{▒0U╪bиEH НmбgХ
5GK:°ЮB5n╔p█МЦ<°cQФzhЬPtО?лШ9%sНnМ╜ФхилЯ▒Жд31╧э|япЇ}Y9"У,ы╠┘фЦDfQо/j╥n█o▒NБЖ=ьЗТТZ╛┌:Х(uб╔в&|ЇMB'ВtJm№╘╡G3CЭ╥YIе¤Vз╞7{ХаЙb.Mэ√В╤Ё▓б╖▌LZj▀╪└-х Щ76ШЦS╛├>╜▌:42Рgр▐ЎYУЎ√VэЩCGlиъ╦bФ▒╕1ёBвН┼ЁИo╡\Т╧/▀мї─╝т▄№їЦ Q┬%2+╤
ZBJб╛3LUФ@╫▓бп╕▌РуТ]1┴сg9╢Ка╛'yКs-Eы▐r┬Пяшр╪qЕнA·╠ЁД0╦ш·=XЮє┼kQ░nэZЭ╧Їў·н9V╟0^ўшЇ╢I№ЦпwиЯё└фgiLл■нoH└i¤▒╖CСyЩЕ№┘щeв%9h)┐ф╜ХХ_3	╡Eъ╫+╢┼ЕЧЗъ■xn@X█O┬Ю┐}ёz╟╟жn▓Р└ап5ГK╧ЩJ╬o°╩спЦ~╗5~╗яо"$ТВ┼BKs1ЭТ├c┐Н:A+Лt,й╓q╡\+°Б>kZнЕХ┬└┐5╒╙gЙ▌D)3vН&╚^6╙°Р┴бC^▌Tп╫╖ПеХmQ╣4е╕═┤╓+╙▌БЧ╔РдбI╥Ик°bЁ4ъuке2'A6╫]/∙"║S╣МВВ╚*┤Я╧╛ўГя ▌▀ Г∙╧╪@с	i█yjLмЩ?* чjxн╥
■\°╣зf№ЯO┐╫iWэ├█)dVWKJ·]QЎ
N┬-Yй\ъPюзаг'Рчўn	#сxЫN┌}╠р┬XB}внn@░╤╕|─Z╫Т╔` ;>vk╓>╚y	qкбYнXБkEЛ╦cГнNtЩ RQОхЧlц73мї╜Щ}Ba┴┘СC,оч▒B╞<w╨G╨4ЬЭЬv║WЮyЕИ╫╚0∙ 6U░TЖ▄╚Nuz44ИЭc█6д╙y╕"вB.U,▓пИq╡uoс┬╓Р═&ЄVlRР┬╚i2╖Pф№ф ▀э ш>╛;╫1VSCрd╝THVKЁ║╢ Nwvчє├жЇ┴e ц√▀√є ∙j||╓йзp╥╪)╬>╗{ЄЭ;ї{чh╗_мl~ым╡■╕>жїkЇы==ETHnсф╤a o>Ъ№╔GгObяfrЯ┴∙9╩№pf▀№┬н+█ы┤КьевУ╡r{О└ jжЕ╔╞╢Чrj4К`МЁhЄї°░═-F3┼Rг>ОH┤РAЗ</'в┼╠■┼Ri7MЩр┘╜■┘gУA{V,цл╡╠▐~ёЎННН▌{d│{з┘╝{r·╕┘∙фЁ░q▐╚Ч╓	┬╪с╣Я$╘╩ьЭг j╚FT■┴O■╢╫8Й╬8х┘эыу▀~}ч╥дЭxp6╛╪}t№шуУцp▄TsЩ▌▌*uN├уfъ╝∙L:wyп)ё╔ГcВыЫ─╟t=LдХr~cлЇ┼Ч~ы╓нW╓╖Ю┘╪╝└D═жпмч╛zyыї[/эW╛xсB5+вТъЮOП█э╗чЛ╙┘щзїу{ў ╙ў>k№уOП█QCв╠ФЁ╡
-}(+мrН4u4'ё.╦
нdd wL_╠Uh╢бh¤╞4▀T┐b╞ржK╛Jт,K╔╛6■4Ь▄╝Ь√уЭФT╚вm|k,xjMФ╡·.▓}╙@Иu▐┼гЎxЪ-ЎН│╩ЯсУ0гзvдR*╨сТ╣g╓a╛V┬r`gх─╓·╟ДаЖ╛ЭN▒═╬Ф╨LtШ▐▌
Ymь4jac║╒e╩oРn▄>╕Ф╦у\вA╧НяЫL:░qИрpb√>o▌"а╬КMU76.╤'xИ3ЫЪ>м1WїЧ0─╡М╚╖ЛжфО┌aW╠k	¤┘еЬА░Чq|yO∙_gЄВ°p╨эt╗╕;╡N░о8>;GИ▀=m*║жc6voь╩∙─дЪХ-БК4┴dт2AА$Z5Д<х9mНшВU╣v
,zIgE2Х┬ФоCшж"ЫЗ8Щs!Гщм╣Uеы1╣(yJ(qb{ДF┬╟▓%їsХ=вe·юЖu)N╞Й▒ti─:
ЇюР╡Сi╦■rуPF ╜3QJNUj├Doї п▓<╡эA=Ж>мйJ┤Бl5Жfs П620║=W>г~├╨nиьйl│┤╒Huе4&$фBвъЗЗтhм╥CR╖▓ъєmЇ!Їз─╜ЗБЬ╣J│T!#pв╢ySэ ў	R╘Я╒╩dd7	hжGне*к╥█┴8─зщ\s∙▓}[МкДе+"du╩▄╤╛l╡ ╛Y┌>ТMOmж■[╦ъ5:AS█Лrє╢I`lO\┴h#■н¤ПM█└№SЦlЯ?$+╟└▒▌t╔Мщс┘√W╘Ш#╤%$ ╢И0╗F?╕╨┐.AbэU╤▐2ч
v¤2¤┴│^^}6╒}Вш:lt╗МX╦(тN> ╡ї?%u╠▀╓]╧р▒К,L/QКюЕ)Т¤St&Ў}Р	бпУ╤K═w╠H╚+Д3Ф№╒k8щ╨;┘Ї■PR║╔%A┴КпA*·┤6Ш║2є04kЧfxZЧcХ╒V#мЯ█O─ i\:щ∙нчl¤ЬT
нЁО!л:,{,в·Їе╔cЮkф(╘
╥рй.╒░иd&eР@┬▐х▒Б=├╩*Х╙Uh╝-ЗШN╓4╟:cА~уlK╤%оw3Л>Х■q░m╓E><Н¤Р╥HфЙ?nк'гE║й%╕	эФйфl(F┬g*lUуrг!НїrjТ.&Ш■Рw╩e▓А!┬T╬!_)g╜ВбLАКкЇЖэ╢╘Ё╩й$У╜ФМr,╩■Э▄?kл$╣ЬЄ_№х Ўг ─F╗&П3t#lN.Г╢'▀╪U┌].а>кVп\N╝p┤∙B∙\6ш╦├"pWЙфгЎD6]▒б├Г{Ис╥└ЫTJв>╣fчщ0Х)│=▄_яSB7╘┌)и╔н"*5>┤¤Щ'л·Ї}@#*r`rlW╙nСz{%пgєцs│╔,ж╖p;2┘"ОС∙Б,╜°X ╡Цap*ы▓▄u%╥╓H jpvbЦлаvz═╔┤9в▒rt:ш╢ъ'з╟╣bjАhBо*¤siaZVQр+jНn╨с═Ф█имa╜┼б-;GnГ_╥i+╧YPI>
7n{7╪щy╜С╩т	z╝e}{уфф°¤╖ юс¤8>∙ФЧппнч9TjV*╧Ыг;wО)┼;|x^╚V∙U¤рш{ хўчПяsЧчё╜╬0¤рр№hPz°╕^Яhс╝w^╢╗╔~y&7╕Эъ`┴двўЖ¤;Лф▌П╛{6u√ыщK/┤ЫёH┐Ь*я╫оnЧ*ЛэR║гєЇd0№√>=Я'шЙё┴г√ЯЭ▀эЎ▐>n■╙╜╙ўO╗Я╫;чу┼├Ў°akv8К▌-N	Лх+Ч+╪╗e╞╜лEь╢╞▒─$╖Шмхa╟цКзh`2ШГ┤Ш6∙bфЄ3Ы┼Э4NгD├Eьи{v╘~tяёЗ'<z|э┌776HЬ╥г8╞ЖШд)Щз╞║у∙Q;ЄЎ╟▀mЮ?╚&'WwЖ з_╣ёЄ<╚v╝ш@u8бЪ▐&e▌й╖З°Lhк╥═w#ЙГ╬нyЄЄbЎъЛ╖2╗Х3=zk═xjиYЄ(бJ_╗uыї╦Ч╢│╣bZ9VMEooVпoдо─&█Gэ╤{Я╧ю'█¤Gя▐k<Шўя|ўН├ў?ы╝∙┘┴Y}°├я?тNZ▒"(RМЮ╔╞╓єй¤lтB|r%╖╪╧╟╖*yd
Ї┐ ─SаOб4i▒ШAj╤@sХ<33yZm√k#uйЦY%є╔·Кё▓>└uї ▄ХВAr)ЩuИЁ│▌ЖИфл└Д2╙╩m№Ы%АLК&{81K▀U═B═2JA%╩ЧМ╙МЁн8AлЙжЮэЄфXИ№╝/п╨сдцлNД6hЁМfы&9хз.зДHЗ║╝дф╓│ОЪ║>БuМ8гiык^╞*НиWАб╡уDg\ЧЦr[PTn' ╥щ┬F!_Л№┼
м─?&=∙J5qG╕z█хЎ+{@дС A┼6cгЛ37KCр╢c╞6╫+┐¤o╛E IR:ШeKE*ВСщ4]ЎQxъ<)═ZшEтлФЙтШ]РNфТ]Ф╝ЦЫI/ю6╠3MЄZЙр╢б╒О+╠WrйRTКiПвhй&UiЮ#^кг4шcНZBн╢ъ╗Бf╕─║Г┘м╝8[=╙░┴yуа9ъh╢$дf╬к╞N*v$нkU{h YXdbЩJ!2╖├кY9gо▐ю;ЗED╧i$к*С&ОaI9в╞Э5Є0ШДsJwm╜fТн║=╪tg+ЬфцЖp<<щАе─╔ДИ╔H▀HKyl░1▓оSўвыКl|вЭсШЮ√`lы▓а4ЎQ.Зb@╠мMЇ─i╠╛ш?ЭPХМX Я1НгLж\DLbF")yбЄ╞6}▐ЩирОY3ОaОNьЎ┌аСв╚Ъ\▒щч&Ь▓ёк9g░E{вwu 1hЦ═┌sq╬╧p│╔.∙гШ└]-<Ц╤з[Tj╝Уe╓-┌╨/?∙P;И)┬ё│тЭ*{eЗv═┼╙P!▄зшлЯ╜ЗB─d╥Щ┬сMР
Г+▌№%ї╗║╛▀ЗЛ#єзИ< Dа6Cg╖UЁ`?5LL0l╞└(@╒НB░╫Г V╫cCQуЫKТlIQS}░`Йи_оd╛PЩ╤Х[Ь╕TWб╓Nж▒ НtФЗ├Б└Щyю║>┼╪Ўж█7ОВr█ex/&╖wv\d96▌u╛ХЁИ9`v┼╩-∙meXй╬NУU9<╬▄╩A╡*XЇв#┌ZJUОЧ7{Д`Ч.ЫM	╡╪ФШЕa╪jQЙН╠░╬RдаЭК&┐╬┴йPё┴╩╚K&aьН:/Ec№╜b	╡1rР─ОZmд╨ЧdC╖]н сДY╡┤Г╗шYm	-┴lWoiъ^iRНFlд·s=6м&jъ├┐и╦Бv$Шц┬╙YТbKЩa5ш╢╪W4║ghэК8Єh╛[{!ЫAreДМЖ┐ў√┐ў┴ЗщZ|M\▐Иp,z╨╢avыьЎ9в╢ЗdГ'g╛ю√ЁїA~Щ5аю░|	┤кiYГ?╢=Гчщ
с0╛t">М ╝Z┬'ийНїЇаD^iЎXOG?-rЮёT·┬FГ┐в=kwеVО╠T╤╓ ЖRs╙`Р5жЬH=▄`n;dЙ
╣fЛ!╡х`Y╔сmЬ╩+UшЩВЦї▓╘9Z▒е┴t╗\&Щr&Yg?ъ╠цTEкU-Мng┌;╛єЁгє~У║zx+ДЧ8эbz╟4е─Ь∙ЖЭ┌zйDк4╘П,ЙpЩq4вSXз5├^├├lЬрP$УDц/▐П┤╩Щ0(П╩жM╤Ю1UШ╢zyYТН?~√╟?∙├╧>■q0ЁпОИ.3\lмї ШЬ<::√ЁгT∙ъ■╦┐▀┌^дrў╬ГзhЎ╔═э+╖o|с╣╥^y}k╗╙NRЯX╚FПg╔├тхO▓W▀Лэ╛▌█╜№▄oы эЯ Ў╬·3k^▌╝¤ъ┤9ы=╬┘╩ющpЄЎiўя?}№┴yязw■р│╗Я╫[ЯЮ╖~Ё┘сOю4▐~▄}я░√ц¤╬√╟├w┌?|╘x√xt>,ц╫/\╝╣}a┐╕╡Y╜xac╗ЦНМZ¤╬O╒╡R^Э╤╨м$#ўя?>;:¤а┤ЮнlfЫзЭ╙а╪a╣-mLЮ╣ ┬еаkЮ╓СЫd*╨qцQ<FУчє╞ё▀|ч;¤├┐¤ш■Я}·гaы¤Z▒¤╥┼╥o╝╕¤ХЄмt▐╩,rє╩fщЄнf┴╟ШIkр0КH0╬c╕e╫*╒JaЦж+й▌ЫЧ
k┼n┐─fЇМзл_:Ыв┌Є■╓~╗-*EУС~e1,√щfгє╬╜╧■ы√o№▌ЗЗwGЯ№Ёя?∙╤Nю╒УЯ7ч▌шГ│┘ёс░╤Nї#]XQ
╬$iХS`тшнRтЕjф╡ЛЩ/_п}сZ-э╦■Щ╩zjyуЛ
уA
!г+t╬b[m)└╨т(├,ъЦршнєЖ╗S1Ц%Г^5ЁJeИMP╕пж`╠/OУгБ/Ъ╠<^,UeУ╥кWj╥ф╕┘b\╞╨m,ОцтмЖZlG╖Fё·╨F.╡УK$Tде+4╦?k║_bpPC┼Uєё-l╟LНЙXХР&bХ|NЩЄDГ`Nj╢@0a+░4!кО╥ЦГЄ├ю|╓!PgEJk^∙╛к╪▓"Y.К╡═нэdЭP▓baA{uk╓	эаV█V
И╚;i;Нэ╖°мйХ╦╚jUtпwu%7!#fс№▄/%ЩKpУ∙░vз╙ju°Ю╓╫}Зtь1x╢л+цм'╕+цR┼RQ┬r^Li╦%M√▐`@_╜бкQc┤╒БЭq╗╥
fh└#O╠й╠vш6╙г╕Э╞АЛ0CЯ"Дe5Oюл═Т'БC\&U╬c[Ж6Wф5─┐6║╕Д▐╘Oд╔Wg@фIP;пvlЖ;╡╦╚Н╥r>1цВ─	кEiпЩZ7-'М$ЙЧQ╠╩ ╔Ё ╜Р╩ОбGнз(X╦ ыЦ░.2╪Ze∙U╦yyИЄЁдHFдauў▄"(у╠ИdOGVЦ Kf╝2Ей┘v╡Ц"tc%ФXЗ!№@sм■OЦTХй)╕Aг3qТJэ╡№gв)ЩА`~З╘[G┤2├ElЛ╪╬е╖╠хЄjЯHB╕Я╜юLtбiРxЛ\ў└5зС╒мNO╗╗тq╔д░╒[Yц╪Aщ.¤mє▓▄╜ў╞│╗╟LW╣ЧceM─Р∙ж▓╝ЎsWЮ:╬╢W╔lгXВ0Ъ╘Ў^A!╫╩┌У0╕┌╦╪╔╗Й╝fмбl═}щиEЧ√▓їр╨%HrЁ╧дЎт%▓0Є╒▐ffV┘i╗0┤xТ	QаK?ўHmj▐>╓┬зГVжzМ╚╘+Х65`]C\*У	чCJ(r╖Д;СPх%└°рИdВBJVDПл2▀4Vж╜fтi─эєт╣┤*ЛH8ЕbhНI╗:ж╥╗ДCЇ╝КLш""A·zA^╚╡!m╫Ш7рыE┘Fє█jm┴Сх∙─╗┬Д√р7═Н╢┐∙цЦ╖Р╬:ciВ)ioАЫЬОZA╦2╔юЭА2Ы╝пк│9CТM╟╦▌аеЖ└┬~&Ў╫7nУМ╨┴bЗp─3вЁ┘б╝ZWьpvя}Ш@jyKФХP"п╛ю)fjЪ"!n╩й	У.NэО\К\R╧(╧g!Egга b*к╟(S/_м ┴1qЦNJ∙>╦Їq┘tq√У?¤У;wю╨5Є8╘!-ллX═╧Щ?Юь╨.Ё3▄p╚"O/!Єъ-ю(х─8∙кЄ ╚cё╟>L-9/с╚╖Gшs╨fк═vсS█м9╣П9[_|A╫ыХШ*е└Лy:КтD<KыВaн╥g╨?мд╘WX&EьЦP* G4БТrJtзVыXZ╟шЮРБ┼gI▒╧3ш╬9иНиjУ┼*л┬┘■Н▓ЪiiI╧-b╣iж└╒┼гЩ[e4╙	qэh▄iЮ|~tЄ╔YуАIй╝%цПf│jxв~еlжЫ~│r(%Э@Ш%┌yDz┴Мо═PУ,A▐лшЯдb|
Ld +е"И4╬╦┘\bЮ╧d#▒Єє╖┐Q╩VNю╝<z┐▀·№а¤0ЩзEyЧ6V╚Ъ█н&c6г3И\■їн█╧Чw╓v/м_╝ry Є│╖_∙Єц╡ыЧЯ{V=╥уbSЖэ╞8√N{■ilў~тЩvсы'Л╫6/№╥WЯ╜VXгЯAi╖╝uy┐╒j╝ўц_ЯЭ}Ё░╒■╕┘ ю╜;o>:╜{МХ╒фЇ╕r6ъvfэюи+J╪4яїа└и&4z╜╬d╥lO█GН■¤УNn{#╢╗V╝vщ╣[Чh■7Ї:═╔╬╬|Pi-═в╓lM═╒ Tн╤V%2I╖O╟┤h╣~mў╞■┌п¤╓єщN·ЁЁ┴╟▄╣√	M;эc*є>|tя~·П·'┐ўс{╙и хVё├gЛз7bН╦│Ў│ё╪+г╤╡^РЮ─є{WF╕Pб,З╨╨с╝	ы═У)ИУgюaМ0╩█╡ноgў╖6╓7.nюЁ╝Ж╔щ┼э╥єW╢ХН▐p╘э▐▐,oчR╣iw~to°щЭ·[ЯЬ╜¤°Я■·├Я~╘¤шp■ёсЇ╜;эЗGУ╓$Y`└5э0╙g▒sкйТ╓Н╜ДbУ╡\фЎFцЎf№е█хg^╗Р}f-¤╠╓·┼┬ЕН╘╡НbvО'▄d╨КФёrR{4x8▒)A╙Oн°4_lЕS5ТuбЧЦн{Z┌%ВїФ┐wg!	0╪4Х╟FциХTьШ╕╒Y T┤└+╡▄▒!oT╔e~ОS0jQРX╣44Эsf  J:▐Ё╜╥(cн дiv╔лхфFN=╨х$г(MцnгШ╕╛Kыд┬╡эЗХ╓ДьS
ЯЙ7Yд└В▌2Z╬Г┌-╞ЧBh╣Ю┘╦щ№╠├Lв'l#├9?Ж"фQДЙD&Ч┐╕│√,{7Шx2
дRМ1P;jMыщQ1C╓.╙Шk▀I1е·╢8Я*jY┐▓r╔│ ЧФM■┌o№╢.,clн#8Z╨a╝▌vH╬ч═уєf╜^Ъ0Dt╣ORЪ1v1║D╩6X{#\
ўЪ~Ц┤g]Pш ╞jмТзПк╒─y┴WO░OПщн╥ъ╟I7 ▓шCг╗╚ЄK╗Ж╡}&╘/д╙┼,;.5gBиКf╠Щ{5еa%"▒W2▄РKЙаС░╢┘cЮм3yИ
eН3∙╚ ю##RnЯЇ╗D╟ьZw$V▌оEМиЄzk╢{█y╘В╟$
▓dБtЧк╪ШU< єБ─И┬Х/GNтWБ"╬UоЛrt╬I╩(═"<Ч╞┐ ТfГLМшЮвЦxCх┼7эUВТм∙Ч╖ю╙цb╜!╡їЁz`·АR	ЕЙЬ'Y#иw╓dфvвiA╞Ь·╫mhN┴ЁJFКrz}╙шЕB8╗фа┤EЪР╚va╟@╢S/*з E╪:√╔UУ╜ДiРYS[ш┼`░йa╠уIц╚╪Щ╓vыМ═IсKX&╓)5}░░д╜Rp\ЬНuЁЦхn&&╓v╜Д2)Ъз╦"7c2*к╘╘┬ЭВЧВу╫'┘JakOиv└gЭбЧ√╛┌D¤├ZЗК╒Ч╬╘■йл7aз_ЪНо░пЗВ╧я+л+░ёGbр▌r2SJfлЕ┌zyлV▌дjsoу¤'Є╔ЇVesн▓Y.oмХ7*ЕJ%W▐_▀-d+8Cо+∙┌╬еы/)эА╣┘|f Р@ЎЖ( И9)0 ╕(йLYэи^ЙnхутЕ'-KtЄn(_няОО№щЗkО╤╞В┬.∙к╗`▐▄Ў(=Є▓ўщю)╫а%┬ПбМН▌═zA5S╙Бї?їжV║╤Ёgxc	∙'+╪qЦ─`╜ф*╤у│вcVм	Ыw▐б№╖rXРд╧▒║ Э>W╙ЭUГpEUцVl.d╢┬╓K=61┘` NHnв■Ь╤d╨эQnМ▄
√6єбWф▓VнjЛBSЕЩT)з^>3\w]d╙f$╔ЛС([<mбг░zBюDФdў√Ўчvўю=Л(Le√4їы╒┐V╤ШпЫъъv╦XMkйE^J╖'┴6╨Н∙u┘Р6М%>vМk╒щсsЇГ{(║лЪРКЭ╪z~*6ё\м═wЭИ	╘▌│Lы-┌,йп╡Bhi╒wX┼┤·рz▓H▓б@- B(Лв╤K$┴Dж╘,ЦCЪzр_'БаДЩыўТdб{╔уgv╪ lЗVНi)Э╬'к╒┬N·│Зф═-r█zчк╙TI┼pщ6ыzнN╢╕ЩL╔ZOєt╖7╨║длгx|BО╒y@-■╫╒F^жЇ.(х╙х*┌JЕ|c╩LЁЗв	4Ы╣:ЁХ╨0'Гач╬чя?:╜┼<╡HпG2;0░ ╚╞I┐~╓zЁЁ╤╬╬ю╒KW │(ОKХJ┼Нr╛Т┘╪кХ*d%╡нї<(ХN4с#t├╕нРб&э╤i>┐єїdэеEцV*sст▐v╣РDт═>√=СDт│√o▐{°П╙╔┘pыУ╙·9]{sz│.°eВkХJxИJЇц▌.t:Мч
Y.й╨\,8яЎ>?k╜yPяЇ|oў╞F5УПЬP@I▀ЖцГгсIЭxТч▀j╠я?hЮы└>ї┴╤гc,+)#D5ЪO╬o\╩?Ъ?ўT'M╬>М▄y;|ясG tp■╙I№│═╦Э▀·Е╩ °╡НЧВЎ╞зНН·h:|ЎB╛Кkt$┘эї╦{█▒"Vё\)┴╚PЄЎ╛ZИцгЕЭ"Ф├d4╚Ц2┼j1УУ╚Хоэn№╩╦╧┐xys║╘2йп^╝|▒0_Ь▌╣ўўo~ЄW?{╗■у7·x№а>mжїюд▐Э12Є╢кДЦrТН¤ЧЪ(ю№^1▒С=╖У{¤ц·Ўnц╥sЫ┐Ё;┐yЎЄ{Щdsз╢qытюн[ыЩч/и┬м?EZ╜Q-яnP┬GЬеNJ╪3	мВ.▄ЩН"K╒Д╚v$kбаК{█ЪфjvjТМъJ┴fR!;e▀pq2▓Ш╤▄4Kа)┼ YM0╥D╞^ГДf┘1╕ма)5х▀h╢в&Р"╟#ЧJ┘ы[хЫ/_9+G;Х\zнАULb8┌(еЯyf/[═4ztё@8вtн─№ъ─CТS╔aб╣4@▄l┐шмFШoy$РбP√КмЭhГМRQ╣@╚Ьa╡╣Zpо$~МцяХЫЩ▄'9ьw┼у▀@/╛]кL╨JmЩ(╜A]Д╘iпHJN╡(Ц╨Bчх2Выл┤л─┌╞·я№Ы▀╔ЦЄЇвшsFОшьНюти&F8>ТV▓#ў┴єkе╡СД╨,ЕBбЇх┌┴}%щу4■рЄxHа`Эi*IС_FJЩT:C-Z.ППDd╪
┴<Н█QiG0$-пБI█Тэ<%n ╢╩ЬGw╨к/@х┌ё Д]ЪWу╪9aswб {╗zшШBТ╡3Ax(╜А*+l░ЁEeш▐Ni╛O{╙}зM-л╥s
Br)ШЦ-╞ЖВ"ў`@Ц#AГ┘#iГ╞`#╢Ош*с0вЬє┼wВ╙Р/2NMXжXєaт$и▀дь╤@TЙь9`лM>┌▓ЕЎ+)S╔╔╬┤ьr╙ЫЖPд\i>Е┐═╕╦Ї▀:еh|Мц№17ee\Щ#╗oB

dS_hнaХLfLЁbKЖ│░K$═Q| sw]Ыu!h~°<k;ж┴m*!\╦┼Ы╥▌e&ё\~┘Д╥╛шw╙Ёлx#█┴├└╚°]Oь6ri Ў╪i	╔L╗ы%bЎeгEбГо╨\╓V ╘Ь╢╧╛()оеу═)2╠┼#ї╞▀<`4ъй╧5d.5О▐h√	жЄЛ╫Х┌я8oЕ**№╥▀~║Ю_╒+pcм$Q5YT/│╛иїЁ╠жёжу╟]`3*$sхlБ\Я■MV6Ю,Ч6+╡НB6┐S^ПЇ╟┼$ag9Ч╬ХA^ф$R╡BеP[гбy6Э▀и╓6w.fКk{█╓╥┘Л█{vv/_╛|є┌НJ║░]▌кU6jXxмнхST╙R@ЬQ5mп├|Хb№)╜хеMf[┌5│.Jё+╒bqГw91еx└└,`╤в	i╤╕1▓Т¤╕┤ч║эb%6gр═╪b═rKЄыx:ФвжЁ5╡]v╛╫nп;г),Zо@O▄ЧKA4[-DЎ╫r&fШдмЕ╕Ay╩└иЩ1№е(H'╣)bЪК%└(H0╟<эSMv┼┐аc┘аё=хz,ЦJO╞$B═ч	▐сШ3К,─╡+Цр)╣@М1Ж╟м▓ь'АYDЎ8хq^еEОя┘|жP
╙^$кд▄╒ОEф{xt°╟№╟ЗЗ╟║О06╡ХQы╕ў]оХ╦dsr	С}╞Ж?Y~┐В╚■Ed~я5ct╬2`┘СЯ┤Ы
_FaЖш	@WШip┘Шlїjq%ФюЦ=T*|Щ▐%ле!3┼Гщl─╪./eФїПаЦ║BH<(╪fAAЭ╚DWИ╓Pё▓─Z	#s4H╓┘ДjJ∙^УЩ╡ц╓ъBеАW)╞╘Еb]КяЄЙL1U█"!╣╛┐┐╡Vк╒Є█% [{∙чnм_█═eК▒V┐>8?>╣┌kkч╩Z▒╠╘ ▌вХf┐│P_2'Н\фR╨sZs&Ї╘всь├OярЧ╝╛╣о[Г·-Е╣аїёj<╘Ш$!ёgc5Р√_. ь+пя?ўХЫ/¤ъ╬цлї{AєєГx$╡▒╜qщ╞uз▌{Ёс√╥Зwя·ЕrЕ═Г┌"1┌й╟}║})22╪S╚╙шd░^оХ╣о╜|y#Ц)Ў▒+T▐#]:ыМ-║^1*>l╝▀h╛Oє\ь╪Й└hу>uЇєn+Р+;┤BmЦ-т╜f@Л°╚R)_.В.,┘дKw▄a,h═ЪЇ@ЫO_╛y¤·z╢Ўи▀Я4ЫM┬ТяtВЮн│а┘FYM╩ЮuEZ2ЕG─аЗ┘╒цZr╥ъ╧'╜·`x╨ЭЭЯg╟┼цAyr▓Хы~∙FючоуZёrя$·>MJ0pЫ╨ГхЄННXz▐ьЛ╡╥dЛя%k╒жї#.W+з1й-ч6рНєЇ├N-FCffp╘а╜N╠╒їтf!ZIG╦й─z>∙╠╬·╦{ыЕё┘∙'╛ё°сЗнF;▌$ъ¤Yc┼U╬├╞цТj$╧Зз6─Є`QДl┴V.vc'sыbъK/э~∙╧Ё0;╒─w╬┐ўУ{?}▄¤°┤╤╧оU._Ъ╞╗ЕН°╬х<хЭ(╟╗]n╞1P&З╔Dbкs█ХП1e┐┌б╜#D6ZЭe5╞РЗ╣eVЙv2z=▀C█ьФ─I√знЛ┬Ujg`╙,Їcн]WєдuT╡:У\Э\╞L{f¤╜┤ЯЪyЬd╜╡шlяЄюЭXЁГЗgw;Л$▌─╫Ыє╚v<]║╕5+жЩВ¤є5wCщ╪РDLЇ,ф`Yн╖iїm┴	Sй_─╥x╤╙╤Г┌b.ЕFЭ╥;
╨\Ї"с5dЧтgгЧ┤8HХA",W█▄{О>oнn]eД\!
▄)sl─БGИJ┤в[%┤ХЇЛ▀e1вХсШъ╣0QfЖ a▒пУтQ╪)n▐╝UXЗbRеp┌nЬў√╜щ┤╒бdб=╧ын╢Дu░ЁЙ	Нщ│╒b
U"СЗKЮОЯЩр\k8└с╙▌2,A╚LB■ХфИsY╓└эщХ═O ┬╣ч#└4╫яI_kV'▐Ї╘C.▄L░-╬г·LДШ╥▓bA╒tEFС.kе8ео▒uЦГшy/╖К─░Ўу■СiwД■_-Uvi║▌D(ШЦЇ┌r Т-a1зєби\|ё╕.щх┤'+oмК#)&╕╦└*%╦Ъ1y@║y·~бїДО'6ц	╜nOl╝r7штALШ/yЩ:├[Л╥Д
	CZОA┐╚┤r·├Ъ#X╤ДЄУцS┤Бу╝К╞┐мт`Сiw$;'8ntЮ|AШ*┬БQЖФQ╟Gцб@L'сcC╨░Дlч┼2C9¤PЦЛ!╞╒+M!\╥┬y∙Zё╗Nёка╩	МёЎШHu∙zg┬,D6VR╘rxиР66с°ыО╪Чг1■VЯn)эЕ╬w+К╨ЮРОiZlЗY╢m[Зh√▓▀ы▄╠Ч├7	СjVфки9а▐┬М% qьшriM3¤%СЗШIK║K=д╞QR.hc▓Н┼l╛L╔:ї╒И."╤j▒аЕIщ	s┌"74┴ёЫEtR ╘ц┤╣GуХ|Б╘sйRbнP jQ; мОГ2цd▒xнZ.cкr▒d╣PкФ+█{;[ww.UK╗Х╥ц■Е█;√Wп▄║~ы╣4 a Єэч_йV╖)пд│╗╔ЄBfRШbЕУ;нЕ`3КQЇa╪
Xки╣Ёчц╤┐Р}Щ▌WR∙▀Яz ~щ&:в^■1ЬmВ2=29т,В█;50,К▓JX9╛Щqнv┤Щ°aB<=T~MН+ИMiJТш┌
$ЇDЦ4ъq%оPЕ"
:Я═HюH1&Їнё\╔шDшК│9\#&Uе∙з┤ы╖▓х<├Бд<7ОCоиаьf╩eHЛ┤░йU▓j
╡У╜∙╓Ы·з ╣┘l┘эЁЕ═юьJalbехriў+═║y╪Ш°оА▓G'■O√уS@/Ю#│√@ZжoLЁ╖b,№-ОЖЯFчO ╨ЯЩн5rМ▓gжП░)юо*Ф∙c"4-╝"Gp<5WХХ√DUx─Ч~\A&Э,АY┼'*Wb╤AF&mюмь~Ф%╨╞AтS─d}°l¤т╤╦ЬЫEЖ5╬"-(9z|└ЖФ1kКтчГxжТB	л┴D╦{ы5м^╪[Ў╥No2yp╘Ю'чьИКЧjЫЫд Ад8	b@d╔ч3ки#й█+Щ─щ	p!Х'IЬ+XY"$i╕Ыч5йB&▓A╫Рфв─хБ▀Є∙!Сi║J▌р╤ччG▐з║эх/}ё┬Н+фO:═│єэї╥нчпnьЁ6ЄBС▐─1ёcОлфР╥w╩лг├Д>╧eц[йnПЭ¤Aуфє╗w▀■Ш~!╕░`╜Ю╦ф │щ?¤q╨ $F▐▀t#eуdЪL╙Зч┼цБh#TOЗъ7 4;@Яv│Гkv╖О#╓UB|М1ФФ√Cз╜▄fuўе7Я█М╙√M6ьФ+ЮNl┘┘h|w-╗╡]B7u7ъOjybЇXIFеX╬Nу¤&~эЎФ РН┤В°Гf·A3їqг¤юYус░Р╦^{aчЄWл╧oqжК─{╒╥аVstыСй|п╘╧ЪЗGь▒sZrЭ╡ПэГєEЯ№uFД=║<	+P─ab╞"╝Y.]иоС╕Лa│@уўєnєdpP7╟╤zп]ЖЩ▄}╪∙╜та└└Х 7гYюНеR<▒°╒┌Z)WшЯpмьgЭ·╤d╘Ш,ЮЭЯ╥р,╢╪┐║╖u}sяZщ╥Z╣sxvz╘A\Y`╣ТбпJА╖J┼└@█:jShM│Ўй╢cб╜[─▓[╕°╬e█ТzVS┤жql№3gл:&█|Эlу7|и|┤┤XОTй7¤Q'░┼Tf#mЦ╘Ё┼pm█JD^мУ╗╡wз╙╗h╪╟▒T1ёь│;╫SЩё├│уF3Я═├│Я╖1WGвEК)4Я╩щЙrхЫХкхb╘╘ ШЧя