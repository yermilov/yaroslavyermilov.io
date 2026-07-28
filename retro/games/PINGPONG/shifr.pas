unit shifr;

{ Browser stand-in for the 2005 SHIFR unit.

  The original XORs a text file into a `file of longint` and back; PP.PAS uses
  it for the high-score table and the two option sets. Two reasons it cannot
  survive as written: it works on typed files, which the tpfiles shim does not
  do, and its DeShifrovka loop runs `for i := -MaxLongint to MaxLongint` with a
  Break on Eof — four billion iterations in a language that cannot yield.

  So the decryption happens at BUILD time: data/ ships the already-decoded
  BEST.COD / DEFAULT.COD / OPTIONS.COD as plain text. What survives here is the
  other half of the unit's job, which is NOT the crypto — it is the COPY. PP.PAS
  treats the `.cod` as the durable store and the `.scr`/`.opt` plaintext as a
  scratch file it reads and then Erases (best.scr three times, default.opt,
  options.opt). Make these no-ops and the scratch file is destroyed after its
  first read and never regenerated: the high-score table renders empty from the
  second visit on, and — because that RTE(100) lands inside an `async` procedure
  — it surfaces as a silently-rejected promise, nothing in the console. Options
  breaks the same way. So both directions copy, and `.cod` stays authoritative.

  Dropping the crypto costs nothing a player can see: the plaintext was always
  written to disk in the clear for the moment between DeShifrovka and Erase, and
  a browser tab has no filesystem to hide it from. Scores still persist for the
  session — tpfiles shadows writes to localStorage. }

interface

procedure DeShifrovka(file1, file2: string);
procedure Shifrovka(file1, file2: string);

implementation

uses tpfiles;

{ Both entry points are file1 → file2, so one helper serves both. }
procedure CopyText(const src, dst: string);
var
  fs, fd: Text;
  s: string;
begin
  Assign(fs, src);
  Reset(fs);        // missing source → RTE(2), exactly as DOS with no .COD
  Assign(fd, dst);
  Rewrite(fd);
  while not EofT(fs) do
  begin
    ReadlnT(fs, s);
    WritelnT(fd, s);
  end;
  Close(fd);
  Close(fs);
end;

procedure DeShifrovka(file1, file2: string);
begin
  CopyText(file1, file2);
end;

procedure Shifrovka(file1, file2: string);
begin
  CopyText(file1, file2);
end;

end.
