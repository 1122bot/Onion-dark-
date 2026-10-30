// Ikon SVG line-style (stroke currentColor) - satu sumber dipakai semua
// halaman, biar konsisten dan gampang diganti. Semua ikon ukuran 20x20,
// stroke-width 1.6, gaya minimal (bukan filled/emoji).

const ICONS = {
    dashboard: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.4"/><rect x="11" y="2.5" width="6.5" height="6.5" rx="1.4"/><rect x="2.5" y="11" width="6.5" height="6.5" rx="1.4"/><rect x="11" y="11" width="6.5" height="6.5" rx="1.4"/></svg>`,

    whatsapp: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 16.5l1.1-3.3a6.9 6.9 0 1 1 2.9 2.6L3.5 16.5z" stroke-linejoin="round"/><path d="M7.2 8.6c0 2.4 2.2 4.6 4.6 4.6" stroke-linecap="round"/></svg>`,

    bug: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.2 6.2A3.3 3.3 0 0 1 10 4.7a3.3 3.3 0 0 1 2.8 1.5"/><path d="M6.1 8.1h7.8v4.2A3.9 3.9 0 0 1 10 16.2a3.9 3.9 0 0 1-3.9-3.9V8.1z"/><path d="M10 4.7V3M5.2 8.4H3.5M16.5 8.4h-1.7M5.3 12H3.7M16.3 12h-1.6M7 6.2 5.8 4.9M13 6.2l1.2-1.3M7.3 15.2l-1.1 1.2M12.7 15.2l1.1 1.2"/></svg>`,

    sessions: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8.2 11.8a3 3 0 0 0 4.5.3l2-2a3 3 0 0 0-4.2-4.2l-1.1 1.1" stroke-linecap="round"/><path d="M11.8 8.2a3 3 0 0 0-4.5-.3l-2 2a3 3 0 0 0 4.2 4.2l1.1-1.1" stroke-linecap="round"/></svg>`,

    logs: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 2.7h7.2L16 6.5V17a.7.7 0 0 1-.7.7H5A.7.7 0 0 1 4.3 17V3.4A.7.7 0 0 1 5 2.7z" stroke-linejoin="round"/><path d="M7 9.5h6M7 12.5h6M7 6.5h3" stroke-linecap="round"/></svg>`,

    system: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3.5" width="14" height="4.5" rx="1"/><rect x="3" y="12" width="14" height="4.5" rx="1"/><circle cx="6" cy="5.75" r=".6" fill="currentColor" stroke="none"/><circle cx="6" cy="14.25" r=".6" fill="currentColor" stroke="none"/></svg>`,

    database: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="10" cy="4.5" rx="6.5" ry="2.5"/><path d="M3.5 4.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5M3.5 9.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5"/></svg>`,

    plus: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 3v14M3 10h14" stroke-linecap="round"/></svg>`,

    copy: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="6.5" width="9" height="10" rx="1.5"/><path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h1.5"/></svg>`,

    database: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="10" cy="4.5" rx="6.5" ry="2.5"/><path d="M3.5 4.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5M3.5 9.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5"/>`,

    profile: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="6.8" r="3.2"/><path d="M3.6 16.8c1-3 3.6-4.6 6.4-4.6s5.4 1.6 6.4 4.6" stroke-linecap="round"/></svg>`,

    channel: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17.5 2.5L2.3 8.7l4.9 1.8M17.5 2.5l-2.6 14-6.7-5.5M17.5 2.5L8.6 11" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    owner: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8.5V8a6 6 0 0 1 12 0v.5" stroke-linecap="round"/><rect x="2.8" y="8.5" width="3.6" height="5" rx="1.2"/><rect x="13.6" y="8.5" width="3.6" height="5" rx="1.2"/><path d="M16 13.5v.8a3 3 0 0 1-3 3h-2" stroke-linecap="round"/></svg>`,

    logout: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 17H4.7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 13.5l3.5-3.5-3.5-3.5M16.3 10H8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    back: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12.5 4.5L6 10l6.5 5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    menu: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5.5h14M3 10h14M3 14.5h14" stroke-linecap="round"/></svg>`,

    chevron: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 4.5L13 10l-5.5 5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    logoMark: `<svg viewBox="0 0 28 28" fill="none"><path d="M14 2L26 21H2L14 2z" fill="url(#logoGrad)"/><defs><linearGradient id="logoGrad" x1="2" y1="21" x2="26" y2="2"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8a8a8a"/></linearGradient></defs></svg>`,
};

function icon(name, cls = "") {
    return `<span class="icon ${cls}">${ICONS[name] || ""}</span>`;
}