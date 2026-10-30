(async function () {
    const user = await guardAuth();
    if (!user) return;

    const content = renderShell(user, "/chat.html");
    setPageTitle("Live Chat");

    let contacts = [];
    let selectedId = "";
    let pollTimer = null;
    let currentMessages = [];
    let currentContact = null;
    let lastContactSnapshot = "";

    const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    function initials(name) {
        return String(name || "?").slice(0, 2).toUpperCase();
    }

    function renderShellContent() {
        content.innerHTML = `
            <div class="page-intro chat-intro"><div><span class="page-kicker">Private conversations</span><h2>Live Chat</h2><p>Connect with another panel user in a focused room.</p></div><span class="chat-live-pill"><i></i> Live backend</span></div>
            <div class="chat-layout">
                <aside class="card chat-contacts"><div class="chat-panel-heading"><div><span class="page-kicker">People</span><h3>Panel users</h3></div><span class="chat-contact-count" id="chat-contact-count">0</span></div><div class="chat-contact-list" id="chat-contact-list"><div class="chat-empty">Loading users...</div></div></aside>
                <section class="card chat-room" id="chat-room"><div class="chat-empty chat-room-empty"><span class="dashboard-chat-icon">${icon("whatsapp")}</span><strong>Select a person to start chatting</strong><small>Your chat will be stored in the panel data folder.</small></div></section>
            </div>
        `;
    }

    function renderContacts() {
        const list = document.getElementById("chat-contact-list");
        if (!list) return;
        document.getElementById("chat-contact-count").textContent = String(contacts.length);
        list.innerHTML = contacts.length ? contacts.map((contact) => {
            const unreadCount = Number(contact.unreadCount || 0);
            const isUnread = unreadCount > 0;
            return `
                <button class="chat-contact ${contact.id === selectedId ? "active" : ""} ${isUnread ? "is-unread" : ""}" type="button" data-chat-user="${escapeHtml(contact.id)}" title="${isUnread ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : `Open chat with ${escapeHtml(contact.username)}`}">
                    <span class="chat-avatar">${initials(contact.username)}</span>
                    <span class="chat-contact-copy"><strong>${escapeHtml(contact.username)}</strong><small>${escapeHtml(contact.role)} · ${escapeHtml(contact.status)}</small></span>
                    ${isUnread ? `<span class="chat-unread-badge">${unreadCount > 9 ? "9+" : unreadCount}</span>` : ""}
                    <span class="chat-contact-chevron">${icon("chevron")}</span>
                </button>
            `;
        }).join("") : `<div class="chat-empty">No active panel users yet.</div>`;
        list.querySelectorAll("[data-chat-user]").forEach((button) => button.addEventListener("click", () => openRoom(button.dataset.chatUser)));
    }

    function getMessageStatus(message) {
        if (!message || message.senderId !== user.id) return "";
        if (String(message.id).startsWith("temp-")) return "pending";
        if (message.status === "read") return "read";
        if (message.status === "sent") return "sent";
        return "sent";
    }

    function renderStatusIcon(status) {
        if (status === "pending") {
            return '<span class="chat-status pending" title="Sending">⏱</span>';
        }
        if (status === "read") {
            return '<span class="chat-status read" title="Delivered & read">✓✓</span>';
        }
        if (status === "sent") {
            return '<span class="chat-status sent" title="Sent">✓</span>';
        }
        return '';
    }

    function renderRoom(contact, messages) {
        const room = document.getElementById("chat-room");
        if (!room) return;
        currentContact = contact || currentContact;
        currentMessages = Array.isArray(messages) ? messages : [];
        const list = currentMessages;
        room.innerHTML = `
            <header class="chat-room-header"><span class="chat-avatar large">${initials(currentContact.username)}</span><span class="chat-room-identity"><strong>${escapeHtml(currentContact.username)}</strong><small><span class="chat-online-dot"></span>${escapeHtml(currentContact.role)} · active</small></span><span class="chat-room-profile"><span>${escapeHtml(currentContact.role)}</span></span></header>
            <div class="chat-message-list" id="chat-message-list">${list.length ? list.map((message) => {
                const status = getMessageStatus(message);
                return `
                <div class="chat-message-row ${message.senderId === user.id ? "mine" : "theirs"}" data-message-id="${escapeHtml(String(message.id))}">
                    <div class="chat-bubble">
                        <span>${escapeHtml(message.text)}</span>
                        <div class="chat-meta">
                            <time>${new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                            ${message.senderId === user.id ? renderStatusIcon(status) : ""}
                        </div>
                    </div>
                </div>
            `; }).join("") : `<div class="chat-empty room-no-messages"><strong>Start the conversation</strong><small>Send a message to ${escapeHtml(currentContact.username)}.</small></div>`}</div>
            <form class="chat-composer" id="chat-composer"><input id="chat-message-input" maxlength="1000" autocomplete="off" placeholder="Message ${escapeHtml(currentContact.username)}..."><button type="submit" aria-label="Send message">${icon("channel")}</button></form>
        `;
        const messageListNode = document.getElementById("chat-message-list");
        if (messageListNode) messageListNode.scrollTop = messageListNode.scrollHeight;
        const composer = document.getElementById("chat-composer");
        composer.addEventListener("submit", sendMessage);
        const input = document.getElementById("chat-message-input");
        if (input) input.focus();
    }

    async function markActiveRoomRead() {
        if (!selectedId) return;
        try {
            await api(`/chat/users/${encodeURIComponent(selectedId)}/read`, { method: "POST" });
            const target = contacts.find((person) => person.id === selectedId);
            if (target) target.unreadCount = 0;
            renderContacts();
        } catch {
            // silent fail; room still works without forcing a read-sync state
        }
    }

    async function openRoom(id) {
        selectedId = id;
        renderContacts();
        try {
            const data = await api(`/chat/users/${encodeURIComponent(id)}/messages`);
            const contact = data.user || contacts.find((person) => person.id === id) || { username: "User", role: "Member" };
            currentContact = contact;
            currentMessages = Array.isArray(data.messages) ? data.messages : [];
            renderRoom(contact, currentMessages);
            await markActiveRoomRead();
        } catch (error) {
            const contact = contacts.find((person) => person.id === id) || { username: "User", role: "Member" };
            currentContact = contact;
            currentMessages = [];
            document.getElementById("chat-room").innerHTML = `<div class="chat-empty">${escapeHtml(error.message)}</div>`;
            renderRoom(contact, []);
        }
    }

    async function loadMessages() {
        if (!selectedId) return;
        try {
            const data = await api(`/chat/users/${encodeURIComponent(selectedId)}/messages`);
            const contact = data.user || contacts.find((person) => person.id === selectedId) || { username: "User", role: "Member" };
            const nextMessages = Array.isArray(data.messages) ? data.messages : [];
            const roomNode = document.getElementById("chat-room");
            const roomOpen = !!roomNode && roomNode.querySelector("#chat-message-list");
            if (roomOpen && JSON.stringify(currentMessages) === JSON.stringify(nextMessages)) {
                await markActiveRoomRead();
                return;
            }
            currentContact = contact;
            currentMessages = nextMessages;
            renderRoom(contact, currentMessages);
            await markActiveRoomRead();
        } catch (error) {
            const room = document.getElementById("chat-room");
            if (room) room.innerHTML = `<div class="chat-empty">${escapeHtml(error.message)}</div>`;
        }
    }

    async function sendMessage(event) {
        event.preventDefault();
        if (!selectedId) return;

        const input = document.getElementById("chat-message-input");
        const button = event.currentTarget.querySelector("button");
        const text = input.value.trim();
        if (!text) return;

        const contact = currentContact || contacts.find((person) => person.id === selectedId) || { username: "User", role: "Member" };
        const tempMessage = {
            id: `temp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            senderId: user.id,
            recipientId: selectedId,
            text,
            createdAt: new Date().toISOString(),
            status: "pending",
        };

        const nextMessages = [...(currentMessages || []), tempMessage];
        currentMessages = nextMessages;
        renderRoom(contact, nextMessages);

        input.disabled = true;
        button.disabled = true;

        try {
            const response = await api(`/chat/users/${encodeURIComponent(selectedId)}/messages`, {
                method: "POST",
                body: { text, silent: true },
            });
            const saved = response?.message || { ...tempMessage, status: "sent" };
            const finalMessages = [...(currentMessages || []).filter((item) => item.id !== tempMessage.id), { ...saved, status: "sent" }];
            currentMessages = finalMessages;
            renderRoom(contact, finalMessages);
            setTimeout(() => {
                const readMessages = currentMessages.map((item) => item.senderId === user.id && item.status === "sent" ? { ...item, status: "read" } : item);
                currentMessages = readMessages;
                renderRoom(contact, readMessages);
            }, 900);
        } catch (error) {
            toast(error.message, "error");
        } finally {
            input.disabled = false;
            button.disabled = false;
            if (document.getElementById("chat-message-input")) document.getElementById("chat-message-input").focus();
        }
    }

    async function refreshContactList() {
        try {
            const data = await api("/chat/users");
            const nextContacts = Array.isArray(data.users) ? data.users.filter((person) => person.id !== user.id) : [];
            const before = lastContactSnapshot;
            contacts = nextContacts;
            lastContactSnapshot = JSON.stringify(nextContacts);
            const unreadContact = nextContacts.find((contact) => Number(contact.unreadCount || 0) > 0 && contact.id !== selectedId);
            if (unreadContact && !selectedId) {
                openRoom(unreadContact.id);
                return;
            }
            if (before !== lastContactSnapshot) {
                renderContacts();
            }
            if (unreadContact && selectedId) {
                const currentRoomIsUnread = selectedId === unreadContact.id;
                if (!currentRoomIsUnread) {
                    const roomNode = document.getElementById("chat-room");
                    if (roomNode) roomNode.classList.add("chat-room-flash");
                    setTimeout(() => roomNode?.classList.remove("chat-room-flash"), 600);
                }
            }
        } catch {
            // silent refresh failures to avoid flicker noise
        }
    }

    function startPolling() {
        clearTimeout(pollTimer);
        pollTimer = setTimeout(async () => {
            const typingNow = document.activeElement && document.activeElement.id === "chat-message-input";
            if (typingNow) {
                startPolling();
                return;
            }
            await refreshContactList();
            if (selectedId) await loadMessages();
            startPolling();
        }, 3000);
    }

    renderShellContent();

    try {
        const data = await api("/chat/users");
        contacts = Array.isArray(data.users) ? data.users.filter((person) => person.id !== user.id) : [];
        lastContactSnapshot = JSON.stringify(contacts);
        renderContacts();
        if (contacts.length) {
            const firstUnread = contacts.find((contact) => Number(contact.unreadCount || 0) > 0);
            const initialTarget = firstUnread || contacts[0];
            await openRoom(initialTarget.id);
            startPolling();
        }
    } catch (error) {
        document.getElementById("chat-contact-list").innerHTML = `<div class="chat-empty">${escapeHtml(error.message)}</div>`;
    }
})();