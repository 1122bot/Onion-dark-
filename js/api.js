// ---------- TOAST ---------- //
function ensureToastContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {
        c = document.createElement("div");
        c.id = "toast-container";
        document.body.appendChild(c);
    }
    return c;
}

function toast(message, type = "info") {
    const c = ensureToastContainer();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ---------- API WRAPPER ---------- //
// Pastikan base API sudah terdeteksi sebelum request pertama.
let __onionApiReady = null;
function ensureApiBase() {
    if (!window.OnionAPI) return Promise.resolve();
    if (window.OnionAPI.ready) return Promise.resolve();
    if (!__onionApiReady) __onionApiReady = window.OnionAPI.detect();
    return __onionApiReady;
}

// Kalau backend tidak ketemu sama sekali, tampilkan layar "Set backend URL"
// supaya user bisa tempel URL panel-nya dan login tetap jalan di hosting apa pun.
function apiUnreachable() {
    const err = new Error("Backend panel tidak ditemukan. Masukkan URL panel Anda.");
    err.status = 0;
    err.code = "NO_BACKEND";
    if (window.OnionAPI) {
        setTimeout(() => window.OnionAPI.showSetup(() => window.location.reload()), 200);
    }
    return err;
}

function getStoredToken() {
    try { return localStorage.getItem("onion_token") || ""; } catch { return ""; }
}
function setStoredToken(t) {
    try {
        if (t) localStorage.setItem("onion_token", t);
        else localStorage.removeItem("onion_token");
    } catch {}
}

async function api(path, { method = "GET", body } = {}) {
    await ensureApiBase();
    // Backend belum ketemu (detect gagal) -> jangan buang request, langsung
    // tampilkan layar setup supaya user bisa isi URL panel.
    if (window.OnionAPI && !window.OnionAPI.ready && !window.OnionAPI.base) {
        throw apiUnreachable();
    }
    let res;
    try {
        const base = (window.OnionAPI && window.OnionAPI.base) || "";
        const headers = {};
        if (body) headers["Content-Type"] = "application/json";
        const token = getStoredToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        res = await fetch(`${base}/api${path}`, {
            method,
            headers,
            credentials: "include",
            cache: "no-store",
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (error) {
        const networkError = new Error("Unable to reach the server. Make sure the backend is running and only one instance is active.");
        networkError.cause = error;
        networkError.status = 0;
        if (window.OnionAPI && !window.OnionAPI.base) {
            setTimeout(() => window.OnionAPI.showSetup(() => window.location.reload()), 300);
        }
        throw networkError;
    }

    let data = null;
    try { data = await res.json(); } catch { /* no body */ }

    // Proxy/rewrite yang salah (mis. Vercel balas HTML "Cannot GET") atau
    // backend mati (502/504) -> anggap backend tidak terjangkau.
    if (!data && (res.status >= 500 || res.status === 404 || res.status === 403)) {
        if (window.OnionAPI) {
            window.OnionAPI.ready = false;
            window.OnionAPI.base = "";
        }
        throw apiUnreachable();
    }

    // Simpan token untuk mode cross-origin (Vercel -> panel VPS)
    if (res.ok && data && data.token) setStoredToken(data.token);
    if (res.status === 401 && getStoredToken()) setStoredToken(null);

    if (!res.ok) {
        const msg = data?.message || `Terjadi kesalahan (${res.status})`;
        const err = new Error(msg);
        err.errorId = data?.errorId;
        err.status = res.status;
        throw err;
    }
    return data;
}

// ---------- BRANDING ---------- //
// Selalu ambil branding segar dari backend (tanpa cache). Ini penting supaya
// saat panel dipindah ke domain/hosting lain, nama, logo, dan banner langsung
// ikut berubah tanpa tersangkut cache lama di browser.
async function loadBranding() {
    try {
        const data = await api("/branding");
        window.__BRAND__ = data.branding;
        return data.branding;
    } catch {
        return window.__BRAND__ || null;
    }
}

// ---------- AUTH GUARD ---------- //
async function guardAuth() {
    await loadBranding();
    try {
        const data = await api("/auth/me");
        return data.user;
    } catch {
        window.location.href = "/index.html";
        return null;
    }
}

async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    setStoredToken(null);
    window.location.href = "/index.html";
}

const COLOR_THEME_OPTIONS = [
    { id: "default", label: "Onion Dark", swatch: "#080d0b" },
    { id: "midnight", label: "Midnight", swatch: "#0a0d14" },
    { id: "graphite", label: "Graphite", swatch: "#17191d" },
    { id: "frost", label: "Frost", swatch: "#dfe7ef" },
    { id: "ocean", label: "Ocean", swatch: "#0b1c2a" },
    { id: "ember", label: "Ember", swatch: "#241514" },
    { id: "ruby", label: "Ruby", swatch: "#3a121c" },
    { id: "violet", label: "Violet", swatch: "#21152f" },
    { id: "forest", label: "Forest", swatch: "#10251d" },
    { id: "amber", label: "Amber", swatch: "#30210d" },
    { id: "daylight", label: "Daylight", swatch: "#f3f5f7" },
    { id: "aurora", label: "Aurora", swatch: "#0e2a32" },
    { id: "sunset", label: "Sunset", swatch: "#39212d" },
    { id: "slate", label: "Slate", swatch: "#1d2736" },
    { id: "red-velvet", label: "Red Velvet", swatch: "#2b0d18" },
    { id: "crimson-glow", label: "Crimson Glow", swatch: "#2a050d" },
    { id: "obsidian-luxe", label: "Obsidian Luxe", swatch: "#15171d" },
    { id: "scarlet-noir", label: "Scarlet Noir", swatch: "#101014" },
    { id: "cyber-lime", label: "Cyber Lime", swatch: "#0d1b15" },
    { id: "neon-violet", label: "Neon Violet", swatch: "#191027" },
    { id: "deep-emerald", label: "Deep Emerald", swatch: "#0b2119" },
    { id: "arctic-glass", label: "Arctic Glass", swatch: "#102431" },
    { id: "copper-noir", label: "Copper Noir", swatch: "#241410" },
    { id: "dark-blue-neon", label: "Dark Blue Neon", swatch: "#071a32" },
];

const XTHEME_OPTIONS = [
    { id: "matrix", label: "Matrix", swatch: "#071910" },
    { id: "xtheme", label: "XTheme", swatch: "#071d26" },
    { id: "anime-soft", label: "Anime Soft", swatch: "#dfeeff" },
    { id: "discord-iphone", label: "Discord iPhone", swatch: "#8397d7" },
];

const THEME_OPTIONS = [...COLOR_THEME_OPTIONS, ...XTHEME_OPTIONS];

function applyTheme(themeId) {
    const theme = THEME_OPTIONS.some((item) => item.id === themeId) ? themeId : "default";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("onion-dark-theme", theme);

    document.querySelectorAll("[data-theme]").forEach((option) => {
        option.classList.toggle("is-selected", option.dataset.theme === theme);
    });
}

applyTheme(localStorage.getItem("onion-dark-theme") || "default");

// ---------- NAV (dipakai kotak-kotak di Dashboard, bukan sidebar) ---------- //
const NAV_ITEMS = [
    { href: "/dashboard.html", icon: "dashboard", label: "Dashboard", sub: "Overview" },
    { href: "/whatsapp.html", icon: "whatsapp", label: "WhatsApp", sub: "Manage senders", roles: ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"] },
    { href: "/xmessage.html", icon: "bug", label: "Travas", sub: "Send messages", roles: ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"] },
    { href: "/chat.html", icon: "whatsapp", label: "Live Chat", sub: "Talk to panel users", roles: ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"] },
    { href: "/sessions.html", icon: "sessions", label: "Sessions", sub: "Connection status", roles: ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"] },
    { href: "/logs.html", icon: "logs", label: "Logs", sub: "Activity & errors", roles: ["OWNER", "ADMIN", "RESELLER"] },
    { href: "/system.html", icon: "system", label: "System Status", sub: "System health", roles: ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"] },
    { href: "/tools.html", icon: "system", label: "Tools", sub: "Useful utilities" },
    { href: "/database.html", icon: "database", label: "Database", sub: "Manage users", roles: ["OWNER", "ADMIN", "RESELLER"] },
    { href: "/profile.html", icon: "profile", label: "Profile", sub: "Account info" },
];

function isInternalPageLink(anchor, event) {
    if (!anchor || !anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin && url.pathname.endsWith(".html");
}

document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a");
    if (!isInternalPageLink(anchor, event)) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

    event.preventDefault();
    window.location.href = destination.href;
});

window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-exiting");
    document.body.classList.add("page-entered");
});

// ---------- SHELL (sidebar minimal + topbar) ---------- //
function renderShell(user, activeHref) {
    const brand = window.__BRAND__ || {};
    const isDashboard = activeHref === "/dashboard.html";

    const shell = document.createElement("div");
    const pageName = activeHref.replace("/", "").replace(".html", "") || "dashboard";
    shell.className = `app-shell page-${pageName}`;

    const channelLink = brand.telegramChannel
        ? `<a class="sidebar-link" href="${brand.telegramChannel}" target="_blank" rel="noopener">${icon("channel")}<span>Channel</span></a>`
        : "";
    const ownerLink = brand.telegramOwnerContact
        ? `<a class="sidebar-link" href="${brand.telegramOwnerContact}" target="_blank" rel="noopener">${icon("owner")}<span>Owner</span></a>`
        : "";
    const logoMarkup = brand.logoPhoto
        ? `<img class="brand-photo" src="${brand.logoPhoto}" alt="${brand.webName || "Onion Dark"} logo">`
        : "";
    const menuLogoMarkup = brand.logoPhoto
        ? `<img class="menu-logo" src="${brand.logoPhoto}" alt="Open sidebar">`
        : "";
    const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
    const navigation = visibleNavItems.map((item) => `
        <a class="sidebar-link sidebar-nav-link ${item.href === activeHref ? "active" : ""}" href="${item.href}">
            ${icon(item.icon)}
            <span class="sidebar-link-copy"><strong>${item.label}</strong><small>${item.sub}</small></span>
        </a>
    `).join("");
    const colorThemeOptions = COLOR_THEME_OPTIONS.map((theme, index) => {
        const isSelected = document.documentElement.dataset.theme === theme.id;
        return `
            <button type="button" class="theme-option ${isSelected ? "is-selected" : ""} ${index >= 9 ? "theme-option-extra" : ""}" data-theme="${theme.id}">
                <i style="--swatch:${theme.swatch}"></i>
                <span>${theme.label}</span>
            </button>
        `;
    }).join("");
    const xThemeOptions = XTHEME_OPTIONS.map((theme) => {
        const isSelected = document.documentElement.dataset.theme === theme.id;
        return `
            <button type="button" class="theme-option ${isSelected ? "is-selected" : ""}" data-theme="${theme.id}">
                <i style="--swatch:${theme.swatch}"></i>
                <span>${theme.label}</span>
            </button>
        `;
    }).join("");

    shell.innerHTML = `
        <aside class="sidebar" id="sidebar">
            <a class="sidebar-brand" href="/dashboard.html" aria-label="Open dashboard" title="Dashboard">
                ${logoMarkup}
                <span class="sidebar-brand-copy"><strong class="brand-wordmark brand-wordmark-sidebar">${brand.webName || "Onion Dark"}</strong><small>${brand.panelLabel || "Onion Dark Control"}</small></span>
            </a>
            <div class="sidebar-section-label">Workspace</div>
            <nav class="sidebar-navigation" aria-label="Primary navigation">
                ${navigation}
            </nav>
            <div class="sidebar-spacer"></div>
            <div class="sidebar-section-label sidebar-support-label">Support</div>
            <div class="sidebar-links">
                ${channelLink}
                ${ownerLink}
            </div>
            <div class="sidebar-user">Signed in as <strong>${user.username}</strong></div>
            <button class="logout-btn" id="logout-btn">${icon("logout")}<span>Logout</span></button>
        </aside>
        <main class="main">
            <div class="topbar">
                <div class="topbar-left">
                    <button class="menu-toggle" id="menu-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">${menuLogoMarkup}</button>
                    ${!isDashboard ? `<a class="back-btn" href="/dashboard.html">${icon("back")}</a>` : ""}
                    <div class="topbar-identity"><h1 id="page-title"></h1></div>
                </div>
                <div class="topbar-actions"><div class="theme-menu-wrap"><button class="theme-toggle" id="theme-toggle" aria-label="Choose theme">Theme</button><div class="theme-menu" id="theme-menu" hidden><div class="theme-group"><div class="theme-group-label">Color</div>${colorThemeOptions}</div><div class="theme-group"><div class="theme-group-label">XTheme</div>${xThemeOptions}</div><button type="button" class="theme-more" id="theme-more">More themes</button></div></div><span class="role-badge">${user.role}</span></div>
            </div>
            <div id="page-content"></div>
        </main>
    `;

    document.body.prepend(shell);
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("menu-toggle").addEventListener("click", () => {
        document.querySelector(".app-shell").classList.toggle("sidebar-collapsed");
        document.getElementById("sidebar").classList.toggle("open");
    });
    document.addEventListener("pointerdown", (event) => {
        const sidebar = document.getElementById("sidebar");
        const toggle = document.getElementById("menu-toggle");
        if (window.innerWidth <= 860 && sidebar.classList.contains("open") && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
            sidebar.classList.remove("open");
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const sidebar = document.getElementById("sidebar");
        if (window.innerWidth <= 860) sidebar.classList.remove("open");
    });
    const themeToggle = document.getElementById("theme-toggle");
    const themeMenu = document.getElementById("theme-menu");
    const themeMore = document.getElementById("theme-more");
    themeToggle.addEventListener("click", (event) => { event.stopPropagation(); themeMenu.hidden = !themeMenu.hidden; });
    themeMore.addEventListener("click", (event) => {
        event.stopPropagation();
        const expanded = themeMenu.classList.toggle("is-expanded");
        themeMore.textContent = expanded ? "Show fewer" : "More themes";
    });
    themeMenu.querySelectorAll("[data-theme]").forEach((option) => {
        option.addEventListener("click", () => { applyTheme(option.dataset.theme); themeMenu.hidden = true; });
    });
    document.addEventListener("click", () => { themeMenu.hidden = true; }, { once: true });

    return document.getElementById("page-content");
}

function setPageTitle(title) {
    const el = document.getElementById("page-title");
    if (el) el.textContent = title;
    const brand = window.__BRAND__ || {};
    document.title = `${title} - ${brand.webName || "Panel"}`;
}

function skeletonGrid(count = 4) {
    return `<div class="grid grid-4">${Array.from({ length: count })
        .map(() => `<div class="card"><div class="skeleton" style="height:52px"></div></div>`)
        .join("")}</div>`;
}

function emptyState(text, iconName = "logs") {
    return `<div class="empty-state">${icon(iconName)}<div>${text}</div></div>`;
}

function errorState(text, iconName = "system") {
    return `<div class="error-state">${icon(iconName)}<div>${text}</div></div>`;
}

function pillClass(status) {
    return (status || "disconnected").toLowerCase();
}
