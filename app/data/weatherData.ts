export interface WeatherData {
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
  forecast: ForecastDay[];
  hourly: HourlyData[];
}

export interface ForecastDay {
  day: string;
  condition: string;
  high: number;
  low: number;
  precipitation: number;
}

export interface HourlyData {
  time: string;
  temp: number;
  condition: string;
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch weather data");
  }
  return data as WeatherData;
}

export const defaultCity = "Phnom Penh";
