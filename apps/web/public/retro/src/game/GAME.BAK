program game;
const mn=200;
var i,n,p1,p2,j:longint;
    a:array[1..mn] of longint;
    fp,gp:array[1..mn,1..mn] of longint;

    function g(l,r:integer):longint; forward;

    function max(a,b:longint):longint;
    begin
         if a>b then max:=a
                else max:=b;
    end;

    function f(l,r:integer):longint;
    begin
         if fp[l,r]=-1 then
            begin
                 if l=r then fp[l,r]:=a[l]
                        else fp[l,r]:=max(a[l]+g(l+1,r),a[r]+g(l,r-1));
            end;
         f:=fp[l,r];
    end;

    function g(l,r:integer):longint;
    begin
         if gp[l,r]=-1 then
            begin
                 if l=r then gp[l,r]:=0
                        else
                          begin
                               if a[l]+g(l+1,r)>a[r]+g(l,r-1) then gp[l,r]:=f(l+1,r)
                                                              else gp[l,r]:=f(l,r-1);
                          end;
            end;
         g:=gp[l,r];
    end;

begin
     assign(input,'input.txt');
     reset(input);
     readln(n);
     for i:=1 to n do read(a[i]);
     for i:=1 to n do
         for j:=1 to n do
             begin
                  fp[i,j]:=-1;
                  gp[i,j]:=-1;
             end;
     p1:=f(1,n);
     p2:=g(1,n);
     assign(output,'output.txt');
     rewrite(output);
     if p1>p2 then writeln(1)
        else if p1<p2 then writeln(2)
             else writeln(0);
end.