// Clients view: list with next good day, detail sheet with services, add/edit form
import { state, on, emit } from "./state.js";
import { t, dayLabel, daysAgo, shortDate, todayIso, weekdayShort } from "./i18n.js";
import { getClients, getClient, saveClient, deleteClient, addService, deleteService, lastServiceDate } from "./store.js";
import { fetchForecasts } from "./weather.js";
import { nextGoodDay, levelOf } from "./score.js";
import { prCities } from "./cities.js";
import { setLocation } from "./location.js";
import { $, esc, setupSheet, openSheet, createMap, refreshMap, initials, toast } from "./ui.js";

const listEl = $("#clientList");
const searchEl = $("#clientSearch");
const detailSheet = $("#clientSheet");
const formSheet = $("#clientFormSheet");
const form = $("#clientForm");

const forecasts = new Map(); // client id -> forecast
let forecastsLoading = false;
let detailId = null;
let editingId = null;
let formMap = null;
let formMarker = null;
let formPoint = null;

const normalize = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------- Forecasts for every client ----------

async function loadClientForecasts() {
    const located = getClients().filter(c => c.lat != null && c.lon != null);
    if (!located.length || forecastsLoading) return;
    forecastsLoading = true;
    try {
        const list = await fetchForecasts(located.map(c => ({ lat: c.lat, lon: c.lon })));
        located.forEach((c, i) => forecasts.set(c.id, list[i]));
    } catch (e) {
        console.warn("Client forecasts failed", e);
    }
    forecastsLoading = false;
    renderList();
    emit("client-forecasts");
    if (detailSheet.open && detailId) renderDetail();
}

export function getClientForecast(id) { return forecasts.get(id); }

// Dates covered by the loaded client forecasts (today first), or [] while loading
export function clientForecastDates() {
    for (const f of forecasts.values()) if (f?.days?.length) return f.days.map(d => d.date);
    return [];
}

export function openClientDetail(id) { openDetail(id); }

function nextGood(client) {
    if (client.lat == null || client.lon == null) return { text: t("clients.noLocation"), cls: "none" };
    const f = forecasts.get(client.id);
    if (!f) return { text: "…", cls: "none" };
    const i = nextGoodDay(f.days);
    if (i === -1) return { text: t("clients.noGoodDay"), cls: "none" };
    return { text: dayLabel(f.days[i].date, f.days[0].date), cls: "good" };
}

// ---------- List ----------

function renderList() {
    const clients = getClients();
    $("#clientSearchWrap").hidden = clients.length === 0;
    if (!clients.length) {
        listEl.innerHTML = `
            <li class="empty">
                <i class="ti ti-user-plus" aria-hidden="true"></i>
                <h3>${esc(t("clients.emptyTitle"))}</h3>
                <p>${esc(t("clients.emptyBody"))}</p>
                <button type="button" class="btn btn-primary" data-new><i class="ti ti-plus" aria-hidden="true"></i>${esc(t("clients.add"))}</button>
            </li>`;
        return;
    }
    const q = normalize(searchEl.value.trim());
    const shown = clients
        .filter(c => !q || normalize(`${c.name} ${c.town} ${c.address}`).includes(q))
        .sort((a, b) => a.name.localeCompare(b.name));
    if (!shown.length) {
        listEl.innerHTML = `<li class="small muted" style="padding:16px 4px">${esc(t("clients.noMatch"))}</li>`;
        return;
    }
    listEl.innerHTML = shown.map(c => {
        const last = lastServiceDate(c);
        const sub = [c.town, last ? t("clients.lastService", { ago: daysAgo(last) }) : t("clients.noServices")].filter(Boolean).join(" · ");
        const next = nextGood(c);
        return `<li class="client-row" data-id="${esc(c.id)}" tabindex="0" role="button">
            <div class="avatar" aria-hidden="true">${esc(initials(c.name))}</div>
            <div class="client-main">
                <div class="client-name">${esc(c.name)}</div>
                <div class="client-sub">${esc(sub)}</div>
            </div>
            <div class="client-next">
                <div class="label">${esc(t("clients.nextGood"))}</div>
                <div class="value ${next.cls}">${esc(next.text)}</div>
            </div>
        </li>`;
    }).join("");
}

// ---------- Detail sheet ----------

function openDetail(id) {
    detailId = id;
    renderDetail();
    openSheet(detailSheet);
}

function renderDetail() {
    const c = getClient(detailId);
    if (!c) { detailSheet.close(); return; }
    const f = forecasts.get(c.id);
    const hasPin = c.lat != null && c.lon != null;

    const week = f ? `
        <h3 class="section-title" style="margin-top:4px">${esc(t("detail.thisWeek"))}</h3>
        <div class="week-dots" style="margin-bottom:16px">${f.days.map(d => {
            const lvl = levelOf(d.isToday ? d.remainingScore ?? d.score : d.score);
            return `<div title="${esc(`${dayLabel(d.date, f.days[0].date)}: ${d.score ?? "—"}`)}">${esc(weekdayShort(d.date))}<i style="background:var(--${lvl === "none" ? "none" : lvl})"></i></div>`;
        }).join("")}</div>` : "";

    const services = [...c.services].sort((a, b) => b.date.localeCompare(a.date));
    detailSheet.querySelector(".sheet-body").innerHTML = `
        <div class="sheet-head">
            <div style="display:flex;gap:12px;align-items:center;min-width:0">
                <div class="avatar" aria-hidden="true">${esc(initials(c.name))}</div>
                <h2 id="clientSheetTitle">${esc(c.name)}</h2>
            </div>
            <button type="button" class="icon-btn" data-close aria-label="Close"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="detail-list">
            ${c.phone ? `<div><i class="ti ti-phone" aria-hidden="true"></i><a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a></div>` : ""}
            ${c.address || c.town ? `<div><i class="ti ti-map-pin" aria-hidden="true"></i><span>${esc([c.address, c.town].filter(Boolean).join(", "))}</span></div>` : ""}
            <div><i class="ti ti-calendar" aria-hidden="true"></i><span>${esc(t("clients.nextGood"))}: <b>${esc(nextGood(c).text)}</b></span></div>
        </div>
        ${week}
        <div class="actions" style="margin-bottom:20px">
            ${hasPin ? `<button type="button" class="btn btn-primary" data-action="forecast"><i class="ti ti-sun" aria-hidden="true"></i>${esc(t("detail.viewForecast"))}</button>` : ""}
            ${hasPin ? `<a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}" target="_blank" rel="noopener"><i class="ti ti-navigation" aria-hidden="true"></i>${esc(t("detail.directions"))}</a>` : ""}
            <button type="button" class="btn" data-action="edit"><i class="ti ti-pencil" aria-hidden="true"></i>${esc(t("detail.edit"))}</button>
        </div>

        <h3 class="section-title">${esc(t("detail.services"))}</h3>
        <form id="serviceForm" class="card" style="padding:12px;margin-bottom:12px;box-shadow:none" novalidate>
            <div style="display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);gap:8px">
                <div class="field" style="margin:0">
                    <label for="svcDate">${esc(t("detail.date"))}</label>
                    <input class="input" type="date" id="svcDate" value="${todayIso()}" max="${todayIso()}">
                </div>
                <div class="field" style="margin:0">
                    <label for="svcNotes">${esc(t("detail.notes"))}</label>
                    <input class="input" id="svcNotes" autocomplete="off" placeholder="${esc(t("detail.notesPh"))}">
                </div>
            </div>
            <div class="field-error" id="svcError" role="alert"></div>
            <button type="submit" class="btn btn-sm" style="margin-top:8px"><i class="ti ti-calendar-plus" aria-hidden="true"></i>${esc(t("detail.logService"))}</button>
        </form>
        ${services.length ? `<ul class="service-list">${services.map(s => `
            <li>
                <span class="date">${esc(shortDate(s.date))}</span>
                <span class="notes">${esc(s.notes)}</span>
                <button type="button" class="icon-btn" style="width:32px;height:32px" data-delete-service="${esc(s.id)}" aria-label="${esc(t("detail.removeService"))}"><i class="ti ti-trash" style="font-size:17px" aria-hidden="true"></i></button>
            </li>`).join("")}</ul>` : `<p class="small muted">${esc(t("detail.noServices"))}</p>`}`;

    const svcForm = $("#serviceForm", detailSheet);
    svcForm.addEventListener("submit", e => {
        e.preventDefault();
        const date = $("#svcDate", detailSheet).value;
        if (!date) { $("#svcError", detailSheet).textContent = t("detail.dateRequired"); return; }
        addService(c.id, date, $("#svcNotes", detailSheet).value);
        toast(t("detail.serviceSaved"));
        emit("clients", { userAction: true });
    });
    $("#svcDate", detailSheet).addEventListener("input", () => { $("#svcError", detailSheet).textContent = ""; });
}

function onDetailClick(e) {
    const c = getClient(detailId);
    if (!c) return;
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "forecast") {
        detailSheet.close();
        setLocation({ lat: c.lat, lon: c.lon, name: c.name });
        location.hash = "#forecast";
    } else if (action === "edit") {
        detailSheet.close();
        openForm(c.id);
    }
    const del = e.target.closest("[data-delete-service]");
    if (del && confirm(t("detail.deleteService"))) {
        deleteService(c.id, del.dataset.deleteService);
        emit("clients", { userAction: true });
    }
}

// ---------- Add / edit form ----------

function setFormPoint(point, { move = true } = {}) {
    formPoint = point;
    if (!formMarker) formMarker = L.marker([point.lat, point.lon]).addTo(formMap);
    else formMarker.setLatLng([point.lat, point.lon]);
    if (move) formMap.setView([point.lat, point.lon], Math.max(formMap.getZoom(), 15));
    $("#cfCoords").textContent = `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
}

function openForm(id = null) {
    editingId = id;
    const c = id ? getClient(id) : null;
    form.reset();
    $("#clientFormTitle").textContent = t(c ? "form.editClient" : "form.newClient");
    $("#cfNameError").textContent = "";
    $("#cfDelete").hidden = !c;
    $("#cfName").value = c?.name ?? "";
    $("#cfPhone").value = c?.phone ?? "";
    $("#cfAddress").value = c?.address ?? "";
    $("#cfTown").innerHTML = `<option value="">${esc(t("form.chooseTown"))}</option>` +
        prCities.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("");
    $("#cfTown").value = c?.town ?? "";

    openSheet(formSheet);
    const start = c?.lat != null ? { lat: c.lat, lon: c.lon } : state.location;
    if (!formMap) {
        formMap = createMap($("#clientMap"), start.lat, start.lon, c?.lat != null ? 16 : 12);
        formMap.on("click", e => setFormPoint({ lat: e.latlng.lat, lon: e.latlng.lng }, { move: false }));
    } else {
        formMap.setView([start.lat, start.lon], c?.lat != null ? 16 : 12);
    }
    if (formMarker) { formMarker.remove(); formMarker = null; }
    formPoint = null;
    $("#cfCoords").textContent = t("form.pinHint");
    if (c?.lat != null) setFormPoint({ lat: c.lat, lon: c.lon });
    refreshMap(formMap);
    if (!c) setTimeout(() => $("#cfName").focus(), 50);
}

function onTownChange() {
    const town = prCities.find(p => p.name === $("#cfTown").value);
    if (!town) return;
    // A town gives a default point; the user can refine it on the map
    if (!formPoint) setFormPoint({ lat: town.lat, lon: town.lon });
    formMap.setView([town.lat, town.lon], 14);
}

function onSubmit(e) {
    e.preventDefault();
    const name = $("#cfName").value.trim();
    if (!name) {
        $("#cfNameError").textContent = t("form.nameRequired");
        $("#cfName").focus();
        return;
    }
    const town = $("#cfTown").value;
    let point = formPoint;
    if (!point && town) {
        const p = prCities.find(x => x.name === town);
        point = { lat: p.lat, lon: p.lon };
    }
    const saved = saveClient({
        id: editingId || undefined,
        name,
        phone: $("#cfPhone").value,
        address: $("#cfAddress").value,
        town,
        lat: point?.lat ?? null,
        lon: point?.lon ?? null
    });
    forecasts.delete(saved.id);
    formSheet.close();
    toast(t("form.saved"));
    emit("clients", { userAction: true });
    openDetail(saved.id);
}

function onDelete() {
    const c = getClient(editingId);
    if (!c || !confirm(t("form.confirmDelete", { name: c.name }))) return;
    deleteClient(c.id);
    forecasts.delete(c.id);
    formSheet.close();
    toast(t("form.deleted"));
    emit("clients", { userAction: true });
}

// ---------- Init ----------

export function renderClients() {
    renderList();
    loadClientForecasts();
}

export function initClients() {
    setupSheet(detailSheet);
    setupSheet(formSheet);
    $("#newClientBtn").addEventListener("click", () => openForm());
    searchEl.addEventListener("input", renderList);
    listEl.addEventListener("click", e => {
        if (e.target.closest("[data-new]")) { openForm(); return; }
        const row = e.target.closest(".client-row");
        if (row) openDetail(row.dataset.id);
    });
    listEl.addEventListener("keydown", e => {
        const row = e.target.closest(".client-row");
        if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDetail(row.dataset.id); }
    });
    detailSheet.addEventListener("click", onDetailClick);
    form.addEventListener("submit", onSubmit);
    $("#cfName").addEventListener("input", () => { $("#cfNameError").textContent = ""; });
    $("#cfTown").addEventListener("change", onTownChange);
    $("#cfDelete").addEventListener("click", onDelete);
    on("clients", () => {
        renderClients();
        if (detailSheet.open) renderDetail();
    });
    on("settings", () => {
        renderList();
        if (detailSheet.open) renderDetail();
    });
}
