(async function () {
    const user = await guardAuth();
    if (!user) return;

    const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const content = renderShell(user, "/dashboard.html");
    setPageTitle("Dashboard");
    content.innerHTML = `
        <div class="skeleton" style="height:170px;margin-bottom:22px"></div>
        ${skeletonGrid(3)}
    `;

    try {
        const data = await api("/dashboard");
        setPageTitle(data.branding.webTitle || "Dashboard");

        const banners = data.branding.banners || [];
        const hasImage = banners.length > 0;
        const bannerImages = hasImage
            ? banners.map((b, i) => `<img src="${b}" class="bg-slide ${i === 0 ? "active" : ""}">`).join("")
            : "";

        const dashboardNavItems = NAV_ITEMS.filter((item) => item.href !== "/dashboard.html" && (!item.roles || item.roles.includes(user.role)));
        const navBoxesHtml = dashboardNavItems.map((item, index) => `
            <a class="nav-box ${index >= 4 ? "nav-box-extra" : ""}" href="${item.href}">
                <span class="icon">${icon(item.icon)}</span>
                <span>
                    <div class="label">${item.label}</div>
                    <div class="sub">${item.sub}</div>
                </span>
                <span class="chevron">${icon("chevron")}</span>
            </a>
        `).join("");
        const navToggleHtml = dashboardNavItems.length > 4 ? `<button class="dashboard-nav-toggle" id="dashboard-nav-toggle" type="button" aria-expanded="false">Show more</button>` : "";

        const s = data.systemStatus;
        const stats = data.stats || {};
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        const statusItem = (name, ok) => `
            <div class="status-item">
                <div class="status-row">
                    <span class="status-dot ${ok ? "online" : "offline"}"></span>
                    <span class="status-name">${name}</span>
                </div>
                <div class="status-text">${ok ? "Operational" : "Down"}</div>
            </div>
        `;

        const notificationMarkup = notifications.length ? `
            <div class="card dashboard-notifications" style="margin-bottom:14px">
                <div class="panel-head-row">
                    <h3>Notifications</h3>
                    <span class="notification-count">${notifications.filter((n) => !n.read).length}</span>
                </div>
                <div class="notification-list">
                    ${notifications.map((n) => `
                        <div class="notification-item ${n.read ? "is-read" : "is-unread"} ${n.type || "info"}">
                            <span class="notification-bullet" aria-hidden="true"></span>
                            <div class="notification-body">
                                <strong>${escapeHtml(n.title || "Notification")}</strong>
                                <small>${escapeHtml(n.message || "")}</small>
                                <time>${new Date(n.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        ` : `
            <div class="card dashboard-notifications" style="margin-bottom:14px">
                <div class="panel-head-row">
                    <h3>Notifications</h3>
                    <span class="notification-count">0</span>
                </div>
                ${emptyState("No notifications yet", "bell")}
            </div>
        `;

        content.innerHTML = `
            <div class="account-banner glass ${hasImage ? "has-image" : ""}" id="account-banner">
                ${bannerImages}
                ${hasImage ? `<div class="scrim"></div>` : ""}
                <span class="banner-live"><i></i> Online</span>
                <div class="banner-content">
                    <div class="banner-heading"><div><div class="banner-brand brand-wordmark brand-wordmark-banner">${data.branding.webName || "ONION DARK"}</div><div class="banner-subtitle">${data.branding.webSubtitle || "Secure WhatsApp Management Panel"}</div></div></div>
                    <div class="banner-welcome">Welcome back, <strong>${data.account.username}</strong></div>
                    <div class="banner-meta"><span>Role <strong>${data.account.role}</strong></span><span>Expires <strong>${data.account.expiredAt ? new Date(data.account.expiredAt).toLocaleDateString("en-US") : "Lifetime"}</strong></span><span>Senders <strong>${data.senderCount}</strong></span></div>
                </div>
            </div>

            <div class="nav-box-grid bottom-navigation">
                ${navBoxesHtml}
                ${navToggleHtml}
            </div>

            <a class="card dashboard-chat-launch" href="/chat.html">
                <span class="dashboard-chat-icon">${icon("whatsapp")}</span>
                <span class="dashboard-chat-copy"><span class="page-kicker">Private panel chat</span><strong>Talk with your team</strong><small>Open a live room with another panel user.</small></span>
                <span class="dashboard-chat-arrow">${icon("chevron")}</span>
            </a>

            <div class="dashboard-metrics" aria-label="Account metrics">
                <div class="metric-item"><span class="metric-dot online"></span><div><span class="metric-label">Active Sessions</span><strong>${stats.activeSenderCount ?? 0}</strong><small>of ${data.senderCount} registered</small></div></div>
                <div class="metric-item"><span class="metric-dot blue"></span><div><span class="metric-label">Messages Sent</span><strong>${stats.totalMessages ?? 0}</strong><small>successful activity</small></div></div>
                <div class="metric-item"><span class="metric-dot warning"></span><div><span class="metric-label">Logged Issues</span><strong>${stats.errorCount ?? 0}</strong><small>recent account activity</small></div></div>
            </div>

            ${notificationMarkup}

            <div class="card" style="margin-bottom:14px">
                <h3>System Status</h3>
                <div class="status-strip">
                    ${statusItem("Website", s.web)}
                    ${statusItem("API", s.api)}
                    ${statusItem("Telegram", s.telegram)}
                    ${statusItem("WhatsApp", s.whatsapp)}
                </div>
            </div>

            <div class="card">
                <h3>Recent Activity</h3>
                ${data.recentActivity.length ? `
                    <div class="activity-log" role="log" aria-label="Recent activity">
                        ${data.recentActivity.map((l, index) => {
                            const level = l.type === "error" || l.success === false ? "error" : l.type === "auth" ? "auth" : "event";
                            const detail = l.message || l.target || l.number || l.username || "Event processed";
                            return `
                                <div class="activity-entry ${level} ${index === 0 ? "latest" : ""}">
                                    <span class="activity-marker" aria-hidden="true"></span>
                                    <time class="activity-time">${new Date(l.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                                    <span class="activity-level">${level}</span>
                                    <span class="activity-type">${l.type || "system"}</span>
                                    <span class="activity-action">${l.action || "activity"}</span>
                                    <span class="activity-detail">${detail}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                ` : emptyState("No activity yet.", "logs")}
            </div>
        `;

        if (banners.length > 1) {
            let idx = 0;
            setInterval(() => {
                const imgs = document.querySelectorAll("#account-banner .bg-slide");
                imgs[idx].classList.remove("active");
                idx = (idx + 1) % imgs.length;
                imgs[idx].classList.add("active");
            }, 4000);
        }

        const navToggle = document.getElementById("dashboard-nav-toggle");
        if (navToggle) navToggle.addEventListener("click", () => {
            const expanded = navToggle.getAttribute("aria-expanded") === "true";
            navToggle.setAttribute("aria-expanded", String(!expanded));
            navToggle.textContent = expanded ? "Show more" : "Show less";
            document.querySelectorAll(".nav-box-extra").forEach((item) => item.classList.toggle("is-visible", !expanded));
        });

        let notificationSnapshot = "";
        async function refreshNotificationsOnly() {
            if (document.hidden) return;
            try {
                const fresh = await api("/dashboard");
                const nextItems = Array.isArray(fresh.notifications) ? fresh.notifications : [];
                const root = document.querySelector(".dashboard-notifications");
                if (!root) return;
                const nextSnapshot = JSON.stringify(nextItems);
                if (nextSnapshot === notificationSnapshot) return;
                notificationSnapshot = nextSnapshot;
                const count = nextItems.filter((n) => !n.read).length;
                const badge = root.querySelector(".notification-count");
                if (badge) badge.textContent = String(count);
                const list = root.querySelector(".notification-list");
                if (list) {
                    list.innerHTML = nextItems.map((n) => `
                        <div class="notification-item ${n.read ? "is-read" : "is-unread"} ${n.type || "info"}">
                            <span class="notification-bullet" aria-hidden="true"></span>
                            <div class="notification-body">
                                <strong>${escapeHtml(n.title || "Notification")}</strong>
                                <small>${escapeHtml(n.message || "")}</small>
                                <time>${new Date(n.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                            </div>
                        </div>
                    `).join("") || `${emptyState("No notifications yet", "bell")}`;
                }
            } catch {
                // silent polling failure; no user-facing interruption
            }
        }

        setInterval(refreshNotificationsOnly, 5000);
    } catch (err) {
        content.innerHTML = errorState(err.message);
        toast(err.message, "error");
    }
})();
