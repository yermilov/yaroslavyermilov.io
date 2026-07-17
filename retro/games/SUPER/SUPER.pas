{ SUPER (2008) — the Library of Babel: enumerate EVERY string of length n over
  a 47-character alphabet (Cyrillic + punctuation) until the counters roll all
  the way over. On DOS it wrote them silently into text.txt (the TEXT.TXT in
  this folder is a run with n=1); in the browser the redirect is gone, so the
  enumeration pours down the 80×25 screen instead — you watch it happen.
  Original: /Users/yarik/games/SUPER/SUPER.PAS.

  The diff against the original, in full:
  - the program body moved into `procedure Main; async;` + `await(Main)`;
  - `Readln(n)` → `await(AskReal(...))` (no console to read from);
  - the text.txt redirect (assign/Rewrite/Close) removed — Write now paints
    the screen;
  - `await(Yield)` once per emitted line — the enumeration loop never yields,
    which in a browser would freeze the tab (47^n iterations);
  - t's element type `1..c+1` → word (pas2js cannot nest an anonymous range;
    values and behavior are identical — TP didn't range-check either).
  The enumeration logic is untouched, including its own 2008 quirks. }
program super;
uses crt; { PORT: the original had no uses clause — needed for AskReal/Yield }
const c = 47;
      symbol : array [1..c] of char =
                             ('а','б','в','г','д','е','ё','ж','з','и','й','к',
                              'л','м','н','о','п','р','с','т','у','ф','х','ц',
                              'ч','ш','щ','ь','ъ','ы','э','ю','я','.',',','!',
                              '"','№',';','%',':','?','*','(',')','-',' ');
var t : array [1..10000] of word; { PORT: was `of 1..c+1` — pas2js rejects a nested anonymous range; same values, no range checks either way }
    i,j,n:word;
    s:real;

procedure Main; async;
begin
     n:=trunc(await(double, AskReal('n (довжина рядка; 1-3 розумно)')));
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
      await(Yield);
      s:=0;
      for i:=1 to n do s:=s+t[i];
     until s=47*n;
end;

begin
Main;
end.
