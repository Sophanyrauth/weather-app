"use client";

import { useState, useEffect } from "react";
import { fetchWeather, defaultCity, WeatherData } from "./data/weatherData";
import WeatherIcon from "./components/WeatherIcon";

const SUGGESTIONS = ["London", "Tokyo", "New York", "Paris", "Sydney", "Dubai", "Phnom Penh"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));
    };
    update();
    const i = setInterval(update, 30000);
    return () => clearInterval(i);
  }, []);

  // Load default city on mount
  useEffect(() => {
    fetchWeather(defaultCity)
      .then((data) => {
        setWeather(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load weather. Check your connection.");
        setLoading(false);
      });
  }, []);

  const handleSearch = async (q?: string) => {
    const searchQ = (q ?? query).trim();
    if (!searchQ) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchWeather(searchQ);
      setWeather(data);
      setKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative" }}>
      <div className="sky-bg" />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              ☁ Skycast
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>Real-feel weather intelligence</p>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{time}</div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <input
              className="search-input"
              style={{ flex: 1, padding: "0.75rem 1.25rem", borderRadius: "12px" }}
              placeholder="Search any city — e.g. Tokyo, London, Dubai..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={loading}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                background: loading
                  ? "rgba(96,184,255,0.3)"
                  : "linear-gradient(135deg, #3b82f6, #60b8ff)",
                border: "none",
                color: "#fff",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.opacity = "0.85")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {loading ? "Loading…" : "Search"}
            </button>
          </div>

          <div className="scroll-x" style={{ display: "flex", gap: "0.5rem", paddingBottom: "0.25rem" }}>
            {SUGGESTIONS.map((city) => (
              <button
                key={city}
                className="city-pill"
                disabled={loading}
                onClick={() => { setQuery(city); handleSearch(city); }}
              >
                {city}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", fontSize: "0.85rem", color: "#fca5a5" }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="glass animate-in" style={{ borderRadius: "24px", padding: "2rem", marginBottom: "1rem", minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⛅</div>
              <div style={{ fontSize: "0.9rem" }}>Fetching weather data…</div>
            </div>
          </div>
        )}

        {/* Weather content */}
        {!loading && weather && (
          <div key={key}>
            {/* Hero card */}
            <div className="glass animate-in" style={{ borderRadius: "24px", padding: "2rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <h2 className="font-display" style={{ fontSize: "2rem", fontWeight: 800 }}>{weather.city}</h2>
                    <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>{weather.country}</span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", maxWidth: 340 }}>
                    {weather.description}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div className="temp-display" style={{ fontSize: "5rem" }}>{weather.temperature}°</div>
                    <div>
                      <div className="font-display" style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{weather.condition}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Feels like {weather.feelsLike}°C</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>H:{weather.high}° · L:{weather.low}°</div>
                    </div>
                  </div>
                </div>

                <WeatherIcon condition={weather.condition} size={110} />
              </div>

              {/* Extra stats row */}
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
                {[
                  { label: "Humidity", value: `${weather.humidity}%` },
                  { label: "Wind", value: `${weather.windSpeed} km/h` },
                  { label: "Visibility", value: `${weather.visibility} km` },
                  { label: "UV Index", value: String(weather.uvIndex) },
                  { label: "Pressure", value: `${weather.pressure} hPa` },
                  { label: "Sunrise", value: weather.sunrise },
                  { label: "Sunset", value: weather.sunset },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="divider" style={{ margin: "1.5rem 0" }} />
              <div className="scroll-x" style={{ display: "flex", gap: "0.5rem" }}>
                {weather.hourly.map((h, i) => (
                  <div key={i} style={{
                    minWidth: 72,
                    padding: "0.75rem 0.5rem",
                    background: i === 0 ? "rgba(96,184,255,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${i === 0 ? "rgba(96,184,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "12px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>{h.time}</div>
                    <WeatherIcon condition={h.condition} size={28} />
                    <div className="font-display" style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: "0.4rem", color: "var(--text-primary)" }}>{h.temp}°</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-day forecast */}
            <div className="glass animate-in animate-in-delay-3" style={{ borderRadius: "20px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Syne, sans-serif", fontWeight: 600, marginBottom: "1rem" }}>
                📅 5-Day Forecast
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {weather.forecast.map((day, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "50px 32px 1fr 80px",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.5rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.03)",
                  }}>
                    <span className="font-display" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>{day.day}</span>
                    <WeatherIcon condition={day.condition} size={28} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "#60b8ff" }}>{day.precipitation}%</span>
                      </div>
                      <div className="precip-bar">
                        <div className="precip-fill" style={{ width: `${day.precipitation}%` }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <span className="font-display" style={{ fontWeight: 700, color: "var(--text-primary)" }}>{day.high}°</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{day.low}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "2.5rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
          Powered by Google Weather API · Built with Next.js
        </div>
      </div>
    </main>
  );
}
