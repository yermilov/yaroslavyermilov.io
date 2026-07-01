import { useEffect, useRef, useState } from 'react';

// A small live-weather lab island (Tier 2): on mount it asks for your location,
// pulls the current conditions from Open-Meteo (free, no API key), and asks the
// API to paint a cached Gemini scene from the same current conditions.

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

type SceneState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; image: string; cached: boolean }
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
  const forecast = times
    .map((time: unknown, i: number) => ({
      time: String(time),
      tempC: Math.round(Number(temps[i])),
      code: Number(codes[i] ?? 0),
    }))
    .filter((hour: ForecastHour) => hour.time && Number.isFinite(hour.tempC))
    .slice(1, 9);

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

export default function WeatherWidget() {
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
        return (await res.json()) as { image: string; cached?: boolean };
      })
      .then((payload) => {
        if (requestId !== sceneRequest.current) return;
        setScene({ status: 'ready', image: payload.image, cached: !!payload.cached });
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
    const { label, icon } = describe(d.code);

    return (
      <div className="not-prose my-6 overflow-hidden rounded-2xl border border-rule bg-elevated">
        <div className="relative mx-auto flex aspect-[4/5] min-h-[420px] w-full max-w-2xl items-center justify-center overflow-hidden bg-coal/35">
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
                ? 'painting scene...'
                : scene.status === 'error'
                  ? 'retry scene'
                  : 'paint current sky'}
            </button>
          )}
          <TemperatureOverlay data={d} label={label} />
          <ForecastBar forecast={d.forecast} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-rule px-6 py-3 font-mono text-sm text-ink-muted">
          <span>
            {icon} {label} · <span className="text-ink">{d.place}</span>
          </span>
          {d.apparentTempC != null && d.apparentTempC !== d.tempC && (
            <span>feels like {formatTemp(d.apparentTempC)}</span>
          )}
          {d.humidity != null && <span>humidity {Math.round(d.humidity)}%</span>}
          {d.wind != null && <span>wind {Math.round(d.wind)} km/h</span>}
          <span>{d.isDay ? 'daytime' : 'nighttime'}</span>
          {scene.status === 'ready' && (
            <span>{scene.cached ? 'cached scene' : 'fresh scene'}</span>
          )}
          {d.fallback && (
            <button
              type="button"
              onClick={locate}
              className="ml-auto text-green underline-offset-2 hover:underline"
            >
              use my location
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="not-prose my-6 rounded-2xl border border-rule bg-elevated p-6 font-mono text-sm text-ink-muted">
      {state.status === 'error' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>couldn’t load weather — {state.message}</span>
          <button
            type="button"
            onClick={locate}
            className="rounded-lg border border-rule px-3 py-1 text-ink hover:text-green"
          >
            retry
          </button>
        </div>
      ) : (
        <span>{state.status === 'locating' ? 'finding your location…' : 'loading weather…'}</span>
      )}
    </div>
  );
}
