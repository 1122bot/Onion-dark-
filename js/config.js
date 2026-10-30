/* ============================================================
   ONION DARK — API BASE AUTO-DETECT
   ------------------------------------------------------------
   Tujuan: frontend ini bisa dipasang di mana saja (panel/VPS,
   Vercel, Netlify, hosting statis apa pun) TANPA mengubah kode.

   Urutan pencarian backend:
     1. localStorage  "onion_api_base"  (di-set lewat layar Setup)
     2. <meta name="onion-api-base">    (opsional, di HTML)
     3. Same-origin   ""                (frontend disajikan backend)
     4. Daftar kandidat di CANDIDATES   (bisa diisi manual)

   Kalau semua gagal, muncul layar "Set backend URL" supaya user
   tinggal tempel URL panel dan langsung tersimpan.
   ============================================================ */
(function () {
    "use strict";

    var STORAGE_KEY = "onion_api_base";

    // Kandidat tambahan (opsional). Kosongkan kalau tidak dipakai.
    var CANDIDATES = [];

    function normalize(base) {
        if (!base) return "";
        base = String(base).trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(base)) base = "https://" + base;
        return base.replace(/\/api$/i, "");
    }

    function fromMeta() {
        var m = document.querySelector('meta[name="onion-api-base"]');
        return m ? normalize(m.getAttribute("content")) : "";
    }

    function fromStorage() {
        try { return normalize(localStorage.getItem(STORAGE_KEY) || ""); } catch (e) { return ""; }
    }

    // Probe harus benar-benar memastikan backend Onion Dark hidup.
    // Status 200 saja tidak cukup: proxy/rewrite yang salah bisa balas HTML
    // "Cannot GET /api/health" atau halaman error. Jadi cek JSON + service id.
    function probe(base, timeout) {
        return new Promise(function (resolve) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, timeout || 4000);
            fetch(base + "/api/health", {
                signal: ctrl.signal,
                credentials: "include",
                cache: "no-store",
                headers: { Accept: "application/json" }
            })
                .then(function (r) {
                    if (!r.ok) { clearTimeout(timer); return resolve(false); }
                    var ct = (r.headers.get("content-type") || "").toLowerCase();
                    if (ct.indexOf("json") === -1) { clearTimeout(timer); return resolve(false); }
                    return r.json().then(function (d) {
                        clearTimeout(timer);
                        resolve(!!(d && d.success && d.service === "onion-dark-panel"));
                    }).catch(function () { clearTimeout(timer); resolve(false); });
                })
                .catch(function () { clearTimeout(timer); resolve(false); });
        });
    }

    var api = {
        base: "",
        ready: false,
        set: function (url) {
            var b = normalize(url);
            try { localStorage.setItem(STORAGE_KEY, b); } catch (e) {}
            api.base = b;
            api.ready = true;
            return b;
        },
        clear: function () {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
            api.base = "";
            api.ready = false;
        },
        url: function (path) {
            return (api.base || "") + "/api" + path;
        }
    };

    window.OnionAPI = api;

    api.detect = function () {
        var stored = fromStorage();
        var meta = fromMeta();

        var chain = [];
        if (stored) chain.push(stored);
        if (meta && meta !== stored) chain.push(meta);
        chain.push("");
        CANDIDATES.forEach(function (c) {
            c = normalize(c);
            if (chain.indexOf(c) === -1) chain.push(c);
        });

        var i = 0;
        function next() {
            if (i >= chain.length) return Promise.resolve(false);
            var base = chain[i++];
            return probe(base).then(function (ok) {
                if (ok) {
                    api.base = base;
                    api.ready = true;
                    if (base) { try { localStorage.setItem(STORAGE_KEY, base); } catch (e) {} }
                    return true;
                }
                return next();
            });
        }
        return next();
    };

    api.showSetup = function (onDone) {
        if (document.getElementById("onion-setup")) return;

        var wrap = document.createElement("div");
        wrap.id = "onion-setup";
        wrap.setAttribute("style", [
            "position:fixed", "inset:0", "z-index:99999",
            "background:rgba(4,10,6,.96)", "backdrop-filter:blur(6px)",
            "display:flex", "align-items:center", "justify-content:center",
            "padding:20px", "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"
        ].join(";"));

        wrap.innerHTML = ''
            + '<div style="width:100%;max-width:430px;background:#0b1410;border:1px solid #1f3a2a;'
            + 'border-radius:18px;padding:26px;color:#e8f5ec;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
            + '  <div style="font-size:12px;letter-spacing:.18em;color:#7ee787;font-weight:700">ONION DARK</div>'
            + '  <h2 style="margin:10px 0 6px;font-size:20px">Hubungkan ke backend</h2>'
            + '  <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#9db8a8">'
            + '    Panel ini belum menemukan server API. Tempel URL panel/backend kamu '
            + '    (contoh: <code style="color:#7ee787">http://1.2.3.4:4106</code>). '
            + '    Cukup sekali, akan tersimpan otomatis.</p>'
            + '  <input id="onion-setup-input" type="text" placeholder="http://ip-panel:4106" '
            + '    style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:11px;'
            + '    border:1px solid #24422f;background:#08100c;color:#e8f5ec;font-size:14px;outline:none">'
            + '  <div id="onion-setup-msg" style="min-height:18px;margin:9px 0 0;font-size:12px;color:#ff8f8f"></div>'
            + '  <button id="onion-setup-btn" style="width:100%;margin-top:8px;padding:13px;border:0;'
            + '    border-radius:11px;background:#7ee787;color:#04140a;font-weight:800;font-size:14px;cursor:pointer">'
            + '    Simpan &amp; sambungkan</button>'
            + '  <button id="onion-setup-reset" style="width:100%;margin-top:8px;padding:10px;border:0;'
            + '    background:transparent;color:#6f8f7d;font-size:12px;cursor:pointer">Reset pengaturan</button>'
            + '</div>';

        document.body.appendChild(wrap);

        var input = wrap.querySelector("#onion-setup-input");
        var msg = wrap.querySelector("#onion-setup-msg");
        var btn = wrap.querySelector("#onion-setup-btn");

        input.focus();
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });

        btn.addEventListener("click", function () {
            var val = input.value;
            if (!val || !val.trim()) { msg.textContent = "URL tidak boleh kosong."; return; }
            btn.disabled = true;
            btn.textContent = "Menghubungkan...";
            msg.textContent = "";
            var base = normalize(val);
            probe(base, 7000).then(function (ok) {
                if (!ok) {
                    btn.disabled = false;
                    btn.textContent = "Simpan & sambungkan";
                    msg.textContent = "Tidak bisa terhubung. Pastikan panel hidup dan port terbuka.";
                    return;
                }
                api.set(base);
                wrap.remove();
                if (typeof onDone === "function") onDone(base);
                else location.reload();
            });
        });

        wrap.querySelector("#onion-setup-reset").addEventListener("click", function () {
            api.clear();
            msg.style.color = "#9db8a8";
            msg.textContent = "Pengaturan direset. Muat ulang halaman.";
        });
    };
})();
