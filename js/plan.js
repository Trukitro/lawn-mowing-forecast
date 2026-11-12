// "Who can you visit?" card in the Clients view
import { state, on } from "./state.js";
import { t, weekdayShort, dayNumber, rangesLabel, getLang } from "./i18n.js";
import { getClients } from "./store.js";
import { buildPlan, orderRoute, routeUrl, MAX_ROUTE_STOPS } from "./planner.js";
import { getClientForecast, clientForecastDates, openClientDetail } from "./clients.js";
import { $, esc, initials } from "./ui.js";

const card = $("#planCard");
let selectedDate = null; // null = tomorrow

function sinceText(item) {
    if (item.daysSince == null) return t("clients.noServices");
    if (item.daysSince <= 0) return t("plan.servicedToday");
    return t("plan.since", { n: item.daysSince });
}

function row(item) {
    const c = item.client;
    // Compact row: the longest good window, plus how many others there are
    const longest = [...item.ranges].sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
    const hours = longest ? rangesLabel([longest]) + (item.ranges.length > 1 ? ` +${item.ranges.length - 1}` : "") : "—";
    return `<li class="plan-row" data-id="${esc(c.id)}" tabindex="0" role="button">
        <div class="avatar" aria-hidden="true">${esc(initials(c.name))}</div>
        <div class="client-main">
            <div class="client-name">${esc(c.name)}</div>
            <div class="client-sub">${esc([c.town, sinceText(item)].filter(Boolean).join(" · "))}</div>
        </div>
        <div class="plan-score">
            <span class="pill lvl-${item.level}">${item.score ?? "—"}</span>
            <span class="plan-hours">${esc(hours)}</span>
        </div>
    </li>`;
}

export function renderPlan() {
    const located = getClients().filter(c => c.lat != null && c.lon != null);
    if (!located.length) { card.hidden = true; return; }
    card.hidden = false;

    const dates = clientForecastDates();
    if (!selectedDate || (dates.length && !dates.includes(selectedDate))) selectedDate = dates[1] ?? dates[0] ?? null;

    $("#planDays").innerHTML = dates.map(d => `<button type="button" data-date="${d}" aria-pressed="${d === selectedDate}">
        ${esc(d === dates[0] ? t("today") : d === dates[1] ? t("tomorrow") : `${weekdayShort(d)} ${dayNumber(d)}`)}</button>`).join("");

    const body = $("#planBody");
    if (!selectedDate) {
        body.innerHTML = `<div class="skeleton" style="height:120px"></div>`;
        return;
    }
    const plan = buildPlan(getClients(), getClientForecast, selectedDate);
    const relative = selectedDate === dates[0] ? t("today") : selectedDate === dates[1] ? t("tomorrow") : null;
    $("#planTitle").textContent = relative
        ? t("plan.titleRel", { day: relative.toLowerCase() })
        : t("plan.titleDate", {
            day: `${getLang() === "es" ? weekdayShort(selectedDate).toLowerCase() : weekdayShort(selectedDate)} ${dayNumber(selectedDate)}`
        });

    const summary = t("plan.summary", { good: plan.good.length, fair: plan.fair.length, bad: plan.bad.length });
    let html = `<p class="small muted" style="margin:0 0 8px">${esc(summary)}</p>`;

    if (plan.loading.length && !plan.good.length && !plan.fair.length && !plan.bad.length) {
        html += `<div class="skeleton" style="height:120px"></div>`;
        body.innerHTML = html;
        return;
    }

    if (plan.good.length) {
        html += `<ul class="client-list">${plan.good.map(row).join("")}</ul>`;
        const stops = orderRoute(state.location, plan.good.map(i => ({ lat: i.client.lat, lon: i.client.lon })));
        const url = routeUrl(stops);
        html += `<div class="actions" style="margin:12px 0 4px">
            <a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener"><i class="ti ti-route" aria-hidden="true"></i>${esc(t("plan.route", { n: Math.min(stops.length, MAX_ROUTE_STOPS) }))}</a>
        </div>`;
        if (stops.length > MAX_ROUTE_STOPS) html += `<p class="small muted" style="margin:0">${esc(t("plan.routeCap", { n: MAX_ROUTE_STOPS }))}</p>`;
    } else {
        html += `<p class="plan-empty"><i class="ti ti-cloud-rain" aria-hidden="true"></i>${esc(t("plan.none"))}</p>`;
    }

    if (plan.fair.length) {
        html += `<h3 class="plan-group">${esc(t("plan.fair", { n: plan.fair.length }))}</h3><ul class="client-list">${plan.fair.map(row).join("")}</ul>`;
    }
    if (plan.bad.length) {
        html += `<details class="plan-more"><summary>${esc(t("plan.betterOther", { n: plan.bad.length }))}</summary><ul class="client-list">${plan.bad.map(row).join("")}</ul></details>`;
    }
    if (plan.noLocation.length) {
        html += `<p class="small muted" style="margin:8px 0 0">${esc(t("plan.noLocation", { n: plan.noLocation.length }))}</p>`;
    }
    body.innerHTML = html;
}

export function initPlan() {
    $("#planDays").addEventListener("click", e => {
        const btn = e.target.closest("button[data-date]");
        if (!btn) return;
        selectedDate = btn.dataset.date;
        renderPlan();
    });
    const open = e => {
        const r = e.target.closest(".plan-row");
        if (r) openClientDetail(r.dataset.id);
    };
    $("#planBody").addEventListener("click", open);
    $("#planBody").addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { if (e.target.closest(".plan-row")) { e.preventDefault(); open(e); } }
    });
    on("client-forecasts", renderPlan);
    on("clients", renderPlan);
    on("settings", renderPlan);
    on("location", renderPlan);
}
