// UI strings and formatting (English / Spanish)

const strings = {
    en: {
        appName: "Lawn Mowing Forecast",
        "nav.forecast": "Forecast",
        "nav.clients": "Clients",
        "nav.settings": "Settings",
        changeLocation: "Change location",

        "verdict.good": "Good day to mow",
        "verdict.fair": "Possible, with care",
        "verdict.bad": "Better reschedule",
        "verdict.none": "No daylight left today",
        today: "Today",
        tomorrow: "Tomorrow",
        bestHours: "Best hours: {list}",
        noGoodHours: "No ideal hours",
        hoursPassed: "Today's best hours have passed. Next good day: {day}.",
        noGoodDayWeek: "No good day in the next 7 days.",
        mainReason: "Main issue: {reason}",
        now: "Now",
        feels: "Feels {t}",

        "reason.rain": "rain",
        "reason.prob": "chance of rain",
        "reason.wet": "wet grass",
        "reason.heat": "heat",
        "reason.cold": "cold",
        "reason.uv": "strong UV",
        "reason.wind": "wind",
        "reason.storm": "thunderstorms",

        next7: "Next 7 days",
        daylightHours: "Daylight hours",
        "legend.good": "Ideal",
        "legend.fair": "Fair",
        "legend.bad": "Avoid",
        "legend.past": "Past",
        hourHint: "Tap an hour to see why it scores that way.",
        hourOk: "no issues",
        "metric.rain": "Rain",
        "metric.prob": "Chance",
        "metric.tmax": "High",
        "metric.wind": "Wind",
        "tab.radar": "Radar",
        "tab.map": "Map",
        "tab.hourly": "Hourly",
        "col.hour": "Hour",
        "col.temp": "Temp",
        "col.rain": "Rain",
        "col.prob": "Chance",
        "col.wind": "Wind",
        "col.score": "Score",
        mapHint: "Tap the map to change the location.",
        errorWeather: "Couldn't load the forecast. Check your connection and try again.",
        retry: "Retry",

        "loc.title": "Choose location",
        "loc.search": "Juncos, Caguas, Ponce…",
        "loc.useMine": "Use my location",
        "loc.orMap": "Or tap the map",
        "loc.usePoint": "Use this point",
        "loc.locating": "Locating…",
        "loc.denied": "Location access was denied.",
        "loc.unsupported": "Your browser can't share its location.",
        "loc.noResults": "No places found",
        "loc.pinned": "Pinned point",
        "loc.puertoRico": "Puerto Rico",

        "clients.title": "Clients",
        "clients.new": "New",
        "clients.search": "Search by name or town",
        "clients.emptyTitle": "Add your first client",
        "clients.emptyBody": "Save addresses and see each client's next good day to mow.",
        "clients.add": "Add client",
        "clients.noMatch": "No clients match",
        "clients.nextGood": "Next good day",
        "clients.noGoodDay": "None this week",
        "clients.noLocation": "No location",
        "clients.lastService": "Last service {ago}",
        "clients.noServices": "No services yet",
        "ago.today": "today",
        "ago.yesterday": "yesterday",
        "ago.days": "{n} days ago",

        "form.newClient": "New client",
        "form.editClient": "Edit client",
        "form.name": "Name",
        "form.namePh": "María Rivera",
        "form.phone": "Phone",
        "form.phonePh": "787-555-0100",
        "form.address": "Address",
        "form.addressPh": "Calle 5 #12, Urb. Las Vegas",
        "form.town": "Town",
        "form.chooseTown": "Choose a town",
        "form.pin": "Exact location",
        "form.pinHint": "Tap the map to place the pin.",
        "form.save": "Save",
        "form.cancel": "Cancel",
        "form.nameRequired": "Enter the client's name",
        "form.saved": "Client saved",
        "form.delete": "Delete client",
        "form.confirmDelete": "Delete {name} and their service history?",
        "form.deleted": "Client deleted",

        "detail.viewForecast": "View forecast",
        "detail.directions": "Directions",
        "detail.call": "Call",
        "detail.edit": "Edit",
        "detail.thisWeek": "This week",
        "detail.services": "Services",
        "detail.logService": "Log service",
        "detail.date": "Date",
        "detail.notes": "Notes",
        "detail.notesPh": "Cut, edging and cleanup",
        "detail.serviceSaved": "Service logged",
        "detail.noServices": "No services logged yet.",
        "detail.deleteService": "Delete this service?",
        "detail.dateRequired": "Choose a date",
        "detail.removeService": "Delete service",

        "settings.title": "Settings",
        "settings.language": "Language",
        "settings.units": "Units",
        "settings.metric": "°C · km/h · mm",
        "settings.imperial": "°F · mph · in",
        "settings.theme": "Theme",
        "settings.auto": "Auto",
        "settings.light": "Light",
        "settings.dark": "Dark",
        "settings.backup": "Backup",
        "settings.backupDesc": "Your clients are stored only in this browser. Export a copy to keep them safe or to move them to another device.",
        "settings.export": "Export",
        "settings.import": "Import",
        "settings.exported": "Backup downloaded",
        "settings.importConfirm": "Replace your {n} current clients with the {m} in this file?",
        "settings.imported": "{n} clients imported",
        "settings.importError": "That file isn't a valid backup.",
        "settings.howScore": "How the score works",
        "settings.howScoreDesc": "Each daylight hour starts at 100 and loses points for rain, chance of rain, wet grass from recent rain, heat (feels-like), strong UV, wind and storms. 70 or more is ideal, 45 to 69 is fair. A day's score is its best 3-hour window.",
        "settings.about": "About",
        "settings.aboutDesc": "Weather by Open-Meteo, maps by OpenStreetMap, radar by RainViewer. MIT license.",
        "settings.source": "Source code",
        migrated: "Your clients were moved to the new storage"
    },
    es: {
        appName: "Pronóstico de corte",
        "nav.forecast": "Pronóstico",
        "nav.clients": "Clientes",
        "nav.settings": "Ajustes",
        changeLocation: "Cambiar ubicación",

        "verdict.good": "Buen día para cortar",
        "verdict.fair": "Se puede, con cuidado",
        "verdict.bad": "Mejor reprogramar",
        "verdict.none": "Ya no quedan horas de luz hoy",
        today: "Hoy",
        tomorrow: "Mañana",
        bestHours: "Mejores horas: {list}",
        noGoodHours: "Sin horas ideales",
        hoursPassed: "Las mejores horas de hoy ya pasaron. Próximo buen día: {day}.",
        noGoodDayWeek: "No hay un buen día en los próximos 7 días.",
        mainReason: "Motivo principal: {reason}",
        now: "Ahora",
        feels: "Sensación {t}",

        "reason.rain": "lluvia",
        "reason.prob": "probabilidad de lluvia",
        "reason.wet": "césped mojado",
        "reason.heat": "calor",
        "reason.cold": "frío",
        "reason.uv": "UV alto",
        "reason.wind": "viento",
        "reason.storm": "tormentas",

        next7: "Próximos 7 días",
        daylightHours: "Horas de luz",
        "legend.good": "Ideal",
        "legend.fair": "Regular",
        "legend.bad": "Evitar",
        "legend.past": "Ya pasó",
        hourHint: "Toca una hora para ver por qué tiene esa puntuación.",
        hourOk: "sin problemas",
        "metric.rain": "Lluvia",
        "metric.prob": "Prob.",
        "metric.tmax": "Máx.",
        "metric.wind": "Viento",
        "tab.radar": "Radar",
        "tab.map": "Mapa",
        "tab.hourly": "Por hora",
        "col.hour": "Hora",
        "col.temp": "Temp.",
        "col.rain": "Lluvia",
        "col.prob": "Prob.",
        "col.wind": "Viento",
        "col.score": "Punt.",
        mapHint: "Toca el mapa para cambiar la ubicación.",
        errorWeather: "No se pudo cargar el pronóstico. Revisa tu conexión e inténtalo de nuevo.",
        retry: "Reintentar",

        "loc.title": "Elegir ubicación",
        "loc.search": "Juncos, Caguas, Ponce…",
        "loc.useMine": "Usar mi ubicación",
        "loc.orMap": "O toca el mapa",
        "loc.usePoint": "Usar este punto",
        "loc.locating": "Buscando tu ubicación…",
        "loc.denied": "Se denegó el acceso a la ubicación.",
        "loc.unsupported": "Tu navegador no puede compartir la ubicación.",
        "loc.noResults": "No se encontraron lugares",
        "loc.pinned": "Punto en el mapa",
        "loc.puertoRico": "Puerto Rico",

        "clients.title": "Clientes",
        "clients.new": "Nuevo",
        "clients.search": "Buscar por nombre o municipio",
        "clients.emptyTitle": "Agrega tu primer cliente",
        "clients.emptyBody": "Guarda direcciones y mira el próximo buen día de corte de cada cliente.",
        "clients.add": "Agregar cliente",
        "clients.noMatch": "Ningún cliente coincide",
        "clients.nextGood": "Próximo buen día",
        "clients.noGoodDay": "Ninguno esta semana",
        "clients.noLocation": "Sin ubicación",
        "clients.lastService": "Último servicio {ago}",
        "clients.noServices": "Sin servicios",
        "ago.today": "hoy",
        "ago.yesterday": "ayer",
        "ago.days": "hace {n} días",

        "form.newClient": "Nuevo cliente",
        "form.editClient": "Editar cliente",
        "form.name": "Nombre",
        "form.namePh": "María Rivera",
        "form.phone": "Teléfono",
        "form.phonePh": "787-555-0100",
        "form.address": "Dirección",
        "form.addressPh": "Calle 5 #12, Urb. Las Vegas",
        "form.town": "Municipio",
        "form.chooseTown": "Elige un municipio",
        "form.pin": "Ubicación exacta",
        "form.pinHint": "Toca el mapa para poner el pin.",
        "form.save": "Guardar",
        "form.cancel": "Cancelar",
        "form.nameRequired": "Escribe el nombre del cliente",
        "form.saved": "Cliente guardado",
        "form.delete": "Eliminar cliente",
        "form.confirmDelete": "¿Eliminar a {name} y su historial de servicios?",
        "form.deleted": "Cliente eliminado",

        "detail.viewForecast": "Ver pronóstico",
        "detail.directions": "Cómo llegar",
        "detail.call": "Llamar",
        "detail.edit": "Editar",
        "detail.thisWeek": "Esta semana",
        "detail.services": "Servicios",
        "detail.logService": "Registrar servicio",
        "detail.date": "Fecha",
        "detail.notes": "Notas",
        "detail.notesPh": "Corte, orilla y limpieza",
        "detail.serviceSaved": "Servicio registrado",
        "detail.noServices": "Aún no hay servicios registrados.",
        "detail.deleteService": "¿Eliminar este servicio?",
        "detail.dateRequired": "Elige una fecha",
        "detail.removeService": "Eliminar servicio",

        "settings.title": "Ajustes",
        "settings.language": "Idioma",
        "settings.units": "Unidades",
        "settings.metric": "°C · km/h · mm",
        "settings.imperial": "°F · mph · in",
        "settings.theme": "Tema",
        "settings.auto": "Auto",
        "settings.light": "Claro",
        "settings.dark": "Oscuro",
        "settings.backup": "Copia de seguridad",
        "settings.backupDesc": "Tus clientes se guardan solo en este navegador. Exporta una copia para no perderlos o para pasarlos a otro dispositivo.",
        "settings.export": "Exportar",
        "settings.import": "Importar",
        "settings.exported": "Copia descargada",
        "settings.importConfirm": "¿Reemplazar tus {n} clientes actuales por los {m} de este archivo?",
        "settings.imported": "{n} clientes importados",
        "settings.importError": "Ese archivo no es una copia válida.",
        "settings.howScore": "Cómo se calcula la puntuación",
        "settings.howScoreDesc": "Cada hora de luz empieza en 100 y pierde puntos por lluvia, probabilidad de lluvia, césped mojado por lluvia reciente, calor (sensación térmica), UV alto, viento y tormentas. 70 o más es ideal; de 45 a 69, regular. La puntuación del día es su mejor bloque de 3 horas.",
        "settings.about": "Acerca de",
        "settings.aboutDesc": "Tiempo de Open-Meteo, mapas de OpenStreetMap y radar de RainViewer. Licencia MIT.",
        "settings.source": "Código fuente",
        migrated: "Tus clientes se pasaron al nuevo almacenamiento"
    }
};

let lang = "en";
let units = "metric";

export function setLang(value) { lang = value === "es" ? "es" : "en"; document.documentElement.lang = lang; }
export function getLang() { return lang; }
export function setUnits(value) { units = value === "imperial" ? "imperial" : "metric"; }
export function getUnits() { return units; }

export function t(key, vars = {}) {
    const s = strings[lang][key] ?? strings.en[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

const locale = () => (lang === "es" ? "es-PR" : "en-US");

// "2026-11-11" -> local Date (avoids the UTC shift of new Date("2026-11-11"))
export function parseDate(iso) {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function weekdayShort(iso) {
    return cap(parseDate(iso).toLocaleDateString(locale(), { weekday: "short" }).replace(".", ""));
}

export function dayNumber(iso) { return parseDate(iso).getDate(); }

// "Today", "Tomorrow" or "Thu, Nov 13"
export function dayLabel(iso, todayRef) {
    if (todayRef) {
        const diff = Math.round((parseDate(iso) - parseDate(todayRef)) / 86400000);
        if (diff === 0) return t("today");
        if (diff === 1) return t("tomorrow");
    }
    return cap(parseDate(iso).toLocaleDateString(locale(), { weekday: "short", month: "short", day: "numeric" }));
}

export function longDate(iso) {
    return cap(parseDate(iso).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" }));
}

export function shortDate(iso) {
    return parseDate(iso).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
}

export function hourLabel(h) {
    h = ((h % 24) + 24) % 24;
    const suffix = h < 12 ? "am" : "pm";
    return `${h % 12 || 12}${suffix}`;
}

export function rangesLabel(ranges) {
    return ranges.map(r => `${hourLabel(r.start)}–${hourLabel(r.end)}`).join(", ");
}

export function daysAgo(iso, todayRef = todayIso()) {
    const n = Math.round((parseDate(todayRef) - parseDate(iso)) / 86400000);
    if (n <= 0) return t("ago.today");
    if (n === 1) return t("ago.yesterday");
    return t("ago.days", { n });
}

// ---------- Units ----------

export function temp(c) {
    if (c == null) return "—";
    return units === "imperial" ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`;
}

export function wind(kmh) {
    if (kmh == null) return "—";
    return units === "imperial" ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`;
}

export function rain(mm) {
    if (mm == null) return "—";
    return units === "imperial" ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`;
}

export function percent(p) { return p == null ? "—" : `${Math.round(p)}%`; }
