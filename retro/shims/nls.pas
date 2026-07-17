{ nls — bilingual (EN/UA) string selection for the retro games.

  The Norton Commander lab passes the site locale into each game's sandboxed
  iframe as `?lang=en|ua`; build.ts sets `window.__retroLang` from it before
  the bundle runs (writeGameIndexHtml). A game calls Loc(en, ua) at every
  user-facing string and gets the one for the active language; GameLang exposes
  the raw 'en'/'ua' for the rare branch that needs it. Default is 'ua' (the
  site's default locale) when nothing is set.

  (The selector is Loc, not T — a bare `T` parses as a generic type param in
  pas2js and is rejected as a call.)

  This is a leaf unit — a game only `uses nls` when it actually shows text, so
  adding it never perturbs the graphical-only ports' bundles. Loc/GameLang are
  called from Pascal, so pas2js keeps them (no asm-only DCE trap here). }
unit nls;

interface

{ 'en' or 'ua' — the active game language (defaults to 'ua'). }
function GameLang: string;
{ Returns `en` when the game language is English, otherwise `ua`. Use at every
  player-facing literal: Loc('Score', 'Рахунок'). }
function Loc(const en, ua: string): string;

implementation

function GameLang: string;
begin
  Result := 'ua';
  asm
    Result = (typeof window !== 'undefined' && window.__retroLang === 'en') ? 'en' : 'ua';
  end;
end;

function Loc(const en, ua: string): string;
begin
  if GameLang = 'en' then Result := en else Result := ua;
end;

end.
