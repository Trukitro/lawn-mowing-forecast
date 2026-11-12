// Shared app state and a tiny event bus
//   "settings"  language, units or theme changed
//   "location"  forecast location changed
//   "clients"   a client or service was added, edited or deleted

export const state = {
    settings: null,
    location: null,       // { lat, lon, name }
    forecast: null,       // result of buildForecast for state.location
    forecastError: false,
    selectedDay: 0,
    selectedHour: null,
    tab: "radar"
};

const bus = new EventTarget();

export function on(type, fn) {
    bus.addEventListener(type, e => fn(e.detail));
}

export function emit(type, detail) {
    bus.dispatchEvent(new CustomEvent(type, { detail }));
}
