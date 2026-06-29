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

type Current = {
  lat: number;
  lon: number;
  tempC: number;
  code: number;
  isDay: boolean;
  humidity: number | null;
  wind: number | null;
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

async function fetchWeather(
  lat: number,
  lon: number,
): Promise<Omit<Current, 'lat' | 'lon' | 'place' | 'fallback'>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const c = (await res.json())?.current ?? {};
  return {
    tempC: Math.round(Number(c.temperature_2m)),
    code: Number(c.weather_code ?? 0),
    isDay: Number(c.is_day ?? 1) === 1,
    humidity: c.relative_humidity_2m ?? null,
    wind: c.wind_speed_10m ?? null,
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
        <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(240px,0.9fr)]">
          <div className="flex items-center gap-5 p-6">
            <div className="text-6xl leading-none" aria-hidden>
              {icon}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-5xl leading-none text-ink">{d.tempC}°</div>
              <div className="mt-2 truncate text-ink-muted">
                {label} · <span className="text-ink">{d.place}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-rule md:border-l md:border-t-0">
            <div className="flex aspect-square min-h-64 items-center justify-center bg-coal/35">
              {scene.status === 'ready' ? (
                <img
                  src={scene.image}
                  alt={`Generated isometric ${label} weather scene for ${d.place}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => loadScene(d)}
                  disabled={scene.status === 'loading'}
                  className="mx-6 rounded-lg border border-rule px-4 py-2 font-mono text-sm text-ink hover:text-green disabled:cursor-wait disabled:text-ink-muted"
                >
                  {scene.status === 'loading'
                    ? 'painting scene...'
                    : scene.status === 'error'
                      ? 'retry scene'
                      : 'paint current sky'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-rule px-6 py-3 font-mono text-sm text-ink-muted">
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
