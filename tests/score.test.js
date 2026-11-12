import { test } from "node:test";
import assert from "node:assert/strict";
import { hourScore, levelOf, bestWindow, goodRanges, buildForecast, nextGoodDay, GOOD } from "../js/score.js";

const dry = { rain: 0, prob: 0, feels: 27, uv: 5, wind: 10, code: 1, wet3h: 0, wet24h: 0 };

test("a dry, mild hour scores 100", () => {
    assert.deepEqual(hourScore(dry), { score: 100, reasons: [] });
});

test("rain probability and wet grass lower the score", () => {
    const r = hourScore({ ...dry, prob: 60, wet3h: 1 });
    assert.equal(r.score, 100 - 30 - 25);
    assert.deepEqual(r.reasons, ["prob", "wet"]);
});

test("heavy rain and storms never go below 0", () => {
    const r = hourScore({ ...dry, rain: 5, prob: 100, code: 95, wet3h: 10 });
    assert.equal(r.score, 0);
    assert.equal(r.reasons[0], "rain");
});

test("heat uses the feels-like temperature", () => {
    assert.equal(hourScore({ ...dry, feels: 36 }).score, 80);
    assert.deepEqual(hourScore({ ...dry, feels: 36 }).reasons, ["heat"]);
});

test("levels", () => {
    assert.equal(levelOf(GOOD), "good");
    assert.equal(levelOf(50), "fair");
    assert.equal(levelOf(10), "bad");
    assert.equal(levelOf(null), "none");
});

test("best window is the best run of 3 consecutive hours", () => {
    const hours = [90, 40, 95, 100, 85, 30].map((score, i) => ({ hour: 7 + i, score }));
    assert.deepEqual(bestWindow(hours), { score: 93, start: 9, end: 12 });
    assert.equal(bestWindow([]), null);
    assert.deepEqual(bestWindow([{ hour: 8, score: 80 }]), { score: 80, start: 8, end: 9 });
});

test("good ranges join consecutive good hours with an exclusive end", () => {
    const hours = [80, 90, 50, 75].map((score, i) => ({ hour: 7 + i, score }));
    assert.deepEqual(goodRanges(hours), [{ start: 7, end: 9 }, { start: 10, end: 11 }]);
});

// Builds a fake Open-Meteo response: yesterday + 2 days, 24 hours each
function fakeResponse({ nowHour = 9, yesterdayLateRain = 0, tomorrowProb = 0 } = {}) {
    const dates = ["2026-11-10", "2026-11-11", "2026-11-12"];
    const hourly = { time: [], precipitation: [], precipitation_probability: [], apparent_temperature: [], temperature_2m: [], uv_index: [], wind_speed_10m: [], weather_code: [] };
    dates.forEach((date, d) => {
        for (let h = 0; h < 24; h++) {
            hourly.time.push(`${date}T${String(h).padStart(2, "0")}:00`);
            hourly.precipitation.push(d === 0 && h === 23 ? yesterdayLateRain : 0);
            hourly.precipitation_probability.push(d === 2 ? tomorrowProb : 0);
            hourly.apparent_temperature.push(27);
            hourly.temperature_2m.push(26);
            hourly.uv_index.push(h >= 11 && h <= 14 ? 9 : 3);
            hourly.wind_speed_10m.push(10);
            hourly.weather_code.push(1);
        }
    });
    return {
        current: { time: `2026-11-11T${String(nowHour).padStart(2, "0")}:15`, temperature_2m: 26 },
        hourly,
        daily: {
            time: dates,
            sunrise: dates.map(d => `${d}T06:40`),
            sunset: dates.map(d => `${d}T17:50`),
            precipitation_sum: [yesterdayLateRain, 0, 0]
        }
    };
}

test("buildForecast drops yesterday and keeps only full daylight hours", () => {
    const f = buildForecast(fakeResponse());
    assert.deepEqual(f.days.map(d => d.date), ["2026-11-11", "2026-11-12"]);
    const hours = f.days[0].hours.map(h => h.hour);
    assert.equal(hours[0], 7);              // 6:00-7:00 starts before sunrise 6:40
    assert.equal(hours[hours.length - 1], 16); // 17:00-18:00 ends after sunset 17:50
    assert.ok(f.days[0].isToday);
});

test("rain late yesterday makes this morning wet, not this afternoon", () => {
    const f = buildForecast(fakeResponse({ yesterdayLateRain: 2 }));
    const h = f.days[0].hours;
    // 7:00 is 8 hours after the rain, so only the 24h rule applies (2 mm is under 10 mm)
    assert.equal(h[0].score, 100);
    const wetMorning = buildForecast(fakeResponse({ yesterdayLateRain: 12 })).days[0].hours[0];
    assert.equal(wetMorning.score, 90);
    assert.deepEqual(wetMorning.reasons, ["wet"]);
});

test("past hours of today are marked and excluded from the remaining score", () => {
    const f = buildForecast(fakeResponse({ nowHour: 15 }));
    const today = f.days[0];
    assert.ok(today.hours.find(h => h.hour === 10).past);
    assert.ok(!today.hours.find(h => h.hour === 15).past);
    assert.equal(today.score, 100);
    assert.deepEqual(today.remainingRanges, [{ start: 15, end: 17 }]);
});

test("nextGoodDay skips a rainy tomorrow and a finished today", () => {
    const rainy = buildForecast(fakeResponse({ nowHour: 9, tomorrowProb: 90 }));
    assert.equal(nextGoodDay(rainy.days), 0);
    assert.ok(rainy.days[1].score < GOOD);
    assert.equal(rainy.days[1].mainReason, "prob");
    const evening = buildForecast(fakeResponse({ nowHour: 19 }));
    assert.equal(evening.days[0].remainingScore, null);
    assert.equal(nextGoodDay(evening.days), 1);
});
