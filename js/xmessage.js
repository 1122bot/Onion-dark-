(async function () {
    const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/xmessage.html");
    setPageTitle("Travas");

    let functions = [];
    let personalSessions = [];
    let globalSessions = [];
    let canUseGlobal = false;
    const globalEligibleRole = ["OWNER", "ADMIN", "RESELLER", "VVIP"].includes(user.role);
    const withTimeout = (promise, timeoutMs) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Global sender lookup timed out.")), timeoutMs)),
    ]);

    content.innerHTML = `<div class="skeleton" style="height:300px"></div>`;

    try {
        const [sessData, fnData] = await Promise.all([
            api("/whatsapp/sessions"),
            api("/xmessage/functions"),
        ]);
        personalSessions = sessData.personal.filter((s) => s.live === "connected");
        functions = fnData.functions;
        try {
            const globalData = await withTimeout(api("/whatsapp/global-active"), 8000);
            globalSessions = globalData.sessions || [];
            canUseGlobal = globalEligibleRole && globalSessions.length > 0;
        } catch {
            globalSessions = [];
            canUseGlobal = false;
        }
    } catch (err) {
        content.innerHTML = errorState(err.message);
        return;
    }

    function sessionOptions(type) {
        const list = type === "global" ? globalSessions : personalSessions;
        if (!list.length) return `<option value="">-- No active sender --</option>`;
        return list.map((s) => `<option value="${s.number}" data-owner-user-id="${escapeHtml(s.ownerUserId || user.id)}">${s.number}</option>`).join("");
    }

    function functionOptions(targetKind = "number") {
        const available = functions.filter((f) => (f.targets || ["number"]).includes(targetKind));
        return available.map((f, index) => `
            <button type="button" class="message-option ${index === 0 ? "selected" : ""}" data-function-id="${f.id}" aria-pressed="${index === 0 ? "true" : "false"}">
                <span class="message-option-check" aria-hidden="true">
                    <span class="message-option-checkmark">✓</span>
                </span>
                <span class="message-option-copy"><strong>${f.label}</strong><small>${f.type || "automatic message"}</small></span>
            </button>
        `).join("") || `<div class="sub">No message type is available for this target.</div>`;
    }

    function normalizeTargetNumber(value) {
        const raw = String(value || "").trim();
        if (!raw || !/^[+\d\s().-]+$/.test(raw)) return null;
        const number = raw.replace(/\D/g, "");
        if (!/^[1-9]\d{7,14}$/.test(number)) return null;
        return number;
    }

    function consoleJobMarkup(job) {
        const logs = (job.logs || []).slice(-3).map((entry) =>
            `<span>${new Date(entry.timestamp).toLocaleTimeString("id-ID")} ${entry.message}</span>`
        ).join("");
        const stop = job.canStop && ["queued", "running"].includes(job.status)
            ? `<button class="btn danger console-stop" data-console-stop="${job.id}">Stop</button>`
            : "";
        return `<div class="console-row"><div class="console-main"><span class="console-dot ${job.status}"></span><div><strong>${job.functionId}</strong><small>${job.targetNumber} · ${job.status}</small></div></div><div class="console-log">${logs}</div>${stop}</div>`;
    }

    function render() {
        const defaultType = canUseGlobal ? "global" : "personal";
        content.innerHTML = `
            <div class="page-intro"><div><span class="page-kicker">Message operations</span><h2>Travas</h2><p>Choose a sender and message type, then monitor delivery in real time.</p></div><a class="btn secondary" href="/whatsapp.html">Manage Senders</a></div>
            <div class="card xmessage-compose-card">
                <div class="xmessage-compose-heading"><div><span class="page-kicker">Message operations</span><h3>Send Message</h3></div><span class="compose-state" id="compose-state">Choose a target</span></div>

                <div class="field">
                    <div class="target-mode-switch" id="target-mode-switch" role="tablist" aria-label="Message target type">
                        <button class="target-mode active" type="button" data-target-type="number" role="tab" aria-selected="true"><span class="target-mode-icon">${icon("profile")}</span><strong>Number</strong></button>
                        <button class="target-mode" type="button" data-target-type="group" role="tab" aria-selected="false"><span class="target-mode-icon">${icon("whatsapp")}</span><strong>Group</strong></button>
                        <button class="target-mode" type="button" data-target-type="channel" role="tab" aria-selected="false"><span class="target-mode-icon">${icon("channel")}</span><strong>Channel</strong></button>
                    </div>
                    <input type="hidden" id="target-type" value="number">
                </div>

                <div class="field">
                    <label>Sender</label>
                    <div class="sender-picker">
                        <label class="sender-field">
                            <span>Source</span>
                            <select id="session-type">
                                ${canUseGlobal ? `<option value="global">Global Sender</option>` : ""}
                                <option value="personal" ${!canUseGlobal ? "selected" : ""}>Personal Sender</option>
                            </select>
                        </label>
                        <label class="sender-field">
                            <span>Number</span>
                            <select id="session-number">${sessionOptions(defaultType)}</select>
                        </label>
                    </div>
                    ${defaultType === "global" ? `<div class="sub">Global Sender is active and ready to use.</div>` : ""}
                </div>

                <div class="field">
                    <label>Target</label>
                    <div class="target-input-wrap">
                        <input type="text" id="target-number" placeholder="Ex : 628123678910">
                    </div>
                </div>

                <div class="field">
                    <label>Message type</label>
                    <div class="message-options" id="message-options" role="group" aria-label="Message types">${functionOptions()}</div>
                </div>

                <div class="xmessage-compose-footer"><p class="form-note">Choose a sender, target, and message type.</p><button class="btn" id="review-send" type="button" disabled>Review &amp; send</button></div>
                <div id="execute-result" style="margin-top:12px"></div>
                <div class="xmessage-overlay xmessage-console-panel" id="confirm-overlay" hidden>
                    <div class="xmessage-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                        <div class="modal-header">
                            <div><span class="modal-kicker">Console process</span><h2 id="confirm-title">Confirm message delivery</h2></div>
                        </div>
                        <div class="confirm-summary" id="confirm-summary"></div>
                        <div class="modal-actions" id="confirm-actions">
                            <button class="btn secondary" id="cancel-confirm">Cancel</button>
                            <button class="btn" id="confirm-send">Confirm and send</button>
                        </div>
                        <div class="job-panel" id="job-panel" hidden>
                            <div class="job-header"><span id="job-status">Queued</span><strong id="job-count">0 sent</strong></div>
                            <div class="job-log" id="job-log" role="log" aria-live="polite"></div>
                            <button class="btn danger block" id="stop-send">Stop sending</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card xmessage-activity-card">
                <div class="section-heading"><div><h3>Travas Activity</h3><p>Background jobs continue after the message is accepted.</p></div><button class="btn secondary" id="refresh-xmessage-log">Refresh</button></div>
                <div class="xmessage-console" id="xmessage-activity-list"><div class="sub">Loading console...</div></div>
            </div>

        `;

        const sessionType = document.getElementById("session-type");
        const sessionNumber = document.getElementById("session-number");
        const targetType = document.getElementById("target-type");
        const targetInput = document.getElementById("target-number");
        const messageOptions = document.getElementById("message-options");
        const activityList = document.getElementById("xmessage-activity-list");
        const reviewButton = document.getElementById("review-send");
        const composeState = document.getElementById("compose-state");
        let selectedFunctionId = functions.find((item) => (item.targets || ["number"]).includes("number"))?.id || "";

        sessionType.addEventListener("change", () => {
            sessionNumber.innerHTML = sessionOptions(sessionType.value);
            updateReadyState();
        });
        sessionNumber.addEventListener("change", updateReadyState);
        document.querySelectorAll("[data-target-type]").forEach((modeButton) => modeButton.addEventListener("click", () => {
            targetType.value = modeButton.dataset.targetType;
            targetInput.value = "";
            targetInput.placeholder = targetType.value === "group" ? "Paste WhatsApp group invite link" : targetType.value === "channel" ? "Paste WhatsApp channel link" : "Ex : 628123678910";
            messageOptions.innerHTML = functionOptions(targetType.value);
            selectedFunctionId = functions.find((item) => (item.targets || ["number"]).includes(targetType.value))?.id || "";
            bindMessageOptions();
            document.querySelectorAll("[data-target-type]").forEach((item) => {
                const active = item === modeButton;
                item.classList.toggle("active", active);
                item.setAttribute("aria-selected", String(active));
            });
            updateReadyState();
        }));
        targetInput.addEventListener("input", updateReadyState);
        function bindMessageOptions() {
            messageOptions.querySelectorAll("[data-function-id]").forEach((option) => {
                option.addEventListener("click", () => {
                    selectedFunctionId = option.dataset.functionId;
                    messageOptions.querySelectorAll("[data-function-id]").forEach((item) => {
                        const selected = item === option;
                        item.classList.toggle("selected", selected);
                        item.setAttribute("aria-pressed", String(selected));
                    });
                    updateReadyState();
                });
            });
        }
        bindMessageOptions();

        const overlay = document.getElementById("confirm-overlay");
        const summary = document.getElementById("confirm-summary");
        const confirmActions = document.getElementById("confirm-actions");
        const jobPanel = document.getElementById("job-panel");
        const jobLog = document.getElementById("job-log");
        const jobStatus = document.getElementById("job-status");
        const jobCount = document.getElementById("job-count");
        let activeJobId = null;
        let pollTimer = null;
        let activityTimer = null;
        let activitySignature = "";

        async function loadActivity() {
            if (activityTimer) clearTimeout(activityTimer);
            try {
                const data = await api("/xmessage/console");
                const nextSignature = JSON.stringify(data.jobs.map((job) => ({
                    id: job.id,
                    status: job.status,
                    sent: job.sent,
                    logs: job.logs?.slice(-3),
                })));
                if (nextSignature !== activitySignature) {
                    activitySignature = nextSignature;
                    activityList.innerHTML = data.jobs.length ? data.jobs.map(consoleJobMarkup).join("") : `<div class="sub">No active Travas process.</div>`;
                    activityList.querySelectorAll("[data-console-stop]").forEach((button) => button.addEventListener("click", async () => { button.disabled = true; button.textContent = "Stopping..."; await api(`/xmessage/jobs/${button.dataset.consoleStop}/stop`, { method: "POST" }).catch(() => {}); loadActivity(); }));
                }
                if (data.jobs.some((job) => ["queued", "running", "stopping"].includes(job.status))) activityTimer = setTimeout(loadActivity, 1000);
            } catch (error) { activityList.innerHTML = `<div class="sub">Console unavailable.</div>`; }
        }

        function closeOverlay() {
            if (pollTimer) clearTimeout(pollTimer);
            pollTimer = null;
            overlay.hidden = true;
        }

        function appendJobLogs(logs) {
            jobLog.innerHTML = logs.map((entry) => `
                <div class="job-log-entry"><time>${new Date(entry.timestamp).toLocaleTimeString("id-ID")}</time><span>${entry.message}</span></div>
            `).join("");
            jobLog.scrollTop = jobLog.scrollHeight;
        }

        async function pollJob() {
            if (!activeJobId) return;
            try {
                const data = await api(`/xmessage/jobs/${activeJobId}`);
                const job = data.job;
                jobStatus.textContent = job.status;
                jobStatus.className = `job-status-${job.status}`;
                jobCount.textContent = `${job.sent} sent`;
                appendJobLogs(job.logs || []);
                if (["completed", "stopped", "failed"].includes(job.status)) {
                    document.getElementById("stop-send").hidden = true;
                    document.getElementById("confirm-send").disabled = false;
                    document.getElementById("confirm-send").textContent = "Confirm and send";
                    if (job.status === "completed") toast("Message delivery completed.", "success");
                    if (job.status === "stopped") toast("Message delivery stopped.", "info");
                    if (job.status === "failed") toast(job.error || "Message delivery failed.", "error");
                    return;
                }
                pollTimer = setTimeout(pollJob, 700);
            } catch (error) {
                jobStatus.textContent = "Connection error";
                toast(error.message, "error");
            }
        }

        function openConfirmation() {
            const fn = functions.find((f) => f.id === selectedFunctionId);

            if (!fn) return toast("Choose a message type first.", "error");
            if (!sessionNumber.value) return toast("No active session available.", "error");
            if (!targetInput.value.trim()) return toast(targetType.value === "group" ? "A group link is required." : targetType.value === "channel" ? "A channel link is required." : "A target number is required.", "error");

            const target = targetType.value === "number"
                ? normalizeTargetNumber(targetInput.value)
                : targetInput.value.trim();
            if (!target) return toast("Nomor WhatsApp hanya boleh berisi angka dan format nomor yang valid.", "error");
            summary.innerHTML = `<div><span>Sender</span><strong>${sessionNumber.value}</strong></div><div><span>Target</span><strong>${target}</strong></div><div><span>Message Type</span><strong>${fn.label}</strong></div>`;
            overlay.hidden = false;
            confirmActions.hidden = false;
            jobPanel.hidden = true;
            const confirmButton = document.getElementById("confirm-send");
            const stopButton = document.getElementById("stop-send");
            confirmButton.disabled = false;
            confirmButton.textContent = "Confirm and send";
            stopButton.hidden = false;
            stopButton.disabled = false;
            activeJobId = null;
        }

        function updateReadyState() {
            const target = targetInput.value.trim();
            const ready = Boolean(sessionNumber.value && target && selectedFunctionId);
            reviewButton.disabled = !ready;
            composeState.textContent = ready ? "Ready to send" : "Choose a target";
            composeState.className = `compose-state${ready ? " ready" : ""}`;
        }

        async function confirmAndSend() {
            const resultBox = document.getElementById("execute-result");
            const btn = document.getElementById("confirm-send");
            const fn = functions.find((f) => f.id === selectedFunctionId);
            const rawTarget = document.getElementById("target-number").value.trim();
            const target = targetType.value === "number" ? normalizeTargetNumber(rawTarget) : rawTarget;
            if (!target) {
                toast("Nomor WhatsApp hanya boleh berisi angka dan format nomor yang valid.", "error");
                return;
            }
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner"></span> Starting...`;
            confirmActions.hidden = true;
            jobPanel.hidden = false;
            jobLog.innerHTML = "";
            jobStatus.textContent = "Queued";
            jobCount.textContent = "0 sent";

            try {
                const response = await api("/xmessage/execute", {
                    method: "POST",
                    body: {
                        sessionType: sessionType.value,
                        sessionNumber: sessionNumber.value,
                            sessionOwnerId: sessionType.value === "personal"
                                ? (sessionNumber.selectedOptions[0]?.dataset.ownerUserId || user.id)
                                : "",
                        targetNumber: target,
                        targetType: targetType.value,
                        functionId: fn.id,
                        params: {},
                    },
                });
                activeJobId = response.jobId;
                overlay.hidden = true;
                resultBox.innerHTML = `<div class="pill connected">Done</div><div class="sub" style="margin-top:8px">Message accepted. Processing continues in the background.</div>`;
                toast("Message accepted.", "success");
                loadActivity();
            } catch (err) {
                resultBox.innerHTML = `<div class="pill error">${err.message}</div>`;
                toast(err.message, "error");
                btn.disabled = false;
                btn.textContent = "Confirm and send";
                confirmActions.hidden = false;
                jobPanel.hidden = true;
            }
        }

        document.getElementById("confirm-send").addEventListener("click", confirmAndSend);
        reviewButton.addEventListener("click", openConfirmation);
        document.getElementById("cancel-confirm").addEventListener("click", closeOverlay);
        document.getElementById("stop-send").addEventListener("click", async (event) => {
            if (!activeJobId) return;
            event.currentTarget.disabled = true;
            try { await api(`/xmessage/jobs/${activeJobId}/stop`, { method: "POST" }); } catch (error) { toast(error.message, "error"); event.currentTarget.disabled = false; }
        });
        document.getElementById("refresh-xmessage-log").addEventListener("click", loadActivity);
        loadActivity();
    }

    render();
})();