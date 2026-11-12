// Mowing score: pure functions, no DOM. Tested in tests/score.test.js.
//
// Every daylight hour gets a 0-100 score. Penalties:
//   rain falling, rain probability, wet grass from recent rain, heat (feels-like),
//   cold, strong UV, strong wind and thunderstorms.
// A day's score is the average of its best 3 consecutive daylight hours,
// because a typical job needs a window, not a single good hour.

export const GOOD = 70;
export const FAIR = 45;
export const WINDOW_HOURS = 3;

export function levelOf(score) {
    if (score == null) return "none";
    if (score >= GOOD) return "good";
    if (score >= FAIR) return "fair";
    return "bad";
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// h: { rain, prob, feels, uv, wind, code, wet3h, wet24h } (metric units)
// Returns { score, reasons } where reasons are keys sorted by impact.
export function hourScore(h) {
    const penalties = {};
    const add = (key, value) => { if (value > 0) penalties[key] = (penalties[key] || 0) + value; };

    const rain = h.rain ?? 0;
    if (rain > 0.1) add("rain", Math.min(60, rain * 40));
    add("prob", (h.prob ?? 0) * 0.5);
    add("wet", Math.min(40, (h.wet3h ?? 0) * 25));
    if ((h.wet24h ?? 0) > 10) add("wet", 10);
    if (h.feels != null) {
        if (h.feels > 32) add("heat", (h.feels - 32) * 5);
        if (h.feels < 15) add("cold", (15 - h.feels) * 4);
    }
    if ((h.uv ?? 0) > 8) add("uv", (h.uv - 8) * 4);
    if ((h.wind ?? 0) > 30) add("wind", (h.wind - 30) * 2);
    if ((h.code ?? 0) >= 95) add("storm", 50);

    const total = Object.values(penalties).reduce((a, b) => a + b, 0);
    const reasons = Object.entries(penalties)
        .filter(([, v]) => v >= 5)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
    return { score: Math.round(clamp(100 - total, 0, 100)), reasons };
}

// "2026-11-11T06:42" -> minutes since midnight
export function minutesOf(iso) {
    return parseInt(iso.slice(11, 13), 10) * 60 + parseInt(iso.slice(14, 16), 10);
}

// Best average of `size` consecutive hours (fewer if the day is shorter).
// hours: array of { hour, score }, consecutive daylight hours.
export function bestWindow(hours, size = WINDOW_HOURS) {
    if (!hours.length) return null;
    const n = Math.min(size, hours.length);
    let best = null;
    for (let i = 0; i + n <= hours.length; i++) {
        const slice = hours.slice(i, i + n);
        const avg = slice.reduce((a, h) => a + h.score, 0) / n;
        if (!best || avg > best.score) best = { score: Math.round(avg), start: slice[0].hour, end: slice[n - 1].hour + 1 };
    }
    return best;
}

// Ranges of consecutive good hours: [{ start, end }] where end is exclusive (7-10 means 7:00 to 10:00)
export function goodRanges(hours) {
    const ranges = [];
    for (const h of hours) {
        if (h.score < GOOD) continue;
        const last = ranges[ranges.length - 1];
        if (last && last.end === h.hour) last.end = h.hour + 1;
        else ranges.push({ start: h.hour, end: h.hour + 1 });
    }
    return ranges;
}

// Turn one Open-Meteo response (requested with past_days=1) into scored days.
// Yesterday is only used to know whether the grass is wet this morning.
export function buildForecast(raw) {
    const H = raw.hourly;
    const nowIso = raw.current?.time ?? H.time[0];
    const nowHourKey = nowIso.slice(0, 13);
    const today = nowIso.slice(0, 10);

    const rainAt = i => H.precipitation?.[i] ?? 0;
    const sumRain = (i, back) => {
        let s = 0;
        for (let k = Math.max(0, i - back); k < i; k++) s += rainAt(k);
        return s;
    };

    const days = [];
    raw.daily.time.forEach((date, d) => {
        if (date < today) return; // past day (from past_days)
        const sunrise = raw.daily.sunrise?.[d];
        const sunset = raw.daily.sunset?.[d];
        const riseMin = sunrise ? minutesOf(sunrise) : 6 * 60;
        const setMin = sunset ? minutesOf(sunset) : 18 * 60;

        const hours = [];
        for (let i = 0; i < H.time.length; i++) {
            const t = H.time[i];
            if (!t.startsWith(date)) continue;
            const hour = parseInt(t.slice(11, 13), 10);
            if (hour * 60 < riseMin || hour * 60 + 60 > setMin) continue; // not full daylight
            const input = {
                rain: rainAt(i),
                prob: H.precipitation_probability?.[i],
                feels: H.apparent_temperature?.[i] ?? H.temperature_2m?.[i],
                uv: H.uv_index?.[i],
                wind: H.wind_speed_10m?.[i],
                code: H.weather_code?.[i],
                wet3h: sumRain(i, 3),
                wet24h: sumRain(i, 24)
            };
            const { score, reasons } = hourScore(input);
            hours.push({
                time: t,
                hour,
                temp: H.temperature_2m?.[i],
                feels: input.feels,
                rain: input.rain,
                prob: input.prob,
                uv: input.uv,
                wind: input.wind,
                code: input.code,
                score,
                level: levelOf(score),
                reasons,
                past: t.slice(0, 13) < nowHourKey
            });
        }

        const window = bestWindow(hours);
        const remaining = hours.filter(h => !h.past);
        const remainingWindow = date === today ? bestWindow(remaining) : window;
        // Most common reason among non-good hours explains a weak day
        const reasonCount = {};
        hours.filter(h => h.score < GOOD).forEach(h => h.reasons.slice(0, 1).forEach(r => { reasonCount[r] = (reasonCount[r] || 0) + 1; }));
        const mainReason = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        days.push({
            date,
            isToday: date === today,
            sunrise,
            sunset,
            rainSum: raw.daily.precipitation_sum?.[d] ?? null,
            probMax: raw.daily.precipitation_probability_max?.[d] ?? null,
            tMax: raw.daily.temperature_2m_max?.[d] ?? null,
            code: raw.daily.weather_code?.[d] ?? null,
            hours,
            score: window ? window.score : null,
            level: levelOf(window ? window.score : null),
            window,
            ranges: goodRanges(hours),
            remainingScore: remainingWindow ? remainingWindow.score : null,
            remainingRanges: goodRanges(remaining),
            mainReason
        });
    });

    return { now: nowIso, current: raw.current ?? null, days };
}

// Index of the first day (from today) with a good score, or -1
export function nextGoodDay(days) {
    return days.findIndex(d => (d.isToday ? d.remainingScore : d.score) >= GOOD);
}
