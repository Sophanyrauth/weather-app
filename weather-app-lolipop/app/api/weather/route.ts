import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_WEATHER_API_KEY;
const GEO_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const WEATHER_URL = "https://weather.googleapis.com/v1";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  try {
    // Geocode city → lat/lng
    const geoRes = await fetch(
      `${GEO_URL}?address=${encodeURIComponent(city)}&key=${API_KEY}`,
    );
    const geoData = await geoRes.json();

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return NextResponse.json(
        { error: `City "${city}" not found` },
        { status: 404 },
      );
    }

    const result = geoData.results[0];
    const { lat, lng } = result.geometry.location;
    type AddressComponent = {
      types: string[];
      long_name: string;
      short_name: string;
    };
    const components: AddressComponent[] = result.address_components;

    const cityName =
      components.find((c) => c.types.includes("locality"))?.long_name ||
      components.find((c) => c.types.includes("administrative_area_level_1"))
        ?.long_name ||
      city;
    const country =
      components.find((c) => c.types.includes("country"))?.short_name || "";

    const location = { latitude: lat, longitude: lng };

    // Fetch current conditions + hourly + daily in parallel
    const [currentRes, hourlyRes, dailyRes] = await Promise.all([
      fetch(`${WEATHER_URL}/currentConditions:lookup?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      }),
      fetch(`${WEATHER_URL}/forecast/hours:lookup?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, hours: 24 }),
      }),
      fetch(`${WEATHER_URL}/forecast/days:lookup?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, days: 6 }),
      }),
    ]);

    const [currentData, hourlyData, dailyData] = await Promise.all([
      currentRes.json(),
      hourlyRes.json(),
      dailyRes.json(),
    ]);

    const cc = currentData.currentConditions;
    if (!cc) {
      console.error(
        "Google Weather API response:",
        JSON.stringify(currentData),
      );
      return NextResponse.json(
        { error: "Weather data unavailable for this location" },
        { status: 502 },
      );
    }

    const timeZone: string | undefined = currentData.timeZone?.id;

    const condition = conditionLabel(cc.weatherCondition?.type || "");
    const description = cc.weatherCondition?.description?.text || condition;
    const temperature = Math.round(cc.temperature?.degrees ?? 0);
    const feelsLike = Math.round(
      cc.feelsLikeTemperature?.degrees ?? temperature,
    );
    const humidity = Math.round(cc.humidity ?? 0);
    const windSpeed = Math.round(cc.wind?.speed?.value ?? 0);
    const visibility = Math.round(cc.visibility?.distance ?? 10);
    const uvIndex = Math.round(cc.uvIndex ?? 0);
    const pressure = Math.round(cc.airPressure?.meanSeaLevelMillibars ?? 1013);

    // Today's high/low and sunrise/sunset from daily[0]
    const todayForecast = dailyData.forecastDays?.[0];
    const high = Math.round(
      todayForecast?.maxTemperature?.degrees ?? temperature + 2,
    );
    const low = Math.round(
      todayForecast?.minTemperature?.degrees ?? temperature - 4,
    );
    const sunrise = todayForecast?.sunEvents?.sunriseTime
      ? formatTime(todayForecast.sunEvents.sunriseTime, timeZone)
      : "--:--";
    const sunset = todayForecast?.sunEvents?.sunsetTime
      ? formatTime(todayForecast.sunEvents.sunsetTime, timeZone)
      : "--:--";

    // 5-day forecast (skip index 0 = today)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const forecast = (dailyData.forecastDays || [])
      .slice(1, 6)
      .map((day: any) => {
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

    // 6 hourly entries (first = "Now")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hourly = (hourlyData.forecastHours || [])
      .slice(0, 6)
      .map((h: any, i: number) => ({
        time:
          i === 0 ? "Now" : formatHour(h.interval?.startTime || "", timeZone),
        temp: Math.round(h.temperature?.degrees ?? 0),
        condition: conditionLabel(h.weatherCondition?.type || ""),
      }));

    return NextResponse.json({
      city: cityName,
      country,
      temperature,
      feelsLike,
      condition,
      description,
      humidity,
      windSpeed,
      visibility,
      uvIndex,
      pressure,
      high,
      low,
      sunrise,
      sunset,
      forecast,
      hourly,
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 },
    );
  }
}
