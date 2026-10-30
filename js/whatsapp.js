(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/whatsapp.html");
    setPageTitle("WhatsApp Management");
    const canManageVisibility = user.role === "OWNER" || user.role === "ADMIN";
    const isOwner = user.role === "OWNER";
    let sessionsLoaded = false;
    let sessionsLoading = false;

    function sessionRow(s) {
        const st = s.live || s.status;
        return `
            <tr data-sender-row data-number="${s.number}" data-owner="${s.ownerUsername || s.ownerUserId || ""}" data-visibility="${s.isGlobal ? "global" : "personal"}" data-status="${st}">
                <td data-label="Number"><strong class="sender-number">${s.number}</strong></td>
                ${isOwner ? `<td data-label="Owner"><span class="sender-owner">${s.ownerUsername || s.ownerUserId || "-"}</span></td>` : ""}
                ${canManageVisibility ? `<td data-label="Visibility"><select class="sender-visibility-select" data-visibility-number="${s.number}" data-visibility-user="${s.ownerUserId || user.id}"><option value="personal" ${s.isGlobal ? "" : "selected"}>Personal</option><option value="global" ${s.isGlobal ? "selected" : ""}>Global</option></select></td>` : ""}
                <td data-label="Status"><div class="sender-status"><span class="pill ${pillClass(st)}" title="${s.statusReason || ""}">${st}</span><small class="sender-status-reason">${s.statusReason || ""}</small></div></td>
                <td data-label="Created"><span class="sender-date">${s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-US") : "-"}</span></td>
                <td data-label="Actions"><div class="sender-actions"><button class="btn secondary" data-reconnect="${s.number}" data-reconnect-user="${s.ownerUserId || user.id}">Reconnect</button><button class="btn danger" data-remove="${s.number}" data-remove-user="${s.ownerUserId || user.id}">Remove</button></div></td>
            </tr>
        `;
    }

    async function loadSessions() {
        if (sessionsLoading) return;
        sessionsLoading = true;
        const listBox = document.getElementById("session-list");
        if (!sessionsLoaded) listBox.innerHTML = `<div class="skeleton" style="height:80px"></div>`;
        try {
            const data = await api("/whatsapp/sessions");
            const rows = data.personal || [];
            listBox.innerHTML = rows.length
                    ? `<div class="sender-list-tools"><label class="sender-search-field"><span>Search</span><input id="sender-search" type="search" placeholder="Sender or owner"></label><label class="sender-filter-field"><span>Status</span><select id="sender-status-filter"><option value="">All statuses</option><option value="connected">Connected</option><option value="connecting">Connecting</option><option value="closed">Closed</option><option value="disconnected">Disconnected</option></select></label>${canManageVisibility ? '<label class="sender-filter-field"><span>Visibility</span><select id="sender-visibility-filter"><option value="">All visibility</option><option value="global">Global</option><option value="personal">Personal</option></select>' : ""}<button class="btn secondary sender-refresh" id="refresh-senders">Refresh</button></div><div class="sender-table-wrap"><table class="sender-table"><thead><tr><th>Number</th>${isOwner ? "<th>Owner</th>" : ""}${canManageVisibility ? "<th>Visibility</th>" : ""}<th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                         <tbody>${rows.map(sessionRow).join("")}</tbody></table></div>`
                : emptyState("No senders yet.", "whatsapp");

            listBox.querySelectorAll("[data-visibility-number]").forEach((select) => {
                select.addEventListener("change", async () => {
                    select.disabled = true;
                    try {
                        await api("/whatsapp/visibility", {
                            method: "POST",
                            body: {
                                number: select.dataset.visibilityNumber,
                                userId: select.dataset.visibilityUser,
                                isGlobal: select.value === "global",
                            },
                        });
                        toast("Sender visibility updated.", "success");
                        await loadSessions();
                    } catch (err) {
                        toast(err.message, "error");
                        await loadSessions();
                    } finally {
                        select.disabled = false;
                    }
                });
            });

            listBox.querySelectorAll("[data-reconnect]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    btn.disabled = true;
                    const originalLabel = btn.textContent;
                    btn.innerHTML = `<span class="spinner"></span> Reconnecting...`;
                    try {
                        await api("/whatsapp/reconnect", { method: "POST", body: { number: btn.dataset.reconnect, userId: btn.dataset.reconnectUser } });
                        toast("Reconnect started.", "success");
                        await loadSessions();
                    } catch (err) {
                        toast(err.message, "error");
                    } finally {
                        btn.disabled = false;
                        btn.textContent = originalLabel;
                    }
                });
            });

            const applyFilters = () => {
                const search = (document.getElementById("sender-search")?.value || "").toLowerCase();
                const status = document.getElementById("sender-status-filter")?.value || "";
                const visibility = document.getElementById("sender-visibility-filter")?.value || "";
                listBox.querySelectorAll("[data-sender-row]").forEach((row) => {
                    const matches = (!search || `${row.dataset.number} ${row.dataset.owner}`.toLowerCase().includes(search))
                        && (!status || row.dataset.status === status)
                        && (!visibility || row.dataset.visibility === visibility);
                    row.hidden = !matches;
                });
            };
            ["sender-search", "sender-status-filter", "sender-visibility-filter"].forEach((id) => document.getElementById(id)?.addEventListener("input", applyFilters));
            document.getElementById("refresh-senders")?.addEventListener("click", async (event) => {
                const refreshButton = event.currentTarget;
                if (sessionsLoading) return;
                refreshButton.disabled = true;
                refreshButton.innerHTML = `<span class="spinner"></span> Refreshing...`;
                try {
                    await loadSessions();
                } finally {
                    refreshButton.disabled = false;
                    refreshButton.textContent = "Refresh";
                }
            });

            listBox.querySelectorAll("[data-remove]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    btn.disabled = true;
                    const originalLabel = btn.textContent;
                    btn.innerHTML = `<span class="spinner"></span> Removing...`;
                    try {
                        await api("/whatsapp/remove", {
                            method: "POST",
                            body: { number: btn.dataset.remove, userId: btn.dataset.removeUser },
                        });

                        toast("Session removed.", "success");
                        await loadSessions();
                    } catch (err) {
                        toast(err.message, "error");
                        btn.disabled = false;
                        btn.textContent = originalLabel;
                    }
                });
            });
            sessionsLoaded = true;
        } catch (err) {
            if (!sessionsLoaded) listBox.innerHTML = errorState(err.message);
        } finally {
            sessionsLoading = false;
        }
    }

    async function startPairing() {
        const numberInput = document.getElementById("pair-number");
        const number = numberInput.value.trim().replace(/[^0-9]/g, "");
        const resultBox = document.getElementById("pair-result");
        const btn = document.getElementById("pair-btn");
        if (!number) { toast("Phone number is required.", "error"); return; }

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Requesting code...`;
        resultBox.innerHTML = "";
        setPairStep(2);

        try {
            const res = await api("/whatsapp/pair", { method: "POST", body: { number } });
            setPairStep(3);
            resultBox.innerHTML = res.pairingCode
                ? `<div class="pairing-code-result"><div class="pill pairing"><span>Pairing code</span><strong id="pairing-code-value">${res.pairingCode}</strong></div><button type="button" class="btn secondary copy-pairing-btn" id="copy-pairing-code" aria-label="Copy pairing code">${icon("copy")}<span>Copy</span></button></div>
                         <div class="sub" style="margin-top:8px">Enter this code in WhatsApp: Linked devices &rarr; Link with phone number.</div>`
                     : `<div class="sub">Session found. Waiting for confirmation...</div>`;

            btn.textContent = "Waiting for connection...";
            const copyButton = document.getElementById("copy-pairing-code");
            if (copyButton) copyButton.addEventListener("click", async () => {
                const code = document.getElementById("pairing-code-value")?.textContent || "";
                try {
                    await navigator.clipboard.writeText(code);
                } catch {
                    const helper = document.createElement("textarea");
                    helper.value = code;
                    helper.style.position = "fixed";
                    helper.style.opacity = "0";
                    document.body.appendChild(helper);
                    helper.select();
                    document.execCommand("copy");
                    helper.remove();
                }
                copyButton.classList.add("copied");
                copyButton.querySelector("span").textContent = "Copied";
                toast("Pairing code copied.", "success");
                setTimeout(() => {
                    copyButton.classList.remove("copied");
                    copyButton.querySelector("span").textContent = "Copy";
                }, 1600);
            });
            await api("/whatsapp/confirm", { method: "POST", body: { number } });

            toast("WhatsApp connected successfully.", "success");
            setPairStep(4);
            numberInput.value = "";
            resultBox.innerHTML = `<div class="pill connected">Connected</div>`;
            loadSessions();
        } catch (err) {
            setPairStep(1);
            toast(err.message, "error");
            resultBox.innerHTML = `<div class="sub" style="color:var(--danger)">${err.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = "Start pairing";
        }
    }

    function setPairStep(activeStep) {
        document.querySelectorAll("[data-pair-step]").forEach((step) => {
            const stepNumber = Number(step.dataset.pairStep);
            step.classList.toggle("active", stepNumber === activeStep);
            step.classList.toggle("complete", stepNumber < activeStep);
        });
    }

    content.innerHTML = `
        <div class="page-intro"><div><span class="page-kicker">Sender operations</span><h2>WhatsApp Management</h2><p>Pair, monitor, and remove WhatsApp sender sessions.</p></div><a class="btn secondary" href="/xmessage.html">Open Travas</a></div>
        <div class="card" style="max-width:460px">
            <h3>Pair a new number</h3>
            <div class="pair-steps" aria-label="Pairing progress">
                <div class="pair-step active" data-pair-step="1"><span>1</span><small>Number</small></div>
                <i></i>
                <div class="pair-step" data-pair-step="2"><span>2</span><small>Request</small></div>
                <i></i>
                <div class="pair-step" data-pair-step="3"><span>3</span><small>Confirm</small></div>
                <i></i>
                <div class="pair-step" data-pair-step="4"><span>4</span><small>Connected</small></div>
            </div>
            <div class="field">
                <label>WhatsApp number (international format)</label>
                <input type="text" id="pair-number" placeholder="Ex : 628123678910">
            </div>
            <div class="pairing-visibility-note"><strong>Personal sender</strong><span>After pairing, only Owner or Admin can change its visibility to Global.</span></div>
            <button class="btn block" id="pair-btn">Start pairing</button>
            <div id="pair-result" style="margin-top:12px"></div>
            <div class="sub" style="margin-top:8px">
                <strong>Note:</strong> Pairing a number will create a new sender session. You can only pair numbers that you own and have access to. The pairing code will be sent to your WhatsApp app for confirmation.
            </div>
        </div>

        <div class="card" style="margin-top:16px">
            <h3>${isOwner ? "All senders" : "Your senders"}</h3>
            <div id="session-list"><div class="skeleton" style="height:80px"></div></div>
        </div>
    `;

    document.getElementById("pair-btn").addEventListener("click", startPairing);
    loadSessions();
    const refreshTimer = setInterval(loadSessions, 15000);
    window.addEventListener("beforeunload", () => clearInterval(refreshTimer), { once: true });
})();