// Settings view: language, units, theme and backup
import { state, emit } from "./state.js";
import { t, setLang, setUnits, todayIso } from "./i18n.js";
import { saveSettings, exportData, parseBackup, replaceClients, getClients } from "./store.js";
import { $, $$, applyI18n, toast } from "./ui.js";

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

function exportBackup() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lawn-mowing-clients-${todayIso()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t("settings.exported"));
}

async function importBackup(file) {
    try {
        const list = parseBackup(JSON.parse(await file.text()));
        const current = getClients().length;
        if (current && !confirm(t("settings.importConfirm", { n: current, m: list.length }))) return;
        replaceClients(list);
        toast(t("settings.imported", { n: list.length }));
        emit("clients");
    } catch (e) {
        console.warn(e);
        toast(t("settings.importError"));
    }
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
    $("#exportBtn").addEventListener("click", exportBackup);
    $("#importBtn").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", e => {
        const file = e.target.files[0];
        e.target.value = "";
        if (file) importBackup(file);
    });
}
