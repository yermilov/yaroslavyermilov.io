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
    promptNote: 'The exact text sent to Gemini — highlighted parts are filled in live from your location and weather.',
    promptWaiting: 'Paint the scene to reveal the prompt.',
    subsHint: 'Filled in live',
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
    promptNote: 'Точний текст, надісланий у Gemini — підсвічені частини підставлені наживо з вашої локації та погоди.',
    promptWaiting: 'Намалюйте сцену, щоб побачити промпт.',
    subsHint: 'Підставлено наживо',
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

type SceneState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; image: string; cached: boolean; prompt?: string; substitutions?: Substitution[] }
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
// highlight (its `title` names which slot it filled). Values are the exact substrings
// the template injected, so they match verbatim; occurrences are collected, sorted, and
// de-overlapped so a longer span always wins over a shorter one nested inside it.
function highlightPrompt(prompt: string, subs: Substitution[], t: Strings): React.ReactNode[] {
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
    out.push(
      <mark
        key={key++}
        title={t[SUB_LABEL[m.kind]]}
        className="rounded-[3px] bg-green/15 px-0.5 text-ink ring-1 ring-inset ring-green/40"
      >
        {prompt.slice(m.start, m.end)}
      </mark>,
    );
    cursor = m.end;
  }
  if (cursor < prompt.length) out.push(prompt.slice(cursor));
  return out;
}

// The right-hand panel: just the exact prompt sent to Gemini, with the parts filled in
// live from the real conditions highlighted — and a key naming each one.
function Explainer({ scene, t }: { scene: SceneState; t: Strings }) {
  const ready = scene.status === 'ready' && scene.prompt;
  const subs = (scene.status === 'ready' && scene.substitutions) || [];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">{t.prompt}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{t.promptNote}</p>
      {ready ? (
        <>
          <pre className="max-h-[50vh] overflow-auto rounded-lg border border-rule bg-coal/40 p-3 font-mono text-xs leading-relaxed text-ink/90 whitespace-pre-wrap">
            {subs.length > 0 ? highlightPrompt(scene.prompt!, subs, t) : scene.prompt}
          </pre>
          {subs.length > 0 && (
            <dl className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                {t.subsHint}
              </span>
              {subs.map((s) => (
                <div key={s.kind} className="flex items-baseline gap-2 border-t border-rule/60 pt-1.5">
                  <dt className="min-w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                    {t[SUB_LABEL[s.kind]]}
                  </dt>
                  <dd className="font-mono text-xs leading-relaxed text-green">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-rule px-3 py-4 text-center font-mono text-xs text-ink-muted">
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
        if (!res.ok) throw new Error(`scene ${res.status}`);
        return (await res.json()) as {
          image: string;
          cached?: boolean;
          prompt?: string;
          substitutions?: Substitution[];
        };
      })
      .then((payload) => {
        if (requestId !== sceneRequest.current) return;
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
                {scene.status !== 'ready' && (
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
                )}
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
