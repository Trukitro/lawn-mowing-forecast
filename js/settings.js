// Settings view: language, units and theme (backup lives in backup.js)
import { state, emit } from "./state.js";
import { setLang, setUnits } from "./i18n.js";
import { saveSettings } from "./store.js";
import { $, $$, applyI18n } from "./ui.js";

export function applySettings() {
    const s = state.settings;
    setLang(s.lang);
    setUnits(s.units);
    if (s.theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = s.theme;
    applyI18n();
    $$("[data-setting]").forEach(group => {
        const value = s[group.dataset.setting];
        $$("button", group).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === value)));
    });
    $$("#langSwitch button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === s.lang)));
}

export function updateSetting(key, value) {
    if (state.settings[key] === value) return;
    state.settings = { ...state.settings, [key]: value };
    saveSettings(state.settings);
    applySettings();
    emit("settings", state.settings);
}

export function initSettings() {
    $$("[data-setting]").forEach(group => {
        group.addEventListener("click", e => {
            const btn = e.target.closest("button[data-value]");
            if (btn) updateSetting(group.dataset.setting, btn.dataset.value);
        });
    });
    $("#langSwitch").addEventListener("click", e => {
        const btn = e.target.closest("button[data-lang]");
        if (btn) updateSetting("lang", btn.dataset.lang);
    });
}
