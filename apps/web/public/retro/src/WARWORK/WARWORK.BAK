program WarWork_PlaneZenit;
uses crt,t_graph,jarik;
const duration=1000;
var mx,my,bx,by,rx,ry,zx1,zx2,rzx1,rzy1,b1,rzx2,rzy2,b2:byte;
    sound,bomb,raket,zenitka1,zenitkaf1,zenitka2,zenitkaf2:boolean;

procedure StartGame;
var i:byte;
begin
     randomize;
     mx:=79;
     my:=12;
     sound:=true;
     bomb:=false;
     raket:=false;
     zenitka1:=true;
     zenitka2:=true;
     zx1:=random(80)+1;
     repeat zx2:=random(80)+1; until zx2<>zx1;
end;

procedure RaketFire;
var i,fx1,fx2:byte;
begin
                if rx<5 then
                begin
                fx1:=1;
                fx2:=5;
                end;
                if rx>75 then
                begin
                fx1:=75;
                fx2:=80;
                end;
                if (rx<75) and (rx>5) then
                begin
                fx1:=rx-5;
                fx2:=rx+5;
                end;
                for i:=1 to 5 do
                begin
                Box(fx1,ry-2,fx2,ry+1,4,4);
                Delay(duration*25 div 10);
                Box(fx1,ry-2,fx2,ry+1,14,14);
                Delay(duration*25 div 10);
                end;
                Box(fx1,ry-2,fx2,ry+1,1,1);
                Bomb:=false;
           end;

procedure PlaneFire;
var i,fx1,fx2:byte;
begin
                if mx<5 then
                begin
                fx1:=1;
                fx2:=5;
                end;
                if mx>75 then
                begin
                fx1:=75;
                fx2:=80;
                end;
                if (mx<75) and (mx>5) then
                begin
                fx1:=mx-5;
                fx2:=mx+5;
                end;
                for i:=1 to 5 do
                begin
                Box(fx1,my-2,fx2,my+1,4,4);
                Delay(duration*25 div 10);
                Box(fx1,my-2,fx2,my+1,14,14);
                Delay(duration*25 div 10);
                end;
                Box(fx1,my-2,fx2,my+1,1,1);
                Delay(duration*10);
                halt;
                inc(b1);
                inc(b2);
           end;

procedure BombFire;
var i,fx1,fx2:byte;
begin
                if bx<5 then
                begin
                fx1:=1;
                fx2:=5;
                end;
                if bx>75 then
                begin
                fx1:=75;
                fx2:=80;
                end;
                if (bx<75) and (bx>5) then
                begin
                fx1:=bx-5;
                fx2:=bx+5;
                end;
                for i:=1 to 5 do
                begin
                Box(fx1,by-2,fx2,by+1,4,4);
                Delay(duration*25 div 10);
                Box(fx1,by-2,fx2,by+1,14,14);
                Delay(duration*25 div 10);
                end;
                Box(fx1,by-2,fx2,by+1,1,1);
                Bomb:=false;
                if (fx1<=mx) and (fx2>=mx) and (by-2<=my) and (by+1>=my) then PlaneFire;
           end;

procedure ZenitkaFire;
var ox1,oy1,ox2,oy2:byte;
begin
     if zenitka1 then
        begin
             textbackground(2);
             textcolor(0);
             gotoxy(zx1,16);
             write(#30);
             textcolor(2);
             ox1:=abs(zx1-mx);
             oy1:=16-my;
             oy1:=oy1 div 2;
             if abs(ox1-oy1)<b1+5 then
                     begin
                     ZenitkaF1:=True;
                     rzx1:=zx1;
                     rzy1:=15;
                     end;
             if abs(ox1-bx) = 5 then
                zenitka1:=false;
             if abs((abs(zx2-mx))-bx) = 5 then
                zenitka2:=false;
         end;
         if abs((abs(zx2-mx))-bx) = 5 then
                zenitka2:=false;
         if zenitka2 then
        begin
             textbackground(2);
             textcolor(0);
             gotoxy(zx2,16);
             write(#30);
             textcolor(2);
             ox2:=abs(zx2-mx);
             oy2:=16-my;
             oy2:=oy2 div 2;
             if abs(ox2-oy2)<b2+5 then
                     begin
                     ZenitkaF2:=True;
                     rzx2:=zx2;
                     rzy2:=15;
                     end;
             if abs(ox2-bx) = 5 then
                zenitka2:=false;
         end;
         if zenitka2 then
        begin
             textbackground(2);
             textcolor(0);
             gotoxy(zx2,16);
             write(#30);
             textcolor(2);
             ox2:=abs(zx2-mx);
             oy2:=16-my;
             oy2:=oy2 div 2;
             if abs(ox2-oy2)<b2+5 then
                     begin
                     ZenitkaF2:=True;
                     rzx2:=zx2;
                     rzy2:=15;
                     end;
             if abs(ox2-bx) = 5 then
                zenitka2:=false;
         end;
end;


procedure MakeView;
begin
     if abs((abs(zx2-mx))-bx) = 5 then
                zenitka2:=false;
     textbackground(1);
     if my>1 then begin
     gotoxy(mx-1,my-1);
     write('   ');
     end;
     gotoxy(mx-1,my);
     write(' ');
     gotoxy(mx+1,my);
     write(' ');
     if my=15 then textbackground(2);
     gotoxy(mx-1,my+1);
     write('   ');
     gotoxy(1,15);
     textbackground(1);
     write('                                                                               ');
     gotoxy(mx,my);
     textcolor(0);
     textbackground(1);
     write(#17);
     textcolor(1);
     if bomb then
        begin
        textbackground(1);
        if by>1 then begin
        gotoxy(bx-1,by-1);
        write('   ');
        end;
        if by=15 then textbackground(2);
        gotoxy(bx-1,by+1);
        write('   ');
        gotoxy(1,15);
        textbackground(1);
        write('                                                                               ');
        gotoxy(bx,by);
        textcolor(0);
        textbackground(1);
        write(#9);
        textcolor(1);
        if by>=16 then BombFire;
        end;
     if raket then
        begin
        textbackground(1);
        gotoxy(rx+2,ry);
        write(' ');
        if ry=15 then textbackground(2);
        gotoxy(1,15);
        textbackground(1);
        write('                                                                               ');
        gotoxy(rx,ry);
        textcolor(0);
        textbackground(1);
        write(#27);
        textcolor(1);
        if ry>=16 then RaketFire;
        end;
        ZenitkaFire;
        if ZenitkaF1 then
           begin
           textbackground(1);
           if rzy1<15 then
           begin
           gotoxy(rzx1-1,rzy1+1);
           write('   ');
           end;
           if rzy1=15 then textbackground(2);
           gotoxy(1,15);
           textbackground(1);
           write('                                                                               ');
           gotoxy(rzx1,rzy1);
           textcolor(0);
           textbackground(1);
           write(#24);
           textcolor(1);
           if (rzy1=1) then
              begin
                   zenitkaf1:=false;
                   gotoxy(rzx1,rzy1);
                   write('  ');
                   inc(b1);
              end;
        if (rzy1=my) and (rzx1=mx) then PlaneFire;
        end;
        ZenitkaFire;
        if abs((abs(zx1-mx))-bx) = 5 then
                zenitka1:=false;
        if abs((abs(zx1-mx))-bx) = 5 then
                zenitka1:=false;
        if ZenitkaF2 then
           begin
           textbackground(1);
           if rzy2<15 then
           begin
           gotoxy(rzx2-1,rzy2+1);
           write('   ');
           end;
           if rzy2=15 then textbackground(2);
           gotoxy(1,15);
           textbackground(1);
           write('                                                                               ');
           gotoxy(rzx2,rzy2);
           textcolor(0);
           textbackground(1);
           write(#24);
           textcolor(1);
           if (rzy2=1) then
              begin
                   zenitkaf2:=false;
                   gotoxy(rzx2,rzy2);
                   write('  ');
                   inc(b2);
              end;
        if (rzy2=my) and (rzx2=mx) then PlaneFire;
        end;
        if my=15 then PlaneFire;
end;

procedure Fire;
var fx1,fx2:byte;
begin
                repeat
                if mx<5 then
                begin
                fx1:=1;
                fx2:=5;
                end;
                if mx>75 then
                begin
                fx1:=75;
                fx2:=80;
                end;
                if (mx<75) and (mx>5) then
                begin
                fx1:=mx-5;
                fx2:=mx+5;
                end;
                Box(fx1,my-2,fx2,my+1,4,4);
                Delay(duration*25 div 10);
                Box(fx1,my-2,fx2,my+1,14,14);
                Delay(duration*25 div 10);
                until keypressed;
                halt;
           end;


procedure Game;
var key:char;
begin
     repeat
           key:=Upcase(InKey);
           case key of
           #72:begin
               my:=my-1;
               MakeView;
               end;
           #75:begin
               mx:=mx-1;
               MakeView;
               end;
           #77:begin
               mx:=mx+1;
               MakeView;
               end;
           #80:begin
               my:=my+1;
               MakeView;
               end;
           'B':if bomb=false then
               begin
               bx:=mx;
               by:=my+1;
               bomb:=true;
               MakeView;
               end;
           'R':if raket=false then
               begin
               rx:=mx-2;
               ry:=my;
               raket:=true;
               MakeView;
               end;
           end;
           if mx<=1 then
           begin
           gotoxy(mx,my);
           textbackground(blue);
           write(' ');
           mx:=79;
           MakeView;
           if (zenitka1=true) and (zenitkaf1=true) then
           begin
           gotoxy(zx1+1,16);
           textbackground(green);
           write('        ');
           end;
           if (zenitka2=true) and (zenitkaf2=true) then
           begin
           gotoxy(zx2+1,16);
           textbackground(green);
           write('        ');
           end;
           end;
           if mx>=80 then
           begin
           gotoxy(mx,my);
           textbackground(blue);
           write(' ');
           mx:=2;
           MakeView;
           end;
           if my<=1 then
           begin
           my:=2;
           MakeView;
           end;
           if my=16 then Fire;
           dec(mx);
           if bomb then inc(by);
           if raket then rx:=rx-2;
           if rx<=1 then
           begin
           raket:=false;
           gotoxy(rx,ry);
           write('   ');
           end;
           if ZenitkaF1 then dec(rzy1);
           if zenitkaf2 then dec(rzy2);
           if abs((abs(zx2-mx))-bx) = 5 then
                zenitka2:=false;
           MakeView;
           delay(duration*25 div 10);
     until key=#27;
end;

begin
StartGame;
textbackground(2);
ClrScr;
Box(1,1,80,15,1,1);
Box(1,16,80,20,2,2);
Game;
end.
