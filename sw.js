// Service worker: works offline and keeps the last forecast.
//   App files (same origin): network first, cached copy when offline, so updates arrive right away.
//   Libraries, icons and fonts from CDNs: cache first (their URLs are versioned).
//   Weather and place APIs: network first, last response when offline.
//   Map tiles and the radar are not cached (OpenStreetMap's tile policy, and radar must be live).

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const LIBS = `libs-${VERSION}`;
const DATA = `data-${VERSION}`;

const SHELL_FILES = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/styles.css",
    "js/app.js",
    "js/cities.js",
    "js/clients.js",
    "js/forecast.js",
    "js/i18n.js",
    "js/location.js",
    "js/pwa.js",
    "js/score.js",
    "js/settings.js",
    "js/state.js",
    "js/store.js",
    "js/ui.js",
    "js/weather.js",
    "Images/sun_and_grass.svg",
    "Images/icons/icon-192.png",
    "Images/icons/icon-512.png",
    "Images/icons/favicon-48.png",
    "Images/icons/apple-touch-icon.png"
];

const LIB_HOSTS = ["unpkg.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
const DATA_HOSTS = ["api.open-meteo.com", "geocoding-api.open-meteo.com", "nominatim.openstreetmap.org"];
const MAX_DATA_ENTRIES = 60;

self.addEventListener("install", event => {
    event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
    const keep = [SHELL, LIBS, DATA];
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request, cacheName, { timeoutMs = 0, fallbackUrl = null, revalidate = false } = {}) {
    const cache = await caches.open(cacheName);
    try {
        // revalidate: skip the browser's HTTP cache so every app file comes from the same deploy
        const network = revalidate && request.mode !== "navigate" ? fetch(request, { cache: "no-cache" }) : fetch(request);
        const response = timeoutMs
            ? await Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs))])
            : await network;
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (e) {
        const cached = await cache.match(request, { ignoreSearch: false }) || (fallbackUrl && await cache.match(fallbackUrl));
        if (cached) return cached;
        throw e;
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") cache.put(request, response.clone());
    return response;
}

async function trimCache(cacheName, max) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", event => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        if (request.mode === "navigate") {
            event.respondWith(networkFirst(request, SHELL, { timeoutMs: 4000, fallbackUrl: "index.html" }));
        } else {
            event.respondWith(networkFirst(request, SHELL, { timeoutMs: 4000, revalidate: true }));
        }
        return;
    }

    if (LIB_HOSTS.includes(url.hostname)) {
        event.respondWith(cacheFirst(request, LIBS));
        return;
    }

    if (DATA_HOSTS.includes(url.hostname)) {
        event.respondWith(networkFirst(request, DATA).finally(() => trimCache(DATA, MAX_DATA_ENTRIES)));
    }
    // Everything else (map tiles, radar) goes straight to the network
});
