// Keeping clients safe: export/import, persistent storage and the backup reminder
import { on, emit } from "./state.js";
import { t, todayIso, daysAgo, shortDate } from "./i18n.js";
import { exportData, parseBackup, replaceClients, getClients, loadBackupInfo, saveBackupInfo } from "./store.js";
import { $, esc, toast } from "./ui.js";

const REMIND_AFTER_DAYS = 30;     // since the last export
const FIRST_REMINDER_DAYS = 7;    // since the first client, when there was never an export
const SNOOZE_DAYS = 7;
const DAY = 86400000;

let persisted = null; // null = unknown or unsupported

// Ask the browser not to clear our data when space runs low or the site is unused.
// Chrome decides silently; Firefox may ask, so this only runs after the user saves data.
async function requestPersist() {
    if (!navigator.storage?.persist) return;
    try {
        persisted = await navigator.storage.persisted();
        if (!persisted) persisted = await navigator.storage.persist();
    } catch (e) {
        persisted = null;
    }
    renderStatus();
}

async function checkPersisted() {
    if (!navigator.storage?.persisted) return;
    try { persisted = await navigator.storage.persisted(); } catch (e) { persisted = null; }
    renderStatus();
}

export function downloadBackup() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lawn-mowing-clients-${todayIso()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveBackupInfo({ ...loadBackupInfo(), lastExport: new Date().toISOString() });
    toast(t("settings.exported"));
    renderStatus();
    renderReminder();
}

async function importBackup(file) {
    try {
        const list = parseBackup(JSON.parse(await file.text()));
        const current = getClients().length;
        if (current && !confirm(t("settings.importConfirm", { n: current, m: list.length }))) return;
        replaceClients(list);
        // The imported file is itself a backup of this data
        saveBackupInfo({ ...loadBackupInfo(), lastExport: new Date().toISOString() });
        toast(t("settings.imported", { n: list.length }));
        emit("clients", { userAction: true });
    } catch (e) {
        console.warn(e);
        toast(t("settings.importError"));
    }
}

// ---------- Reminder logic (exported for tests) ----------

// Returns "never", "old" or null
export function reminderKind({ clients, lastExport, snoozeUntil, now = Date.now() }) {
    if (!clients.length) return null;
    if (snoozeUntil && Date.parse(snoozeUntil) > now) return null;
    if (lastExport) return now - Date.parse(lastExport) > REMIND_AFTER_DAYS * DAY ? "old" : null;
    const oldest = Math.min(...clients.map(c => Date.parse(c.createdAt) || now));
    return now - oldest > FIRST_REMINDER_DAYS * DAY ? "never" : null;
}

function renderReminder() {
    const el = $("#backupReminder");
    const clients = getClients();
    const info = loadBackupInfo();
    const kind = reminderKind({ clients, lastExport: info.lastExport, snoozeUntil: info.snoozeUntil });
    if (!kind) { el.hidden = true; el.innerHTML = ""; return; }
    const title = kind === "never"
        ? t(clients.length === 1 ? "reminder.never1" : "reminder.never", { n: clients.length })
        : t("reminder.old", { ago: daysAgo(info.lastExport.slice(0, 10)) });
    el.hidden = false;
    el.innerHTML = `
        <i class="ti ti-shield-check" aria-hidden="true"></i>
        <div class="reminder-text">
            <b>${esc(title)}</b>
            <span>${esc(t("reminder.hint"))}</span>
            <div class="actions" style="margin-top:8px">
                <button type="button" class="btn btn-sm btn-primary" data-reminder="export"><i class="ti ti-download" aria-hidden="true"></i>${esc(t("settings.export"))}</button>
                <button type="button" class="btn btn-sm btn-ghost" data-reminder="later">${esc(t("reminder.later"))}</button>
            </div>
        </div>`;
}

function renderStatus() {
    const el = $("#backupStatus");
    const { lastExport } = loadBackupInfo();
    const parts = [lastExport ? t("backup.last", { date: shortDate(lastExport.slice(0, 10)) }) : t("backup.never")];
    if (persisted === true) parts.push(t("backup.protected"));
    else if (persisted === false && getClients().length) parts.push(t("backup.notProtected"));
    el.innerHTML = parts.map(p => `<span>${esc(p)}</span>`).join("");
}

export function initBackup() {
    $("#exportBtn").addEventListener("click", downloadBackup);
    $("#importBtn").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", e => {
        const file = e.target.files[0];
        e.target.value = "";
        if (file) importBackup(file);
    });
    $("#backupReminder").addEventListener("click", e => {
        const action = e.target.closest("[data-reminder]")?.dataset.reminder;
        if (action === "export") downloadBackup();
        if (action === "later") {
            saveBackupInfo({ ...loadBackupInfo(), snoozeUntil: new Date(Date.now() + SNOOZE_DAYS * DAY).toISOString() });
            renderReminder();
        }
    });
    on("clients", detail => {
        if (detail?.userAction) requestPersist();
        renderReminder();
        renderStatus();
    });
    on("settings", () => { renderReminder(); renderStatus(); });
    renderReminder();
    renderStatus();
    // Installed apps get persistent storage without a prompt, so ask right away there
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) requestPersist();
    else checkPersisted();
    window.addEventListener("appinstalled", requestPersist);
}
