// Weather, geocoding and condition icons
import { buildForecast } from "./score.js";
import { getLang } from "./i18n.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const HOURLY = "temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,uv_index,wind_speed_10m,relative_humidity_2m";
const DAILY = "sunrise,sunset,precipitation_sum,precipitation_probability_max,temperature_2m_max,weather_code";
const CURRENT = "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m";
const CACHE_MS = 20 * 60 * 1000;

const cache = new Map(); // "lat,lon" -> { at, forecast }
const keyOf = (lat, lon) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

// Fetch scored forecasts for several points in one request.
// Returns an array aligned with `points` ({ lat, lon }).
export async function fetchForecasts(points, { force = false } = {}) {
    const now = Date.now();
    const result = new Array(points.length);
    const missing = [];
    points.forEach((p, i) => {
        const hit = cache.get(keyOf(p.lat, p.lon));
        if (!force && hit && now - hit.at < CACHE_MS) result[i] = hit.forecast;
        else missing.push(i);
    });
    if (!missing.length) return result;

    const lats = missing.map(i => points[i].lat.toFixed(4)).join(",");
    const lons = missing.map(i => points[i].lon.toFixed(4)).join(",");
    const url = `${FORECAST_URL}?latitude=${lats}&longitude=${lons}&hourly=${HOURLY}&daily=${DAILY}&current=${CURRENT}&timezone=auto&past_days=1&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];
    missing.forEach((i, n) => {
        const forecast = buildForecast(list[n]);
        cache.set(keyOf(points[i].lat, points[i].lon), { at: now, forecast });
        result[i] = forecast;
    });
    return result;
}

export async function fetchForecast(lat, lon, opts) {
    return (await fetchForecasts([{ lat, lon }], opts))[0];
}

// Place search (Open-Meteo geocoding): [{ name, detail, lat, lon }]
export async function searchPlaces(query) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=${getLang()}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(r => ({
        name: r.name,
        detail: [r.admin1, r.country].filter(Boolean).join(", "),
        lat: r.latitude,
        lon: r.longitude
    }));
}

// Reverse geocoding (Nominatim). Callers must keep to 1 request per second.
export async function placeName(lat, lon) {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12&accept-language=${getLang()}`);
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.municipality || a.county || a.state || null;
}

// WMO weather codes -> Tabler icon + description
const CONDITIONS = [
    [[0], "ti-sun", "Clear sky", "Despejado"],
    [[1], "ti-sun", "Mainly clear", "Mayormente despejado"],
    [[2], "ti-cloud", "Partly cloudy", "Parcialmente nublado"],
    [[3], "ti-cloud", "Overcast", "Nublado"],
    [[45, 48], "ti-cloud-fog", "Fog", "Niebla"],
    [[51, 53, 55, 56, 57], "ti-cloud-rain", "Drizzle", "Llovizna"],
    [[61, 80], "ti-cloud-rain", "Light rain", "Lluvia ligera"],
    [[63, 81], "ti-cloud-rain", "Rain", "Lluvia"],
    [[65, 66, 67, 82], "ti-cloud-rain", "Heavy rain", "Lluvia fuerte"],
    [[71, 73, 75, 77, 85, 86], "ti-snowflake", "Snow", "Nieve"],
    [[95, 96, 99], "ti-cloud-storm", "Thunderstorm", "Tormenta"]
];

export function condition(code) {
    const c = CONDITIONS.find(([codes]) => codes.includes(code));
    if (!c) return { icon: "ti-cloud", text: getLang() === "es" ? "Desconocido" : "Unknown" };
    return { icon: c[1], text: getLang() === "es" ? c[3] : c[2] };
}
