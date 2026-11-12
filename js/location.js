// Current location: chip in the header and the "choose location" sheet
import { state, emit, on } from "./state.js";
import { t } from "./i18n.js";
import { saveLocation } from "./store.js";
import { searchPlaces, placeName } from "./weather.js";
import { prCities } from "./cities.js";
import { $, esc, setupSheet, openSheet, createMap, refreshMap, debounce } from "./ui.js";

const sheet = $("#locationSheet");
const input = $("#placeSearch");
const results = $("#placeResults");
const errorEl = $("#locationError");
const usePointBtn = $("#usePoint");

let map = null;
let marker = null;
let pickedPoint = null;
let nameRequest = 0;
let searchRequest = 0;

const normalize = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function setLocation(loc) {
    state.location = { lat: loc.lat, lon: loc.lon, name: loc.name || null };
    saveLocation(state.location);
    renderChip();
    emit("location", state.location);
    if (!loc.name) resolveName();
}

function renderChip() {
    const loc = state.location;
    $("#locationName").textContent = loc
        ? loc.name || `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`
        : "…";
}

// Nominatim allows 1 request per second, so wait a moment before asking
const resolveName = debounce(async () => {
    const id = ++nameRequest;
    const { lat, lon } = state.location;
    try {
        const name = await placeName(lat, lon);
        if (id !== nameRequest || !name) return;
        state.location.name = name;
        saveLocation(state.location);
        renderChip();
    } catch (e) {
        console.warn("Reverse geocoding failed", e);
    }
}, 1100);

function choose(loc) {
    sheet.close();
    setLocation(loc);
}

function renderResults(list, emptyText) {
    if (!list.length) {
        results.innerHTML = emptyText ? `<li class="small muted" style="padding:8px">${esc(emptyText)}</li>` : "";
        return;
    }
    results.innerHTML = list.map((p, i) => `
        <li><button type="button" data-i="${i}">
            <i class="ti ti-map-pin" aria-hidden="true"></i>
            <span>${esc(p.name)}<small>${esc(p.detail)}</small></span>
        </button></li>`).join("");
    results.onclick = e => {
        const btn = e.target.closest("button[data-i]");
        if (btn) choose(list[+btn.dataset.i]);
    };
}

function localMatches(q) {
    const nq = normalize(q);
    return prCities
        .filter(c => normalize(c.name).includes(nq))
        .slice(0, 5)
        .map(c => ({ name: c.name, detail: t("loc.puertoRico"), lat: c.lat, lon: c.lon }));
}

const remoteSearch = debounce(async q => {
    const id = ++searchRequest;
    const local = localMatches(q);
    try {
        const remote = await searchPlaces(q);
        if (id !== searchRequest) return;
        // Skip remote results that duplicate a local municipality
        const extra = remote.filter(r => !local.some(l => normalize(l.name) === normalize(r.name) && Math.abs(l.lat - r.lat) < 0.1));
        renderResults([...local, ...extra].slice(0, 8), t("loc.noResults"));
    } catch (e) {
        if (id === searchRequest) renderResults(local, t("loc.noResults"));
    }
}, 350);

function onSearch() {
    const q = input.value.trim();
    errorEl.textContent = "";
    if (!q) { renderResults(defaultSuggestions()); return; }
    renderResults(localMatches(q));
    if (q.length >= 3) remoteSearch(q);
}

function defaultSuggestions() {
    return ["San Juan", "Bayamón", "Caguas", "Juncos", "Ponce", "Mayagüez"]
        .map(n => prCities.find(c => c.name === n))
        .map(c => ({ name: c.name, detail: t("loc.puertoRico"), lat: c.lat, lon: c.lon }));
}

function useMyLocation() {
    errorEl.textContent = "";
    if (!navigator.geolocation) { errorEl.textContent = t("loc.unsupported"); return; }
    const btn = $("#useMyLocation span");
    btn.textContent = t("loc.locating");
    navigator.geolocation.getCurrentPosition(
        pos => { btn.textContent = t("loc.useMine"); choose({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
        () => { btn.textContent = t("loc.useMine"); errorEl.textContent = t("loc.denied"); },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
}

export function openLocationSheet() {
    input.value = "";
    errorEl.textContent = "";
    pickedPoint = null;
    usePointBtn.hidden = true;
    renderResults(defaultSuggestions());
    openSheet(sheet);
    const { lat, lon } = state.location;
    if (!map) {
        map = createMap($("#locationMap"), lat, lon, 11);
        marker = L.marker([lat, lon]).addTo(map);
        map.on("click", e => {
            pickedPoint = { lat: e.latlng.lat, lon: e.latlng.lng };
            marker.setLatLng(e.latlng);
            usePointBtn.hidden = false;
        });
    } else {
        map.setView([lat, lon], 11);
        marker.setLatLng([lat, lon]);
    }
    refreshMap(map);
}

export function initLocation() {
    setupSheet(sheet);
    $("#locationChip").addEventListener("click", openLocationSheet);
    input.addEventListener("input", onSearch);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            results.querySelector("button")?.click();
        }
    });
    $("#useMyLocation").addEventListener("click", useMyLocation);
    usePointBtn.addEventListener("click", () => { if (pickedPoint) choose(pickedPoint); });
    on("settings", renderChip);
}
