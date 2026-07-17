Unit Cr_Lib;

Interface

 Uses Graph;

 Procedure GrInit(Path:string);
 Procedure InitPattern(p1,p2,p3,p4,p5,p6,p7,p8,Color:byte);
 Procedure NAngle(x,y,r:integer; n:byte; angle:word);
 Procedure ArcSector(x,y: integer; StAngle, EndAngle, Radius: word);
 Procedure ArcSegment(x,y: integer; StAngle, EndAngle, Radius: word);
 Procedure LoadScreen(x,y:integer;FileName:string;put:word);
 Procedure SaveScreen(x1,y1,x2,y2:integer;FileName:string);

Implementation

procedure GrInit(Path:string);
  var
    GrDriver, GrMode, ErrorCode : integer;
 begin
   GrDriver:=Detect;
   InitGraph(GrDriver, GrMode,Path);
   ErrorCode:=GraphResult;
   if ErrorCode <> grOk then
    begin
      writeln('Помилка графiки : ',GraphErrorMsg(ErrorCode));
      Halt(1);
    end;
 end;

procedure InitPattern(p1,p2,p3,p4,p5,p6,p7,p8,Color:byte);
  var
    Pattern : FillPatternType;
 begin
   Pattern[1]:=p1; Pattern[2]:=p2;
   Pattern[3]:=p3; Pattern[4]:=p4;
   Pattern[5]:=p5; Pattern[6]:=p6;
   Pattern[7]:=p7; Pattern[8]:=p8;
   SetFillPattern(Pattern, Color);
 end;

procedure NAngle(x,y,r:integer; n:byte; Angle:word);
  var
     a,h,t : real;
 begin
   a:=Angle*Pi/180;
   h:=2 * Pi / n;
   t:=a;
   MoveTo(x + round(r*cos(t)), y - round(r*sin(t)));
   while 2*Pi+a > t do
    begin
      t:=t+h;
      LineTo(x + round(r*cos(t)), y - round(r*sin(t)));
    end;
 end;

procedure ArcSector(x,y: integer; StAngle, EndAngle, Radius: word);
  var
    a : ArcCoordsType;
 begin
   Arc(x, y, StAngle, EndAngle, Radius);
   GetArcCoords(a);
   with a do
    begin
      Line(X, Y, Xend, Yend);
      Line(X, Y, Xstart, Ystart);
    end;
 end;

procedure ArcSegment(x,y: integer; StAngle, EndAngle, Radius: word);
  var
    a : ArcCoordsType;
 begin
   Arc(x, y, StAngle, EndAngle, Radius);
   GetArcCoords(a);
   with a do
    Line(Xstart, Ystart, Xend, Yend);
 end;

procedure LoadScreen(x,y:integer;FileName:string;put:word);
  var
    PicFile : File;
    size    : word;
    DataPtr : Pointer;
    NumRead : Word;
 begin
   Assign(PicFile,FileName);
   Reset(PicFile,1);
   size:=FileSize(PicFile);
   Reset(PicFile,size);
   GetMem(DataPtr,size);
   BlockRead(PicFile,DataPtr^,1);
   PutImage(x,y,DataPtr^,put);
   Close(PicFile);
   FreeMem(DataPtr,size);
 end;

procedure SaveScreen(x1,y1,x2,y2:integer;FileName:string);
  var
    PicFile : File;
    size    : word;
    DataPtr : Pointer;
 begin
   size:=ImageSize(x1,y1,x2,y2);
   GetMem(DataPtr,size);
   GetImage(x1,y1,x2,y2,DataPtr^);
   Assign(PicFile,FileName);
   Rewrite(PicFile,size);
   BlockWrite(PicFile,DataPtr^,1);
   Close(PicFile);
   FreeMem(DataPtr,size);
 end;

End.
