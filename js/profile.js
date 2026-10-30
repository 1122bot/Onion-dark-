(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/profile.html");
    setPageTitle("Profile");

    const brand = window.__BRAND__ || {};
    const fallbackName = user.username || brand.webName || "User";
    const fallbackInitial = fallbackName.slice(0, 1).toUpperCase();

    const statusText = (user.status || "active").toLowerCase() === "active" ? "Active" : String(user.status || "Active");
    const expiryText = user.expiredAt ? new Date(user.expiredAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Lifetime";

    content.innerHTML = `
        <div class="page-intro"><div><span class="page-kicker">Account center</span><h2>Profile</h2><p>Account identity, access, and subscription status.</p></div></div>
        <div class="profile-layout">
            <div class="card profile-identity" id="profile-identity">
                <div class="profile-avatar" id="profile-avatar">${fallbackInitial}</div>
                <h3 id="profile-name">${user.username}</h3>
                <p id="profile-handle">${brand.profileLabel || "Panel account"}</p>
                <span class="pill connected">${statusText}</span>
            </div>

            <div class="card profile-details-card">
                <div class="section-heading"><div><h3>Account details</h3><p>Current account information.</p></div></div>
                <table>
                    <tr><td>Username</td><td><strong>${user.username}</strong></td></tr>
                    <tr><td>Role</td><td><span class="pill connected">${user.role}</span></td></tr>
                    <tr><td>Status</td><td>${statusText}</td></tr>
                    <tr><td>Expired</td><td>${expiryText}</td></tr>
                </table>
            </div>

            <div class="card profile-password-card">
                <div class="section-heading"><div><h3>Change password</h3><p>Update your password for this account.</p></div></div>
                <form id="change-password-form" class="profile-password-form">
                    <div class="field"><label for="current-password">Current password</label><input id="current-password" name="currentPassword" type="password" autocomplete="current-password" required></div>
                    <div class="field"><label for="new-password">New password</label><input id="new-password" name="newPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" required><small>Use 8-72 characters.</small></div>
                    <div class="field"><label for="password-confirmation">Confirm new password</label><input id="password-confirmation" name="confirmation" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div>
                    <div class="auth-error" id="password-error"></div>
                    <div class="password-actions"><button class="btn" type="submit" id="change-password-btn">Change password</button></div>
                </form>
            </div>
        </div>
    `;

    try {
        const response = await api("/auth/telegram-profile");
        const profile = response.profile;
        if (profile?.name) document.getElementById("profile-name").textContent = profile.name;
        if (profile?.username) document.getElementById("profile-handle").textContent = profile.username;
        if (profile?.photo) {
            const identity = document.getElementById("profile-identity");
            identity.classList.add("has-telegram-photo");
            identity.style.setProperty("--profile-photo", `url("${profile.photo}")`);
            document.getElementById("profile-avatar").innerHTML = `<img src="${profile.photo}" alt="Telegram profile photo">`;
        }
    } catch {
        // Keep the local account fallback when Telegram profile lookup is unavailable.
    }

    document.getElementById("change-password-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = document.getElementById("change-password-btn");
        const error = document.getElementById("password-error");
        const payload = Object.fromEntries(new FormData(form).entries());
        error.textContent = "";
        button.disabled = true;
        try {
            const result = await api("/auth/password", { method: "POST", body: payload });
            toast(result.message || "Password changed successfully.", "success");
            form.reset();
        } catch (err) {
            error.textContent = err.message;
        } finally {
            button.disabled = false;
        }
    });
})();
