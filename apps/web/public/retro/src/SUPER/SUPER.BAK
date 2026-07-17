program super;
const c = 47;
      symbol : array [1..c] of char =
                             ('а','б','в','г','д','е','ё','ж','з','и','й','к',
                              'л','м','н','о','п','р','с','т','у','ф','х','ц',
                              'ч','ш','щ','ь','ъ','ы','э','ю','я','.',',','!',
                              '"','№',';','%',':','?','*','(',')','-',' ');
var t : array [1..10000] of 1..c+1;
    i,j,n:word;
    s:real;

begin
     Readln(n);
     assign(output,'text.txt');
     Rewrite(output);
     for i:=1 to n do
         t[i]:=1;
    repeat
     for i:=1 to n do
         begin
              Write(symbol[t[i]]);
              inc(t[n]);
              for j:=n downto 2 do
                  begin
                       if t[j]>c then begin t[j]:=1; inc(t[j-1]); end;
                  end;
         end;
      Writeln;
      s:=0;
      for i:=1 to n do s:=s+t[i];
     until s=47*n;
     Close(output);
end.