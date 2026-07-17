{ A `dos` unit shim for pas2js — just enough for these games to compile.

  GetTime maps to the browser clock (hundredths like DOS INT 21h/2Ch). Note the
  games' busy-wait `Duration` loops built on it would never yield in a browser;
  the ports that actually USE timing go through crt.Delay instead. PUSHKA only
  DECLARES such a procedure (never calls it), so this exists mostly so the
  original declaration compiles verbatim. }
unit dos;

{$mode objfpc}

interface

procedure GetTime(var hour, minute, second, sec100: word);
procedure GetDate(var year, month, day, dow: word);

implementation

uses SysUtils;

procedure GetTime(var hour, minute, second, sec100: word);
var
  now: TDateTime;
  h, m, s, ms: word;
begin
  now := Time;
  DecodeTime(now, h, m, s, ms);
  hour := h;
  minute := m;
  second := s;
  sec100 := ms div 10;
end;

procedure GetDate(var year, month, day, dow: word);
var
  now: TDateTime;
  y, m, d: word;
begin
  now := Date;
  DecodeDate(now, y, m, d);
  year := y;
  month := m;
  day := d;
  dow := DayOfWeek(now) - 1; // DOS: 0 = Sunday
end;

end.
