(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/database.html");
    setPageTitle("Database");

    const PANEL_ROLES = ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"];

    let users = [];
    let roles = [];
    let canCreateOwners = false;
    let canDeleteOwners = false;
    let canCreateAccounts = false;
    let creatableRoles = [];
    let canDeleteAccounts = false;
    let canManageAccounts = false;
    let actorRole = user.role;
    let temporaryPassword = "";

    const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Lifetime";
    const isExpired = (user) => user.expiredAt && new Date(user.expiredAt) < new Date();

    function userStatus(user) {
        if (isExpired(user)) return ["Expired", "danger"];
        if (user.status !== "active") return [user.status, "muted"];
        return ["Active", "success"];
    }

    function getFilteredUsers() {
        const query = document.getElementById("database-search")?.value.trim().toLowerCase() || "";
        const roleFilter = document.getElementById("database-role")?.value || "";
        return users.filter((entry) => {
            const matchesQuery = !query || [entry.username, entry.telegramId, entry.role].some((value) => String(value || "").toLowerCase().includes(query));
            return matchesQuery && (!roleFilter || entry.role === roleFilter);
        });
    }

    function bindDeleteActions() {
        document.querySelectorAll("[data-delete-user]").forEach((button) => button.addEventListener("click", () => deleteUser(button.dataset.deleteUser, button.dataset.username, button)));
    }

    function bindRoleActions() {
        document.querySelectorAll("[data-role-select]").forEach((select) => select.addEventListener("change", () => {
            const button = document.querySelector(`[data-role-user="${CSS.escape(select.dataset.roleSelect)}"]`);
            if (button) button.disabled = select.value === select.dataset.currentRole;
        }));
        document.querySelectorAll("[data-role-user]").forEach((button) => button.addEventListener("click", () => {
            const target = button.dataset.roleUser;
            const roleSelect = document.querySelector(`[data-role-select="${CSS.escape(target)}"]`);
            const nextRole = roleSelect?.value || "";
            updateRole(target, button.dataset.roleName, button, nextRole);
        }));
    }

    function bindExpiryActions() {
        document.querySelectorAll("[data-expiry-action]").forEach((button) => button.addEventListener("click", () => {
            const id = button.dataset.expiryUser;
            const operation = button.dataset.expiryAction;
            const duration = document.querySelector(`[data-expiry-select="${CSS.escape(id)}"]`)?.value || "";
            adjustExpiry(id, operation, duration, button);
        }));
    }

    function refreshTable() {
        const table = document.getElementById("database-table");
        if (!table) return;
        table.innerHTML = renderTable(getFilteredUsers());
        bindDeleteActions();
        bindRoleActions();
        bindExpiryActions();
    }

    function render() {
        const selectableRoles = creatableRoles.length ? creatableRoles : (canCreateOwners ? roles : []);
        const activeCount = users.filter((entry) => userStatus(entry)[0] === "Active").length;
        const expiringCount = users.filter((entry) => entry.expiredAt && !isExpired(entry)).length;

        content.innerHTML = `
            <div class="page-intro database-intro">
                <div><span class="page-kicker">Account management</span><h2>User Database</h2><p>Review accounts and manage access within your role.</p></div>
                ${canCreateAccounts ? `<button class="btn" id="open-create-user">${icon("plus")} Create user</button>` : ""}
            </div>
            <div class="database-stats grid grid-3">
                <div class="card database-stat"><div class="database-stat-head">${icon("database")}<span>Total accounts</span></div><strong>${users.length}</strong><small>All records in storage</small></div>
                <div class="card database-stat"><div class="database-stat-head">${icon("profile")}<span>Active accounts</span></div><strong>${activeCount}</strong><small>Ready to access the panel</small></div>
                <div class="card database-stat"><div class="database-stat-head">${icon("chevron")}<span>Time-limited</span></div><strong>${expiringCount}</strong><small>Accounts with an expiry date</small></div>
            </div>
            <div class="card database-card">
                <div class="database-toolbar">
                    <div class="database-toolbar-copy"><div class="database-title-line"><h3>Account directory</h3><span class="database-record-count">${users.length} records</span></div><p>Manage access and account status.</p></div>
                    <div class="database-filters"><label><span>Find account</span><input id="database-search" type="search" placeholder="Username or Telegram ID"></label><label><span>Role</span><select id="database-role"><option value="">All roles</option>${roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("")}</select></label></div>
                </div>
                <div id="database-table">${renderTable(getFilteredUsers())}</div>
            </div>
            <div class="database-modal" id="create-user-modal" hidden>
                <div class="database-modal-backdrop" data-close-create></div>
                <form class="card database-form" id="create-user-form">
                    <div class="modal-header"><div><span class="page-kicker">New account</span><h3>Create user</h3></div><button type="button" class="icon-button" data-close-create aria-label="Close">&times;</button></div>
                    <div class="database-form-grid">
                        <label class="field"><span>Username</span><input name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="new_user"></label>
                        <label class="field"><span>Role</span><select name="role">${selectableRoles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("")}</select></label>
                        ${canCreateOwners ? `<label class="field"><span>Owner key <small>(only for OWNER)</small></span><input name="ownerKey" type="password" placeholder="Required only when creating OWNER"></label>` : ""}
                        <label class="field"><span>Password <small>(optional)</small></span><input name="password" minlength="8" maxlength="72" type="password" placeholder="Generate automatically"></label>
                        <label class="field"><span>Telegram ID <small>(optional)</small></span><input name="telegramId" inputmode="numeric" placeholder="123456789"></label>
                        <label class="field"><span>Duration</span><input name="duration" type="text" placeholder="Lifetime, 30d, 2w, 6m, 1y, 72h" list="duration-presets"><datalist id="duration-presets"><option value=""></option><option value="1d">1 day</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="6m">6 months</option><option value="1y">1 year</option><option value="Lifetime"></option></datalist></label>
                    </div>
                    <div id="create-user-status" class="database-process-status" role="status" aria-live="polite"></div><div id="create-user-error" class="auth-error"></div>
                    <div class="modal-actions"><button type="button" class="btn secondary" data-close-create>Cancel</button><button class="btn" type="submit">Create account</button></div>
                </form>
            </div>
            <div class="database-modal" id="password-modal" hidden><div class="database-modal-backdrop" data-close-password></div><div class="card database-password"><span class="page-kicker">Save these credentials</span><h3>Account created</h3><p>The generated password is shown once. Store it securely before closing.</p><div class="credential-line"><span>Username</span><strong id="created-username"></strong><button type="button" class="btn small secondary" data-copy="username">Copy</button></div><div class="credential-line"><span>Password</span><strong id="created-password"></strong><button type="button" class="btn small secondary" data-copy="password">Copy</button></div><div class="credential-line"><span>Panel</span><a id="created-panel-link" target="_blank" rel="noreferrer" href="#"></a></div><button class="btn block" data-close-password>Done</button></div></div>
        `;

        const createModal = document.getElementById("create-user-modal");
        const passwordModal = document.getElementById("password-modal");
        const setModalOpen = (modal, open) => {
            if (!modal) return;
            modal.hidden = !open;
            document.body.style.overflow = open ? "hidden" : "";
            if (open) {
                modal.setAttribute("aria-hidden", "false");
                requestAnimationFrame(() => {
                    const input = modal.querySelector("input:not([type=hidden]), select");
                    if (input) input.focus();
                });
            } else {
                modal.setAttribute("aria-hidden", "true");
            }
        };

        document.getElementById("database-search").addEventListener("input", refreshTable);
        document.getElementById("database-role").addEventListener("change", refreshTable);
        document.getElementById("open-create-user").addEventListener("click", () => setModalOpen(createModal, true));
        document.querySelectorAll("[data-close-create]").forEach((element) => element.addEventListener("click", () => setModalOpen(createModal, false)));
        document.querySelectorAll("[data-close-password]").forEach((element) => element.addEventListener("click", () => setModalOpen(passwordModal, false)));
        document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
            const field = button.dataset.copy;
            const value = field === "username" ? document.getElementById("created-username").textContent : document.getElementById("created-password").textContent;
            try {
                await navigator.clipboard.writeText(value);
                toast(`${field === "username" ? "Username" : "Password"} copied.`, "success");
            } catch {
                toast("Copy failed. Please copy manually.", "error");
            }
        }));
        document.getElementById("create-user-form").addEventListener("submit", createUser);
        bindDeleteActions();
        bindRoleActions();
        bindExpiryActions();
    }

    function roleOptionsForEntry(entry) {
        if (actorRole === "OWNER") return PANEL_ROLES.filter((role) => role !== entry.role);
        if (actorRole === "ADMIN") {
            if (entry.role === "PREMIUM") return ["VVIP"];
            if (entry.role === "VVIP") return ["PREMIUM", "RESELLER"];
            if (entry.role === "RESELLER") return ["VVIP"];
            return [];
        }
        if (actorRole === "RESELLER") {
            if (entry.role === "PREMIUM") return ["VVIP"];
            if (entry.role === "VVIP") return ["PREMIUM"];
            return [];
        }
        return [];
    }

    function canAdjustExpiryForEntry(entry) {
        return actorRole === "OWNER" || (actorRole === "ADMIN" && ["VVIP", "PREMIUM"].includes(entry.role));
    }

    function canDeleteEntry(entry) {
        return actorRole === "OWNER" || (actorRole === "ADMIN" && ["RESELLER", "VVIP", "PREMIUM"].includes(entry.role));
    }

    function renderTable(filtered) {
        if (!filtered.length) return `<div class="empty-state"><strong>No matching accounts</strong><span>Try another search or create a new user.</span></div>`;
        return `<div class="database-table-wrap"><table class="database-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Telegram ID</th><th>Expires</th><th>Created</th><th>Actions</th></tr></thead><tbody>${filtered.map((entry) => {
            const [status, statusClass] = userStatus(entry);
            const isOwnerEntry = entry.role === "OWNER";
            const canDeleteThisEntry = canDeleteAccounts && canDeleteEntry(entry) && (!isOwnerEntry || (canDeleteOwners && entry.id !== user.id));
            const options = roleOptionsForEntry(entry);
            const canRoleSwitch = options.length > 0 && entry.id !== user.id;
            const roleChoices = [entry.role, ...options.filter((role) => role !== entry.role)];
            const roleSelect = canRoleSwitch ? `<span class="database-role-control"><span class="database-role-select"><select class="database-role-switch" aria-label="Choose a new role for ${escapeHtml(entry.username)}" data-role-select="${escapeHtml(entry.id)}" data-current-role="${escapeHtml(entry.role)}">${roleChoices.map((role) => `<option value="${escapeHtml(role)}"${role === entry.role ? " selected" : ""}>${role === entry.role ? "Current: " : "Change to "}${escapeHtml(role)}</option>`).join("")}</select>${icon("chevron")}</span><button class="btn small secondary database-role-button" data-role-user="${escapeHtml(entry.id)}" data-role-name="${escapeHtml(entry.username)}" disabled>Apply</button></span>` : "";
            const deleteButton = canDeleteThisEntry ? `<button class="btn danger small" data-delete-user="${escapeHtml(entry.id)}" data-username="${escapeHtml(entry.username)}">Delete</button>` : `<span class="table-protected">Protected</span>`;
            const expiryControl = canManageAccounts && canAdjustExpiryForEntry(entry) ? `<span class="database-expiry-control"><select class="database-expiry-select" aria-label="Expiry adjustment for ${escapeHtml(entry.username)}" data-expiry-select="${escapeHtml(entry.id)}"><option value="1d">1 day</option><option value="7d">7 days</option><option value="30d" selected>30 days</option><option value="90d">90 days</option></select><button class="btn small secondary" data-expiry-user="${escapeHtml(entry.id)}" data-expiry-action="add" aria-label="Add time">+</button><button class="btn small ghost" data-expiry-user="${escapeHtml(entry.id)}" data-expiry-action="subtract" aria-label="Remove time"${entry.expiredAt ? "" : " disabled"}>-</button><button class="btn small ghost database-lifetime-button" data-expiry-user="${escapeHtml(entry.id)}" data-expiry-action="lifetime" aria-label="Set lifetime">Lifetime</button></span>` : "";
            return `<tr><td data-label="User"><strong>${escapeHtml(entry.username)}</strong><small class="table-sub">${escapeHtml(entry.source)} account</small></td><td data-label="Role"><span class="role-badge">${escapeHtml(entry.role)}</span></td><td data-label="Status"><span class="status-pill ${statusClass}">${escapeHtml(status)}</span></td><td data-label="Telegram ID">${escapeHtml(entry.telegramId || "-")}</td><td data-label="Expires"><span class="database-expiry-cell"><span>${formatDate(entry.expiredAt)}</span>${expiryControl}</span></td><td data-label="Created">${formatDate(entry.createdAt)}</td><td data-label="Actions" class="database-actions">${roleSelect}${deleteButton}</td></tr>`;
        }).join("")}</tbody></table></div>`;
    }

    async function loadUsers() {
        try {
            const data = await api("/database/users");
            users = data.users || [];
            roles = data.roles || ["OWNER", "ADMIN", "RESELLER", "VVIP", "PREMIUM"];
            canCreateOwners = Boolean(data.canCreateOwners);
            canCreateAccounts = Boolean(data.canCreateAccounts);
            creatableRoles = data.creatableRoles || [];
            canDeleteOwners = Boolean(data.canDeleteOwners || data.isPrimaryOwner);
            canManageAccounts = Boolean(data.canManageAccounts);
            actorRole = String(data.actorRole || user.role || "OWNER").toUpperCase();
            canDeleteAccounts = Boolean(data.canDeleteAccounts);
            render();
        } catch (error) {
            content.innerHTML = errorState(error.message);
        }
    }

    async function createUser(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const errorBox = document.getElementById("create-user-error");
        const statusBox = document.getElementById("create-user-status");
        const button = form.querySelector("button[type=submit]");
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.username = String(payload.username || "").trim();
        const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;
        if (!usernamePattern.test(payload.username)) {
            errorBox.textContent = "Username must be 3-20 characters and contain only letters, numbers, or underscores.";
            statusBox.textContent = "Creation failed. Check the form and try again.";
            return;
        }
        const formFields = [...form.querySelectorAll("input, select, button")];
        button.disabled = true;
        form.setAttribute("aria-busy", "true");
        formFields.forEach((field) => { field.disabled = true; });
        button.innerHTML = `<span class="spinner"></span> Creating...`;
        statusBox.textContent = "Creating account. Please wait...";
        errorBox.textContent = "";
        toast("Account creation is in progress...", "info");
        try {
            const data = await api("/database/users", { method: "POST", body: payload });
            await loadUsers();

            document.getElementById("created-username").textContent = data.user.username;
            document.getElementById("created-password").textContent = data.temporaryPassword || "Custom password saved";
            const panelLink = document.getElementById("created-panel-link");
            panelLink.textContent = data.panelDomain || "Panel link unavailable";
            panelLink.href = data.panelDomain || "#";
            panelLink.hidden = !data.panelDomain;
            setModalOpen(createModal, false);
            setModalOpen(passwordModal, true);
        } catch (error) {
            errorBox.textContent = error.message;
            statusBox.textContent = "Creation failed. Check the form and try again.";
        } finally {
            form.removeAttribute("aria-busy");
            formFields.forEach((field) => { field.disabled = false; });
            button.disabled = false;
            button.textContent = "Create account";
            if (!errorBox.textContent) statusBox.textContent = "";
        }
    }

    async function updateRole(id, username, button, nextRole) {
        const target = users.find((u) => u.id === id);
        if (!target) return;

        if (!nextRole) {
            toast("No allowed role transition for this account.", "error");
            return;
        }

        if (!window.confirm(`Change role for ${username} from ${target.role} to ${nextRole}?`)) return;

        const actionButtons = [...document.querySelectorAll("[data-role-user]")];
        actionButtons.forEach((item) => { item.disabled = true; });
        button.innerHTML = `<span class="spinner"></span> Applying...`;

        try {
            await api(`/database/users/${encodeURIComponent(id)}/role`, { method: "PATCH", body: { role: nextRole } });
            toast(`Role updated to ${nextRole}.`, "success");
            await loadUsers();
        } catch (error) {
            toast(error.message, "error");
            actionButtons.forEach((item) => { item.disabled = false; });
            button.textContent = "Apply";
        }
    }

    async function adjustExpiry(id, operation, duration, button) {
        const target = users.find((entry) => entry.id === id);
        if (!target || !duration) return;
        const action = operation === "add" ? "Add" : operation === "subtract" ? "Remove" : "Set lifetime for";
        const message = operation === "lifetime" ? `${action} ${target.username}?` : `${action} ${duration} ${operation === "add" ? "to" : "from"} ${target.username}'s expiry?`;
        if (!window.confirm(message)) return;

        const expiryButtons = [...document.querySelectorAll("[data-expiry-action]")];
        expiryButtons.forEach((item) => { item.disabled = true; });
        button.textContent = "...";
        try {
            await api(`/database/users/${encodeURIComponent(id)}/expiry`, { method: "PATCH", body: { operation, duration } });
            toast(`Expiry ${operation === "add" ? "extended" : operation === "subtract" ? "reduced" : "set to lifetime"}.`, "success");
            await loadUsers();
        } catch (error) {
            toast(error.message, "error");
            expiryButtons.forEach((item) => { item.disabled = false; });
            button.textContent = operation === "add" ? "+" : operation === "subtract" ? "-" : "Lifetime";
        }
    }

    async function deleteUser(id, username, button) {
        if (!window.confirm(`Delete account ${username}? This cannot be undone.`)) return;
        const row = button.closest("tr");
        const deleteButtons = [...document.querySelectorAll("[data-delete-user]")];
        const rowControls = row ? [...row.querySelectorAll("button, select")].filter((item) => item !== button) : [];
        deleteButtons.forEach((item) => { item.disabled = true; });
        rowControls.forEach((item) => { item.disabled = true; });
        row?.classList.add("is-processing");
        row?.setAttribute("aria-busy", "true");
        button.innerHTML = `<span class="spinner"></span> Deleting...`;
        toast(`Deleting ${username}. Please wait...`, "info");
        try {
            await api(`/database/users/${encodeURIComponent(id)}`, { method: "DELETE" });
            toast("Account deleted.", "success");
            await loadUsers();
        } catch (error) {
            toast(error.message, "error");
            deleteButtons.forEach((item) => { item.disabled = false; });
            rowControls.forEach((item) => { item.disabled = false; });
            row?.classList.remove("is-processing");
            row?.removeAttribute("aria-busy");
            button.textContent = "Delete";
        }
    }

    await loadUsers();
})();
