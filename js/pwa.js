// Installable app: service worker, install button and offline banner
import { t } from "./i18n.js";
import { on, emit } from "./state.js";
import { $, toast } from "./ui.js";

let installPrompt = null;

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function renderInstallCard() {
    const card = $("#installCard");
    if (isStandalone()) { card.hidden = true; return; }
    const button = $("#installBtn");
    const hint = $("#installHint");
    if (installPrompt) {
        card.hidden = false;
        button.hidden = false;
        hint.textContent = "";
    } else if (isIos()) {
        card.hidden = false;
        button.hidden = true;
        hint.textContent = t("install.ios");
    } else {
        card.hidden = true;
    }
}

function renderOffline() {
    $("#offlineBanner").hidden = navigator.onLine;
}

async function install() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    if (outcome === "accepted") toast(t("install.done"));
    renderInstallCard();
}

export function initPwa() {
    const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
    if ("serviceWorker" in navigator && secure) {
        const register = () => navigator.serviceWorker.register("sw.js")
            .catch(e => console.warn("Service worker registration failed", e));
        // Register after the page has loaded so it doesn't compete with the first render
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
    }

    window.addEventListener("beforeinstallprompt", e => {
        e.preventDefault();
        installPrompt = e;
        renderInstallCard();
    });
    window.addEventListener("appinstalled", () => {
        installPrompt = null;
        renderInstallCard();
    });
    $("#installBtn").addEventListener("click", install);

    window.addEventListener("offline", renderOffline);
    window.addEventListener("online", () => {
        renderOffline();
        emit("online");
    });

    renderInstallCard();
    renderOffline();
    on("settings", renderInstallCard);
}
