// Small DOM helpers shared by the views
import { t } from "./i18n.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Translate elements marked with data-i18n, data-i18n-placeholder and data-i18n-aria
export function applyI18n(root = document) {
    $$("[data-i18n]", root).forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]", root).forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$("[data-i18n-aria]", root).forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

let toastTimer;
export function toast(message) {
    $(".toast")?.remove();
    clearTimeout(toastTimer);
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = message;
    document.body.appendChild(el);
    toastTimer = setTimeout(() => el.remove(), 2600);
}

// <dialog> sheets: close on backdrop click and on [data-close] buttons
export function setupSheet(dialog) {
    dialog.addEventListener("click", e => {
        if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
    });
}

export function openSheet(dialog) {
    if (!dialog.open) dialog.showModal();
}

// Leaflet map with OpenStreetMap tiles
export function createMap(el, lat, lon, zoom = 13) {
    const map = L.map(el, { zoomControl: true, attributionControl: true }).setView([lat, lon], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);
    return map;
}

// Leaflet needs a size recalculation after its container becomes visible
export function refreshMap(map) {
    if (!map) return;
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 300);
}

export function initials(name) {
    return name.split(/\s+/)
        .map(w => w.match(/[\p{L}\p{N}]/u)?.[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";
}

export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
