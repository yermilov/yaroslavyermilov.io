import { weatherSceneCache, weatherSceneDay } from '@yermilov/db-schema';
import { and, eq, gt, lte, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { Database } from '../db';
import type { AppBindings } from '../types';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const MAX_SCENE_CACHE_ENTRIES = 80;
const GENERATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_GENERATIONS_PER_CLIENT_WINDOW = 12;
const MAX_GENERATIONS_GLOBAL_WINDOW = 120;
const LOCATION_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;
const CLOUD_COVER_THRESHOLD_DRAMATIC = 70;
const CLOUD_COVER_THRESHOLD_SCATTERED = 30;

const requestSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

// A dynamic value the live weather/location data filled into the prompt template.
// `value` is the exact substring that appears in `prompt`, so the lab's "how it
// works" panel can locate and highlight it verbatim. `kind` names which slot it filled.
type PromptSubstitution = {
  kind: 'location' | 'time' | 'weather' | 'temperature' | 'atmosphere' | 'lighting';
  value: string;
};

type Scene = {
  image: string;
  generatedAt: string;
  prompt: string;
  substitutions: PromptSubstitution[];
};

type CurrentWeather = {
  tempC: number;
  code: number;
  isDay: boolean;
  condition: string;
  cloudCover: number;
  precipitation: number;
  time?: string;
};

type SettlementType = 'city' | 'town' | 'village' | 'hamlet' | 'unknown';

type LocationContext = {
  city?: string;
  country?: string;
  settlementType?: SettlementType;
};

type WeatherPromptContext = {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  cloudCover: number;
  precipitation: number;
  userHour?: number;
  userMinute?: number;
  userDay?: number;
  userMonth?: number;
  userYear?: number;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  settlementType?: SettlementType;
};

type WeatherCompositionResult = {
  elements: string;
  instructions: string;
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
const locationContextCache = new Map<string, { expiresAt: number; context: LocationContext }>();
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

function getWeatherDescription(code: number): string {
  const codeMap: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'foggy',
    48: 'depositing rime fog',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'dense drizzle',
    56: 'light freezing drizzle',
    57: 'dense freezing drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    66: 'light freezing rain',
    67: 'heavy freezing rain',
    71: 'slight snowfall',
    73: 'moderate snowfall',
    75: 'heavy snowfall',
    77: 'snow grains',
    80: 'slight rain showers',
    81: 'moderate rain showers',
    82: 'violent rain showers',
    85: 'slight snow showers',
    86: 'heavy snow showers',
    95: 'thunderstorm',
    96: 'thunderstorm with slight hail',
    99: 'thunderstorm with heavy hail',
  };

  return codeMap[code] || 'clear sky';
}

function getWeatherComposition(context: WeatherPromptContext): WeatherCompositionResult {
  const elements: string[] = [];
  const instructions: string[] = [];

  if (context.cloudCover > CLOUD_COVER_THRESHOLD_DRAMATIC) {
    elements.push('dense dramatic clouds');
    instructions.push(
      'Clouds should exist at MULTIPLE heights - some above the skyline, some wrapping around mid-level buildings, creating depth and dramatic atmosphere. The overcast sky should diffuse light across the entire scene.'
    );
  } else if (context.cloudCover > CLOUD_COVER_THRESHOLD_SCATTERED) {
    elements.push('fluffy scattered clouds');
    instructions.push(
      'Scatter clouds at various heights throughout the scene, some floating between buildings to create depth.'
    );
  }

  if (context.precipitation > 0) {
    if (context.temperature < 0) {
      elements.push('falling snowflakes');
      instructions.push(
        'Snowflakes must fall visibly THROUGH the entire scene - between buildings, at ALL vertical levels, not just at the top. Show snow accumulation on roofs, ledges, windowsills, and ground. Surfaces should have a fresh snow coating.'
      );
    } else {
      elements.push('rain droplets');
      instructions.push(
        'Rain must fall visibly THROUGH the entire architectural zone - between buildings, at ALL vertical levels, not just at the top. Show wet reflections on building surfaces, glistening rooftops, and puddles forming at street level.'
      );
    }
  }

  if (context.weatherCode === 45 || context.weatherCode === 48) {
    elements.push('atmospheric fog');
    instructions.push(
      'Fog should WRAP AROUND buildings at mid-level, not just float at the top. Reduce visibility of distant buildings progressively. The fog creates a mysterious, layered depth effect throughout the scene.'
    );
  }

  if (context.isDay) {
    if (context.cloudCover < CLOUD_COVER_THRESHOLD_SCATTERED) {
      elements.push('warm sunlight');
      instructions.push(
        'Sunlight should cast visible shadows on buildings and streets. The warm lighting must illuminate building facades throughout the scene, not just the sky area.'
      );
    }
  } else {
    elements.push('moonlight and stars');
    instructions.push(
      'Cool blue moonlight should illuminate building surfaces throughout the scene. Add warm glowing windows in buildings to contrast with the cool night tones.'
    );
  }

  return {
    elements: elements.length > 0 ? elements.join(', ') : 'calm atmospheric conditions',
    instructions:
      instructions.length > 0
        ? instructions.join('\n\n')
        : 'Weather lighting should be visible on building surfaces throughout the scene.',
  };
}

function getLightingDescription(isDay: boolean, userHour?: number): string {
  if (!isDay) {
    return 'cool blue nighttime lighting with warm window glows from buildings';
  }
  if (userHour !== undefined) {
    if (userHour >= 5 && userHour < 9) return 'soft golden morning light with long shadows';
    if (userHour >= 17 && userHour < 20) return 'warm orange sunset lighting';
  }
  return 'bright natural daylight with soft shadows';
}

function getTimeOfDayDescription(context: {
  isDay: boolean;
  userHour?: number;
  userMinute?: number;
  userDay?: number;
  userMonth?: number;
  userYear?: number;
}): string {
  const { isDay, userHour, userMinute, userDay, userMonth, userYear } = context;

  if (userHour === undefined) {
    return isDay ? 'during daytime' : 'at nighttime';
  }

  const timeStr = `${userHour.toString().padStart(2, '0')}:${(userMinute ?? 0).toString().padStart(2, '0')}`;
  const period = isDay ? 'daytime' : 'nighttime';

  let dateStr = '';
  if (userDay !== undefined && userMonth !== undefined && userYear !== undefined) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthName = monthNames[userMonth - 1] ?? 'Unknown';
    dateStr = ` on ${monthName} ${userDay}, ${userYear}`;
  }

  if (userHour >= 5 && userHour < 9) {
    return `in the early morning at ${timeStr}${dateStr} (${period})`;
  } else if (userHour >= 9 && userHour < 12) {
    return `in the late morning at ${timeStr}${dateStr} (${period})`;
  } else if (userHour >= 12 && userHour < 14) {
    return `around noon at ${timeStr}${dateStr} (${period})`;
  } else if (userHour >= 14 && userHour < 17) {
    return `in the afternoon at ${timeStr}${dateStr} (${period})`;
  } else if (userHour >= 17 && userHour < 20) {
    return `in the evening at ${timeStr}${dateStr} (${period})`;
  } else if (userHour >= 20 || userHour < 5) {
    return `at night at ${timeStr}${dateStr} (${period})`;
  }

  return `at ${timeStr}${dateStr} (${period})`;
}

function isRuralSettlement(settlementType: SettlementType | undefined): boolean {
  return settlementType === 'village' || settlementType === 'hamlet' || settlementType === 'town';
}

function getSettlementLabel(settlementType: SettlementType | undefined): string {
  switch (settlementType) {
    case 'city':
      return 'city';
    case 'town':
      return 'town';
    case 'village':
      return 'village';
    case 'hamlet':
      return 'hamlet';
    default:
      return 'location';
  }
}

function buildWeatherImagePrompt(context: WeatherPromptContext): {
  prompt: string;
  substitutions: PromptSubstitution[];
} {
  const weather = getWeatherDescription(context.weatherCode);
  const weatherComposition = getWeatherComposition(context);
  const lighting = getLightingDescription(context.isDay, context.userHour);
  const timeOfDay = getTimeOfDayDescription({
    isDay: context.isDay,
    userHour: context.userHour,
    userMinute: context.userMinute,
    userDay: context.userDay,
    userMonth: context.userMonth,
    userYear: context.userYear,
  });

  const tempStr = `${Math.round(context.temperature)}°C`;

  const hasCoords = typeof context.latitude === 'number' && typeof context.longitude === 'number';
  const hasCity = !!context.city;
  const hasCountry = !!context.country;
  const isRural = isRuralSettlement(context.settlementType);
  const settlementLabel = getSettlementLabel(context.settlementType);

  // The dynamic values injected into the template below — each `value` is the exact
  // substring that lands in the returned prompt, so the lab UI can highlight it. Only
  // `location` differs between the rural/urban branches; the rest are shared.
  const buildSubs = (locationDescription: string): PromptSubstitution[] => [
    { kind: 'location', value: locationDescription },
    { kind: 'time', value: timeOfDay },
    { kind: 'weather', value: weather },
    { kind: 'temperature', value: tempStr },
    { kind: 'atmosphere', value: weatherComposition.elements },
    { kind: 'lighting', value: lighting },
  ];

  const backgroundStyle = context.isDay
    ? 'Use a warm, soft background - creamy off-white (#FAFAF9) with subtle warm orange-peach tones.'
    : 'Use a deep, atmospheric dark background - dark navy blue (#1A1A2E) with subtle purple undertones.';

  if (isRural && hasCoords) {
    const locationDescription = hasCity
      ? `the ${settlementLabel} of ${context.city}${hasCountry ? `, ${context.country}` : ''}`
      : `a ${settlementLabel} at coordinates (${context.latitude!.toFixed(4)}, ${context.longitude!.toFixed(4)})${hasCountry ? ` in ${context.country}` : ''}`;

    const villageGuidance = hasCity
      ? `Depict the ${settlementLabel} of ${context.city} with its characteristic rural architecture. If you are unfamiliar with this ${settlementLabel}, use search to learn about typical ${hasCountry ? context.country + ' ' : ''}village architecture.`
      : `Depict a typical ${hasCountry ? context.country + ' ' : ''}${settlementLabel} with authentic rural architecture.`;

    const natureGuidance = hasCountry
      ? `Show the natural landscape typical for this region of ${context.country} - fields, forests, meadows, orchards, rivers, or whatever terrain realistically exists at these coordinates. Use search to learn about the typical landscape around ${hasCity ? context.city : 'this area'} if unsure.`
      : `Show natural landscape elements typical for the coordinates - fields, forests, meadows, or whatever terrain realistically exists there.`;

    return {
      substitutions: buildSubs(locationDescription),
      prompt: `Create a 45° top-down isometric miniature 3D cartoon scene depicting ${locationDescription}, ${timeOfDay}, in ${weather} weather conditions.

SCALE & COMPOSITION (CRITICAL FOR VILLAGE): Aerial view from 500m altitude at 45° isometric angle showing approximately 1km x 1km area. This is a RURAL scene with MIXED landscape:
- 40% of the frame: Village/settlement with 20-50 small houses, a church or local landmark, dirt roads, and farm buildings
- 50% of the frame: Natural landscape - fields, forests, meadows, rivers, or terrain typical for the region
- 10% of the frame: Transition areas - gardens, orchards, fences, paths connecting to nature

VILLAGE ARCHITECTURE: ${villageGuidance} Include traditional houses with characteristic roof styles, a small church or chapel, farm buildings, wooden fences, vegetting gardens, and unpaved roads.

NATURAL LANDSCAPE: ${natureGuidance}

STYLE: Clean composition, ${backgroundStyle} Soft refined textures with ${lighting}. Capture the peaceful, pastoral atmosphere of rural life.

WEATHER (CRITICAL - ${tempStr}, ${weatherComposition.elements}):
${weatherComposition.instructions}
Weather must be visible throughout the ENTIRE scene - over both village and nature areas.

DO NOT include any text, labels, or UI elements. Pure rural landscape scene only. Aspect ratio: 4:5 vertical portrait.`,
    };
  }

  let locationDescription: string;
  let landmarkGuidance: string;

  if (hasCoords) {
    if (hasCity) {
      locationDescription = `the ${settlementLabel} of ${context.city}`;
    } else {
      locationDescription = `a location at coordinates (${context.latitude!.toFixed(4)}, ${context.longitude!.toFixed(4)})`;
    }

    if (hasCountry) {
      locationDescription += `, ${context.country}`;
    }

    if (hasCity) {
      landmarkGuidance = `Include a few famous ${context.city} landmarks as recognizable focal points. If you are unfamiliar or unsure about ${context.city} landmarks or recognizable architecture, use search to study them first.`;
    } else {
      landmarkGuidance = `Depict rolling countryside, villages, fields, forests, or whatever terrain realistically exists at these coordinates${hasCountry ? ` in ${context.country}` : ''}. Include any notable local structures like churches, farms, or historic buildings as focal points.`;
    }
  } else {
    locationDescription =
      'a mysterious floating island in the digital void, Tron-meets-Kung-Fury style';
    landmarkGuidance =
      'Feature a surreal retrofuturistic cityscape with neon-outlined geometric buildings, glowing grid lines extending into infinity, synthwave aesthetics, and impossible architecture. Include holographic pyramids, chrome towers with scanline textures, laser beams cutting through the sky, and an endless orthogonal grid floor stretching toward the horizon. Think 80s sci-fi album cover meets cyberpunk fever dream. Bonus points for a tiny pixelated sun or moon with sunglasses.';
  }

  let architectureStyle: string;
  if (hasCoords && hasCity && hasCountry) {
    architectureStyle = `Architecture should reflect the authentic building styles of ${context.city}, ${context.country}. If you know this location's typical architecture (building materials, roof styles, colors, urban layout), use it. Otherwise, use search to learn about ${context.city}'s characteristic architecture before generating.`;
  } else if (hasCoords && hasCountry) {
    architectureStyle = `Architecture should reflect typical building styles found in ${context.country}. Use characteristic materials, roof shapes, colors, and urban patterns of the region.`;
  } else if (hasCoords) {
    architectureStyle = `Use generic but realistic urban or rural architecture appropriate for the coordinates.`;
  } else {
    architectureStyle = `Use stylized retrofuturistic architecture with neon accents and chrome surfaces.`;
  }

  return {
    substitutions: buildSubs(locationDescription),
    prompt: `Create a 45° top-down isometric miniature 3D cartoon scene depicting ${locationDescription}, ${timeOfDay}, in ${weather} weather conditions.

SCALE & COMPOSITION (CRITICAL): Aerial view from 500m altitude at 45° isometric angle. Show approximately 1km x 1km area with 100-200 tiny buildings (each 5-15 pixels tall). Buildings and streets must fill 90%+ of the frame - this is a bird's-eye view of an entire neighborhood, NOT a close-up of a few blocks.

LANDMARKS: ${landmarkGuidance}

ARCHITECTURE: ${architectureStyle}

STYLE: Clean composition, ${backgroundStyle} Soft refined textures with ${lighting}.

WEATHER (CRITICAL - ${tempStr}, ${weatherComposition.elements}):
${weatherComposition.instructions}
Weather must be visible throughout the ENTIRE scene, not just at edges.

DO NOT include any text, labels, or UI elements. Pure architectural scene only. Aspect ratio: 4:5 vertical portrait.`,
  };
}

function extractLocalTimeParts(time?: string) {
  const match = time?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return {};
  return {
    userYear: Number(match[1]),
    userMonth: Number(match[2]),
    userDay: Number(match[3]),
    userHour: Number(match[4]),
    userMinute: Number(match[5]),
  };
}

function locationContextKey(lat: number, lon: number) {
  return `${lat.toFixed(3)}:${lon.toFixed(3)}`;
}

async function fetchLocationContext(lat: number, lon: number): Promise<LocationContext> {
  const key = locationContextKey(lat, lon);
  const cached = locationContextCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.context;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
      '&format=json&addressdetails=1&accept-language=en';
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: {
        'user-agent': 'yaroslavyermilov.io weather lab',
      },
    });
    if (!response.ok) throw new Error(`nominatim ${response.status}`);

    const address = ((await response.json()) as {
      address?: Record<string, string | undefined>;
    }).address;
    const context: LocationContext = {
      city:
        address?.city ??
        address?.town ??
        address?.village ??
        address?.hamlet ??
        address?.municipality ??
        address?.county,
      country: address?.country,
      settlementType: address?.city
        ? 'city'
        : address?.town
          ? 'town'
          : address?.village
            ? 'village'
            : address?.hamlet
              ? 'hamlet'
              : 'unknown',
    };
    locationContextCache.set(key, { context, expiresAt: Date.now() + LOCATION_CONTEXT_TTL_MS });
    return context;
  } catch {
    const context: LocationContext = {};
    locationContextCache.set(key, { context, expiresAt: Date.now() + 10 * 60 * 1000 });
    return context;
  }
}

function buildPrompt(
  input: z.infer<typeof requestSchema>,
  weather: CurrentWeather,
  location: LocationContext
) {
  return buildWeatherImagePrompt({
    temperature: weather.tempC,
    weatherCode: weather.code,
    isDay: weather.isDay,
    cloudCover: weather.cloudCover,
    precipitation: weather.precipitation,
    ...extractLocalTimeParts(weather.time),
    city: location.city,
    country: location.country,
    latitude: input.lat,
    longitude: input.lon,
    settlementType: location.settlementType,
  });
}

async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,precipitation,weather_code,cloud_cover,is_day&timezone=auto';
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    res = await fetch(url, {
      headers: { 'user-agent': 'yaroslavyermilov.io weather lab' },
    });
    if (res.ok) break;
  }
  if (!res?.ok) return null;

  const current = (await res.json())?.current ?? {};
  const tempC = Number(current.temperature_2m);
  const code = Number(current.weather_code ?? 0);
  if (!Number.isFinite(tempC) || !Number.isInteger(code)) return null;

  return {
    tempC,
    code,
    isDay: Number(current.is_day ?? 1) === 1,
    condition: WMO_LABELS[code] ?? 'clear sky',
    cloudCover: Number(current.cloud_cover ?? 0),
    precipitation: Number(current.precipitation ?? 0),
    time: typeof current.time === 'string' ? current.time : undefined,
  };
}

function extractImageData(response: unknown): string | null {
  const visited = new Set<unknown>();

  function findNestedImage(value: unknown): string | null {
    if (!value || typeof value !== 'object' || visited.has(value)) return null;
    visited.add(value);

    const record = value as Record<string, unknown>;
    const mimeType = typeof record.mime_type === 'string'
      ? record.mime_type
      : typeof record.mimeType === 'string'
        ? record.mimeType
        : undefined;
    if (
      mimeType?.startsWith('image/') &&
      typeof record.data === 'string' &&
      record.data.length > 100
    ) {
      return `data:${mimeType};base64,${record.data}`;
    }

    if (
      record.type === 'image' &&
      typeof record.data === 'string' &&
      record.data.length > 100
    ) {
      return `data:image/jpeg;base64,${record.data}`;
    }

    for (const nested of Object.values(record)) {
      const image = findNestedImage(nested);
      if (image) return image;
    }
    return null;
  }

  const typedResponse = response as {
    output_image?: { data?: string; mime_type?: string };
    outputImage?: { data?: string; mimeType?: string };
  };
  if (typedResponse.output_image?.data) {
    const mimeType = typedResponse.output_image.mime_type ?? 'image/png';
    return `data:${mimeType};base64,${typedResponse.output_image.data}`;
  }

  const outputImage = typedResponse.outputImage;
  if (outputImage?.data) {
    const mimeType = outputImage.mimeType ?? 'image/png';
    return `data:${mimeType ?? 'image/png'};base64,${outputImage.data}`;
  }

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
  return findNestedImage(response);
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

// The UTC calendar day the budget counter is keyed on. A new day is a fresh
// row, so the budget auto-resets at 00:00 UTC. `date` columns are strings.
function utcDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// L2 persistent cache read (survives redeploys). Returns a non-expired scene
// together with the row's own expiry so L1 can be hydrated with the REMAINING
// lifetime, not a fresh 3h — otherwise a nearly-expired persisted scene would be
// served for almost another full TTL. Any DB error degrades to a miss — a
// database hiccup must never break the endpoint (L1 + fresh generation still work).
async function readPersistedScene(
  db: Database | null,
  key: string,
  now: number,
  c: Context<AppBindings>,
): Promise<{ scene: Scene; expiresAt: number } | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select({ payload: weatherSceneCache.payload, expiresAt: weatherSceneCache.expiresAt })
      .from(weatherSceneCache)
      .where(and(eq(weatherSceneCache.cacheKey, key), gt(weatherSceneCache.expiresAt, new Date(now))))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { scene: row.payload as Scene, expiresAt: new Date(row.expiresAt).getTime() };
  } catch (err) {
    c.var.logger.warn({ event: 'weather_scene.l2_read_error', err });
    return null;
  }
}

// Where a budget slot was reserved, so the matching release undoes the right
// counter. 'db' = the persistent Postgres counter; 'memory' = the in-process
// fallback used when there's no DB or the DB reserve failed.
type ReservationStore = 'db' | 'memory';

// In-process daily counter — the fallback budget so the hard cap NEVER silently
// vanishes when the DB is unavailable (missing table before the migration, or an
// outage). Per-instance and reset on restart (that's what the Postgres counter
// fixes), but during a DB problem it still bounds spend to the budget instead of
// falling back to the much looser rate limit. Keyed on the UTC day; a new day
// resets it.
let inMemoryBudget = { day: '', count: 0 };

function reserveInMemorySlot(now: number, budget: number): boolean {
  const day = utcDayKey(now);
  if (inMemoryBudget.day !== day) inMemoryBudget = { day, count: 0 };
  if (inMemoryBudget.count >= budget) return false;
  inMemoryBudget.count += 1;
  return true;
}

function releaseInMemorySlot(now: number): void {
  if (inMemoryBudget.day === utcDayKey(now) && inMemoryBudget.count > 0) {
    inMemoryBudget.count -= 1;
  }
}

// Reserve one generation against today's hard daily budget (cost control B),
// ATOMICALLY and CONDITIONALLY. The increment only happens when the day is still
// under budget (the `setWhere count < budget` guard), all in one statement — so
// a burst of concurrent cache misses can't all read the same sub-cap count and
// each generate (the viral-spike overshoot this feature prevents), AND a request
// that's already over budget does NOT bump the counter (no phantom counts to
// leave the day stuck over-budget). A returned row means a slot was granted;
// none means the cap is spent. WHICH store held it is returned so the caller
// releases the right one on failure.
//
// Fallback: no DB, or a DB error (outage, or the table missing pre-migration) →
// the in-process counter. The cap is thus NEVER silently disabled — it degrades
// to a per-instance cap, not to the much looser rate limit. Deliberate trade-off
// over failing closed: on a single-instance site keeping the widget alive during
// a DB blip (and across the pre-migration window) is worth a bounded worst case
// — if the DB fails mid-day AFTER it already recorded generations, this instance
// can grant up to another `budget` before the day rolls over. Bounded and rare;
// failing closed would instead break the widget on every DB hiccup.
async function reserveDailySlot(
  db: Database | null,
  now: number,
  budget: number,
  c: Context<AppBindings>,
): Promise<{ allowed: boolean; via: ReservationStore }> {
  if (!db) return { allowed: reserveInMemorySlot(now, budget), via: 'memory' };
  try {
    const rows = await db
      .insert(weatherSceneDay)
      .values({ day: utcDayKey(now), count: 1 })
      .onConflictDoUpdate({
        target: weatherSceneDay.day,
        set: { count: sql`${weatherSceneDay.count} + 1` },
        setWhere: sql`${weatherSceneDay.count} < ${budget}`,
      })
      .returning({ count: weatherSceneDay.count });
    // A row back = granted (fresh-day insert, or an under-budget increment). No
    // row = the conditional update didn't fire = the cap is spent (no increment).
    return { allowed: rows.length > 0, via: 'db' };
  } catch (err) {
    c.var.logger.warn({ event: 'weather_scene.reserve_error', err });
    return { allowed: reserveInMemorySlot(now, budget), via: 'memory' };
  }
}

// Give a reserved slot back when the generation it was reserved for fails, so a
// flaky Gemini can't silently erode the day's budget (only real, billable scenes
// should count). Releases the same store the reservation used. Best-effort.
async function releaseDailySlot(
  db: Database | null,
  now: number,
  via: ReservationStore,
  c: Context<AppBindings>,
): Promise<void> {
  if (via === 'memory') {
    releaseInMemorySlot(now);
    return;
  }
  if (!db) return;
  try {
    await db
      .update(weatherSceneDay)
      .set({ count: sql`GREATEST(${weatherSceneDay.count} - 1, 0)` })
      .where(eq(weatherSceneDay.day, utcDayKey(now)));
  } catch (err) {
    c.var.logger.warn({ event: 'weather_scene.release_error', err });
  }
}

// After a successful generation: persist the scene to L2 and opportunistically
// prune expired rows. The daily counter is NOT bumped here — it was already
// reserved atomically before generation (reserveDailySlot). Best-effort: a
// failure here must not fail the response the user already has.
async function persistSceneCache(
  db: Database | null,
  key: string,
  scene: Scene,
  now: number,
  c: Context<AppBindings>,
): Promise<void> {
  if (!db) return;
  const expiresAt = new Date(now + THREE_HOURS_MS);
  try {
    await db
      .insert(weatherSceneCache)
      .values({ cacheKey: key, payload: scene, expiresAt })
      .onConflictDoUpdate({
        target: weatherSceneCache.cacheKey,
        set: { payload: scene, expiresAt, createdAt: sql`now()` },
      });
    await db.delete(weatherSceneCache).where(lte(weatherSceneCache.expiresAt, new Date(now)));
  } catch (err) {
    c.var.logger.warn({ event: 'weather_scene.persist_error', err });
  }
}

export function weatherSceneRoutes(args: {
  apiKey?: string;
  model: string;
  allowedOrigins: string[];
  // The Drizzle db, or null when DATABASE_URL is unset → in-memory-only (no L2
  // cache, no daily budget enforcement). Matches the pre-persistence behaviour.
  db: Database | null;
  // Hard daily generation cap (cost control B).
  dailyBudget: number;
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

    // L2: persistent cache (survives redeploys). Hydrate L1 with the row's OWN
    // remaining lifetime (not a fresh 3h) and serve it — a cache hit is free
    // regardless of budget.
    const persisted = await readPersistedScene(args.db, key, now, c);
    if (persisted) {
      cache.set(key, { scene: persisted.scene, expiresAt: persisted.expiresAt });
      capSceneCache();
      return c.json({ ...persisted.scene, cached: true });
    }

    // Rate-limit gate first (in-memory, cheap, no DB write to compensate).
    const slot = takeGenerationSlot(clientKey(c), now);
    if (!slot.allowed) {
      c.header('Retry-After', String(Math.ceil(slot.retryAfterMs / 1000)));
      // `code` is a stable machine-readable signal the frontend branches on to
      // show a tailored throttled state (vs string-matching `error`).
      return c.json({ error: 'weather scene generation is rate limited', code: 'rate_limited' }, 429);
    }

    // Budget gate (cost control B): reaching here means a full cache miss that
    // passed the rate limit, i.e. we would call Gemini. Reserve one slot against
    // today's hard daily cap ATOMICALLY (increment-and-check in one statement) so
    // a concurrent burst can't overshoot the cap. If the day is spent, refuse.
    const reservation = await reserveDailySlot(args.db, now, args.dailyBudget, c);
    if (!reservation.allowed) {
      c.var.logger.warn({ event: 'weather_scene.daily_budget_reached', budget: args.dailyBudget });
      // Distinct code: the daily budget is spent for everyone until UTC midnight,
      // so the UI shows a "back tomorrow" message rather than a short cooldown.
      return c.json({ error: 'daily scene budget reached', code: 'daily_budget' }, 429);
    }

    // From here we hold a reserved budget slot. Guarantee it's released on ANY
    // path that doesn't produce a scene — the explicit 502s below AND a thrown
    // fetch/JSON error (which would otherwise skip the release and leak the slot,
    // falsely eroding the daily cap). The finally releases unless `generated`.
    let generated = false;
    try {
      const location = await fetchLocationContext(input.lat, input.lon);
      const { prompt, substitutions } = buildPrompt(input, weather, location);
      const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': args.apiKey,
        },
        body: JSON.stringify({
          model: args.model,
          input: [{ type: 'text', text: prompt }],
          response_format: {
            type: 'image',
            mime_type: 'image/jpeg',
            aspect_ratio: '4:5',
          },
        }),
      });

      if (!res.ok) {
        c.var.logger.warn({
          event: 'weather_scene.gemini_error',
          status: res.status,
          model: args.model,
        });
        // A provider-side 429 (the Google AI Studio per-project daily quota — the
        // independent backstop) is a throttle, not a generic failure: surface it
        // as our own 429 so the frontend shows the throttled state, not "retry".
        if (res.status === 429) {
          return c.json({ error: 'weather scene generation is throttled', code: 'provider_quota' }, 429);
        }
        return c.json({ error: 'weather scene generation failed' }, 502);
      }

      const image = extractImageData(await res.json());
      if (!image) {
        c.var.logger.warn({ event: 'weather_scene.no_image', model: args.model });
        return c.json({ error: 'weather scene generation returned no image' }, 502);
      }

      // `prompt` + `substitutions` are returned so the lab's "how it works" panel can
      // show the actual text sent to Gemini AND highlight the dynamic parts the live
      // conditions filled in; cached so a cache-hit response still carries them.
      const scene = { image, generatedAt: new Date(now).toISOString(), prompt, substitutions };
      cache.set(key, { scene, expiresAt: now + THREE_HOURS_MS });
      capSceneCache();
      // Persist to L2 (best-effort). The daily counter was already reserved before
      // generation, so it is NOT bumped again here.
      await persistSceneCache(args.db, key, scene, now, c);
      generated = true;
      return c.json({ ...scene, cached: false });
    } finally {
      // Reserved but no scene produced (502, or a thrown error propagating to the
      // app error handler) → give the slot back so failures don't spend budget.
      if (!generated) await releaseDailySlot(args.db, now, reservation.via, c);
    }
  });
}
