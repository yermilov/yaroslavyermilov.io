import { useEffect, useRef, useState } from 'react';

// A small live-weather lab island (Tier 2): on mount it asks for your location,
// pulls the current conditions from Open-Meteo (free, no API key), and asks the
// API to paint a cached Gemini scene from the same current conditions. On desktop
// it runs full-screen as two columns — the painted scene on the left, and a live
// "how it works" panel on the right that shows the real inputs (the Open-Meteo
// conditions) and the actual prompt those conditions built for Gemini.

type Locale = 'en' | 'ua';

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'clear sky', icon: '☀️' },
  1: { label: 'mainly clear', icon: '🌤️' },
  2: { label: 'partly cloudy', icon: '⛅' },
  3: { label: 'overcast', icon: '☁️' },
  45: { label: 'fog', icon: '🌫️' },
  48: { label: 'rime fog', icon: '🌫️' },
  51: { label: 'light drizzle', icon: '🌦️' },
  53: { label: 'drizzle', icon: '🌦️' },
  55: { label: 'dense drizzle', icon: '🌧️' },
  56: { label: 'freezing drizzle', icon: '🌧️' },
  57: { label: 'freezing drizzle', icon: '🌧️' },
  61: { label: 'slight rain', icon: '🌦️' },
  63: { label: 'rain', icon: '🌧️' },
  65: { label: 'heavy rain', icon: '🌧️' },
  66: { label: 'freezing rain', icon: '🌧️' },
  67: { label: 'freezing rain', icon: '🌧️' },
  71: { label: 'slight snow', icon: '🌨️' },
  73: { label: 'snow', icon: '🌨️' },
  75: { label: 'heavy snow', icon: '❄️' },
  77: { label: 'snow grains', icon: '🌨️' },
  80: { label: 'rain showers', icon: '🌦️' },
  81: { label: 'rain showers', icon: '🌧️' },
  82: { label: 'violent showers', icon: '⛈️' },
  85: { label: 'snow showers', icon: '🌨️' },
  86: { label: 'heavy snow showers', icon: '❄️' },
  95: { label: 'thunderstorm', icon: '⛈️' },
  96: { label: 'thunderstorm, hail', icon: '⛈️' },
  99: { label: 'thunderstorm, hail', icon: '⛈️' },
};
const describe = (code: number) => WMO[code] ?? { label: 'clear sky', icon: '☀️' };
const CLOUD_ONLY = new Set(['clear sky', 'mainly clear', 'partly cloudy', 'overcast']);

const WEATHER_GLASS =
  'border border-white/15 bg-black/25 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl';
const WEATHER_GLASS_STRONG =
  'border border-white/10 bg-black/40 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl';

// UI strings — the lab index is bilingual, so the widget follows the page locale
// (the .mdx passes locale="en" | "ua"). Meteorological condition labels stay in
// English because the prompt itself (shown verbatim on the right) is English.
const STR = {
  en: {
    intro:
      'Your browser location → current conditions from Open-Meteo → a Gemini-painted scene of exactly that weather, right now.',
    how: 'How it works',
    location: 'Your location',
    conditions: 'Live conditions',
    source: 'Open-Meteo',
    prompt: 'The prompt',
    promptNote:
      'everyone’s doing it, so I did too — here’s the recipe: grab the user’s location and the forecast from Open-Meteo, build the prompt dynamically, and send it to gemini-3-pro-image-preview aka nano banana pro (more details in the ',
    promptNoteLink: 'github gist',
    promptNoteAfter: ').',
    promptWaiting: 'Paint the scene to reveal the prompt.',
    subLocation: 'location',
    subTime: 'current time',
    subWeather: 'condition',
    subTemperature: 'temperature',
    subAtmosphere: 'atmosphere',
    subLighting: 'lighting',
    result: 'The scene',
    resultNote: 'Gemini renders a 45° top-down isometric 4:5 painting from that prompt.',
    temperature: 'temperature',
    feelsLike: 'feels like',
    condition: 'condition',
    humidity: 'humidity',
    wind: 'wind',
    daylight: 'daylight',
    day: 'daytime',
    night: 'nighttime',
    coords: 'coordinates',
    repaint: 'repaint scene',
    painting: 'painting scene…',
    retryScene: 'retry scene',
    throttledTitle: 'generator busy',
    throttledRate: 'Too many scenes just now — the sky painter is catching its breath.',
    throttledBudget: "Today's scene budget is spent. Fresh scenes return after midnight UTC.",
    throttledProvider: 'The image generator hit its daily limit. Back later.',
    throttledTryAgain: 'try again',
    throttledWait: 'try again in',
    paint: 'paint current sky',
    useLocation: 'use my location',
    cached: 'cached scene',
    fresh: 'fresh scene',
    locating: 'finding your location…',
    loading: 'loading weather…',
    failed: 'couldn’t load weather',
    retry: 'retry',
  },
  ua: {
    intro:
      'Локація вашого браузера → поточні умови з Open-Meteo → намальована Gemini сцена саме такої погоди, просто зараз.',
    how: 'Як це працює',
    location: 'Ваше місцезнаходження',
    conditions: 'Поточні умови',
    source: 'Open-Meteo',
    prompt: 'Промпт',
    promptNote:
      'всі роблять і я зробив, записуйте рецепт: витягаємо локацію користувача і прогноз погоди через Open-Meteo, формуємо динамічно промпт і відправляємо на gemini-3-pro-image-preview ака nano banana pro (додаткові деталі у ',
    promptNoteLink: 'github gist',
    promptNoteAfter: ').',
    promptWaiting: 'Намалюйте сцену, щоб побачити промпт.',
    subLocation: 'локація',
    subTime: 'поточний час',
    subWeather: 'умови',
    subTemperature: 'температура',
    subAtmosphere: 'атмосфера',
    subLighting: 'освітлення',
    result: 'Сцена',
    resultNote: 'Gemini малює ізометричну сцену 45° згори у форматі 4:5 за цим промптом.',
    temperature: 'температура',
    feelsLike: 'відчувається як',
    condition: 'умови',
    humidity: 'вологість',
    wind: 'вітер',
    daylight: 'час доби',
    day: 'день',
    night: 'ніч',
    coords: 'координати',
    repaint: 'перемалювати',
    painting: 'малюю сцену…',
    retryScene: 'спробувати ще',
    throttledTitle: 'генератор зайнятий',
    throttledRate: 'Забагато сцен одразу — художник неба переводить подих.',
    throttledBudget: 'Денний ліміт сцен вичерпано. Нові сцени — після опівночі UTC.',
    throttledProvider: 'Генератор зображень досяг денного ліміту. Спробуйте пізніше.',
    throttledTryAgain: 'спробувати ще',
    throttledWait: 'спробувати через',
    paint: 'намалювати небо',
    useLocation: 'моє місцезнаходження',
    cached: 'сцена з кешу',
    fresh: 'свіжа сцена',
    locating: 'визначаю місцезнаходження…',
    loading: 'завантажую погоду…',
    failed: 'не вдалося завантажити погоду',
    retry: 'ще раз',
  },
} satisfies Record<Locale, Record<string, string>>;
type Strings = (typeof STR)[Locale];

type ForecastHour = {
  time: string;
  tempC: number;
  code: number;
};

type Current = {
  lat: number;
  lon: number;
  tempC: number;
  apparentTempC: number | null;
  code: number;
  isDay: boolean;
  humidity: number | null;
  wind: number | null;
  forecast: ForecastHour[];
  place: string;
  fallback: boolean;
};

// A dynamic value the live weather/location filled into the prompt. `value` is the
// exact substring in `prompt`, so we can locate and highlight it; `kind` names the slot.
type SubKind = 'location' | 'time' | 'weather' | 'temperature' | 'atmosphere' | 'lighting';
type Substitution = { kind: SubKind; value: string };

// A throttle is distinct from a generic error: the scene generator is
// intentionally rate/budget-limited (cost control), so we show a calm
// "busy / back later" state and a cooldown instead of an eager retry.
//   rate    — per-client/global short-window limit (has a Retry-After cooldown)
//   budget  — the daily cap is spent for everyone until UTC midnight
//   provider— the upstream Gemini quota (the independent backstop) is exhausted
type ThrottleReason = 'rate' | 'budget' | 'provider';
type SceneState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; image: string; cached: boolean; prompt?: string; substitutions?: Substitution[] }
  | { status: 'throttled'; reason: ThrottleReason; retryAt: number | null }
  | { status: 'error' };

type State =
  | { status: 'locating' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Current };

// Where to show weather when geolocation is denied/unavailable, so the widget is
// never empty. (You chose "use my location" — this is only the graceful fallback.)
const FALLBACK = { lat: 50.4501, lon: 30.5234, place: 'Kyiv' };
const API_ORIGIN = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://yermilovapi-production.up.railway.app';
const formatTemp = (value: number) => `${Math.round(value)}°`;

function formatHour(time: string) {
  const parsed = new Date(time);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const match = time.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : time;
}

function describeWind(wind: number | null) {
  if (wind == null) return null;
  if (wind >= 39) return 'very strong wind';
  if (wind >= 29) return 'strong wind';
  return null;
}

// Collapse consecutive forecast hours whose condition + temperature are identical
// to the hour before — plun.me hid these repeats so the strip shows only the hours
// where something actually changes.
function dedupeForecast(hours: ForecastHour[]): ForecastHour[] {
  return hours.filter((h, i) => {
    const prev = hours[i - 1];
    return !prev || prev.code !== h.code || prev.tempC !== h.tempC;
  });
}

async function fetchWeather(
  lat: number,
  lon: number,
): Promise<Omit<Current, 'lat' | 'lon' | 'place' | 'fallback'>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code&forecast_hours=12&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
  const c = json?.current ?? {};
  const hourly = json?.hourly ?? {};
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const temps = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
  const codes = Array.isArray(hourly.weather_code) ? hourly.weather_code : [];
  const forecast = dedupeForecast(
    times
      .map((time: unknown, i: number) => ({
        time: String(time),
        tempC: Math.round(Number(temps[i])),
        code: Number(codes[i] ?? 0),
      }))
      .filter((hour: ForecastHour) => hour.time && Number.isFinite(hour.tempC))
      .slice(1, 9),
  );

  return {
    tempC: Math.round(Number(c.temperature_2m)),
    apparentTempC: c.apparent_temperature == null ? null : Math.round(Number(c.apparent_temperature)),
    code: Number(c.weather_code ?? 0),
    isDay: Number(c.is_day ?? 1) === 1,
    humidity: c.relative_humidity_2m ?? null,
    wind: c.wind_speed_10m ?? null,
    forecast,
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) return 'your location';
    const j = await res.json();
    return j.city || j.locality || j.principalSubdivision || j.countryName || 'your location';
  } catch {
    return 'your location';
  }
}

function TemperatureOverlay({ data, label }: { data: Current; label: string }) {
  const feelsLike = data.apparentTempC;
  const showFeelsLike = feelsLike != null && feelsLike !== Math.round(data.tempC);
  const notableWind = describeWind(data.wind);
  const condition = !CLOUD_ONLY.has(label) ? label : null;
  const weatherInfo = [notableWind, condition].filter(Boolean).join(' · ');

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-4 pt-5">
      <div className={`${WEATHER_GLASS} rounded-2xl px-6 py-4 text-center`}>
        <span className="font-mono text-6xl font-light leading-none text-white drop-shadow-md">
          {formatTemp(data.tempC)}
        </span>
        {(showFeelsLike || weatherInfo) && (
          <div className="mt-2 flex flex-col items-center gap-1">
            {showFeelsLike && (
              <span className="text-sm font-medium text-white/90 drop-shadow-sm">
                feels like {formatTemp(feelsLike)}
              </span>
            )}
            {weatherInfo && (
              <span className="text-xs font-medium uppercase text-white/75 drop-shadow-sm">
                {weatherInfo}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ForecastBar({ forecast }: { forecast: ForecastHour[] }) {
  if (forecast.length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
      <div className={`${WEATHER_GLASS_STRONG} rounded-xl px-2 py-2 sm:py-2.5`}>
        <div className="flex justify-between gap-0.5 overflow-x-auto">
          {forecast.map((hour) => {
            const item = describe(hour.code);
            return (
              <div
                key={hour.time}
                className="flex min-w-10 flex-1 flex-col items-center gap-0.5 px-1 py-1 text-center"
              >
                <span className="text-base leading-tight drop-shadow-sm sm:text-xl" aria-hidden>
                  {item.icon}
                </span>
                <span className="font-mono text-[11px] font-semibold leading-tight text-white/90 sm:text-sm">
                  {formatTemp(hour.tempC)}
                </span>
                <span className="text-[11px] font-medium leading-tight text-white/70 sm:text-xs">
                  {formatHour(hour.time)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SUB_LABEL: Record<SubKind, keyof Strings> = {
  location: 'subLocation',
  time: 'subTime',
  weather: 'subWeather',
  temperature: 'subTemperature',
  atmosphere: 'subAtmosphere',
  lighting: 'subLighting',
};

// Render the prompt with every dynamically-substituted value wrapped in a green
// highlight. Values are the exact substrings the template injected, so they match
// verbatim; occurrences are collected, sorted, and de-overlapped so a longer span
// always wins over a shorter one nested inside it. Clicking a highlight toggles an
// in-flow hint chip right after the token naming the slot it filled (one open at a
// time — replaces the old separate "Filled in live" key list).
function HighlightedPrompt({
  prompt,
  subs,
  t,
}: {
  prompt: string;
  subs: Substitution[];
  t: Strings;
}) {
  const [active, setActive] = useState<number | null>(null);

  const matches: { start: number; end: number; kind: SubKind }[] = [];
  for (const s of subs) {
    if (!s.value) continue;
    for (let from = 0; ; ) {
      const idx = prompt.indexOf(s.value, from);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + s.value.length, kind: s.kind });
      from = idx + s.value.length;
    }
  }
  // Earliest first; on a tie the longer span wins so we don't split a nested match.
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const m of matches) {
    if (m.start < cursor) continue; // already inside an accepted (longer) span
    if (m.start > cursor) out.push(prompt.slice(cursor, m.start));
    // Underline only the words, leaving the template's own indentation / line
    // breaks unstyled — so a multi-line value reads as a tidy marked token instead
    // of one big filled block. The green dotted underline signals "live + clickable".
    const raw = prompt.slice(m.start, m.end);
    const lead = raw.match(/^\s*/)?.[0] ?? '';
    const trail = raw.match(/\s*$/)?.[0] ?? '';
    const core = raw.slice(lead.length, raw.length - trail.length);
    const idx = key++;
    const open = active === idx;
    if (lead) out.push(lead);
    out.push(
      <button
        key={`t${idx}`}
        type="button"
        onClick={() => setActive(open ? null : idx)}
        aria-expanded={open}
        className={`cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] leading-[inherit] text-green underline decoration-dotted decoration-1 underline-offset-[3px] transition-colors ${
          open ? 'decoration-green decoration-solid' : 'decoration-green/50 hover:decoration-green'
        }`}
      >
        {core}
      </button>,
    );
    if (trail) out.push(trail);
    if (open) {
      out.push(
        <span
          key={`h${idx}`}
          className="mx-1 inline-block whitespace-nowrap rounded-[3px] border border-green/40 bg-green/10 px-1.5 py-px align-baseline font-mono text-[10px] uppercase tracking-wide text-green"
        >
          ← {t[SUB_LABEL[m.kind]]}
        </span>,
      );
    }
    cursor = m.end;
  }
  if (cursor < prompt.length) out.push(prompt.slice(cursor));
  return <>{out}</>;
}

// The scene generator is intentionally cost-limited, so a throttle gets its own
// calm panel over the placeholder — not the generic retry button. A rate limit
// ticks down its Retry-After cooldown and then offers a retry; the daily/provider
// caps won't clear until reset, so they show the message alone (no eager retry
// that would just re-hit the limit).
function ThrottledScene({
  reason,
  retryAt,
  t,
  onRetry,
}: {
  reason: ThrottleReason;
  retryAt: number | null;
  t: Strings;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!retryAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [retryAt]);
  const remainingMs = retryAt ? Math.max(0, retryAt - now) : 0;
  const message =
    reason === 'budget' ? t.throttledBudget : reason === 'provider' ? t.throttledProvider : t.throttledRate;
  const canRetry = reason === 'rate' && remainingMs === 0;
  return (
    <div
      className={`${WEATHER_GLASS} relative z-10 mx-6 flex max-w-sm flex-col items-center gap-2 rounded-xl px-5 py-4 text-center`}
      role="status"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-white/60">{t.throttledTitle}</span>
      <p className="font-mono text-sm leading-relaxed text-white/90">{message}</p>
      {reason === 'rate' && remainingMs > 0 && (
        <span className="font-mono text-xs text-white/60">
          {t.throttledWait} {Math.ceil(remainingMs / 1000)}s
        </span>
      )}
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-mono text-sm text-green underline-offset-2 hover:underline"
        >
          {t.throttledTryAgain}
        </button>
      )}
    </div>
  );
}

// Where the making-of recipe points readers for the full source.
const GIST_URL = 'https://gist.github.com/yermilov/8843c6c380e6585c9163b91be730d6f2';

// The right-hand panel: just the exact prompt sent to Gemini, with the parts filled in
// live from the real conditions highlighted — and a key naming each one.
function Explainer({ scene, t }: { scene: SceneState; t: Strings }) {
  const ready = scene.status === 'ready' && scene.prompt;
  const subs = (scene.status === 'ready' && scene.substitutions) || [];

  return (
    // On desktop the panel matches the scene column's height, so the prompt
    // scrolls inside the viewport instead of stretching the page below it.
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-9rem)] lg:min-h-0">
      <p className="max-w-prose leading-relaxed text-ink">
        {t.promptNote}
        <a
          href={GIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green underline-offset-2 hover:underline"
        >
          {t.promptNoteLink}
        </a>
        {t.promptNoteAfter}
      </p>
      {ready ? (
        <pre className="max-h-[50vh] overflow-auto rounded-lg border border-rule bg-coal/40 p-4 font-mono text-xs leading-relaxed text-ink/90 whitespace-pre-wrap lg:max-h-none lg:min-h-0 lg:flex-1">
          {subs.length > 0 ? (
            <HighlightedPrompt prompt={scene.prompt!} subs={subs} t={t} />
          ) : (
            scene.prompt
          )}
        </pre>
      ) : (
        <p className="flex items-center justify-center rounded-lg border border-dashed border-rule px-3 py-10 text-center font-mono text-xs text-ink-muted lg:min-h-0 lg:flex-1">
          {scene.status === 'loading' ? t.painting : t.promptWaiting}
        </p>
      )}
    </div>
  );
}

export default function WeatherWidget({ locale = 'en' }: { locale?: Locale }) {
  const t = STR[locale] ?? STR.en;
  const [state, setState] = useState<State>({ status: 'locating' });
  const [scene, setScene] = useState<SceneState>({ status: 'idle' });
  const sceneRequest = useRef(0);

  const run = (lat: number, lon: number, place: string, fallback: boolean) => {
    sceneRequest.current += 1;
    setState({ status: 'loading' });
    setScene({ status: 'idle' });
    fetchWeather(lat, lon)
      .then((w) => setState({ status: 'ready', data: { ...w, lat, lon, place, fallback } }))
      .catch((e: unknown) =>
        setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      );
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      run(FALLBACK.lat, FALLBACK.lon, `${FALLBACK.place} · default`, true);
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        run(latitude, longitude, await reverseGeocode(latitude, longitude), false);
      },
      () => run(FALLBACK.lat, FALLBACK.lon, `${FALLBACK.place} · default`, true),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  };

  const loadScene = (d: Current) => {
    const requestId = ++sceneRequest.current;
    setScene({ status: 'loading' });
    fetch(`${API_ORIGIN}/api/weather-scene`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: d.lat, lon: d.lon }),
    })
      .then(async (res) => {
        // A 429 is an intentional throttle, not a failure — surface it as its own
        // state (with the reason + a cooldown from Retry-After) so the UI can show
        // a calm "busy / back later" panel instead of an eager retry that just
        // re-hits the limit. `code` distinguishes rate vs daily-budget vs provider.
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as { code?: string } | null;
          const reason: ThrottleReason =
            body?.code === 'daily_budget'
              ? 'budget'
              : body?.code === 'provider_quota'
                ? 'provider'
                : 'rate';
          const retryAfterSec = Number(res.headers.get('Retry-After'));
          const retryAt =
            Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? Date.now() + retryAfterSec * 1000 : null;
          if (requestId === sceneRequest.current) setScene({ status: 'throttled', reason, retryAt });
          return null;
        }
        if (!res.ok) throw new Error(`scene ${res.status}`);
        return (await res.json()) as {
          image: string;
          cached?: boolean;
          prompt?: string;
          substitutions?: Substitution[];
        };
      })
      .then((payload) => {
        if (!payload || requestId !== sceneRequest.current) return;
        setScene({
          status: 'ready',
          image: payload.image,
          cached: !!payload.cached,
          prompt: payload.prompt,
          substitutions: payload.substitutions,
        });
      })
      .catch(() => {
        if (requestId === sceneRequest.current) setScene({ status: 'error' });
      });
  };

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.status !== 'ready' || scene.status !== 'idle') return;
    loadScene(state.data);
  }, [state, scene.status]);

  if (state.status === 'ready') {
    const d = state.data;
    const { label } = describe(d.code);

    // Throttled overlay: a calm "busy / back later" panel instead of the generic
    // retry button. For a rate limit we count the Retry-After cooldown down and
    // only then offer a retry; for the daily/provider caps a retry won't help
    // until the reset, so we show the message alone.
    const throttled = scene.status === 'throttled' ? scene : null;

    return (
      <div className="not-prose">
        {/* Desktop: full-screen two columns (scene | how-it-works). Mobile: stacked. */}
        <div className="grid gap-6 lg:min-h-[calc(100vh-9rem)] lg:grid-cols-2 lg:items-center lg:gap-10">
          {/* LEFT — the painted scene */}
          <div className="flex flex-col items-center">
            <div className="w-full overflow-hidden rounded-2xl border border-rule bg-elevated">
              <div className="relative mx-auto flex aspect-[4/5] w-full max-w-xl items-center justify-center overflow-hidden bg-coal/35 lg:aspect-auto lg:h-[calc(100vh-9rem)] lg:max-w-none">
                {scene.status === 'ready' ? (
                  <img
                    src={scene.image}
                    alt={`Generated isometric ${label} weather scene for ${d.place}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-coal via-elevated to-rule" />
                )}
                {throttled ? (
                  <ThrottledScene reason={throttled.reason} retryAt={throttled.retryAt} t={t} onRetry={() => loadScene(d)} />
                ) : scene.status !== 'ready' ? (
                  <button
                    type="button"
                    onClick={() => loadScene(d)}
                    disabled={scene.status === 'loading'}
                    className={`${WEATHER_GLASS} relative z-10 mx-6 rounded-xl px-4 py-2 font-mono text-sm text-white/90 hover:text-green disabled:cursor-wait disabled:text-white/60`}
                  >
                    {scene.status === 'loading'
                      ? t.painting
                      : scene.status === 'error'
                        ? t.retryScene
                        : t.paint}
                  </button>
                ) : null}
                <TemperatureOverlay data={d} label={label} />
                <ForecastBar forecast={d.forecast} />
              </div>
            </div>
            {d.fallback && (
              <button
                type="button"
                onClick={locate}
                className="mt-3 font-mono text-sm text-green underline-offset-2 hover:underline"
              >
                {t.useLocation}
              </button>
            )}
          </div>

          {/* RIGHT — the exact prompt, with live-substituted parts highlighted */}
          <Explainer scene={scene} t={t} />
        </div>
      </div>
    );
  }

  return (
    <div className="not-prose my-6 rounded-2xl border border-rule bg-elevated p-6 font-mono text-sm text-ink-muted">
      {state.status === 'error' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {t.failed} — {state.message}
          </span>
          <button
            type="button"
            onClick={locate}
            className="rounded-lg border border-rule px-3 py-1 text-ink hover:text-green"
          >
            {t.retry}
          </button>
        </div>
      ) : (
        <span>{state.status === 'locating' ? t.locating : t.loading}</span>
      )}
    </div>
  );
}
