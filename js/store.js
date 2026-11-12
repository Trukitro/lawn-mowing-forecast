// Local persistence: settings, last location and clients (localStorage)

const KEYS = {
    settings: "lawnMowing.settings",
    location: "lawnMowing.lastLocation",
    clients: "lawnMowing.clients",
    backup: "lawnMowing.backup",
    legacyLang: "lawnMowing.lang",
    legacyDb: "lawnMowing.clientsDb" // sql.js database from the previous version
};

function read(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn("Could not save", key, e);
        return false;
    }
}

export function newId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ---------- Settings ----------

export function loadSettings() {
    const saved = read(KEYS.settings) || {};
    let legacyLang = null;
    try { legacyLang = localStorage.getItem(KEYS.legacyLang); } catch (e) { /* ignore */ }
    const browserLang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
    return {
        lang: saved.lang || legacyLang || browserLang,
        units: saved.units || "metric",
        theme: saved.theme || "auto"
    };
}

export function saveSettings(settings) { write(KEYS.settings, settings); }

// ---------- Location ----------

export function loadLocation() {
    const loc = read(KEYS.location);
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) return loc;
    return null;
}

export function saveLocation(loc) { write(KEYS.location, { lat: loc.lat, lon: loc.lon, name: loc.name || null }); }

// ---------- Clients ----------
// Client: { id, name, phone, address, town, lat, lon, createdAt, services: [{ id, date, notes }] }

let clients = null;

export function getClients() {
    if (!clients) clients = (read(KEYS.clients)?.clients || []).map(normalizeClient).filter(Boolean);
    return clients;
}

function persist() { return write(KEYS.clients, { version: 1, clients }); }

function normalizeClient(c) {
    if (!c || typeof c !== "object" || !String(c.name || "").trim()) return null;
    const num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
    return {
        id: String(c.id || newId()),
        name: String(c.name).trim(),
        phone: String(c.phone || "").trim(),
        address: String(c.address || "").trim(),
        town: String(c.town || "").trim(),
        lat: num(c.lat),
        lon: num(c.lon),
        createdAt: c.createdAt || new Date().toISOString(),
        services: Array.isArray(c.services)
            ? c.services
                .filter(s => s && /^\d{4}-\d{2}-\d{2}/.test(String(s.date || "")))
                .map(s => ({ id: String(s.id || newId()), date: String(s.date).slice(0, 10), notes: String(s.notes || "") }))
            : []
    };
}

export function getClient(id) { return getClients().find(c => c.id === id) || null; }

export function saveClient(data) {
    const list = getClients();
    const existing = data.id ? list.find(c => c.id === data.id) : null;
    const client = normalizeClient({ ...(existing || {}), ...data, services: existing ? existing.services : [] });
    if (existing) list[list.indexOf(existing)] = client;
    else list.push(client);
    persist();
    return client;
}

export function deleteClient(id) {
    clients = getClients().filter(c => c.id !== id);
    persist();
}

export function addService(clientId, date, notes) {
    const c = getClient(clientId);
    if (!c) return;
    c.services.push({ id: newId(), date, notes: notes.trim() });
    persist();
}

export function deleteService(clientId, serviceId) {
    const c = getClient(clientId);
    if (!c) return;
    c.services = c.services.filter(s => s.id !== serviceId);
    persist();
}

export function lastServiceDate(client) {
    return client.services.reduce((max, s) => (s.date > max ? s.date : max), "") || null;
}

// ---------- Backup ----------

// { lastExport: ISO date of the last export or import, snoozeUntil: ISO date }
export function loadBackupInfo() { return read(KEYS.backup) || {}; }
export function saveBackupInfo(info) { write(KEYS.backup, info); }

export function exportData() {
    return { app: "lawn-mowing-forecast", version: 1, exportedAt: new Date().toISOString(), clients: getClients() };
}

// Returns the normalized clients from a backup object, or throws
export function parseBackup(obj) {
    const list = Array.isArray(obj) ? obj : obj?.clients;
    if (!Array.isArray(list)) throw new Error("Invalid backup");
    return list.map(normalizeClient).filter(Boolean);
}

export function replaceClients(list) {
    clients = list;
    persist();
}

// ---------- Migration from the sql.js version ----------

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// Returns the number of migrated clients (0 if there was nothing to migrate)
export async function migrateLegacyDb() {
    let saved = null;
    try { saved = localStorage.getItem(KEYS.legacyDb); } catch (e) { return 0; }
    if (!saved) return 0;
    if (read(KEYS.clients)) return 0; // already migrated

    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js");
    const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
    const binary = atob(saved);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const db = new SQL.Database(bytes);
    const rows = sql => db.exec(sql)[0]?.values || [];
    const services = rows("SELECT client_id, date, notes FROM services");
    const migrated = rows("SELECT id, name, address, phone, lat, lon FROM clients").map(([id, name, address, phone, lat, lon]) => normalizeClient({
        name, address, phone, lat, lon,
        services: services.filter(s => s[0] === id).map(s => ({ date: s[1], notes: s[2] }))
    })).filter(Boolean);
    db.close();

    clients = migrated;
    persist();
    try { localStorage.setItem(KEYS.legacyDb + ".migrated", saved); localStorage.removeItem(KEYS.legacyDb); } catch (e) { /* ignore */ }
    return migrated.length;
}
