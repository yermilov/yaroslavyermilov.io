{$A+,B-,D+,E+,F-,G-,I+,L+,N-,O-,P-,Q-,R+,S+,T-,V+,X+}
{$M 65520,0,655360}

{***************************************************
It is a "Star Wars" program. It is a space Fire-game.
Created by Kostia Balitsky and Anton Yakovenko
If you find some bugs in this program ,please,tell
authors about them!!!
****************************************************}

{*****************************MAIN PROGRAM***********************************}
Program SpecialFunction;
  Uses Zastava,Drawings,Graph,Crt,Menu_KB;

  Const
        LifePrice         =8;
        FuelPrice         =2;
        LaserPrice        =2;
        JdamPrice         =5;
        PatronPrice       =1;
        MaxPatron         =5;
        LaserEnergyMinus  =1;
        WindowY2          =497;
        LaserDamage       =5;
        FuelDamage        =5;
        LifeDamage        =10;
        StartLifeX        =10;
        StartLifeY        =19;
        ZastX1            =350;
        ZastY1            =250;
        Zastx2            =450;
        Zasty2            =350;


  Type

        tLanguarge=(English,Russian,Ukrainian);
        tShType=(Ship001,ship002,ship003);
        tPatrType=(JDAMpatr,EASYpatr);
        tEnemyPatrType=integer;
        tEnemyShipType=(Sh1,Sh2,Sh3,Sh4,Sh5,Sh6,Sh7,Sh8,Sh9,Sh10);

        tMission=object
          Way         :longint;
          MaxShip     :Byte;
          Possibility :byte;
          procedure Init(s:String);
        end;

        tPatron=object
           Alive    :boolean;
           X,Y      :integer;
           Speed    :ShortInt;
           PatrType :tPatrType;
           damage   :byte;
           procedure Create;
           procedure Draw;
        end; {tPatron object}

        tEnemyPatron=object
           Alive    :boolean;
           X,Y      :integer;
           Speed    :ShortInt;
           damage   :byte;
           procedure Create(num:shortint);
           procedure Draw;
        end;{tEnemyPatron object}

        tShip=Object
           ShipX,ShipY                 :integer;
           Life,Fuel,Speed             :Integer;
           Height,Width                :integer;
           ShType                      :tShType;
           JdamNum,EasyNum,LaserEnergy :LongInt;
           MaxSpeed,MaxPossibleSpeed   :Word;
           Money                       :Longint;
           Jdam                        :tPatron;
           Easy                        :array[1..maxpatron]of  tpatron;
           procedure Draw;
           procedure Initialize;
        End;{tShip object}

        tEnemyShip=object
          x,y             :integer;
          Life            :Shortint;
          ShType          :tEnemyShipType;
          Height,Width    :Integer;
          PatrType        :tEnemyPatrType;
          Speed           :ShortInt;
          MoneyPlus       :Integer;
          TaranDamage     :ShortInt;
          Patron          :tEnemyPatron;
          procedure Draw;
          procedure Create;
        end;{tEnemyShip object}



  var
       Languarge             :tLanguarge;
       helpy,i,j,HelpY2,missnum,laserX:integer;
       HelpFuelMinus,Way     :longint;
       Ship                  :tShip;
       Left,Right,Fire,Pause :char;
       Plus,Minus,JdamFire   :char;
       EasyFire,c            :char;{c is a ReadKey variable}
       mission               :tMission;
       Enemy                 :array[1..10]of tEnemyShip;
       s                     :String;
       LaserHelp             :ShortInt;
       LaserBool,BreakDied   :Boolean;
       Fired                 :Boolean;
       Button:array[1..maxbutton]of tButton;{From  Drawings}
       Straight:tSTRAIGHT;{From MenuKB unit}
       file1:text;

  procedure tEnemyPatron.Draw;
    begin
      SetColor(0);
      Line(x,y-speed,x,y-speed-15);
      SetColor(15);
      if alive then
      Line(x,y,x,y-15);
    end;

  procedure tEnemyPatron.Create;
    begin
      x:=enemy[num].x+(Enemy[num].width div 2);
      y:=enemy[num].y+10+(Enemy[num].height);
      alive:=true;
      Speed:=2;
      Damage:=4;
    end;

  procedure tMission.Init;
      var f  :text;
          s1 :string;
    begin
      s:=s+'.swm';
      getdir(0,s1);
      Assign(f,s1+'\Missions\'+s);
      ReSet(f);
      Read(f,way);
      Readln(f,MaxShip);
      Readln(f,MissNum);
      ReadLn(f,Possibility);
      Close(f);
    end;

    procedure tPatron.Create;
    begin
      X:=(Ship.ShipX)+(Ship.Width div 2);
      Alive:=true;
      Y:=Ship.ShipY-30;
      Case PatrType of
        JDAMpatr:begin
                   Speed:=1;
                   Damage:=50;
                 end;
        EASYpatr:begin
                   Speed:=1;
                   Damage:=10;
                 end;
      End;{Case PatrType of}
    end;

  procedure tPatron.Draw;
    begin
      case PatrType of
        Jdampatr: DrawRocket001(x,y);
        easypatr: DrawRocket002(x,y);
      End;
    end;


  procedure tEnemyShip.Draw;
    begin
      Case ShType of
        Sh1:  DrawEnemyShip1(x,y);
        Sh2:  DrawEnemyShip2(x,y);
        Sh3:  DrawEnemyShip3(x,y);
        Sh4:  DrawEnemyShip4(x,y);
        Sh5:  DrawEnemyShip5(x,y);
        Sh6:  DrawEnemyShip6(x,y);
        Sh7:  DrawEnemyShip7(x,y);
        Sh8:  DrawEnemyShip8(x,y);
        Sh9:  DrawEnemyShip9(x,y);
        Sh10: DrawEnemyShip10(x,y);
      end;
    end;

  procedure tEnemyShip.Create;
     var Num:Integer;
    begin
      num:=random(missnum)+1;
      Case num of
        1 :ShType:=Sh1;
        2 :ShType:=Sh2;
        3 :ShType:=Sh3;
        4 :ShType:=Sh4;
        5 :ShType:=Sh5;
        6 :ShType:=Sh6;
        7 :ShType:=Sh7;
        8 :ShType:=Sh8;
        9 :ShType:=Sh9;
        10:ShType:=Sh10;
      end;

      Case ShType of

        Sh1:begin
              Height:=80;
              Width:=60;
              Life:=10;
              PatrType:=1;
              Speed:=1;
              moneyplus:=2;
            end;

        Sh2:begin
              Height:=80;
              Width:=80;
              Life:=20;
              PatrType:=1;
              Speed:=1;
              moneyplus:=5;
            end;

        Sh3:begin
              Height:=90;
              Width:=60;
              Life:=30;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=10;
            end;

        Sh4:begin
              Height:=85;
              Width:=94;
              Life:=40;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=50;
            end;

        Sh5:begin
              Height:=98;
              Width:=72;
              Life:=45;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=50;
            end;

        Sh6:begin
              Height:=84;
              Width:=72;
              Life:=55;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=60;
            end;

        Sh7:begin
              Height:=70;
              Width:=20;
              Life:=25;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=30;
            end;

        Sh8:begin
              Height:=60;
              Width:=40;
              Life:=35;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=40;
            end;

        Sh9:begin
              Height:=80;
              Width:=40;
              Life:=35;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=40;
            end;

        Sh10:begin
              Height:=90;
              Width:=60;
              Life:=70;
              PatrType:=1;
              Speed:=1;
              MoneyPlus:=90;
            end;

      End;{case ShType of ...}
      y:=-Height;
      TaranDamage:=10;
      If Way<=10 then y:=Random(100);
      X:=Random(500)+100;
    end;


  Procedure tShip.Initialize;
    begin
       ShipX:=350;
       ShipY:=399;
       Life:=100;
       Fuel:=100;
       Speed:=10;
       MaxSpeed:=20;
       MaxPossibleSpeed:=20;
       Width:=100;
       Height:=100;
       Jdamnum:=100;
       EasyNum:=100;
       LaserEnergy:=100;
       Money:=0;
       BreakDied:=false;
    end;

  Procedure tShip.Draw;
    begin
      If ShType=Ship001 then
         DrawShip001(ShipX,ShipY);
      If ShType=Ship002 then
         DrawShip002(ShipX,ShipY);
      If ShType=Ship003 then
         DrawShip003(ShipX,ShipY);
    end;
{******************************StartUp Initializing**************************}
  procedure InitializeAll;
      var f:File of char;
    begin
      Languarge:=English;
      WriteLn('Creating ship...');
      Ship.Initialize;
      Ship.ShType:=Ship001;
      HelpFuelMinus:=1;
      Way:=0;
      BreakDied:=false;
      WriteLn('Creating buttons...');
      {|}Assign(f,'SetUp.DAT');{Reading buttons from char                   }
      {|}ReSet(f);             {file "SetUp.DAT".Start properties:          }
      {|}Read(f,pause);        {pause='p';left=left(#75);right=right(#77)   }
      {|}Read(f,left);         {fire=space(#32);plus= '=';minus='-'         }
      {|}Read(f,Right);        {JdamFire= 'z'; EasyFire= 'x'}
      {|}Read(f,Fire);         {********************************************}
      {|}Read(f,Plus);
      {|}Read(f,minus);
      {|}Read(f,JdamFire);
      {|}Read(f,EasyFire);
      {|}Close(f);
      WriteLn('Initializing time...');
      GetDelay;
      randomize;
      {Empty:=false;}
    end;


  Procedure DoubleCode;
  begin
    setviewport(1,1,getmaxx,getmaxy,true);
    setcolor(4);
    Settextstyle(2,0,3);
    i:=1;
    Repeat
     j:=1;
     repeat
       Outtextxy(j,i,'10');
       Inc(j,10);
     until j>=800;
     inc(i,20);
    Until i>=600;
  end;

  Procedure EasySetUP;
  Begin
    for i:=1 to maxpatron do
      begin
        ship.easy[i].alive:=false;
      end;
     ship.JDAM.alive:=false;
    for i:=1 to missnum do
      begin
       enemy[i].life:=0;
      end;
      Way:=0;
      Ship.ShipX:=350;
      Ship.ShipY:=400;
  End;

  Procedure DrawWay(way:integer);
    begin
      SetColor(123);
      Str(Mission.Way,s);
      SetViewPort(3,WindowY2+5,797,597,true);
      SetFillStyle(1,4);
      Bar(Startlifex+270,Startlifey+15,Startlifex+350,Startlifey+25);
      OutTextXY(Startlifex+150,Startlifey,'You must go:'+s);
      Str(way,s);
      OutTextXY(Startlifex+150,Startlifey+15,'You have already gone:'+s);
      SetViewPort(3,3,797,WindowY2,true);
    end;

  Procedure DrawLaserEnergy;
    begin
      SetViewPort(3,WindowY2+5,797,597,true);
      SetFillStyle(1,4);
      SetColor(123);
      with ship do
      begin{with}
        Str(LaserEnergy,S);
        Bar(Startlifex+150,Startlifey+45,Startlifex+225,Startlifey+55);
        OutTextXY(StartLifeX+150,StartLifeY+45,'LASER:'+s);
      end;{with}
      SetViewPort(3,3,797,WindowY2,true);
    end;

  Procedure DrawJDAMnum;
    begin
      SetViewPort(3,WindowY2+5,797,597,true);
      SetFillStyle(1,4);
      SetColor(123);
      with ship do
      begin{with}
        Str(JdamNum,S);
        Bar(Startlifex+150,Startlifey+55,Startlifex+225,Startlifey+63);
        OutTextXY(StartLifeX+150,StartLifeY+55,'JDAM:'+s);
      end;{with}
      SetViewPort(3,3,797,WindowY2,true);
    end;

  Procedure DrawEASYnum;
    begin
      SetViewPort(3,WindowY2+5,797,597,true);
      SetFillStyle(1,4);
      SetColor(123);
      with ship do
      begin{with}
        Str(EASYnum,S);
        Bar(Startlifex+150,Startlifey+65,Startlifex+235,Startlifey+75);
        OutTextXY(StartLifeX+150,StartLifeY+65,'AMMO:'+s);
      end;{with}
      SetViewPort(3,3,797,WindowY2,true);
    end;


  Procedure DrawSpeed(Speed:integer);
    begin
      Str(Speed,s);
      SetFillStyle(1,4);
      SetViewPort(3,WindowY2+5,797,597,true);
      SetColor(123);
      Bar(Startlifex+70,Startlifey+50,StartLifeX+90,StartLifeY+60);
      OutTextXY(Startlifex,Startlifey+55,'Speed :  '+s);
      SetViewPort(3,3,797,WindowY2,true);
    end;

  Procedure DrawLife(percent:ShortInt);
      var i,c:integer;
    begin
      SetViewPort(3,WindowY2+5,797,597,true);
      Str(percent,s);
      SetFillStyle(1,4);
      s:=s+'%';
      Bar(startlifex,startlifey,startlifex+100,startlifey+11);
      c:=116;
      For i:=startlifex to startlifex+percent do
       begin
         SetColor(c);
         Line(i,startlifey,i,startlifey+11);
         Inc(c);
       end;
      SetTextStyle(13,0,1);
      Bar(startlifex+110,startlifey,startlifex+150,startlifey+15);
      SetColor(167);
      OutTextXY(Startlifex+110,startlifey,s);
      SetViewPort(3,3,797,WindowY2,true);
    end;

  procedure DrawMoney;
  begin
    SetViewPort(3,WindowY2+5,797,597,true);
    Str(Ship.Money,s);
    SetFillStyle(1,4);
    Bar(StartLifeX+150,Startlifey+30,StartLifeX+270,Startlifey+40);
    SetColor(123);
    OutTextXY(Startlifex+150,startlifey+30,'Your money:'+s);
    SetViewPort(3,3,797,WindowY2,true);
  end;

  procedure DrawDied;
      var i:integer;
          color:byte;
    begin
      DrawLife(0);
      Color:=40;
      for i:=1 to 60 do begin
        Delay(100);
        SetFillStyle(1,color+4);
        FillEllipse(Ship.ShipX,Ship.Shipy,i+4,i+4);
        SetFillStyle(1,color+3);
        FillEllipse(Ship.ShipX,Ship.Shipy,i+3,i+3);
        SetFillStyle(1,color+2);
        FillEllipse(Ship.ShipX,Ship.Shipy,i+2,i+2);
        SetFillStyle(1,color+1);
        FillEllipse(Ship.ShipX,Ship.Shipy,i+1,i+1);
        SetFillStyle(1,color);
        FillEllipse(Ship.ShipX,Ship.Shipy,i,i);
      end;
      BreakDied:=true;
    end;

  procedure DrawFuel(percent:ShortInt);
      var i,c:integer;
          s  :string;
    begin
      SetViewPort(3,WindowY2+5,797,597,true);
      Str(percent,s);
      SetFillStyle(1,4);
      s:=s+'%';
      Bar(startlifex,startlifey+30,startlifex+100,startlifey+42);
      c:=116;
      For i:=startlifex to startlifex+percent do
       begin
         SetColor(c);
         Line(i,startlifey+30,i,startlifey+42);
         Inc(c);
       end;
      SetTextStyle(13,0,1);
      Bar(startlifex+110,startlifey+30,startlifex+150,startlifey+45);
      SetColor(167);
      OutTextXY(Startlifex+110,startlifey+30,s);
      SetViewPort(3,3,797,WindowY2,true);
    end;

Procedure DrawMeteorites(HelpY:integer);
  begin
   SetViewPort(3,3,797,WindowY2,true);
   Setfillstyle(1,0);
   Bar(1,1,101,WindowY2);
   Bar(696,1,797,WindowY2);
   If HelpY>1 then
     begin
       DrawMeteorite(1,-100+HelpY,'r');
       DrawMeteorite(796,-100+HelpY,'l');
     end;
   DrawMeteorite(1,HelpY,'r');
   DrawMeteorite(796,HelpY,'l');
   DrawMeteorite(1,HelpY+100,'r');
   DrawMeteorite(796,HelpY+100,'l');
   DrawMeteorite(1,HelpY+200,'r');
   DrawMeteorite(796,HelpY+200,'l');
   DrawMeteorite(1,HelpY+300,'r');
   DrawMeteorite(796,HelpY+300,'l');
   DrawMeteorite(1,HelpY+400,'r');
   DrawMeteorite(796,HelpY+400,'l');
 end;


Procedure Zastavka_Before_Game;
  begin
    For i:=16 to 32 do
      begin
        SetColor(i);
        RectAngle(i,i,getmaxx-i,getmaxy-i);
      end;
    SetColor(4);
    SetTextStyle(6,0,4);
    OutTextXY(230,50,'S t a r  W a r s');
    DrawMeteorite(200,250,'r');
    DrawMeteorite(600,250,'l');
    DrawShip001(ZastX1,ZastY1);
  end;

  Procedure LaserLine;
    var x,y:integer;
  begin
    Line(LaserX+1,Ship.ShipY,LaserX+1,1);
    Line(LaserX,  Ship.ShipY,LaserX,1);
    For y:=Ship.ShipY downto 1 do
      begin
        PutPixel(laserx+random(2),y,14);
      end;
    SetColor(0);
  end;

  Procedure LaserFire;
   var x,y:integer;
  Begin
    LaserHelp:=1; LaserX:=Ship.Shipx+(Ship.Width div 2);LaserBool:=true;
    LaserLine;
    DrawLaserEnergy;
    For i:=1 to Mission.maxship do
      If ((Ship.ShipX +(Ship.Width div 2))>=Enemy[i].x)
      and((Ship.ShipX+(Ship.Width div 2))<=(Enemy[i].x+Enemy[i].Width))
      then begin
        Dec(Enemy[i].life,LaserDamage);
      end;

  End;


PROCEDURE MakeUpGrade;
     var position:integer;
  begin
    SetViewPort(1,1,getmaxx,getmaxy,true);
    ClearDevice;
    i:=0;
    SetFillStyle(1,8);
    Bar(1,1,800,600);
    SetColor(17);
    Repeat
      Line(1,i,800,i);
      inc(i,50);
    Until i>=600;
    i:=0;
    Repeat
      Line(i,1,i,50);
      Line(i,100,i,150);
      Line(i,200,i,250);
      Line(i,300,i,350);
      Line(i,400,i,450);
      Line(i,500,i,550);
      inc(i,100);
    Until i>=800;
    i:=50;
    Repeat
      Line(i,50,i,100);
      Line(i,150,i,200);
      Line(i,250,i,300);
      Line(i,350,i,400);
      Line(i,450,i,500);
      Line(i,550,i,600);
      inc(i,100);
    Until i>=800;
    Rect(1,1,798,598);
    SetTextStyle(6,0,3);
    SetColor(7);
    OutTextXY(7,-2,'U P G R A D I N G    M A R K E T');
    SetColor(7);
    OutTextXY(8,-1,'U P G R A D I N G    M A R K E T');
    SetColor(7);
    OutTextXY(9,0,'U P G R A D I N G    M A R K E T');
    SetColor(1);
    OutTextXY(10,1,'U P G R A D I N G    M A R K E T');
    SetFillStyle(1,64);
    Bar(40,50,500,590);
    Bar(600,400,790,550);
    Rect(600,400,790,550);
    SetTextStyle(1,0,1);
    OutTextXY(610,410,'Controls:');
    SetTextStyle(2,0,4);
    OutTextXY(620,430,'"up"- to move cursor up');
    OutTextXY(620,440,'"down"- to move cursor down');
    OutTextXY(620,450,'"+"- to buy 1 of propery');
    OutTextXY(620,460,'"-"- to give 1 of propery out');
    OutTextXY(620,470,'"Esc"- finish and quit');
    SetColor(14);
    SetTextStyle(7,0,3);
    OutTextXY(50,100,'LIFE   -');
    OutTextXY(50,200,'FUEL   -');
    OutTextXY(50,300,'LASER  -');
    OutTextXY(50,400,'JDAM   -');
    OutTextXY(50,500,'AMMO   -');
    SetTextStyle(2,0,5);
    OutTextXY(202,55,'You have now');
    OutTextXY(302,55,'Price for one');
    OutTextXY(402,55,'    TEXT');
    {Life}
    OutTextXY(401,100,'This property');
    OutTextXY(401,110,'means number ');
    OutTextXY(401,120,'of life per- ');
    OutTextXY(401,130,'cents of your ');
    OutTextXY(401,140,'ship.');
    {Fuel}
    OutTextXY(401,200,'This property');
    OutTextXY(401,210,'means V ');
    OutTextXY(401,220,'of fuel in  ');
    OutTextXY(401,230,'your ship.');
    {Laser}
    OutTextXY(401,300,'This property');
    OutTextXY(401,310,'means number ');
    OutTextXY(401,320,'of laser');
    OutTextXY(401,330,'energy in ');
    OutTextXY(401,340,'your ship.');
    {Jdam}
    OutTextXY(401,400,'This property');
    OutTextXY(401,410,'means number ');
    OutTextXY(401,420,'of JDAM roc-');
    OutTextXY(401,430,'kets in your');
    OutTextXY(401,440,'magazine.');
    {Patrons}
    OutTextXY(401,500,'This property');
    OutTextXY(401,510,'means number ');
    OutTextXY(401,520,'of easy roc-');
    OutTextXY(401,530,'kets in your');
    OutTextXY(401,540,' magazine.');
    Rect(40,50,500,590);
    SetColor(4);
    Line(200,52,200,588);
    Line(300,52,300,588);
    Line(400,52,400,588);
    Line(42,90,498,90);
    Line(42,190,498,190);
    Line(42,290,498,290);
    Line(42,390,498,390);
    Line(42,490,498,490);
    SetTextStyle(1,0,1);
    Str(LifePrice,s);
    OutTextXY(340,120,s);
    Str(FuelPrice,s);
    OutTextXY(340,220,s);
    Str(LaserPrice,s);
    OutTextXY(340,320,s);
    Str(JdamPrice,s);
    OutTextXY(340,420,s);
    Str(PatronPrice,s);
    OutTextXY(340,520,s);
      Ship.ShipX:=600;
      Ship.ShipY:=250;
      SetFillStyle(1,64);
      Bar(Ship.ShipX,Ship.ShipY,Ship.ShipX+100,Ship.ShipY+100);
      Rect(Ship.ShipX-1,Ship.ShipY-1,Ship.ShipX+101,Ship.ShipY+101);
      Ship.Draw;

     position:=1;

    Repeat

      SetColor(64);

      RectAngle(45,95,180,130);
      RectAngle(46,96,179,129);

      RectAngle(45,195,180,230);
      RectAngle(46,196,179,229);

      RectAngle(45,295,180,330);
      RectAngle(46,296,179,329);

      RectAngle(45,395,180,430);
      RectAngle(46,396,179,429);

      RectAngle(45,495,180,530);
      RectAngle(46,496,179,529);

      SetColor(14);
      Case Position of
       1:begin
          RectAngle(45,95,180,130);
          RectAngle(46,96,179,129);
         end;
       2:begin
           RectAngle(45,195,180,230);
           RectAngle(46,196,179,229);
         end;
       3:begin
           RectAngle(45,295,180,330);
           RectAngle(46,296,179,329);
         end;
       4:begin
           RectAngle(45,395,180,430);
           RectAngle(46,396,179,429);
         end;
       5:begin
           RectAngle(45,495,180,530);
           RectAngle(46,496,179,529);
         end;
      end;{case}

      SetFillStyle(1,64);
      Bar(220,100,280,170);
      Bar(220,200,280,270);
      Bar(220,300,280,370);
      Bar(220,400,280,470);
      Bar(220,500,280,570);

      SetColor(4);
      SetTextStyle(1,0,4);
      Str(Ship.life,s);
      OutTextXY(220,100,s);
      Str(Ship.fuel,s);
      OutTextXY(220,200,s);
      Str(Ship.laserenergy,s);
      OutTextXY(220,300,s);
      Str(Ship.JDAMnum,s);
      OutTextXY(220,400,s);
      Str(Ship.easynum,s);
      OutTextXY(220,500,s);

      SetFillStyle(1,64);
      SetTextStyle(8,0,1);
      Bar(600,100,790,200);
      Rect(600,100,790,200);
      Str(Ship.Money,s);
      OutTextXY(610,110,'Your money :');
      OutTextXY(640,130,s+' $');

      C:=readkey;
      Case c of
        #72{up}  :begin
                   If position>0 then Dec(position);
                   If position=0 then position:=5;
                 end;
        #80{down}:begin
                   If position<6 then Inc(position);
                   If position=6 then position:=1;
                 end;
        '=','+':Begin
              case position of
                1:begin
                      if (Ship.life<100)and(Ship.money>=lifeprice) then
                      begin inc(Ship.life); dec(Ship.money,lifeprice);end;
                  end;

                2:begin
                    if (Ship.fuel<100)and(Ship.money>=fuelprice) then
                      begin inc(Ship.fuel); dec(Ship.money,fuelprice);end;
                  end;
                3:begin
                    if (Ship.money>=laserprice) then
                      begin inc(Ship.laserenergy); dec(Ship.money,laserprice);end;
                  end;
                4:begin
                    if (Ship.money>=JDAMprice) then
                      begin inc(Ship.JDAMnum); dec(Ship.money,JDAMprice);end;
                  end;
                5:begin
                    if (Ship.money>=patronprice) then
                      begin inc(Ship.easynum); dec(Ship.money,patronprice);end;
                  end;
              End;{case position of}
            End;{'+'}

        '-':Begin
              case position of
                1:begin
                    if (Ship.life>1) then
                      begin dec(Ship.life); inc(Ship.money,lifeprice);end;
                  end;

                2:begin
                    if (Ship.fuel>0) then
                      begin dec(Ship.fuel); inc(Ship.money,fuelprice);end;
                  end;
                3:begin
                    if (ship.laserenergy>0) then
                      begin dec(Ship.laserenergy); inc(Ship.money,laserprice);end;
                  end;
                4:begin
                    if (ship.jdamnum>0) then
                      begin dec(Ship.JDAMnum); inc(Ship.money,JDAMprice);end;
                  end;
                5:begin
                    if (ship.easynum>0) then
                      begin dec(Ship.easynum); inc(Ship.money,patronprice);end;
                  end;
              End;{case position of}
            End;{'-'}

      End;{Case c of}

    Until c=#27;

  end;{MakeUpGrade}

PROCEDURE DEMOGAME;
BEGIN{demogame}
  ClearDevice;
  SetViewPort(1,1,800,600,true);
  SetColor(67);
  SetViewPort(3,WindowY2+5,797,597,false);
  SetFillStyle(1,4);
  Rect(-2,-(WindowY2+5),796,597);
  Rect(-2,-3,796,97);
  FloodFill(100,50,8);
  SetViewPort(3,WindowY2+5,797,597,true);
  SetTextStyle(7,0,2);
  outtextxy(330,1,'Star Wars');
    SetTextStyle(13,0,1);
    Rect(startlifex-2,Startlifey-2,Startlifex+102,Startlifey+12);
    Rect(startlifex-2,Startlifey+28,Startlifex+102,Startlifey+44);
    OutTextXY(10,Startlifey-10,'Life:');
    OutTextXY(10,Startlifey+20,'Fuel:');
  DrawLife(Ship.Life);
  DrawFuel(Ship.Fuel);
  DrawSpeed(Ship.Speed);
  SetViewPort(4,4,796,WindowY2-1,true);
  Ship.Draw;
  HelpY:=1;
  Repeat
    Inc(HelpY);
    If HelpY=100 then helpY:=1;
    DrawMeteorites(helpY);
  Until KeyPressed;

END;{demogame}

PROCEDURE MAIN(NAME:string);
  BEGIN {MAIN}
  Mission.init(name);
  ClearDevice;
  SetViewPort(1,1,800,600,true);
  SetColor(67);
  SetViewPort(3,WindowY2+5,797,597,false);
  SetFillStyle(1,4);
  Rect(-2,-(WindowY2+5),796,597);
  Rect(-2,-3,796,97);
  FloodFill(100,50,8);
  SetViewPort(3,WindowY2+5,797,597,true);
  SetTextStyle(7,0,2);
  outtextxy(330,1,'Star Wars');
    SetTextStyle(13,0,1);
    Rect(startlifex-2,Startlifey-2,Startlifex+102,Startlifey+12);
    Rect(startlifex-2,Startlifey+28,Startlifex+102,Startlifey+44);
    OutTextXY(10,Startlifey-10,'Life:');
    OutTextXY(10,Startlifey+20,'Fuel:');
  DrawLife(Ship.Life);
  DrawFuel(Ship.Fuel);
  DrawSpeed(Ship.Speed);
  SetViewPort(4,4,796,WindowY2-1,true);
  Ship.Draw;
  Repeat
    While keypressed do
      begin
        c:=readkey;
        SetFillStyle(0,1);
        with Ship do Bar(ShipX,ShipY,Shipx+100,ShipY+100);

         if c=#27 then quit;

         if c = pause then
            begin
              Ship.Draw;
              DrawPause;
              Readkey;
              SetFillStyle(1,0);
              Bar(250,200,550,400);
            end;

         If c= Left{#75 left} then
             begin
               If (Ship.ShipX-Ship.Speed)<=100 then
                 begin
                  Inc(Ship.Shipx,(Ship.Speed+5)*5);
                  Dec(Ship.life,lifedamage);
                  Dec(Ship.Fuel, FuelDamage);
                  If Ship.life<=0 then DrawDied;
                    DrawLife(Ship.Life);
                    DrawFuel(Ship.Fuel);
                 end;

               If (Ship.ShipX-Ship.Speed) > (100) then
               dec(Ship.ShipX,Ship.Speed+5);
             end;

         If c=Right{#77right} then
             begin
               If (Ship.ShipX+Ship.Speed) >=600 then begin
                  Dec(Ship.Shipx,(Ship.Speed+5)*5);
                  Dec(Ship.life,lifedamage);
                  Dec(Ship.Fuel, FuelDamage);
                  If Ship.life<=0 then DrawDied;
                  DrawLife(Ship.Life);
                  DrawFuel(Ship.Fuel);
               end;

               If Ship.ShipX <(600) then
                inc(Ship.ShipX,Ship.Speed+5);
             end;

         If (c=Fire)and(Ship.LaserEnergy>0) { <Space> } then
            begin
               if Not(LaserBool) then begin
                   LaserFire;
                   with ship do if LaserEnergy > 0 then
                      Dec(LaserEnergy,LaserEnergyMinus);
               end;{if Not(LaserBool) then begin}
            end;{Space...}

         If (c=JdamFire)and(not(Ship.JDAM.alive))and(Ship.JDAMnum>0) then begin
            Ship.Jdam.patrtype:=JDAMpatr;
            Ship.Jdam.Create;
            Dec(Ship.JDAMnum);
         end;{c=JdamFire then begin}

         If c=EasyFire then begin
         {|}Fired:=False;
         {|}for i:=1 to maxpatron do
         {|}begin{for i:=1 to maxpatron do}
         {|}{\}if not(fired)and(Not(Ship.Easy[i].Alive))then
         {|}{\}begin
         {|}{\}  Ship.Easy[i].PatrType:=Easypatr;
         {|}{\}  Ship.Easy[i].Create;
         {|}{\}  Fired:=True;
         {|}{\}  Dec(Ship.Easynum);
         {|}{\}end;
         {|}end;{for i:=1 to maxpatron do}
         end;{c=EasyFire then begin}

         If c=Plus then
            begin
              With Ship do
                If Speed<MaxSpeed then
                 Begin Speed:=Speed+1; DrawSpeed(Speed); End;
            end;{If c=Plus then...}

       If c=Minus then
            begin  {then}
            {|}With Ship do
            {|}  If Speed>1 then begin Speed:=Speed-1; DrawSpeed(Speed); end;
            end; {then}

      END;{While}

     If Ship.Fuel > 0 then
        begin
        {|}DrawFuel(Ship.Fuel);
        {|}DrawSpeed(Ship.Speed);
        end;

     If Ship.Fuel <= 0 then
        begin
       {|}DrawFuel(0);
       {|}Ship.Speed:=1;
       {|}Ship.MaxSpeed:=1;
       {|}DrawSpeed(Ship.Speed);
        end;

     SetFillStyle(1,0);

     If (LaserHelp<>0)and(laserbool) then begin
     {|}LaserLine;
     {|}Inc(LaserHelp);
     {|}  if (laserhelp=10){or(Ship.ShipX<>LaserX)} then
     {|}  Begin laserhelp:=0; SetColor(0);
     {|}  {|}Line(LaserX+1,Ship.ShipY,LaserX+1,1);
     {|}  {|}Line(LaserX,Ship.ShipY,LaserX,1); LaserBool:=False;
     {|}  End;{if laserhelp=10...}
     end;{if laserhelp<>0 then...}

     SetFillStyle(1,0);
     for i:=1 to Mission.MaxShip do with enemy[i] do
        Bar(x,y,x+width,y+height);

     HelpY:=HelpY+Ship.Speed;

     For i:=1 to Mission.MaxShip do begin{For i:=1 to Mission.maxship do...}
     {|}IF (Enemy[i].life>0) then With enemy[i] do begin
     {|} if (x>=ship.ShipX)and(x<=(Ship.ShipX+Ship.Width))
     {|} AND ((x+width)>=ship.ShipX)and((x+width)<=(Ship.ShipX+Ship.Width))
     {|} AND (y>=ship.Shipy)and(y<=(Ship.Shipy+Ship.Height))
     {|} AND ((y+height)>=ship.ShipY)and((y+height)<=(Ship.Shipy+Ship.Height))
     {|} THEN begin Dec(Ship.life,tarandamage); life:=0; DrawLife(Ship.Life); end;
     {|}  end;
     {|} Inc(Enemy[i].y,Enemy[i].speed);
     {|} If Enemy[i].y >= 600 then Begin enemy[i].life:=0; Enemy[i].create; End;
     {|} if (enemy[i].life<=0)and(Enemy[i].y<600)
     {|} then begin inc(Ship.money,Enemy[i].moneyplus); Enemy[i].Create;end;
     {|} Enemy[i].Draw;
     {|} With Enemy[i] do begin
     {|}  If (Ship.Jdam.x>=x)and(Ship.Jdam.x<=(x+width))and(Ship.Jdam.y>=Y)
     {|}  and(Ship.Jdam.y<=(y+height-20)) then
     {|}  {\}begin
     {|}  {\}  dec(life,Ship.Jdam.Damage);
     {|}  {\}  SetFillStyle(1,0);
     {|}  {\}  Ship.Jdam.alive:=false;
     {|}  {\}  Bar(Ship.Jdam.x-20,Ship.Jdam.y-10,Ship.Jdam.x+20,Ship.Jdam.y+30);
     {|}  {\}end;
     {|} End;{with...}
     {|} (*******************************************************************)
     {|} FOR j:=1 to maxpatron do
     {|} Begin{FOR j:=1 to maxpatron do...}
     {|} With Enemy[i] do BEGIN
     {|}  If (Ship.Easy[j].x>=x)and(Ship.Easy[j].x<=(x+width))and(Ship.Easy[j].y>=Y)
     {|}  and(Ship.Easy[j].y<=(y+height-20)) then
     {|}  {\}begin
     {|}  {\}  dec(life,Ship.Easy[j].Damage);
     {|}  {\}  SetFillStyle(1,0);
     {|}  {\}  Ship.Easy[j].alive:=false;
     {|}  {\}  Bar(Ship.Easy[j].x-20,Ship.Easy[j].y-10,Ship.Easy[j].x+20,Ship.Easy[j].y+30);
     {|}  {\}end;
     {|} END;{With Enemy[i] do BEGIN...}
     {|} End; {FOR j:=1 to maxpatron do...}
     {|} J:=random(mission.possibility);
     {|} With Enemy[i].patron do begin
     {|}   If (mission.possibility<>0)and(not(alive))and(j=5) then
     {|}     begin  Create(i); end;
     {|}  If alive then
     {|}      begin
     {|}         If y >= 605 then alive:=false;
     {|}         Inc(y,speed);
     {|}         Draw;
     {|}         If (x>=Ship.ShipX)and(x<=(Ship.ShipX+Ship.Width))
     {|}         and(y>=Ship.ShipY+15)and(y<=(Ship.ShipY+Ship.Height)) then
     {|}         begin
     {|}            Dec(Ship.life,Damage);
     {|}            alive:=false;
     {|}            DrawLife(Ship.life);
     {|}            SetColor(0);
     {|}            Line(x,y,x,y-15);
     {|}         end;
     {|}       end;
     {|} End;
     end; {for i:=1 to mission.maxship...}

     If (Ship.Jdam.Alive) then begin
        SetFillStyle(1,0);
        Bar(Ship.jdam.x-20,ship.jdam.y-10,Ship.jdam.x+20,ship.jdam.y+50);
        SetColor(4);
        Ship.Jdam.X:=Ship.ShipX+(Ship.width div 2);
        Dec(ship.jdam.y);
        Ship.Jdam.Draw;
        if ship.jdam.y=-60 then ship.jdam.alive:=false;
     End;{If (Ship.Jdam.Alive) then begin}

     For i:=1 to MaxPatron do begin
     {|}If Ship.Easy[i].alive then
     {|}with Ship.Easy[i] do begin
     {|} {\}SetColor(1);
     {|} {\}SetFillStyle(1,0);
     {|} {\}Bar(x,y,x+15,y+30);
     {|} {\}Draw;
     {|} {\}if y<=-30 then alive:=false;
     {|} {\}dec(y);
     {|}End;{With Ship.Easy[i] do begin}
     End;{For i:=1 to MaxPatron do begin}

{     If (Laserbool)or(laserhelp<>0)then begin
         SetViewPort(3,WindowY2+5,797,597,true);
         SetColor(14);
         RectAngle(600,10,650,50);
         SetViewPort(3,3,797,WindowY2,true);
       end
     else begin
         SetViewPort(3,WindowY2+5,797,597,true);
         SetColor(4);
         RectAngle(600,10,650,50);
         SetViewPort(3,3,797,WindowY2,true);
     end;}

     If HelpY>=101  then begin {if helpy>=101 then ...}
         HelpY:=1; Inc(helpy2); Inc(Way); End;{if helpy>=101 then ...}

     if (helpy2=4)and(Ship.Fuel>0) then
     begin Dec(Ship.Fuel,HelpFuelMinus); HelpY2:=0; end;

     If ship.Fuel<0 then ship.fuel:=0;

     If Ship.LaserEnergy=0 then DrawLaserEnergy;
     If Ship.life<=0 then begin
       DrawDied;
       BreakDied:=true;
       DrawLife(Ship.Life);
     End;

     DrawEASYnum;
     DrawJDAMnum;
     DrawMoney;
     DrawWay(Way);
     DrawMeteorites(HelpY);
     Ship.Draw;

     If BreakDied then Exit;

  Until Mission.way=WAY;{WAY is a global variable!!}
  IF Mission.Way >= WAY then congratulate;

  END;{MAIN}

PROCEDURE LoadGame;
  var table:tTable;
      s:string;
BEGIN
  cleardevice;
  with table do begin
    x1:=100;
    y1:=100;
    x2:=700;
    y2:=500;
    Draw;
  end;
  SetTextStyle(1,0,1);
  OutTextXY(120,150,'Enter file name (without extension) :');
  s:=ReadXY(200,200,1);
  Ship.Money:=1000;
  With Ship do begin
    life:=1;
    fuel:=0;
    laserenergy:=0;
    JDAMnum:=0;
    EASYnum:=0;
  end;
  MakeUpGrade;
  EasySetUp;
  Main(s);
END;

{*************************----M-E-N-U----************************************}
{****************************************************************************}
{****************************************************************************}
{****************************************************************************}
{****************************************************************************}

  Procedure InitLang;
      var f:text;
    begin
      Case languarge of
        russian  :Assign(f,'CaptR.swf');
        english  :Assign(f,'CaptE.swf');
        ukrainian:Assign(f,'CaptU.swf');
      End;{Case}
      ReSet(f);
      For i:=1 to maxbutton do ReadLn(f,Button[i].Caption);
      Close(f);
    end;
{***************************Part of menu ABOUT*******************************}
    PROCEDURE ABOUTMENU;
    procedure DrawAM;
    begin {DrawAM}
      ClearDevice;
      DoubleCode;
      SetColor(46);
      SetTextStyle(1,0,3);
      OutTextXY(270,30, 'STAR WARS (AEROBOSS 2.0)');
      OutTextXY(310,50, '_Special_Function_');
      SetTextStyle(1,0,1);
      OutTextXY(30,70,  'Program created by:');
      OutTextXY(30,90,  '   Kostia Balitsky  (idea,engine)       Anton Yakovenko  (designer)');
      OutTextXY(30,110,'Special thanks to programming teachers:');
      OutTextXY(30,130,'  >>Kopnyak V.E.');
      OutTextXY(30,150,'  >>Nepomniashchi G.I.');
      OutTextXY(30,170,'Program created in PDU WORKGROUP  ');
      OutTextXY(30,190,'   FROM AUTHOR:');
      OutTextXY(30,210,'In 2003 I made an AEROBOSS program for my first programing');
      OutTextXY(30,230,'comprehension.Now I had an idea to make second version of this');
      OutTextXY(30,250,'program.I asked Anton to come tomy team.He agreed, and we made');
      OutTextXY(30,270,'"STAR WARS._special_function_".');
      SetTextStyle(7,0,1);
      OutTextXY(30,290,'  Your wishes and remarks send on this address:');
      OutTextXY(30,310,'      SPACE.MegaGALAXY.GALAXY     >>');
      OutTextXY(30,330,'      Milky Way.Sun System.Earth  >>');
      OutTextXY(30,350,'      Europe.Ukraine.Vinnitsa     >>');
      OutTextXY(30,370,'      Hmelnitsky Shosse 22(PDU).Room №1 ; №8');
      SetTextStyle(1,0,1);
      OutTextXY(600,560,'press <<ENTER>>');
    end;{drawAM}

  BEGIN {ABOUTMENU}
   DrawAM;
   ReadEnter;
  END;{ABOUTMENU}

  PROCEDURE ShipsMenu;
     Procedure DrawSM;
     begin
       Cleardevice;
       DoubleCode;
       Button[13].draw;
       Button[14].draw;
       Button[15].draw;
       Button[16].draw;
       DrawShip001(400,30);
       DrawShip002(400,150);
       DrawShip003(400,290);
     end;
  BEGIN
    DrawSM;
    Repeat
      Straight.CreateKey;
      Case Straight.press of
       1:Ship.ShType:=Ship001;
       2:Ship.ShType:=Ship002;
       3:Ship.ShType:=Ship003;
      End;{Case ...}
    Until Straight.press=4;
  END;

  PROCEDURE LangMenu;
    procedure DrawLM;
    begin
      Cleardevice;
      doublecode;
      Button[17].draw;
      Button[18].draw;
      Button[19].draw;
      Button[20].draw;
    end;
  Begin
    DrawLM;
    Straight.Draw;
    Repeat
      Straight.CreateKey;
      Case Straight.press of
        1:begin
            Languarge:=russian;
            InitLang;
            DrawLM;
            Straight.draw;
          end;
        2:begin
            Languarge:=english;
            InitLang;
            DrawLM;
            Straight.draw;
          end;
        3:begin
            Languarge:=ukrainian;
            InitLang;
            DrawLM;
            Straight.draw;
          end;
      End;
    Until Straight.press=4;
  End;

  procedure AutomaticSetting;
  begin
    left:=#75;
    right:=#77;
    plus:='=';
    minus:='-';
    pause:='p';
    fire:=#32;
    jdamfire:='z';
    easyfire:='x';
  end;

  PROCEDURE SetUpMENU;
    VAR Str1,Str2,Str3:String;
  BEGIN
    RestoreCrtMode;
    ClrScr;
    Window(1,1,80,25);
    TextBackGround(1);
    TextColor(14);
    GoToXY(1,1);
    Write('╔══════════════════════════════════════════════════════════════════════════════╗');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    write('║                                                                              ║');
    Write('╚══════════════════════════════════════════════════════════════════════════════╝');
    TextColor(14);
    GoToXY(2,2);
    Write('____________________________STAR_WARS_SETUP___________________________________');
    GoToXY(2,4);
    Write('Hear You can change controls. At first You must enter key word ,then You press');
    GoToXY(2,5);
    Write('new control key.');
    TextColor(3);
    GoToXY(3,6);
    Write(' Key words:');
    GoToXY(2,7);
    Write('"left" - to move ship left;');
    GoToXY(2,8);
    Write('"right" - to move ship right;');
    GoToXY(2,9);
    Write('"more" - to increment ship speed;');
    GoToXY(2,10);
    Write('"less" - to decrement ship speed;');
    GoToXY(2,11);
    Write('"laser" - to attack with laser;');
    GoToXY(2,12);
    Write('"jdam" - to attack with jdam rockets;');
    GoToXY(2,13);
    Write('"ammo" - to attack with rockets;');
    GoToXY(2,14);
    Write('"pause" - to pause game;');
    GoToXY(2,15);
    Write('"exit" - to quit from setup;');
    GoToXY(2,16);
    Write('"default" - to create automatic settings');
    Window(1,19,80,25);
    TextColor(2);
    TextBackGround(0);
    Writeln('Enter key word:');
    Write('>');
    Repeat
      ClrScr;
      Writeln('Enter key word:');
      Write('>');
      ReadLn(str1);
      If Str1='left' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); Left:=ReadKey; if left=#0 then left:= readkey;
        end;

      If Str1='right' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); Right:=ReadKey; if Right=#0 then Right:= readkey;
        end;

      If {UpCase}(Str1)='MORE' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); plus:=ReadKey; if plus=#0 then plus:= readkey;
        end;

      If {UpCase}(Str1)='LESS' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); minus:=ReadKey; if minus=#0 then minus:= readkey;
        end;

      If {UpCase}(Str1)='LASER' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); fire:=ReadKey; if fire=#0 then fire:= readkey;
        end;

      If {UpCase}(Str1)='JDAM' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); jdamfire:=ReadKey; if jdamfire=#0 then jdamfire:= readkey;
        end;

      If {UpCase}(Str1)='AMMO' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); easyfire:=ReadKey; if easyfire=#0 then easyfire:= readkey;
        end;

      If {UpCase}(Str1)='PAUSE' then
        begin
          GoToXY(1,3);
          WriteLn('Press a new control :');
          Write('>'); pause:=ReadKey; if pause=#0 then pause:= readkey;
        end;

      If {UpCase}(Str1)='DEFAULT' then
        begin
         AutomaticSetting;
        end;
    Until {UpCase}(str1)='EXIT';
    initgraph(gd,gm,'');
    SetGraphMode(gd);
  END;



  PROCEDURE OptionsMenu;
     procedure DrawOM;
     begin
       ClearDevice;
       doublecode;
       button[9].draw;
       button[10].draw;
       button[11].draw;
       button[12].draw;
     end;
  BEGIN
    DrawOM;
    Straight.position:=1;
    Straight.Draw;
    Repeat
      Straight.CreateKey;
      if straight.press=1 then begin
        SetUpMenu;
        DrawOM;
        Straight.Draw;
        Straight.press:=0;
      end;
      if Straight.press=2 then begin
        ShipsMenu;
        DrawOM;
        Straight.Draw;
        Straight.press:=0;
      end;
      if Straight.press=3 then begin
        LangMenu;
        DrawOM;
        Straight.Draw;
        Straight.press:=0;
      end;
    Until Straight.press=4;
  END;

  PROCEDURE PlayMenu;

    procedure DrawPM;
    begin{DrawPM}
      ClearDevice;
      doublecode;
      Button[5].Draw;
      Button[6].Draw;
      Button[7].Draw;
      Button[8].Draw;
    end; {DrawPM}

  BEGIN{PlayMenu}
    DrawPM;
    Straight.position:=1;
    Straight.Draw;
    Repeat
      Straight.CreateKey;
      if Straight.press=4 then Quit;
    Until (Straight.press=1)or(Straight.press=2)or(Straight.press=3);
  END;{PlayMenu}

  PROCEDURE MainMenu;

    Procedure DrawMM;
    begin
      SetViewPort(1,1,getmaxx,getmaxy,true);
      ClearDevice;
      doublecode;
      Button[1].Draw;
      Button[2].Draw;
      Button[3].Draw;
      Button[4].Draw;
    end;

    var s1:string;

  BEGIN{MainMenu}
    DrawMM;
    Straight.Draw;
    Repeat
      Straight.CreateKey;
      case Straight.press of
       2:Begin
          OptionsMenu;
          DrawMM;
          Straight.Draw;
         End;
       3:Begin
          AboutMenu;
          DrawMM;
          Straight.Draw;
         End;
       4:quit;
      end;
    Until Straight.press=1;
    PlayMenu;
    If Straight.Press=3 then DemoGame;
    If Straight.press=2 then LoadGame;
    If Straight.Press=1 then
      BEGIN
        Ship.life:=100;
        getdir(0,s1);
        Assign(file1,s1+'\Missions\'+'All.Swf');
        ReSet(File1);
        readln(file1,s1);
        Ship.life:=100;
        {NewGameSetUp;}
        Ship.Initialize;
        Main(s1);
        While not(eof(file1)) do
          begin
            readln(file1,s1);
            If not(BreakDied)
             then  begin
               MakeUpGrade;
               EasySetUp;
               Main(s1);
             end;
          end;
        Close(File1);
        If not (breakdied) then  MainCongratulate;
        If     (breakdied) then  YouLost;
      END;
  END;{MainMenu}

  procedure MakeMainMenu;
       Procedure InitMenu;
            VAR F:TEXT;
         begin
           for i:=1 to 4 do button[i].StartUp(i);
           Button[5].StartUp(1);
           Button[6].StartUp(2);
           Button[7].StartUp(3);
           Button[8].StartUp(4);
           Button[9].StartUp(1);
           Button[10].StartUp(2);
           Button[11].StartUp(3);
           Button[12].StartUp(4);
           Button[13].StartUp(1);
           Button[14].StartUp(2);
           Button[15].StartUp(3);
           Button[16].StartUp(4);
           Button[17].StartUp(1);
           Button[18].StartUp(2);
           Button[19].StartUp(3);
           Button[20].StartUp(4);
           InitLang;
           Straight.Position:=1;
         end;

    Begin{Makemainmenu }
      InitMenu;
      Repeat
        SetViewPort(1,1,800,600,true);
        MainMenu;
      Until false;
    End;{Makemainmenu }



Begin
  InitializeAll;
  InitAll;
{ ZastavkaBeforeGame;}
  MakeMainMENU;
  CloseGraph;
End.