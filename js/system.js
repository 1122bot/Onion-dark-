/* system status and owner pricing controls */
(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/system.html");
    setPageTitle("System Status");
    content.innerHTML = skeletonGrid(4);

    async function loadPricingEditor(status) {
        try {
            const { pricing } = await api("/system/pricing");
            const groups = Object.entries(pricing.plans || {}).map(([role, items]) => `
                <section class="price-group"><div class="price-group-heading"><div><span class="page-kicker">Access tier</span><h3>${escapeHtml(role)}</h3></div><span class="sub">${items.length} options</span></div>
                <div class="price-list">${items.map((item, index) => `<div class="price-row" data-role="${escapeHtml(role)}" data-index="${index}"><div class="price-plan"><strong>${escapeHtml(item.label || "Custom")}</strong><small>${escapeHtml(item.duration || "custom")}</small></div><label class="price-input"><span>$</span><input type="number" min="0" step="1" value="${Number(item.price) || 0}"></label></div>`).join("")}</div></section>
            `).join("");
            content.innerHTML = `
                <div class="page-intro system-intro"><div><span class="page-kicker">Infrastructure overview</span><h2>System Status</h2><p>Quick health check and pricing controls.</p></div><button class="btn secondary" id="refresh-btn" type="button">Refresh</button></div>
                <div class="system-status-grid"><div class="card system-status-card"><span>Website</span><strong>${pill(status.website)}</strong></div><div class="card system-status-card"><span>API</span><strong>${pill(status.api)}</strong></div><div class="card system-status-card"><span>Telegram</span><strong>${pill(status.telegramBot)}</strong></div><div class="card system-status-card"><span>WhatsApp</span><strong>${pill(status.whatsapp)}</strong><small>${status.activeWhatsappSessions || 0} active sessions</small></div><div class="card system-status-card"><span>Storage</span><strong>${pill(status.storage === "local" ? "connected" : status.storage, "Local", "Unavailable")}</strong></div><div class="card system-status-card"><span>Uptime</span><strong>${Math.floor(Number(status.uptimeSeconds || 0) / 60)}m</strong></div></div>
                <div class="card pricing-manager-card"><div class="section-heading"><div><span class="page-kicker">Owner controls</span><h3>Prices</h3><p class="sub">Change a price directly. Labels and durations stay unchanged.</p></div></div>${user.role === "OWNER" ? `<div class="price-groups">${groups}</div><div class="pricing-actions"><span id="pricing-status" class="sub"></span><button class="btn" type="button" id="pricing-save">Save prices</button></div>` : `<div class="read-only-pricing"><span>Owner-only editor</span><p class="sub">Contact the owner to request changes.</p></div>`}</div>
                <div class="sub system-updated">Last checked: ${new Date(status.serverTime).toLocaleString("en-US")}</div>`;
            document.getElementById("refresh-btn").addEventListener("click", load);
            const saveButton = document.getElementById("pricing-save");
            if (saveButton) saveButton.addEventListener("click", async () => {
                const statusNode = document.getElementById("pricing-status");
                try {
                    saveButton.disabled = true;
                    const next = JSON.parse(JSON.stringify(pricing));
                    content.querySelectorAll(".price-row").forEach((row) => { next.plans[row.dataset.role][Number(row.dataset.index)].price = Math.max(0, Number(row.querySelector("input").value) || 0); });
                    const data = await api("/system/pricing", { method: "POST", body: { pricing: next } });
                    statusNode.style.color = "var(--success)";
                    statusNode.textContent = `Saved. ${data.notified || 0} Telegram users notified.`;
                    toast("Prices updated and broadcasted.", "success");
                } catch (error) { statusNode.style.color = "var(--danger)"; statusNode.textContent = error.message || "Could not save prices."; toast(statusNode.textContent, "error"); }
                finally { saveButton.disabled = false; }
            });
        } catch (err) { content.innerHTML = errorState(err.message); }
    }

    const pill = (ok, onText = "Online", offText = "Offline") =>
        `<span class="pill ${ok === true || ok === "active" || ok === "connected" ? "connected" : "disconnected"}">${ok === true ? onText : ok === false ? offText : ok}</span>`;

    const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    async function load() {
        try {
            const { status } = await api("/system");
            await loadPricingEditor(status);
        } catch (err) {
            content.innerHTML = errorState(err.message);
        }
    }

    load();
})();
