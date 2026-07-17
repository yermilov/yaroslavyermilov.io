program PingPong0;
uses crt,graph;
type coordinates = record
     x,y:integer;
     end;
     block = record
     nx,ny,color,vid:byte;
     balls:integer;
     here:boolean;
     end;
const duration = 1000;
      ballspeed = 10;
      herospeed = 10;
var ball,fly,ud:coordinates;
    alfa,beta,c,HeroX:integer;
    vertical,gorizontal,right,left,d:boolean;
    n0:byte;
    ng,nv:shortint;
    key:char;
    blocks : array [1..5, 1..16] of block;
    score:integer;
    lines:byte;

    function InKey:char;
    begin
         if keypressed then InKey:=Readkey;
    end;

    procedure MakeBall(x,y:integer; radius,color:byte);
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Circle(x,y,radius);
         FloodFill(x,y,color);
    end;

    procedure MakeHero(color:byte);
    begin
         SetColor(color);
         SetFillStyle(1,color);
         Bar(HeroX,425,HeroX+100,440);
    end;

    function udar(var doska:boolean):boolean;
    var i,j:byte;
        flag:boolean;
    begin
         Udar:=false;
         if ball.x<=5 then
            begin
                 Udar:=true;
                 gorizontal:=true;
                 MakeBall(ball.x,ball.y,25,0);
                 ball.x:=6;
            end;
         if ball.x>=635 then
            begin
                 Udar:=true;
                 gorizontal:=false;
                 MakeBall(ball.x,ball.y,35,0);
                 ball.x:=634;
            end;
         flag:=true;
         if GetPixel(ball.x,ball.y-6)<>0 then
            begin
                 Udar:=true;
                 vertical:=false;
                 ball.y:=ball.y+7;
                 for i:=5 downto 1 do
                     for j:=1 to 16 do
                         with blocks[i,j] do
                              begin
                                   if here then begin
                                      if (ball.x>=(nx-1)*40) and
                                         (ball.x<=nx*40) and (flag)
                                                          then begin
                                         score:=score+balls;
                                         here:=false;
                                         flag:=false;
                                         SetColor(0);
                                         SetFillStyle(1,0);
                                         Rectangle((nx-1)*40,(ny-1)*50,nx*40,ny*50);
                                         Line(639,1,639,ny*50);
                                         FloodFill((nx-1)*40+1,(ny-1)*50+1,0);
                                                                end;
                                         end
                              end;
                 MakeBall(ball.x,ball.y-7,25,0);
            end;
         doska:=false;
         if ball.y>=450 then
            begin
                 Udar:=true;
                 vertical:=true;
                 MakeBall(ball.x,ball.y,25,0);
                 ball.y:=445;
                 doska:=true;
                 inc(lines);
                 for i:=1 to 5 do
                     begin
                          if i=lines then
                             begin
                                  for j:=1 to 16 do
                                      begin
                                           blocks[i,j].here:=true;
                                      end;
                             end;
                     end;
            end;
         if (abs(ball.y-425)<=8) and (ball.x>=herox) and (ball.x<=herox+100) and (not vertical) then
            begin
                 Udar:=true;
                 vertical:=true;
                 MakeBall(ball.x,ball.y,7,0);
                 if ((Left) and (not gorizontal)) or ((Right) and (gorizontal)) then beta:=beta+3;
                 if ((Left) and (gorizontal)) or ((Right) and (not gorizontal)) then beta:=beta-3;
                 doska:=true;
            end;
    end;

    procedure MakeBlocks;
    var i,j:byte;
    begin
         for i:=1 to 5 do
             for j:=1 to 16 do
                 with blocks[i,j] do
                      begin
                           if here then begin
                           SetColor(15);
                           SetFillStyle(1,color);
                           Rectangle((nx-1)*40,(ny-1)*50,nx*40,ny*50);
                           Line(639,1,639,ny*50);
                           FloodFill((nx-1)*40+1,(ny-1)*50+1,15);      end;
                      end;
    end;

    procedure Game;
    var i,j:byte;
        flag:boolean;
    begin
         randomize;
         score:=0;
         HeroX:=100;
         vertical:=true;
         gorizontal:=true;
         alfa:=random(89)+1;
         ball.x:=150;
         ball.y:=350;
         herox:=100;
         right:=false;
         left:=false;
         d:=false;
         lines:=1;
         for i:=1 to 5 do
             for j:=1 to 16 do
                 with blocks[i,j] do
                      begin
                           nx:=j;
                           ny:=i;
                           color:=random(15)+1;
                           balls:=100;
                           if i=1 then here:=true
                                  else here:=false;
                      end;
         repeat
               c:=1;
               MakeBall(ball.x,ball.y,25,0);
               ud.x:=ball.x;
               ud.y:=ball.y;
               for i:=1 to 5 do for j:=1 to 16 do with blocks[i,j] do begin
               SetColor(0);
               SetFillStyle(1,0);
               Rectangle((nx-1)*40,(ny-1)*50,nx*40,ny*50);
               Line(639,1,639,ny*50);
               FloodFill((nx-1)*40+1,(ny-1)*50+1,0);    end;
               repeat
                     if d then vertical:=true;
                     MakeBall(ball.x,ball.y,5,0);
                     if d then begin d:=false; vertical:=true; end;
                     fly.y:=trunc(c*sin(alfa));
                     fly.x:=trunc(c*sin(90-alfa));
                     if vertical then nv:=-1
                                 else nv:=1;
                     if gorizontal then ng:=1
                                   else ng:=-1;
                     ball.x:=ud.x+fly.x*ng;
                     ball.y:=ud.y+fly.y*nv;
                     MakeBall(ball.x,ball.y,5,4);
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
                     end;
                     MakeHero(0);
                     If Left then herox:=herox-herospeed;
                     if right then herox:=herox+herospeed;
                     If HeroX<=1 then HeroX:=1;
                     If HeroX>=540 then HeroX:=540;
                     If (HeroX<=1) and (HeroX>=540) then
                        begin
                             Left:=false;
                             Right:=false;
                        end;
                     MakeHero(14);
                     MakeBlocks;
                     flag:=true;
                     for i:=1 to 5 do
                         begin
                              for j:=1 to 16 do
                                       flag:=flag and not blocks[i,j].here;
                              if flag then lines:=i-1;
                         end;
                     delay(duration*3);
               until Udar(d);
         until key=#27;
    end;
procedure InitPingPong;
var errorcode,gd,gm:integer;
begin
     gd:=detect;
     InitGraph(gd,gm,'');
     ErrorCode:=GraphResult;
     If ErrorCode=GrOk then
                           begin
                       Game;
                       CloseGraph;
                           end
                       else
                           begin
                       ClrScr;
                       Writeln('Error:',GraphErrorMsg(ErrorCode));
                       Readln;
                           end;
end;

begin
InitPingPong;
end.