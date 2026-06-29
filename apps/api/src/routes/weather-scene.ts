import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { AppBindings } from '../types';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const MAX_SCENE_CACHE_ENTRIES = 80;
const GENERATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_GENERATIONS_PER_CLIENT_WINDOW = 12;
const MAX_GENERATIONS_GLOBAL_WINDOW = 120;

const requestSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

type Scene = {
  image: string;
  generatedAt: string;
};

type CurrentWeather = {
  tempC: number;
  code: number;
  isDay: boolean;
  condition: string;
};

const WMO_LABELS: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'rime fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'dense drizzle',
  56: 'freezing drizzle',
  57: 'freezing drizzle',
  61: 'slight rain',
  63: 'rain',
  65: 'heavy rain',
  66: 'freezing rain',
  67: 'freezing rain',
  71: 'slight snow',
  73: 'snow',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'rain showers',
  81: 'rain showers',
  82: 'violent showers',
  85: 'snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'thunderstorm with hail',
};

const cache = new Map<string, { expiresAt: number; scene: Scene }>();
const clientGenerationBuckets = new Map<string, { resetAt: number; count: number }>();
let globalGenerationBucket = { resetAt: 0, count: 0 };

function cacheKey(input: z.infer<typeof requestSchema>, weather: CurrentWeather) {
  const roundedLat = Math.round(input.lat * 100) / 100;
  const roundedLon = Math.round(input.lon * 100) / 100;
  const dayPart = weather.isDay ? 'day' : 'night';
  return [
    roundedLat,
    roundedLon,
    weather.code,
    Math.round(weather.tempC),
    dayPart,
  ].join(':');
}

function pruneExpiredSceneCache(now: number) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function capSceneCache() {
  while (cache.size > MAX_SCENE_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

function buildPrompt(input: z.infer<typeof requestSchema>, weather: CurrentWeather) {
  const dayPart = weather.isDay ? 'daytime' : 'nighttime';
  return [
    'Create a single square isometric city weather scene for a personal website lab widget.',
    `Location coordinates: ${input.lat.toFixed(2)}, ${input.lon.toFixed(2)}.`,
    `Current weather: ${weather.condition}, ${Math.round(weather.tempC)} degrees Celsius, ${dayPart}.`,
    'Render a compact architectural diorama: streets, roofs, windows, trees, and sky.',
    'Make the weather visually accurate: clouds, rain, snow, fog, sun, moon, wet pavement, shadows, or warm windows as appropriate.',
    'Use sophisticated editorial illustration, crisp geometry, no text, no logos, no UI, no people in focus.',
  ].join(' ');
}

async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code,is_day&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) return null;

  const current = (await res.json())?.current ?? {};
  const tempC = Number(current.temperature_2m);
  const code = Number(current.weather_code ?? 0);
  if (!Number.isFinite(tempC) || !Number.isInteger(code)) return null;

  return {
    tempC,
    code,
    isDay: Number(current.is_day ?? 1) === 1,
    condition: WMO_LABELS[code] ?? 'clear sky',
  };
}

function extractImageData(response: unknown): string | null {
  const candidates =
    (response as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
      .candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts ?? []) {
      const inlineData = part.inlineData as
        | { data?: string; mimeType?: string }
        | undefined;
      if (inlineData?.data) {
        const mimeType = inlineData.mimeType ?? 'image/png';
        return `data:${mimeType};base64,${inlineData.data}`;
      }
    }
  }
  return null;
}

function clientKey(c: Context<AppBindings>) {
  // Railway provides the proxy chain in x-forwarded-for. Use the last hop so a
  // caller-supplied prefix cannot mint a fresh rate-limit bucket.
  const forwardedFor = c.req
    .header('x-forwarded-for')
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const clientAddress = forwardedFor?.at(-1) ?? 'unknown';
  const userAgent = (c.req.header('user-agent') ?? 'unknown').slice(0, 120);
  return `${clientAddress}:${userAgent}`;
}

function pruneClientBuckets(now: number) {
  for (const [key, bucket] of clientGenerationBuckets) {
    if (bucket.resetAt <= now) clientGenerationBuckets.delete(key);
  }
}

function takeGenerationSlot(client: string, now: number) {
  pruneClientBuckets(now);

  const clientBucket = clientGenerationBuckets.get(client) ?? {
    resetAt: now + GENERATION_WINDOW_MS,
    count: 0,
  };
  if (clientBucket.count >= MAX_GENERATIONS_PER_CLIENT_WINDOW) {
    clientGenerationBuckets.set(client, clientBucket);
    return { allowed: false, retryAfterMs: clientBucket.resetAt - now };
  }

  if (globalGenerationBucket.resetAt <= now) {
    globalGenerationBucket = { resetAt: now + GENERATION_WINDOW_MS, count: 0 };
  }
  if (globalGenerationBucket.count >= MAX_GENERATIONS_GLOBAL_WINDOW) {
    return { allowed: false, retryAfterMs: globalGenerationBucket.resetAt - now };
  }

  clientBucket.count += 1;
  clientGenerationBuckets.set(client, clientBucket);
  globalGenerationBucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function weatherSceneRoutes(args: {
  apiKey?: string;
  model: string;
  allowedOrigins: string[];
}) {
  return new Hono<AppBindings>().post('/', async (c) => {
    const origin = c.req.header('origin');
    if (!origin || !args.allowedOrigins.includes(origin)) {
      return c.json({ error: 'weather scene generation origin is not allowed' }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid weather scene request' }, 400);
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid weather scene request' }, 400);
    }
    if (!args.apiKey) {
      return c.json({ error: 'weather scene generation is not configured' }, 503);
    }

    const input = parsed.data;
    const weather = await fetchCurrentWeather(input.lat, input.lon);
    if (!weather) {
      return c.json({ error: 'current weather lookup failed' }, 502);
    }

    const key = cacheKey(input, weather);
    const now = Date.now();
    pruneExpiredSceneCache(now);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return c.json({ ...cached.scene, cached: true });
    }

    const slot = takeGenerationSlot(clientKey(c), now);
    if (!slot.allowed) {
      c.header('Retry-After', String(Math.ceil(slot.retryAfterMs / 1000)));
      return c.json({ error: 'weather scene generation is rate limited' }, 429);
    }

    const prompt = buildPrompt(input, weather);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      args.model,
    )}:generateContent?key=${encodeURIComponent(args.apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!res.ok) {
      c.var.logger.warn({
        event: 'weather_scene.gemini_error',
        status: res.status,
        model: args.model,
      });
      return c.json({ error: 'weather scene generation failed' }, 502);
    }

    const image = extractImageData(await res.json());
    if (!image) {
      c.var.logger.warn({ event: 'weather_scene.no_image', model: args.model });
      return c.json({ error: 'weather scene generation returned no image' }, 502);
    }

    const scene = { image, generatedAt: new Date(now).toISOString() };
    cache.set(key, { scene, expiresAt: now + THREE_HOURS_MS });
    capSceneCache();
    return c.json({ ...scene, cached: false });
  });
}
