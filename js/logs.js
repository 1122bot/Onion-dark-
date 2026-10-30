(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/logs.html");
    setPageTitle("Activity & Error Logs");
    content.innerHTML = `<div class="skeleton" style="height:200px"></div>`;

    function typeBadge(type) {
        const map = { error: "error", auth: "connecting", account: "connected", whatsapp: "pairing", xmessage: "connected" };
        return `<span class="pill ${map[type] || "disconnected"}">${type}</span>`;
    }

    try {
        const data = await api("/logs");
        const errors = data.logs.filter((l) => l.type === "error" || l.success === false).length;
        content.innerHTML = `
            <div class="page-intro"><div><span class="page-kicker">System activity</span><h2>Activity & Error Logs</h2><p>Audit trail for account activity and operations.</p></div><button class="btn secondary" id="refresh-logs">Refresh</button></div>
            <div class="grid grid-3 compact-stats"><div class="card stat-card"><span class="stat-kicker">Visible events</span><strong>${data.logs.length}</strong><span class="stat-meta">latest records</span></div><div class="card stat-card"><span class="stat-kicker">Issues</span><strong>${errors}</strong><span class="stat-meta">errors or failed actions</span></div><div class="card stat-card"><span class="stat-kicker">Scope</span><strong>Account</strong><span class="stat-meta">your activity only</span></div></div>
            <div class="card logs-surface-card">
                ${data.logs.length ? `
                    <table>
                        <thead><tr><th>Time</th><th>Type</th><th>Details</th></tr></thead>
                        <tbody>
                            ${data.logs.map((l) => `
                                <tr>
                                    <td>${new Date(l.timestamp).toLocaleString("en-US")}</td>
                                    <td>${typeBadge(l.type)}</td>
                                    <td>
                                        ${l.errorId ? `<code>${l.errorId}</code> — ` : ""}
                                        ${l.action || l.route || l.message || "-"}
                                        ${l.username ? ` (${l.username})` : ""}
                                        ${l.number ? ` — ${l.number}` : ""}
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                ` : emptyState("No activity logs yet.", "logs")}
            </div>
        `;
        document.getElementById("refresh-logs").addEventListener("click", () => window.location.reload());
    } catch (err) {
        content.innerHTML = errorState(err.message);
    }
})();