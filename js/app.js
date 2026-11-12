// App entry point: settings, routing and startup
import { state } from "./state.js";
import { t } from "./i18n.js";
import { loadSettings, loadLocation, migrateLegacyDb } from "./store.js";
import { applySettings, initSettings } from "./settings.js";
import { initLocation, setLocation } from "./location.js";
import { initForecast, onForecastShown } from "./forecast.js";
import { initClients, renderClients } from "./clients.js";
import { initPwa } from "./pwa.js";
import { initBackup } from "./backup.js";
import { initPlan } from "./plan.js";
import { $, $$, toast } from "./ui.js";

const DEFAULT_LOCATION = { lat: 18.2272, lon: -65.9196, name: "Juncos" };
const VIEWS = ["forecast", "clients", "settings"];

function route() {
    const view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "forecast";
    VIEWS.forEach(v => { $(`#view-${v}`).hidden = v !== view; });
    $$(".nav a").forEach(a => {
        if (a.dataset.view === view) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
    });
    if (view === "clients") renderClients();
    if (view === "forecast") onForecastShown();
    window.scrollTo({ top: 0 });
}

// Start location: ?lat=..&lon=.. in the URL, then the last used location, then Juncos
function startLocation() {
    const params = new URLSearchParams(location.search);
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon };
    }
    return loadLocation() || DEFAULT_LOCATION;
}

async function start() {
    state.settings = loadSettings();
    applySettings();

    initSettings();
    initLocation();
    initForecast();
    initClients();
    initPwa();
    initBackup();
    initPlan();

    window.addEventListener("hashchange", route);
    route();
    setLocation(startLocation());

    try {
        const migrated = await migrateLegacyDb();
        if (migrated) {
            toast(t("migrated"));
            renderClients();
        }
    } catch (e) {
        console.warn("Could not migrate the old client database", e);
    }
}

start();
