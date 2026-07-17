unit drawings;
interface
 Uses graph,crt,dos;

 type  tTable=Object
          x1,y1,x2,y2:integer;
          Caption:string[20];
          procedure Draw;
       end;

       tButton=object
         Caption:string[20];
         Style,size1,size2:integer;
         number:byte;
         x1,y1,x2,y2:integer;
         Procedure StartUp(num:byte);
         Procedure Draw;
       end;

 var
   DelTime :LongInt;
   Gd,Gm:integer;

 function  EnterPress:boolean;
 procedure ReadEnter;
 procedure initgr256;
 procedure initall;
 procedure DrawMeteorite(x,y:integer;napr:char);
 procedure DrawAvro(x,y:integer);

 procedure DrawShip001(x,y:integer);
 procedure DrawShip002(x1,y1:integer);
 procedure DrawShip003(x,y:integer);

 procedure DrawEnemyShip1(x,y:integer);
 procedure DrawEnemyShip2(x,y:integer);
 procedure DrawEnemyShip3(x,y:integer);
 procedure DrawEnemyShip4(x1,y1:integer);
 procedure DrawEnemyShip5(x,y:integer);
 procedure DrawEnemyShip6(x,y:integer);
 procedure DrawEnemyShip7(x,y:integer);
 procedure DrawEnemyShip8(x,y:integer);
 procedure DrawEnemyShip9(x,y:integer);
 procedure DrawEnemyShip10(x,y:integer);

 procedure DrawRocket001(x,y:integer);
 procedure DrawRocket002(x,y:integer);

 procedure YouLost;
 procedure Rect(x1,y1,x2,y2:integer);
 procedure DrawPause;
 function  ReadXY(x,y:integer; max:byte):String;
 function  StringUpCase(str1:string):string;
 procedure GetDelay;
 procedure Congratulate;
 procedure MainCongratulate;
 procedure Quit;

implementation
  var
   i,j :integer;
   ch        :char;

 procedure Quit;
   type arr=array[1..200,1..150] of byte;
        arrptr=arr;
   var  monitor:arrptr;
        c:char;
        Table:tTable;
   begin
     With table do begin
       x1:=301;
       y1:=201;
       x2:=500;
       y2:=350;
     end;
     for i:=1 to 200 do
      for j:=1 to 150 do
        begin
          monitor[i,j]:=GetPixel(i+300,j+200);
        end;
     Table.Draw;
     SetColor(14);
     SetTextStyle(1,0,1);
     OutTextXY(320,220,'  Do You really ');
     OutTextXY(320,240,'  want to quit ?');
     OutTextXY(320,260,'    (y/n)');
     Repeat
       c:=readkey;
     Until (c='y')or(c='Y')or(c='n')or(c='N');
     CASE C OF
       'y','Y':begin{'y','Y'}
                 CLoseGraph;
                 RestoreCrtMode;
                 Halt(1);
               end;{'y','Y'}
       'n','N':begin{ 'n','N'}
                 for i:=1 to 200 do
                 for j:=1 to 150 do
                 begin{for}
                   putpixel(i+300,j+200,monitor[i,j]);
                 end;{for}
               end;{ 'n','N'}

     END;
   end;

 procedure ReadEnter;
     var c:char;
   begin
     Repeat
      c:=readkey;
     Until readkey=#13;
   end;

 procedure GetDelay;
    var Hour,Min,Sec,Sec100,s:Word;
   begin
    DelTime:=0;
    Repeat
      GetTime(Hour,Min,sec,sec100);
    until Sec<>59;
    Sec100:=sec;
    Repeat
      GetTime(Hour,Min,sec,s);
      Delay(1);
      Inc(DelTime);
    Until Sec=Sec100+1;

   end;

 procedure Rect;
   begin
     SetColor(7);
     RectAngle(x1,y1,x2,y2);
     SetColor(8);
     RectAngle(x1+1,y1+1,x2-1,y2-1);
   end;

 procedure initgr256;
  begin
   gd:=InstallUserDriver('svga256m.bgi',nil);
   gm:=3;
   initgraph(gd,gm,'');
  end;

 procedure initall;
  begin
    InitGr256;
 {   InitMouse;}
    DirectVideo:=false;
    ClearDevice;
{    HideMouse;}
  end;

 Procedure DrawEnemyShip1;
     var x1,y1:integer;
   begin
     SetColor(4);
     x1:=getx; y1:=gety;
   MoveTo(x+20,y+10);
     LineTo(x+40,y+10);
     LineTo(x+60,y+30);
     LineTo(x+60,y+50);
     LineTo(x+40,y+70);
     LineTo(x+20,y+70);
     LineTo(x,y+50);
     LineTo(x,y+30);
     LineTo(x+20,y+10);
   MoveTo(x+5,y+25);
     LineTo(x,y+15);
     LineTo(x+10,y+10);
     LineTo(x+10,y+20);
   MoveTo(x+55,y+25);
     LineTo(x+60,y+15);
     LineTo(x+50,y+10);
     LineTo(x+50,y+20);
   MoveTo(x+25,y+10);
     LineTo(x+20,y+5);
     LineTo(x+40,y+5);
     LineTo(x+35,y+10);
   MoveTo(x+7,y+57);
     LineTo(x+7,y+70);
     LineTo(x+8,y+73);
     LineTo(x+9,y+73);
     LineTo(x+10,y+70);
     LineTo(x+10,y+61);
   MoveTo(x+35,y+70);
     LineTo(x+35,y+73);
     LineTo(x+47,y+73);
   MoveTo(x+47,y+63);
     LineTo(x+47,y+75);
     LineTo(x+50,y+80);
     LineTo(x+53,y+75);
     LineTo(x+53,y+57);
     SetFillStyle(1,4);
     FillEllipse(x+30,y+40,10,10);
     SetColor(252);
     Line(x+21,y+40,x+35,y+33);
     Line(x+35,y+33,x+33,y+48);
     Line(x+33,y+48,x+21,y+40);
     SetFillStyle(1,6);
{     Floodfill(x+20,y+20,4);}
     MoveTo(x1,y1);
     SetColor(14);
   end;

 Procedure DrawMeteorite(x,y:integer;napr:char);
    type
      koords=array[1..8]of integer;
    var
      xk,yk:^koords;
      i:byte;
  begin
    setcolor(1);
    new(xk);
    new(yk);
    if (napr='r')or(napr='R') then
      begin
       xk^[1]:=x;
       yk^[1]:=y;

       xk^[2]:=xk^[1]+100;
       yk^[2]:=yk^[1]+30;

       xk^[3]:=xk^[1]+80;
       yk^[3]:=yk^[1]+50;

       xk^[4]:=xk^[1]+60;
       yk^[4]:=yk^[1]+50;

       xk^[5]:=xk^[1]+80;
       yk^[5]:=yk^[1]+60;

       xk^[6]:=xk^[1]+90;
       yk^[6]:=yk^[1]+70;

       xk^[7]:=xk^[1]+80;
       yk^[7]:=yk^[1]+70;

       xk^[8]:=xk^[1];
       yk^[8]:=yk^[1]+100;
      end;

    if (napr='l')or(napr='L') then
      begin
       xk^[1]:=x;
       yk^[1]:=y;

       xk^[2]:=xk^[1]-100;
       yk^[2]:=yk^[1]+30;

       xk^[3]:=xk^[1]-80;
       yk^[3]:=yk^[1]+50;

       xk^[4]:=xk^[1]-60;
       yk^[4]:=yk^[1]+50;

       xk^[5]:=xk^[1]-80;
       yk^[5]:=yk^[1]+60;

       xk^[6]:=xk^[1]-90;
       yk^[6]:=yk^[1]+70;

       xk^[7]:=xk^[1]-80;
       yk^[7]:=yk^[1]+70;

       xk^[8]:=xk^[1];
       yk^[8]:=yk^[1]+100;
      end;

   for i:=2 to 8 do
    begin
      line(xk^[i-1],yk^[i-1],xk^[i],yk^[i]);
    end;
   line(xk^[1],yk^[1],xk^[8],yk^[8]);
   Dispose(xk);
   Dispose(yk);
  end;

procedure drawAvro;
    var contur:byte;
         x1,y1:word;
  begin
    x1:=x+51;
    y1:=y+27;
    rectangle(x,y,x+100,y+100);
    contur:=33;
    setcolor(contur);
    ellipse(x1,y1,0,180,4,28);
    ellipse(x1,y1+60,180,0,4,12);
    line(x1-4,y1,x1-54,y1+56);
    line(x1+4,y1,x1+54,y1+56);
    line(x1-54,y1+56,x1-54,y1+66);
    line(x1+54,y1+56,x1+54,y1+66);
    line(x1-54,y1+66,x1-4,y1+60);
    line(x1+54,y1+66,x1+4,y1+60);
    setfillstyle(1,4);
    floodfill(x1+30,y1+30,contur);
  end;

procedure DrawShip003;
 begin
  setcolor(14);
  Line(50+x,1+y,20+x,40+y);
  Line(50+x,1+y,80+x,40+y);
  Line(50+x,30+y,65+x,55+y);
  Line(50+x,30+y,35+x,55+y);
  Line(20+x,40+y,35+x,55+y);
  Line(80+x,40+y,65+x,55+y);
  line(50+x,30+y,50+x,60+y);
  setfillstyle(1,1);
  floodfill(x+50,y+10,14);
  bar(40+x,60+y,60+x,65+y);
  rectangle(40+x,60+y,60+x,65+y);
 end;

procedure DrawShip001;
    var contur:byte;
  begin
    contur:=14;
    SetColor(contur);
    Line(x+50,y,x+40,y+63);
    Line(x+50,y,x+60,y+63);
    Line(x+40,y+63,x+40,y+80);
    Line(x+60,y+63,x+60,y+80);
    Line(x+40,y+80,x+50,y+95);
    Line(x+60,y+80,x+50,y+95);
    Line(x+40,y+63,x+30,y+60);
    Line(x+60,y+63,x+70,y+60);
    Line(x+40,y+80,x+30,y+77);
    Line(x+60,y+80,x+70,y+77);
    Line(x+22,y+81,x+25,y+90);
    Line(x+28,y+81,x+25,y+90);
    Line(x+72,y+81,x+75,y+90);
    Line(x+78,y+81,x+75,y+90);
    Line(x+50,y+17,x+48,y+30);
    Line(x+50,y+17,x+52,y+30);
    Line(x+48,y+30,x+52,y+30);
    SetFillStyle(1,5);
{    FloodFill(x+50,y+50,contur);}
    SetFillStyle(6,5);
    Bar(x+20,y+58,x+30,y+80);
    Bar(x+70,y+58,x+80,y+80);
    RectAngle(x+20,y+58,x+30,y+80);
    RectAngle(x+70,y+58,x+80,y+80);
    SetFillStyle(1,18);
{    FloodFill(x+35,y+70,contur);
    FloodFill(x+65,y+70,contur);}
  end;

procedure DrawRocket001;
 begin
  ellipse(x,y-2,315,225,2,13);
  line(x-2,y,x-4,y-1);
  line(x+2,y,x+4,y-1);
  line(x-4,y-1,x-4,y-2);
  line(x+4,y-1,x+4,y-2);
  line(x-4,y-2,x-2,y-3);
  line(x+4,y-2,x+2,y-3);
  line(x-2,y+5,x-10,y+27);
  line(x+2,y+5,x+10,y+27);
  line(x-10,y+27,x-3,y+26);
  line(x+10,y+27,x+3,y+26);
  line(x-3,y+26,x+3,y+26);
  line(x-3,y+19,x-3,y+27);
  line(x+3,y+19,x+3,y+27);
 end;

procedure DrawRocket002;
  begin
    line(x+5,y+3,x+7,y);
    line(x+10,y+3,x+8,y);
    line(x+5,y+3,x+5,y+15);
    line(x+10,y+3,x+10,y+15);
    line(x+5,y+15,x,y+25);
    line(x+10,y+15,x+15,y+25);
    line(x,y+25,x+15,y+25);
    rectangle(x+7,y+16,x+8,y+25);
  end;

  function ReadXY;
      var S:String;
          X1,Y1,k:integer;
          c,c1:char;
    begin
        SetFillStyle(1,1);
        SetTextStyle(1,0,1);
        SetColor(15);
        s:='                         ';
        k:=0;
        x1:=x;
        y1:=y;
      Repeat
        c:=readkey;
        case c of
           #13: ;
           #8:  begin
                  if x1>=x then
                    begin
                      bar(x1,y1,x1+20,y+20);
                      delete(s,length(s),1);
                      dec(k);
                      x1:=x1-20;
                    end;
                end
           else
             begin
               Inc(k);
               x1:=x1+20;
               OutTextXY(x1,y1,c);
               s[k]:=c;
             end;
        end;
      c1:=c;
      Until c=#13;
      repeat
        if s[length(s)]=' ' then  delete(s,length(s),1);
        if Length(s)>k then  delete(s,length(s),1);
      until (s[length(s)]<> ' ')and(length(s)<=k);
      ReadXY:=s;
    end;

  procedure DrawPause;
      var table:tTable;
    begin
      With Table do begin
        x1:=250;
        x2:=550;
        y1:=200;
        y2:=400;
        Draw;
      End;
      SetFillStyle(1,249);
      SetColor(6);
      FillEllipse(400,350,30,10);
      SetColor(78);
      FillEllipse(400,250,50,15);
      Line(350,250,370,350);
      Line(450,250,430,350);
      Ellipse(400,350,180,0,30,10);
      SetFillStyle(1,6);
      FloodFill(400,300,78);
      SetTextStyle(2,0,5);
      OutTextXY(380,300,'Coffee');
      SetTextStyle(1,0,1);
      {SHADOW}
      SetColor(7);
      OutTextXY(305,225,'P');
      OutTextXY(355,245,'A');
      OutTextXY(405,265,'U');
      OutTextXY(455,245,'S');
      OutTextXY(505,225,'E');
      {TEXT}
      SetColor(14);
      OutTextXY(300,230,'P');
      OutTextXY(350,250,'A');
      OutTextXY(400,270,'U');
      OutTextXY(450,250,'S');
      OutTextXY(500,230,'E');
    end;

procedure DrawShip002(x1,y1:integer);
  var x,y:integer;
      contur:byte;
begin
  x:=x1+15;
  y:=y1;
  Contur:=120;
  setcolor(contur);
  line(x+29,y+12,x+38,y+12);
  line(x+29,y+12,x+19,y+22);
  line(x+38,y+12,x+48,y+22);
  line(x+19,y+22,x+19,y+26);
  line(x+48,y+22,x+48,y+26);
  line(x+20,y+27,x+22,y+27);
  line(x+47,y+27,x+45,y+27);
  line(x+23,y+26,x+24,y+25);
  line(x+27,y+27,x+25,y+25);
  line(x+27,y+27,x+27,y+29);
  line(x+28,y+30,x+29,y+31);
  line(x+29,y+32,x+27,y+34);
  line(x+27,y+34,x+27,y+38);
  line(x+27,y+38,x+25,y+40);
  line(x+25,y+40,x+25,y+45);
  line(x+24,y+46,x+22,y+46);
  line(x+21,y+47,x+21,y+54);
  line(x+21,y+54,x+13,y+62);
  line(x+13,y+62,x+13,y+64);
  line(x+13,y+64,x+11,y+66);
  line(x+11,y+66,x+11,y+67);
  line(x+11,y+67,x+10,y+68);
  line(x+10,y+68,x+9,y+68);
  line(x+9,y+68,x+5,y+72);
  line(x+5,y+73,x+4,y+74);
  line(x+3,y+73,x+2,y+72);
  line(x+2,y+71,x+2,y+70);
  line(x+2,y+70,x,y+68);
  line(x,y+68,x,y+66);
  line(x,y+66,x-2,y+64);
  line(x-2,y+64,x-2,y+62);
  line(x-2,y+62,x-3,y+63);
  line(x-3,y+63,x-3,y+90);
  line(x-2,y+91,x,y+91);
  line(x,y+91,x+4,y+87);
  line(x+5,y+87,x+6,y+86);
  line(x+7,y+86,x+12,y+81);
  line(x+12,y+81,x+16,y+81);
  line(x+16,y+81,x+20,y+77);
  line(x+21,y+77,x+23,y+79);
  line(x+23,y+80,x+23,y+81);
  line(x+24,y+82,x+25,y+83);
  line(x+25,y+83,x+30,y+83);
  line(x+30,y+83,x+32,y+81);
  line(x+32,y+81,x+32,y+75);
  line(x+32,y+75,x+35,y+75);
  line(x+35,y+75,x+35,y+81);
  line(x+35,y+81,x+37,y+83);
  line(x+37,y+83,x+42,y+83);
  line(x+42,y+83,x+44,y+81);
  line(x+44,y+81,x+44,y+78);
  line(x+45,y+78,x+46,y+77);
  line(x+47,y+77,x+51,y+81);
  line(x+51,y+81,x+55,y+81);
  line(x+55,y+81,x+61,y+87);
  line(x+61,y+87,x+63,y+87);
  line(x+63,y+87,x+67,y+91);
  line(x+67,y+91,x+69,y+91);
  line(x+70,y+90,x+70,y+63);
  line(x+69,y+62,x+69,y+65);
  line(x+69,y+64,x+67,y+66);
  line(x+67,y+66,x+67,y+68);
  line(x+67,y+68,x+65,y+70);
  line(x+65,y+70,x+65,y+74);
  line(x+64,y+74,x+58,y+68);
  line(x+57,y+68,x+56,y+67);
  line(x+56,y+66,x+54,y+64);
  line(x+54,y+63,x+53,y+62);
  line(x+53,y+61,x+47,y+55);
  line(x+53,y+61,x+46,y+54);
  line(x+46,y+54,x+46,y+47);
  line(x+45,y+46,x+43,y+46);
  line(x+43,y+45,x+42,y+44);
  line(x+42,y+44,x+42,y+40);
  line(x+42,y+40,x+40,y+38);
  line(x+40,y+38,x+40,y+34);
  line(x+40,y+34,x+38,y+32);
  line(x+38,y+31,x+40,y+29);
  line(x+40,y+29,x+40,y+26);
  line(x+41,y+26,x+42,y+25);
  line(x+43,y+25,x+45,y+27);
  setfillstyle(1,contur);
  floodfill(x+50,y+70,contur);
  setcolor(4);
  rectangle(x+29,y,x+30,y+18);
  rectangle(x+37,y,x+38,y+18);
rectangle(x+27,y+4,x+28,y+5);
putpixel(x+28,y+3,4);
putpixel(x+28,y+6,4);
rectangle(x+31,y+4,x+32,y+5);
putpixel(x+31,y+3,4);
putpixel(x+31,y+6,4);
rectangle(x+35,y+4,x+36,y+5);
rectangle(x+39,y+4,x+40,y+5);
putpixel(x+36,y+3,4);
putpixel(x+36,y+6,4);
putpixel(x+39,y+3,4);
putpixel(x+39,y+6,4);
rectangle(x+27,y+8,x+28,y+9);
rectangle(x+31,y+8,x+32,y+9);
rectangle(x+35,y+8,x+36,y+9);
rectangle(x+39,y+8,x+40,y+9);
rectangle(x+27,y+16,x+28,y+23);
rectangle(x+31,y+16,x+32,y+23);
putpixel(x+28,y+15,4);
putpixel(x+31,y+15,4);
putpixel(x+28,y+24,4);
putpixel(x+31,y+24,4);
rectangle(x+29,y+22,x+30,y+25);
rectangle(x+39,y+16,x+40,y+23);
rectangle(x+35,y+16,x+36,y+23);
rectangle(x+37,y+22,x+38,y+25);
putpixel(x+36,y+15,4);
putpixel(x+39,y+15,4);
putpixel(x+36,y+24,4);
putpixel(x+39,y+24,4);
rectangle(x+31,y+28,x+32,y+33);
rectangle(x+35,y+28,x+36,y+33);
rectangle(x+33,y+42,x+34,y+44);
rectangle(x+23,y+52,x+24,y+69);
rectangle(x+43,y+52,x+44,y+69);
rectangle(x+21,y+66,x+22,y+67);
rectangle(x+25,y+66,x+26,y+67);
rectangle(x+41,y+66,x+42,y+67);
rectangle(x+45,y+66,x+46,y+67);
putpixel(x+22,y+65,4);
putpixel(x+22,y+68,4);
putpixel(x+25,y+65,4);
putpixel(x+25,y+68,4);
putpixel(x+45,y+65,4);
putpixel(x+45,y+68,4);
putpixel(x+42,y+65,4);
putpixel(x+42,y+68,4);
rectangle(x+9,y+68,x+10,y+85);
rectangle(x+57,y+68,x+58,y+85);
rectangle(x+7,y+82,x+8,y+83);
rectangle(x+11,y+82,x+12,y+83);
putpixel(x+8,y+81,4);
putpixel(x+8,y+84,4);
putpixel(x+11,y+81,4);
putpixel(x+11,y+84,4);
rectangle(x+55,y+82,x+56,y+83);
rectangle(x+59,y+82,x+60,y+83);
putpixel(x+56,y+81,4);
putpixel(x+56,y+84,4);
putpixel(x+59,y+81,4);
putpixel(x+59,y+84,4);
line(x+29,y+64,x+33,y+60);
line(x+34,y+60,x+38,y+64);
line(x+29,y+68,x+33,y+64);
line(x+34,y+64,x+38,y+68);
line(x+29,y+72,x+33,y+68);
line(x+34,y+68,x+38,y+72);
putpixel(x+32,y+73,4);
putpixel(x+33,y+72,4);
putpixel(x+34,y+72,4);
putpixel(x+35,y+73,4);
putpixel(x+31,y+49,7);
putpixel(x+32,y+48,7);
putpixel(x+36,y+49,7);
putpixel(x+35,y+48,7);
setcolor(7);
line(x+31,y+53,x+33,y+51);
line(x+36,y+53,x+34,y+51);
line(x+31,y+57,x+33,y+55);
line(x+36,y+57,x+34,y+55);
line(x+29,y+63,x+33,y+59);
line(x+38,y+63,x+34,y+59);
line(x+29,y+67,x+33,y+63);
line(x+38,y+67,x+34,y+63);
line(x+29,y+71,x+33,y+67);
line(x+38,y+71,x+34,y+67);
line(x+31,y+73,x+33,y+71);
line(x+34,y+71,x+36,y+73);
setcolor(14);
line(x+33,y+73,x+34,y+73);
line(x+31,y+51,x+33,y+49);
line(x+36,y+51,x+34,y+49);
line(x+31,y+55,x+33,y+53);
line(x+36,y+55,x+34,y+53);
line(x+31,y+59,x+33,y+57);
line(x+36,y+59,x+34,y+57);
line(x+33,y+61,x+29,y+65);
line(x+34,y+61,x+38,y+65);
line(x+33,y+65,x+29,y+69);
line(x+34,y+65,x+38,y+69);
line(x+33,y+69,x+29,y+73);
line(x+34,y+69,x+38,y+73);
setcolor(1);
line(x+31,y+52,x+33,y+50);
line(x+36,y+52,x+34,y+50);
line(x+31,y+56,x+33,y+54);
line(x+36,y+56,x+34,y+54);
line(x+29,y+62,x+33,y+58);
line(x+38,y+62,x+34,y+58);
line(x+29,y+66,x+33,y+62);
line(x+38,y+66,x+34,y+62);
line(x+29,y+70,x+33,y+66);
line(x+38,y+70,x+34,y+66);
line(x+30,y+73,x+33,y+70);
line(x+34,y+70,x+37,y+73);
end;

procedure tButton.StartUp;
  begin
    Caption:='Button';
    Style:=1;
    Size1:=4;
    Size2:=1;
    x1:=100;
    X2:=400;
    y1:=100;y2:=200;
    Case num of
      1:begin
          y1:=025;
          y2:=125;
        end;
      2:begin
          y1:=150;
          y2:=250;
        end;
      3:begin
          y1:=275;
          y2:=375;
        end;
      4:begin
          y1:=400;
          y2:=500;
        end;
    end;{case}
    If num=5 then begin x1:=600; y1:=480; x2:=780; y2:=550; end;
  end;

procedure tButton.Draw;
    const col1=17;
          col2=14;
    var texty1,texty2,texty,i:integer;
  begin
    SetColor(Col1);
    SetFillStyle(1,1);
    SetTextStyle(style,0,size1);
    Bar(x1,y1,x2,y2);
    TextY:=1;
    for i:=16 to 31 do
      begin
        inc(texty);
        setcolor(i);
        Rectangle(x1+texty,y1+texty,x2-texty,y2-texty);
      end;
    SetColor(16);
    texty1:=(((x2-16)-(x1+16)-textwidth(caption))div 2)+x1+16;
    texty:=(((y2-16)-(y1+16)-textheight(caption))div 2)+y1+16;
    OutTextXY(Texty1,texty,caption);
  end;


 procedure Congratulate;
   var
      bool:boolean;
   begin
     j:=17;
     bool:=true;
     For i:=1 to 400 do
     begin
       setcolor(j);
       rectangle(400-i,250-i,400+i,250+i);
       if bool then inc(j) else dec(j);
       if j=31 then bool:=false;
       if j=17 then bool:=true;
     end;
     SetFillStyle(1,0);
     For i:=1 to 100 do
       begin
       FillEllipse(400,250,i,i);
       end;
     SetColor(4);
     SetTextStyle(1,0,5);
     Outtextxy(200,50,'My congratulations!!!');
     Delay(DelTime);
     SetTextStyle(0,0,2);
     OutTextXY(200,150,'You finished this MISSION! ');
     Delay(DelTime);
     OutTextXY(200,200,'Now You are at the next planet.');
     Delay(DelTime);
     OutTextXY(200,250,'Press <enter>');
     ReadEnter;
   end;

 procedure DrawEnemyShip2(x,y:integer);
   begin
   setcolor(5);
   MoveTo(x+30,y+10);
     LineTo(x+30,y+50);
     LineTo(x+40,y+80);
     LineTo(x+50,y+50);
     LineTo(x+50,y+10);
     LineTo(x+30,y+10);
   MoveTo(x+33,y+10);
     LineTo(x+31,y+6);
     LineTo(x+49,y+6);
     LineTo(x+47,y+10);
   MoveTo(x+40,y+70);
     LineTo(x+35,y+50);
     LineTo(x+45,y+50);
     LineTo(x+40,y+70);
     PutPixel(x+34,y+8,14);
     PutPixel(x+36,y+8,14);
     PutPixel(x+38,y+8,14);
     PutPixel(x+40,y+8,14);
     PutPixel(x+42,y+8,14);
     PutPixel(x+44,y+8,14);
     PutPixel(x+46,y+8,14);
     SetFillStyle(1,2);
     {FloodFill(x+40,y+20,5);}
     Ellipse(x+15,y+40,0,180,15,4);
     Line(x,y+40,x,y+15);
     Ellipse(x+15,y+15,180,0,15,4);
     Ellipse(x+65,y+40,0,180,15,4);
     Line(x+80,y+40,x+80,y+15);
     Ellipse(x+65,y+15,180,0,15,4);
     Line(x+5,y+23,x+5,y+33);
     Line(x+9,y+23,x+9,y+33);
     Line(x+13,y+23,x+13,y+33);
     Line(x+17,y+23,x+17,y+33);
     Line(x+21,y+23,x+21,y+33);
     Line(x+25,y+23,x+25,y+33);

     Line(x+54,y+23,x+54,y+33);
     Line(x+58,y+23,x+58,y+33);
     Line(x+62,y+23,x+62,y+33);
     Line(x+66,y+23,x+66,y+33);
     Line(x+70,y+23,x+70,y+33);
     Line(x+74,y+23,x+74,y+33);
     SetColor(14);
   end;

   Function EnterPress;
       var c:char;
   begin
     while keypressed do c:=readkey;
     if c=#13 then EnterPress:=True else EnterPress:=False;
   end;

   procedure tTable.Draw;
   begin{tTable.Draw;}
     SetFillStyle(1,1);
     Bar(x1,y1,x2,y2);
     j:=15;
     For i:=0 to 16 do
     begin
       Inc(j);
       SetColor(j);
       rectangle(x1+i,y1+i,x2-i,y2-i);
     end;
   end;{tTable.Draw;}

  procedure DrawEnemyShip3(x,y:integer);
  begin
  setcolor(6);
  line(x,y+10,x+60,y+10);
  line(x,y+10,x+20,y+50);
  line(x+20,y+50,x+20,y+70);
  line(x+60,y+10,x+40,y+50);
  line(x+40,y+50,x+40,y+70);
  line(x+40,y+70,x+30,y+90);
  line(x+20,y+70,x+30,y+90);
  setcolor(14);
  rectangle(x+3,y+10,x+17,y+5);
  rectangle(x+57,y+10,x+43,y+5);
  setcolor(4);
  rectangle(x+4,y+9,x+16,y+6);
  rectangle(x+56,y+9,x+44,y+6);
  setcolor(9);
  line(x+6,y+14,x+20,y+41);
  line(x+6,y+14,x+20,y+14);
  line(x+20,y+14,x+20,y+41);
  line(x+54,y+14,x+40,y+41);
  line(x+40,y+41,x+40,y+14);
  line(x+40,y+14,x+54,y+14);
  setcolor(6);
  rectangle(x+29,y+11,x+31,y+30);
  setcolor(5);
  line(x+25,y+15,x+25,y+65);
  line(x+25,y+65,x+35,y+65);
  line(x+35,y+65,x+35,y+15);
   setcolor(1);
  line(x+27,y+70,x+30,y+80);
  line(x+30,y+80,x+33,y+70);
  line(x+27,y+70,x+33,y+70);
  setcolor(4);
  line(x+1,y+11,x+16,y+40);
  line(x+2,y+11,x+17,y+40);
  line(x+3,y+11,x+18,y+40);
  line(x+4,y+11,x+19,y+40);
  setcolor(4);
  line(x+59,y+11,x+44,y+40);
  line(x+58,y+11,x+43,y+40);
  line(x+57,y+11,x+42,y+40);
  line(x+56,y+11,x+41,y+40);
  end;

procedure DrawEnemyShip4(x1,y1:integer);
  var x,y:integer;
begin
  x:=x1-3;
  y:=y1-2;
  setcolor(14);
  line(x+4,y+10,x+24,y+10);
  line(x+24,y+10,x+44,y+20);
  line(x+45,y+20,x+50,y+15);
  line(x+50,y+15,x+55,y+20);
  line(x+45,y+21,x+56,y+21);
  line(x+57,y+20,x+78,y+10);
  line(x+78,y+10,x+96,y+10);
  line(x+95,y+11,x+58,y+29);
  line(x+58,y+29,x+41,y+29);
  line(x+40,y+28,x+5,y+11);
  line(x+41,y+18,x+50,y+7);
  line(x+50,y+7,x+59,y+18);
  rectangle(x+41,y+29,x+59,y+56);
  line(x+41,y+56,x+33,y+48);
  line(x+32,y+48,x+32,y+56);
  line(x+32,y+56,x+46,y+70);
  line(x+59,y+56,x+67,y+48);
  line(x+68,y+48,x+68,y+56);
  line(x+68,y+56,x+54,y+70);
  line(x+50,y+29,x+50,y+85);
  line(x+46,y+70,x+54,y+70);
  line(x+46,y+70,x+46,y+80);
  line(x+54,y+70,x+54,y+80);
  line(x+47,y+81,x+48,y+84);
  line(x+53,y+81,x+52,y+84);
  line(x+49,y+85,x+51,y+85);
  setcolor(12);
  line(x+39,y+17,x+50,y+3);
  line(x+50,y+3,x+61,y+17);
  line(x+43,y+19,x+50,y+11);
  line(x+50,y+11,x+57,y+19);
  line(x+14,y+12,x+23,y+12);
  line(x+24,y+13,x+43,y+22);
  line(x+44,y+23,x+44,y+27);
  line(x+44,y+27,x+15,y+13);
  line(x+57,y+23,x+57,y+27);
  line(x+58,y+22,x+77,y+13);
  line(x+78,y+12,x+86,y+12);
  line(x+85,y+13,x+58,y+26);
  rectangle(x+25,y+22,x+26,y+31);
  rectangle(x+74,y+22,x+75,y+31);
  line(x+34,y+52,x+34,y+55);
  line(x+34,y+55,x+46,y+67);
  line(x+34,y+52,x+46,y+64);
  line(x+46,y+64,x+46,y+67);
  line(x+66,y+52,x+66,y+55);
  line(x+66,y+52,x+54,y+64);
  line(x+66,y+55,x+54,y+67);
  line(x+54,y+64,x+54,y+67);
  line(x+40,y+65,x+40,y+69);
  line(x+60,y+65,x+60,y+69);
  setcolor(11);
  line(x+45,y+23,x+56,y+27);
  line(x+45,y+27,x+56,y+23);
  setcolor(1);
  line(x+42,y+30,x+49,y+55);
  line(x+49,y+30,x+42,y+55);
  line(x+51,y+30,x+58,y+55);
  line(x+58,y+30,x+51,y+55);
  setcolor(9);
  line(x+47,y+71,x+49,y+84);
  line(x+53,y+71,x+51,y+84);
end;

procedure DrawEnemyShip5(x,y:integer);
 begin
   setcolor(2);
{   RectAngle(x,y,x+72,y+98);}
   line(x+24,y+70,x+48,y+70);
   line(x+36,y,x+24,y+69);
   line(x+36,y,x+47,y+67);
   line(x+23,y+70,x+22,y+70);
   line(x+21,y+71,x+20,y+70);
   line(x+20,y+70,x+19,y+70);
   line(x+48,y+68,x+49,y+69);
   line(x+50,y+69,x+51,+y+70);
   line(x+52,y+69,x+53,y+69);
   line(x+54,y+68,x+55,y+67);
   line(x+55,y+67,x+55,y+41);
   line(x+55,y+41,x+64,y+41);
   line(x+64,y+41,x+64,y+68);
   line(x+64,y+68,x+72,y+68);
   line(x+72,y+68,x+43,y+87);
   line(x+54,y+70,x+36,y+98);
   line(x+36,y+98,x+18,y+70);
   line(x+18,y+70,x+18,y+68);
   line(x+17,y+67,x+17,y+41);
   line(x+17,y+41,x+8,y+41);
   line(x+8,y+41,x+8,y+68);
   line(x+8,y+68,x,y+68);
   line(x,y+68,x+28,y+86);
   line(x+32,y+33,x+35,y+23);
   line(x+37,y+23,x+40,y+33);
   line(x+31,y+40,x+35,y+48);
   line(x+37,y+48,x+41,y+40);
   setcolor(7);
   line(x+36,y+4,x+36,y+69);
   setcolor(12);
   rectangle(x+11,y+76,x+12,y+85);
   rectangle(x+60,y+76,x+61,y+85);
   line(x+9,y+68,x+16,y+42);
   line(x+16,y+68,x+9,y+42);
   line(x+56,y+68,x+63,y+42);
   line(x+63,y+68,x+56,y+42);
   line(x+9,y+40,x+12,y+21);
   line(x+13,y+21,x+16,y+40);
   line(x+56,y+40,x+59,y+21);
   line(x+60,y+21,x+63,y+40);
   line(x+11,y+40,x+12,y+33);
   line(x+13,y+33,x+14,y+40);
   line(x+58,y+40,x+59,y+33);
   line(x+60,y+33,x+61,y+40);
   setcolor(14);
   line(x+10,y+40,x+13,y+25);
   line(x+12,y+25,x+15,y+40);
   line(x+57,y+40,x+60,y+25);
   line(x+59,y+25,x+62,y+40);
   setcolor(1);
   line(x+24,y+70,x+36,y+82);
   line(x+36,y+82,x+48,y+70);
   line(x+29,y+75,x+36,y+95);
   line(x+36,y+95,x+44,y+74);
   line(x+36,y+95,x+36,y+82);
   line(x+30,y+76,x+36,y+70);
   line(x+36,y+70,x+42,y+76);
   setcolor(9);
   line(x+25,y+69,x+35,y+59);
   line(x+37,y+59,x+47,y+69);
   line(x+35,y+69,x+30,y+64);
   line(x+36,y+70,x+42,y+64);
 end;

procedure DrawEnemyShip6(x,y:integer);
begin
  setcolor(14);
{  rectangle(x,y,x+72,y+84);}
  line(x,y,x+4,y+44);
  line(x+4,y+44,x+13,y+44);
  line(x+13,y+44,x+13,y+10);
  line(x+13,y+10,x+31,y+28);
  line(x,y,x+72,y);
  line(x+72,y,x+68,y+44);
  line(x+68,y+44,x+59,y+44);
  line(x+59,y+44,x+59,y+10);
  line(x+59,y+10,x+41,y+28);
  line(x+32,y,x+32,y+75);
  line(x+40,y,x+40,y+75);
  line(x+36,y,x+36,y+83);
  line(x+36,y+83,x+33,y+76);
  line(x+36,y+83,x+39,y+76);
  setcolor(12);
  line(x+2,y+2,x+6,y+42);
  line(x+6,y+42,x+11,y+42);
  line(x+11,y+42,x+11,y+5);
  line(x+11,y+5,x+30,y+24);
  line(x+30,y+24,x+30,y+2);
  line(x+30,y+2,x+2,y+2);
  line(x+42,y+2,x+42,y+24);
  line(x+42,y+24,x+61,y+5);
  line(x+61,y+5,x+61,y+42);
  line(x+61,y+42,x+66,y+42);
  line(x+66,y+42,x+70,y+2);
  line(x+70,y+2,x+42,y+2);
  setcolor(7);
  line(x+13,y+4,x+28,y+19);
  line(x+13,y+4,x+28,y+4);
  line(x+28,y+4,x+28,y+19);
  line(x+44,y+4,x+44,y+19);
  line(x+44,y+4,x+59,y+4);
  line(x+44,y+19,x+59,y+4);
  setcolor(2);
  rectangle(x+33,y+1,x+35,y+75);
  rectangle(x+37,y+1,x+39,y+75);
  setcolor(9);
  line(x+34,y+2,x+34,y+74);
  line(x+38,y+2,x+38,y+74);
  setcolor(11);
  line(x+34,y+76,x+35,y+79);
  line(x+38,y+76,x+37,y+79);
  line(x+35,y+76,x+35,y+77);
  line(x+36,y+76,x+35,y+76);
end;

procedure DrawEnemyShip7(x,y:integer);
  begin
  setcolor(7);
  line(x,y+10,x+3,y+12);
  line(x+4,y+12,x+7,y+13);
  line(x+8,y+13,x+14,y+13);
  line(x+20,y+10,x+17,y+12);
  line(x+16,y+12,x+15,y+12);
  line(x+1,y+12,x+3,y+23);
  line(x+19,y+12,x+17,y+23);
  line(x+3,y+23,x+1,y+41);
  line(x+17,y+23,x+19,y+41);
  line(x+1,y+42,x,y+43);
  line(x+19,y+42,x+20,y+43);
  line(x,y+44,x+1,y+53);
  line(x+20,y+44,x+19,y+53);
  line(x+2,y+54,x+3,y+60);
  line(x+18,y+54,x+17,y+60);
  line(x+4,y+61,x+5,y+63);
  line(x+16,y+61,x+15,y+63);
  line(x+6,y+64,x+10,y+69);
  line(x+14,y+64,x+10,y+69);
  setcolor(14);
  line(x+1,y,x+1,y+8);
  line(x+4,y+1,x+4,y+9);
  line(x+7,y+4,x+7,y+10);
  line(x+10,y+5,x+10,y+11);
  line(x+13,y+4,x+13,y+10);
  line(x+16,y+1,x+16,y+9);
  line(x+19,y,x+19,y+8);
  setcolor(4);
  line(x+6,y+14,x+14,y+14);
  line(x+6,y+14,x+10,y+25);
  line(x+10,y+25,x+14,y+14);
  setcolor(10);
  line(x+4,y+37,x+7,y+49);
  line(x+10,y+35,x+10,y+49);
  line(x+16,y+37,x+13,y+49);
  setcolor(9);
  line(x+6,y+51,x+14,y+51);
  line(x+6,y+51,x+10,y+60);
  line(x+10,y+60,x+14,y+51);
  end;

procedure DrawEnemyShip8(x,y:integer);
begin
  SETCOLOR(1);
{  RectAngle(x,y,x+40,y+60);}
  LINE(X+5,y+3,x+5,y+20);
  line(x+4,y+21,x+2,y+23);
  line(x+2,y+24,x,y+27);
  line(x,y+27,x,y+33);
  line(x+1,y+34,x+3,y+38);
  putpixel(x+4,y+39,1);
  line(x+5,y+40,x+5,y+57);
  line(x+6,y+58,x+7,y+60);
  line(x+8,y+60,x+10,y+56);
  line(x+10,y+56,x+10,y+35);
  line(x+11,y+34,x+20,y+51);
  line(x+20,y+51,x+29,y+34);
  line(x+30,y+35,x+30,y+57);
  line(x+31,y+58,x+32,y+60);
  line(x+33,y+60,x+35,y+56);
  line(x+35,y+56,x+35,y+40);
  line(x+36,y+39,x+39,y+35);
  putpixel(x+39,y+34,1);
  line(x+40,y+33,x+40,y+27);
  line(x+40,y+27,x+37,y+22);
  putpixel(x+36,y+22,1);
  line(x+35,y+20,x+35,y+3);
  line(x+35,y+3,x+33,y+0);
  line(x+32,y,x+30,y+3);
  line(x+30,y+3,x+30,y+25);
  line(x+29,y+26,x+28,y+27);
  line(x+27,y+27,x+25,y+24);
  line(x+24,y+24,x+20,y+22);
  line(x+19,y+22,x+16,y+24);
  line(x+15,y+24,x+14,y+26);
  line(x+14,y+26,x+13,y+27);
  line(x+12,y+27,x+10,y+25);
  line(x+10,y+25,x+10,y+3);
  line(x+10,y+3,x+8,y);
  line(x+7,y,x+5,y+3);
  line(x+6,y+23,x+4,y+28);
  line(x+4,y+29,x+4,y+33);
  line(x+5,y+34,x+6,y+37);
  line(x+34,y+23,x+36,y+28);
  line(x+36,y+29,x+36,y+33);
  line(x+35,y+34,x+34,y+37);
  setcolor(4);
  line(x+11,y+12,x+15,y+10);
  line(x+15,y+10,x+15,y+23);
  line(x+29,y+12,x+25,y+10);
  line(x+25,y+10,x+25,y+23);
  setcolor(14);
  rectangle(x+12,y+13,x+13,y+25);
  rectangle(x+27,y+13,x+28,y+25);
  setcolor(9);
  line(x+16,y+37,x+24,y+37);
  line(x+16,y+37,x+20,y+46);
  line(x+20,y+46,x+24,y+37);
END;
  procedure DrawEnemyShip9(x,y:integer);
  begin
  setcolor(11);
  SetLineStyle(UserBitLn,21845,NormWidth);
  line(x+19,y+6,x+19,y+58);
  line(x+20,y+7,x+20,y+59);
  setcolor(14);
  line(x+35,y+46,x+35,y+58);
  line(x+36,y+47,x+36,y+59);
  setcolor(12);
  setlinestyle(UserBitLn,65535,NormWidth);
  line(x+17,y,x+19,y+5);
  line(x+20,y+5,x+22,y);
  line(x+17,y,x+22,y);
  setcolor(1);
  line(x,y+60,x+12,y+59);
  line(x+6,y+59,x+15,y+59);
  line(x+15,y+60,x+24,y+60);
  line(x+24,y+59,x+33,y+59);
  line(x+34,y+60,x+39,y+60);
  line(x,y+60,x,y+67);
  line(x,y+67,x+2,y+67);
  line(x+2,y+67,x+2,y+71);
  line(x+2,y+71,x+8,y+77);
  line(x+3,y+71,x+8,y+76);
  line(x+8,y+77,x+10,y+77);
  line(x+11,y+78,x+15,y+78);
  line(x+16,y+79,x+24,y+79);
  line(x+24,y+78,x+28,y+78);
  line(x+29,y+77,x+31,y+77);
  line(x+32,y+76,x+37,y+71);
  line(x+31,y+76,x+36,y+71);
  line(x+37,y+71,x+37,y+67);
  line(x+37,y+67,x+39,y+67);
  line(x+39,y+67,x+39,y+60);
  setcolor(9);
  line(x+15,y+68,x+19,y+77);
  line(x+20,y+77,x+24,y+68);
  line(x+15,y+68,x+24,y+68);
  setcolor(10);
  line(x+10,y+64,x+11,y+64);
  line(x+9,y+65,x+9,y+66);
  line(x+10,y+67,x+11,y+67);
  line(x+12,y+66,x+12,y+65);
  line(x+28,y+64,x+29,y+64);
  line(x+27,y+65,x+27,y+66);
  line(x+28,y+67,x+29,y+67);
  line(x+30,y+66,x+30,y+65);
  line(x+14,y+65,x+14,y+64);
  line(x+16,y+65,x+16,y+64);
  putpixel(x+15,y+66,10);
  putpixel(x+15,y+63,10);
  line(x+19,y+62,x+20,y+62);
  line(x+18,y+63,x+18,y+64);
  line(x+19,y+65,x+20,y+65);
  line(x+21,y+63,x+21,y+64);
  line(x+23,y+64,x+23,y+65);
  line(x+25,y+64,x+25,y+65);
  putpixel(x+24,y+63,10);
  putpixel(x+24,y+66,10);
  setlinestyle(userbitln,43690,normwidth);
  setcolor(14);
  line(x+3,y+46,x+3,y+59);
  line(x+4,y+45,x+4,y+58);
  SetLineStyle(SolidLn,0,NormWidth);
  END;

procedure DrawEnemyShip10(x,y:integer);
begin
setcolor(1);
line(x,y+10,x+19,y+10);
line(x+19,y+10,x+19,y+20);
line(x,y+10,x,y+20);
line(x,y+20,x+20,y+40);
line(x+20,y+40,x+20,y+70);
line(x+20,y+70,x+30,y+90);
line(x+30,y+90,x+40,y+70);
line(x+40,y+70,x+40,y+40);
line(x+40,y+40,x+60,y+20);
line(x+60,y+20,x+60,y+10);
line(x+60,y+10,x+40,y+10);
line(x+40,y+10,x+40,y+20);
line(x+19,y+20,x+25,y+25);
line(x+39,y+20,x+33,y+25);
line(x+26,y+25,x+29,y+26);
line(x+32,y+25,x+29,y+26);
setcolor(4);
line(x+2,y,x+2,y+8);
line(x+10,y,x+10,y+8);
line(x+18,y,x+18,y+8);
line(x+41,y,x+41,y+8);
line(x+49,y,x+49,y+8);
line(x+57,y,x+57,y+8);
line(x+8,y+29,x+8,y+49);
line(x+10,y+31,x+10,y+49);
line(x+8,y+55,x+8,y+60);
line(x+10,y+55,x+10,y+60);
line(x+9,y+61,x+9,y+62);
line(x+51,y+29,x+51,y+49);
line(x+49,y+31,x+49,y+49);
line(x+49,y+55,x+49,y+60);
line(x+51,y+55,x+51,y+60);
line(x+50,y+61,x+50,y+62);
line(x+27,y+40,x+33,y+40);
line(x+27,y+40,x+30,y+48);
line(x+33,y+40,x+30,y+48);
setcolor(9);
line(x+19,y+50,x,y+50);
line(x,y+50,x+19,y+59);
line(x+8,y+51,x+19,y+56);
line(x+19,y+53,x+15,y+51);
line(x+40,y+50,x+59,y+50);
line(x+59,y+50,x++40,y+59);
line(x+40,y+56,x+51,y+51);
line(x+44,y+51,x+40,y+53);
line(x+27,y+70,x+33,y+70);
line(x+33,y+70,x+30,y+84);
line(x+30,y+84,x+27,y+70);
setcolor(14);
line(x+6,y+4,x+6,y+7);
line(x+14,y+4,x+14,y+7);
line(x+45,y+4,x+45,y+7);
line(x+53,y+4,x+53,y+7);
line(x+22,y+50,x+26,y+50);
line(x+22,y+50,x+24,y+58);
line(x+24,y+58,x+26,y+50);
line(x+34,y+50,x+38,y+50);
line(x+38,y+50,x+36,y+58);
line(x+36,y+58,x+34,y+50);
setcolor(10);
line(x+8,y+15,x+12,y+15);
line(x+12,y+15,x+10,y+24);
line(x+10,y+24,x+8,y+15);
line(x+47,y+15,x+51,y+15);
line(x+51,y+15,x+49,y+24);
line(x+49,y+24,x+47,y+15);
setcolor(2);
line(x+20,y+20,x+38,y+20);
line(x+29,y+22,x+29,y+24);
line(x+26,y+22,x+26,y+23);
line(x+32,y+22,x+32,y+23);
putpixel(x+24,y+22,2);
putpixel(x+34,y+22,2);
setcolor(6);
line(x+22,y+32,x+24,y+32);
line(x+22,y+32,x+23,y+39);
line(x+23,y+39,x+24,y+32);
  line(x+36,y+32,x+38,y+32);
  line(x+36,y+32,x+37,y+39);
  line(x+37,y+39,x+38,y+32);
end;

Function StringUpCase;
begin
end;

procedure MainCongratulate;
  const del=5000;
begin
  SetViewPort(1,1,getmaxx,getmaxy,true);
  DrawEnemyShip1(1,1);
  DrawEnemyShip2(100,100);
  DrawEnemyShip3(700,1);
  DrawEnemyShip4(600,100);
  DrawEnemyShip5(1,500);
  DrawEnemyShip6(100,400);
  DrawEnemyShip7(700,500);
  DrawEnemyShip8(600,400);
  DrawEnemyShip9(300,250);
  DrawEnemyShip10(400,250);
  SetFillStyle(1,0);
  SetColor(14);
  i:=1;
  Repeat
    FillEllipse(400,250,i,i);
    Inc(i);
  Until i>=550;
  SetTextStyle(4,0,5);
  MoveTo(1,100);
  {OutTextXY(1,100,'Y O U  W O N  T H I S  G A M E !');}
  OutText('Y');
  Delay(del);
  OutText(' O');
  Delay(del);
  OutText(' U');
  Delay(del);
  OutText('  W');
  Delay(del);
  OutText(' O');
  Delay(del);
  OutText(' N');
  Delay(del);
  OutText('  T');
  Delay(del);
  OutText(' H');
  Delay(del);
  OutText(' I');
  Delay(del);
  OutText(' S');
  Delay(del);
  OutText('  G');
  Delay(del);
  OutText(' A');
  Delay(del);
  OutText(' M');
  Delay(del);
  OutText(' E');
  Delay(del);
  OutText(' !');
  Delay(del);
  SetTextStyle(1,0,1);
  SetColor(2);
  OutTextXY(100,200,'You finished all missions in this program and now you are');
  SetTextStyle(9,0,1);
  OutTextXY(200,260,'T H E   W I N N E R');
  SetFillStyle(1,1);
  FillEllipse(400,500,50,50);
  Line(400,450,350,400);
  ReadKey;
end;

Procedure YouLOST;
begin
setviewport(1,1,getmaxx,getmaxy,true);
Cleardevice;
setcolor(14);
line(285,0,324,0);
line(285,0,230,200);
line(230,200,292,156);
line(292,156,237,333);
line(237,333,320,274);
line(320,274,272,428);
line(272,428,252,428);
line(252,428,257,468);
line(257,468,299,429);
line(299,429,275,429);
line(278,429,380,196);
line(380,196,298,254);
line(298,254,356,76);
line(356,76,291,121);
line(291,121,324,0);
SetFillstyle(1,14);
FloodFill(290,10,14);
Settextstyle(7,0,5);
setcolor(4);
Outtextxy(220,230,'You LOST!!!');
While keypressed do readkey;
ReadKey;
end;

begin
end.