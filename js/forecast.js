// Forecast view: verdict, 7-day strip, hour bar, metrics and side tabs
import { state, on } from "./state.js";
import { t, temp, wind, rain, percent, hourLabel, rangesLabel, dayLabel, longDate, weekdayShort, dayNumber } from "./i18n.js";
import { fetchForecast, condition } from "./weather.js";
import { nextGoodDay, levelOf } from "./score.js";
import { getClients } from "./store.js";
import { setLocation } from "./location.js";
import { $, $$, esc, createMap, refreshMap } from "./ui.js";

let loadId = 0;
let map = null;
let mapMarker = null;
let clientLayer = null;
let radarFor = null;

export async function loadForecast({ force = false } = {}) {
    const id = ++loadId;
    const { lat, lon } = state.location;
    state.forecastError = false;
    state.forecast = null; // show skeletons, never the previous location's data
    renderForecast();
    try {
        const forecast = await fetchForecast(lat, lon, { force });
        if (id !== loadId) return; // location changed while loading
        state.forecast = forecast;
        state.selectedDay = 0;
        state.selectedHour = null;
    } catch (e) {
        if (id !== loadId) return;
        console.error(e);
        state.forecast = null;
        state.forecastError = true;
    }
    renderForecast();
}

function selectedDay() {
    return state.forecast?.days[state.selectedDay] ?? null;
}

// ---------- Verdict ----------

function renderVerdict() {
    const el = $("#verdict");
    const f = state.forecast;
    if (state.forecastError) {
        el.className = "verdict";
        el.innerHTML = `
            <div class="notice"><i class="ti ti-cloud-off" aria-hidden="true"></i><div>${esc(t("errorWeather"))}</div></div>
            <button type="button" class="btn" id="retryBtn" style="margin-top:12px"><i class="ti ti-refresh" aria-hidden="true"></i>${esc(t("retry"))}</button>`;
        $("#retryBtn").addEventListener("click", () => loadForecast({ force: true }));
        return;
    }
    if (!f) {
        el.className = "verdict";
        el.innerHTML = `
            <div class="skeleton" style="height:20px;width:45%"></div>
            <div class="skeleton" style="height:30px;width:75%;margin-top:10px"></div>
            <div class="skeleton" style="height:18px;width:60%;margin-top:14px"></div>`;
        return;
    }

    const day = selectedDay();
    const todayRef = f.days[0]?.date;
    const score = day.isToday ? day.remainingScore : day.score;
    const ranges = day.isToday ? day.remainingRanges : day.ranges;
    const level = levelOf(score);
    const title = t(`verdict.${level}`);

    let hoursText;
    if (ranges.length) {
        hoursText = t("bestHours", { list: rangesLabel(ranges) });
    } else if (day.isToday && (day.ranges.length || score == null)) {
        const next = nextGoodDay(f.days.slice(1));
        hoursText = next === -1 ? t("noGoodDayWeek") : t("hoursPassed", { day: dayLabel(f.days[next + 1].date, todayRef) });
    } else {
        hoursText = t("noGoodHours");
    }

    const reason = level !== "good" && level !== "none" && day.mainReason ? `<div class="verdict-hours"><i class="ti ti-info-circle" aria-hidden="true"></i><span>${esc(t("mainReason", { reason: t(`reason.${day.mainReason}`) }))}</span></div>` : "";

    let now = "";
    if (day.isToday && f.current) {
        const c = f.current;
        const cond = condition(c.weather_code);
        now = `<div class="verdict-now">
            <span><i class="ti ${cond.icon}" aria-hidden="true"></i>${esc(t("now"))}: ${esc(cond.text)}</span>
            <span><i class="ti ti-temperature" aria-hidden="true"></i>${temp(c.temperature_2m)} · ${esc(t("feels", { t: temp(c.apparent_temperature) }))}</span>
            <span><i class="ti ti-droplet" aria-hidden="true"></i>${percent(c.relative_humidity_2m)}</span>
            <span><i class="ti ti-wind" aria-hidden="true"></i>${wind(c.wind_speed_10m)}</span>
        </div>`;
    }

    el.className = `verdict ${level}`;
    el.innerHTML = `
        <div class="verdict-top">
            <div>
                <div class="verdict-day">${esc(day.isToday ? `${t("today")} · ${longDate(day.date)}` : longDate(day.date))}</div>
                <div class="verdict-title">${esc(title)}</div>
            </div>
            <div class="verdict-score" ${score == null ? "hidden" : ""}><b>${score ?? ""}</b><small>/100</small></div>
        </div>
        <div class="verdict-hours"><i class="ti ti-clock" aria-hidden="true"></i><span>${esc(hoursText)}</span></div>
        ${reason}
        ${now}`;
}

// ---------- Day strip ----------

function renderDays() {
    const el = $("#days");
    const f = state.forecast;
    if (!f) {
        el.innerHTML = state.forecastError ? "" : `<div class="skeleton" style="height:96px;grid-column:1/-1"></div>`;
        return;
    }
    el.innerHTML = f.days.map((d, i) => {
        const cond = condition(d.code);
        const lvl = levelOf(d.score);
        return `<button type="button" class="day" data-i="${i}" aria-pressed="${i === state.selectedDay}"
                    aria-label="${esc(`${dayLabel(d.date, f.days[0].date)}: ${d.score ?? "—"}/100, ${cond.text}`)}">
            <span>${esc(i === 0 ? t("today") : weekdayShort(d.date))}</span>
            <span class="num">${dayNumber(d.date)}</span>
            <i class="ti ${cond.icon}" aria-hidden="true"></i>
            <span class="pill lvl-${lvl}">${d.score ?? "—"}</span>
        </button>`;
    }).join("");
}

// ---------- Hour bar ----------

function renderHours() {
    const bar = $("#hourbar");
    const axis = $("#hourAxis");
    const detail = $("#hourDetail");
    const day = selectedDay();
    if (!day) {
        bar.innerHTML = state.forecastError ? "" : `<div class="skeleton" style="flex:1"></div>`;
        axis.innerHTML = "";
        detail.hidden = true;
        $("#hoursDay").textContent = "";
        return;
    }
    $("#hoursDay").textContent = dayLabel(day.date, state.forecast.days[0].date);
    bar.innerHTML = day.hours.map(h => `<button type="button" class="${h.level}${h.past ? " past" : ""}" data-hour="${h.hour}"
        aria-pressed="${h.hour === state.selectedHour}" aria-label="${esc(`${hourLabel(h.hour)}: ${h.score}/100`)}" title="${esc(`${hourLabel(h.hour)} · ${h.score}`)}"></button>`).join("");

    if (day.hours.length) {
        const first = day.hours[0].hour;
        const last = day.hours[day.hours.length - 1].hour + 1;
        const mid = Math.round((first + last) / 2);
        axis.innerHTML = `<span>${hourLabel(first)}</span><span>${hourLabel(mid)}</span><span>${hourLabel(last)}</span>`;
    } else {
        axis.innerHTML = "";
    }

    detail.hidden = false;
    const h = day.hours.find(x => x.hour === state.selectedHour);
    if (!h) {
        detail.innerHTML = `<i class="ti ti-hand-finger" aria-hidden="true"></i><span class="muted">${esc(t("hourHint"))}</span>`;
        return;
    }
    const reasons = h.reasons.length ? h.reasons.map(r => t(`reason.${r}`)).join(", ") : t("hourOk");
    detail.innerHTML = `
        <span class="pill lvl-${h.level}" style="padding:2px 8px;border-radius:999px;font-weight:600">${h.score}</span>
        <b>${hourLabel(h.hour)}–${hourLabel(h.hour + 1)}</b>
        <span>${temp(h.temp)}</span>
        <span><i class="ti ti-umbrella" aria-hidden="true"></i> ${percent(h.prob)}</span>
        <span><i class="ti ti-wind" aria-hidden="true"></i> ${wind(h.wind)}</span>
        <span class="muted">${esc(reasons)}</span>`;
}

// ---------- Metrics ----------

function renderMetrics() {
    const el = $("#metrics");
    const day = selectedDay();
    if (!day) { el.innerHTML = ""; return; }
    const maxWind = day.hours.reduce((m, h) => Math.max(m, h.wind ?? 0), 0);
    const items = [
        ["ti-cloud-rain", t("metric.rain"), rain(day.rainSum)],
        ["ti-umbrella", t("metric.prob"), percent(day.probMax)],
        ["ti-temperature", t("metric.tmax"), temp(day.tMax)],
        ["ti-wind", t("metric.wind"), wind(day.hours.length ? maxWind : null)]
    ];
    el.innerHTML = items.map(([icon, label, value]) => `
        <div class="metric"><i class="ti ${icon}" aria-hidden="true"></i><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`).join("");
}

// ---------- Side tabs ----------

function showTab(tab) {
    state.tab = tab;
    $$(".tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    ["radar", "map", "hourly"].forEach(name => { $(`#panel-${name}`).hidden = name !== tab; });
    renderSide();
}

function renderSide() {
    const loc = state.location;
    if (state.tab === "radar") {
        const key = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
        if (radarFor !== key) {
            radarFor = key;
            $("#radar").src = `https://www.rainviewer.com/map.html?loc=${key},8&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=1&c=3&o=83&lm=1&layer=radar`;
        }
    } else if (state.tab === "map") {
        renderMap();
    } else {
        renderHourlyTable();
    }
}

function renderMap() {
    const { lat, lon } = state.location;
    if (!map) {
        map = createMap($("#forecastMap"), lat, lon, 11);
        mapMarker = L.marker([lat, lon]).addTo(map);
        clientLayer = L.layerGroup().addTo(map);
        map.on("click", e => setLocation({ lat: e.latlng.lat, lon: e.latlng.lng }));
    } else {
        map.setView([lat, lon], map.getZoom());
        mapMarker.setLatLng([lat, lon]);
    }
    clientLayer.clearLayers();
    getClients().filter(c => c.lat != null && c.lon != null).forEach(c => {
        L.circleMarker([c.lat, c.lon], { radius: 7, color: "#2e7d32", weight: 2, fillColor: "#4c9a2a", fillOpacity: 0.7 })
            .bindTooltip(esc(c.name))
            .addTo(clientLayer);
    });
    refreshMap(map);
}

function renderHourlyTable() {
    const el = $("#hoursTable");
    const day = selectedDay();
    if (!day) { el.innerHTML = ""; return; }
    el.innerHTML = `
        <thead><tr><th>${esc(t("col.hour"))}</th><th>${esc(t("col.temp"))}</th><th>${esc(t("col.rain"))}</th><th>${esc(t("col.prob"))}</th><th>${esc(t("col.wind"))}</th><th>${esc(t("col.score"))}</th></tr></thead>
        <tbody>${day.hours.map(h => `
            <tr class="${h.past ? "past" : ""}">
                <td>${hourLabel(h.hour)}</td>
                <td>${temp(h.temp)}</td>
                <td>${rain(h.rain)}</td>
                <td>${percent(h.prob)}</td>
                <td>${wind(h.wind)}</td>
                <td><span class="pill lvl-${h.level}">${h.score}</span></td>
            </tr>`).join("")}</tbody>`;
}

export function renderForecast() {
    renderVerdict();
    renderDays();
    renderHours();
    renderMetrics();
    renderSide();
}

export function initForecast() {
    $("#days").addEventListener("click", e => {
        const btn = e.target.closest(".day");
        if (!btn) return;
        state.selectedDay = +btn.dataset.i;
        state.selectedHour = null;
        renderForecast();
    });
    $("#hourbar").addEventListener("click", e => {
        const btn = e.target.closest("button[data-hour]");
        if (!btn) return;
        const hour = +btn.dataset.hour;
        state.selectedHour = state.selectedHour === hour ? null : hour;
        renderHours();
    });
    $$(".tabs [data-tab]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
    on("location", () => loadForecast());
    on("settings", renderForecast);
    on("clients", () => { if (state.tab === "map") renderMap(); });
}

export function onForecastShown() {
    if (state.tab === "map") refreshMap(map);
}
