import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_WEATHER_API_KEY;
const GEO_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const WEATHER_URL = "https://weather.googleapis.com/v1";
const OPEN_METEO_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type WeatherResponse = {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  uvIndex: number;
  pressure: number;
  high: number;
  low: number;
  sunrise: string;
  sunset: string;
  forecast: Array<{
    day: string;
    condition: string;
    high: number;
    low: number;
    precipitation: number;
  }>;
  hourly: Array<{
    time: string;
    temp: number;
    condition: string;
  }>;
};

type AddressComponent = {
  types: string[];
  long_name: string;
  short_name: string;
};

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 6000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function conditionLabel(type: string): string {
  const t = (type || "").toUpperCase();
  if (t.includes("CLEAR") || t === "SUNNY") return "Sunny";
  if (t.includes("PARTLY")) return "Partly Cloudy";
  if (t.includes("MOSTLY_CLOUDY") || t.includes("OVERCAST") || t === "CLOUDY")
    return "Cloudy";
  if (t.includes("RAIN") || t.includes("DRIZZLE") || t.includes("SHOWER"))
    return "Rain";
  if (t.includes("SNOW") || t.includes("FLURR") || t.includes("BLIZZARD"))
    return "Snow";
  if (t.includes("THUNDER") || t.includes("STORM")) return "Thunderstorm";
  if (t.includes("FOG") || t.includes("MIST") || t.includes("HAZE"))
    return "Foggy";
  if (t.includes("WIND")) return "Cloudy";
  return "Partly Cloudy";
}

function formatTime(isoString: string, timeZone?: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  } catch {
    return "--:--";
  }
}

function formatHour(isoString: string, timeZone?: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
  } catch {
    return "--:--";
  }
}

function conditionFromWmoCode(code?: number): string {
  if (code === undefined || code === null) return "Partly Cloudy";

  if (code === 0) return "Sunny";
  if ([1, 2].includes(code)) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "Rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";

  return "Partly Cloudy";
}

async function fetchGoogleWeather(city: string): Promise<WeatherResponse> {
  const geoData = await fetchJsonWithTimeout<{
    status: string;
    error_message?: string;
    results?: Array<{
      geometry: { location: { lat: number; lng: number } };
      address_components: AddressComponent[];
    }>;
  }>(`${GEO_URL}?address=${encodeURIComponent(city)}&key=${API_KEY}`);

  if (geoData.status !== "OK") {
    if (geoData.status === "ZERO_RESULTS") {
      throw new Error(`City \"${city}\" not found`);
    }

    const details = geoData.error_message
      ? `${geoData.status}: ${geoData.error_message}`
      : geoData.status;
    throw new Error(`Google geocode error (${details})`);
  }

  if (!geoData.results?.length) {
    throw new Error(`City \"${city}\" not found`);
  }

  const result = geoData.results[0];
  const { lat, lng } = result.geometry.location;
  const components: AddressComponent[] = result.address_components;

  const cityName =
    components.find((c) => c.types.includes("locality"))?.long_name ||
    components.find((c) => c.types.includes("administrative_area_level_1"))
      ?.long_name ||
    city;
  const country =
    components.find((c) => c.types.includes("country"))?.short_name || "";

  const location = { latitude: lat, longitude: lng };

  const [currentData, hourlyData, dailyData] = await Promise.all([
    fetchJsonWithTimeout<{
      currentConditions?: {
        weatherCondition?: { type?: string; description?: { text?: string } };
        temperature?: { degrees?: number };
        feelsLikeTemperature?: { degrees?: number };
        humidity?: number;
        wind?: { speed?: { value?: number } };
        visibility?: { distance?: number };
        uvIndex?: number;
        airPressure?: { meanSeaLevelMillibars?: number };
      };
      timeZone?: { id?: string };
    }>(`${WEATHER_URL}/currentConditions:lookup?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    }),
    fetchJsonWithTimeout<{
      forecastHours?: Array<{
        interval?: { startTime?: string };
        temperature?: { degrees?: number };
        weatherCondition?: { type?: string };
      }>;
    }>(`${WEATHER_URL}/forecast/hours:lookup?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, hours: 24 }),
    }),
    fetchJsonWithTimeout<{
      forecastDays?: Array<{
        interval?: { startTime?: string };
        maxTemperature?: { degrees?: number };
        minTemperature?: { degrees?: number };
        daytimeForecast?: {
          weatherCondition?: { type?: string };
          precipitation?: { probability?: { percent?: number } };
        };
        overnightForecast?: {
          weatherCondition?: { type?: string };
        };
        precipitationProbability?: { percent?: number };
        sunEvents?: { sunriseTime?: string; sunsetTime?: string };
      }>;
    }>(`${WEATHER_URL}/forecast/days:lookup?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, days: 6 }),
    }),
  ]);

  const cc = currentData.currentConditions;
  if (!cc) {
    throw new Error("Weather data unavailable for this location");
  }

  const timeZone: string | undefined = currentData.timeZone?.id;
  const condition = conditionLabel(cc.weatherCondition?.type || "");
  const temperature = Math.round(cc.temperature?.degrees ?? 0);
  const feelsLike = Math.round(cc.feelsLikeTemperature?.degrees ?? temperature);

  const todayForecast = dailyData.forecastDays?.[0];
  const high = Math.round(
    todayForecast?.maxTemperature?.degrees ?? temperature + 2,
  );
  const low = Math.round(
    todayForecast?.minTemperature?.degrees ?? temperature - 4,
  );

  const forecast = (dailyData.forecastDays || []).slice(1, 6).map((day) => {
    const startDate = new Date(day.interval?.startTime || Date.now());
    return {
      day: DAYS[startDate.getDay()],
      condition: conditionLabel(
        day.daytimeForecast?.weatherCondition?.type ||
          day.overnightForecast?.weatherCondition?.type ||
          "",
      ),
      high: Math.round(day.maxTemperature?.degrees ?? 0),
      low: Math.round(day.minTemperature?.degrees ?? 0),
      precipitation: Math.round(
        day.daytimeForecast?.precipitation?.probability?.percent ??
          day.precipitationProbability?.percent ??
          0,
      ),
    };
  });

  const hourly = (hourlyData.forecastHours || []).slice(0, 6).map((h, i) => ({
    time: i === 0 ? "Now" : formatHour(h.interval?.startTime || "", timeZone),
    temp: Math.round(h.temperature?.degrees ?? 0),
    condition: conditionLabel(h.weatherCondition?.type || ""),
  }));

  return {
    city: cityName,
    country,
    temperature,
    feelsLike,
    condition,
    description: cc.weatherCondition?.description?.text || condition,
    humidity: Math.round(cc.humidity ?? 0),
    windSpeed: Math.round(cc.wind?.speed?.value ?? 0),
    visibility: Math.round(cc.visibility?.distance ?? 10),
    uvIndex: Math.round(cc.uvIndex ?? 0),
    pressure: Math.round(cc.airPressure?.meanSeaLevelMillibars ?? 1013),
    high,
    low,
    sunrise: todayForecast?.sunEvents?.sunriseTime
      ? formatTime(todayForecast.sunEvents.sunriseTime, timeZone)
      : "--:--",
    sunset: todayForecast?.sunEvents?.sunsetTime
      ? formatTime(todayForecast.sunEvents.sunsetTime, timeZone)
      : "--:--",
    forecast,
    hourly,
  };
}

async function fetchOpenMeteoWeather(city: string): Promise<WeatherResponse> {
  const geoData = await fetchJsonWithTimeout<{
    results?: Array<{
      latitude: number;
      longitude: number;
      name: string;
      country_code?: string;
    }>;
  }>(
    `${OPEN_METEO_GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );

  const location = geoData.results?.[0];
  if (!location) {
    throw new Error(`City \"${city}\" not found`);
  }

  const weather = await fetchJsonWithTimeout<{
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      surface_pressure?: number;
      wind_speed_10m?: number;
    };
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      weather_code?: number[];
    };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      sunrise?: string[];
      sunset?: string[];
      precipitation_probability_max?: number[];
      uv_index_max?: number[];
    };
  }>(
    `${OPEN_METEO_WEATHER_URL}?latitude=${location.latitude}&longitude=${location.longitude}` +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m" +
      "&hourly=temperature_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max" +
      "&forecast_days=6&timezone=auto",
  );

  const current = weather.current || {};
  const daily = weather.daily || {};
  const hourly = weather.hourly || {};

  const currentCondition = conditionFromWmoCode(current.weather_code);
  const currentTemp = Math.round(current.temperature_2m ?? 0);
  const currentFeelsLike = Math.round(
    current.apparent_temperature ?? currentTemp,
  );

  const hourlyForecast = (hourly.time || []).slice(0, 6).map((iso, i) => ({
    time: i === 0 ? "Now" : formatHour(iso),
    temp: Math.round(hourly.temperature_2m?.[i] ?? currentTemp),
    condition: conditionFromWmoCode(hourly.weather_code?.[i]),
  }));

  const dailyForecast = (daily.time || []).slice(1, 6).map((dayIso, i) => {
    const date = new Date(dayIso);
    return {
      day: DAYS[date.getDay()],
      condition: conditionFromWmoCode(daily.weather_code?.[i + 1]),
      high: Math.round(daily.temperature_2m_max?.[i + 1] ?? 0),
      low: Math.round(daily.temperature_2m_min?.[i + 1] ?? 0),
      precipitation: Math.round(
        daily.precipitation_probability_max?.[i + 1] ?? 0,
      ),
    };
  });

  return {
    city: location.name,
    country: location.country_code || "",
    temperature: currentTemp,
    feelsLike: currentFeelsLike,
    condition: currentCondition,
    description: currentCondition,
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    windSpeed: Math.round(current.wind_speed_10m ?? 0),
    visibility: 10,
    uvIndex: Math.round(daily.uv_index_max?.[0] ?? 0),
    pressure: Math.round(current.surface_pressure ?? 1013),
    high: Math.round(daily.temperature_2m_max?.[0] ?? currentTemp + 2),
    low: Math.round(daily.temperature_2m_min?.[0] ?? currentTemp - 4),
    sunrise: daily.sunrise?.[0] ? formatTime(daily.sunrise[0]) : "--:--",
    sunset: daily.sunset?.[0] ? formatTime(daily.sunset[0]) : "--:--",
    forecast: dailyForecast,
    hourly: hourlyForecast,
  };
}

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  try {
    if (API_KEY) {
      try {
        const googleWeather = await fetchGoogleWeather(city);
        return NextResponse.json(googleWeather);
      } catch (googleError) {
        const reason =
          googleError instanceof Error
            ? googleError.message
            : String(googleError);
        console.warn(
          `Google Weather API unavailable (${reason}). Using Open-Meteo fallback.`,
        );
      }
    }

    const openMeteoWeather = await fetchOpenMeteoWeather(city);
    return NextResponse.json(openMeteoWeather);
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json(
      { error: "Unable to load weather right now. Please try again." },
      { status: 503 },
    );
  }
}
