(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/sessions.html");
    setPageTitle("Sessions");
    content.innerHTML = skeletonGrid(2);

    function table(rows) {
        if (!rows.length) return emptyState("No sessions yet.", "sessions");
        return `<table><thead><tr><th>Number</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>${rows.map((s) => `
                <tr>
                    <td>${s.number}</td>
                    <td><span class="pill ${pillClass(s.live || s.status)}">${s.live || s.status}</span></td>
                    <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID") : "-"}</td>
                </tr>
            `).join("")}</tbody></table>`;
    }

    try {
        const data = await api("/whatsapp/sessions");
        const connected = data.personal.filter((s) => (s.live || s.status) === "connected").length;
        content.innerHTML = `
            <div class="page-intro"><div><span class="page-kicker">Connection registry</span><h2>WhatsApp Sessions</h2><p>Monitor your senders and connection status.</p></div><button class="btn secondary" id="refresh-sessions">Refresh</button></div>
            <div class="grid grid-3 compact-stats"><div class="card stat-card"><span class="stat-kicker">Registered</span><strong>${data.personal.length}</strong><span class="stat-meta">total sessions</span></div><div class="card stat-card"><span class="stat-kicker">Connected</span><strong>${connected}</strong><span class="stat-meta">ready to use</span></div><div class="card stat-card"><span class="stat-kicker">Availability</span><strong>${data.personal.length ? Math.round((connected / data.personal.length) * 100) : 0}%</strong><span class="stat-meta">connection health</span></div></div>
            <div class="card">
                <div class="section-heading"><div><h3>Your senders</h3><p>Active sessions become available to the configured sender pool.</p></div></div>
                ${table(data.personal)}
            </div>
        `;
        document.getElementById("refresh-sessions").addEventListener("click", () => window.location.reload());
    } catch (err) {
        content.innerHTML = errorState(err.message);
    }
})();