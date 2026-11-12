// Day plan: which clients can be visited on a given day, and in what order. Pure functions.
import { levelOf } from "./score.js";

const DAY = 86400000;

function daysBetween(fromIso, toIso) {
    const [y1, m1, d1] = fromIso.slice(0, 10).split("-").map(Number);
    const [y2, m2, d2] = toIso.slice(0, 10).split("-").map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY);
}

// clients: [{ id, lat, lon, services: [{ date }] }]
// forecastOf(id) -> forecast from buildForecast, or undefined while loading
// date: "YYYY-MM-DD" of the day to plan
// Returns { good, fair, bad, loading, noLocation } where each item is
//   { client, score, ranges, level, daysSince } (daysSince is null if never serviced).
// Within a group, the most overdue clients come first.
export function buildPlan(clients, forecastOf, date) {
    const plan = { good: [], fair: [], bad: [], loading: [], noLocation: [] };
    for (const client of clients) {
        if (client.lat == null || client.lon == null) { plan.noLocation.push(client); continue; }
        const forecast = forecastOf(client.id);
        const day = forecast?.days.find(d => d.date === date);
        if (!day) { plan.loading.push(client); continue; }
        const score = day.isToday ? day.remainingScore : day.score;
        const ranges = day.isToday ? day.remainingRanges : day.ranges;
        const last = client.services.reduce((max, s) => (s.date > max ? s.date : max), "");
        const item = {
            client,
            score,
            ranges,
            level: levelOf(score),
            daysSince: last ? daysBetween(last, date) : null
        };
        plan[item.level === "none" ? "bad" : item.level].push(item);
    }
    // Never serviced first, then the longest since the last service; ties by score
    const overdue = (a, b) =>
        (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity) || (b.score ?? -1) - (a.score ?? -1);
    plan.good.sort(overdue);
    plan.fair.sort(overdue);
    plan.bad.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return plan;
}

// Great-circle distance in km
export function distanceKm(a, b) {
    const rad = x => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Visit order by always going to the nearest remaining stop (good enough for a handful of stops)
export function orderRoute(start, stops) {
    const remaining = [...stops];
    const route = [];
    let here = start;
    while (remaining.length) {
        let best = 0;
        for (let i = 1; i < remaining.length; i++) {
            if (distanceKm(here, remaining[i]) < distanceKm(here, remaining[best])) best = i;
        }
        here = remaining.splice(best, 1)[0];
        route.push(here);
    }
    return route;
}

// Google Maps directions from the device's location through every stop
export const MAX_ROUTE_STOPS = 10;
export function routeUrl(stops) {
    const pts = stops.slice(0, MAX_ROUTE_STOPS).map(s => `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`);
    if (!pts.length) return null;
    const destination = pts.pop();
    let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${destination}`;
    if (pts.length) url += `&waypoints=${encodeURIComponent(pts.join("|"))}`;
    return url;
}
