# Onion Dark Panel — Frontend

Folder ini berisi frontend Onion Dark Panel. Folder yang sama dapat disajikan oleh backend lokal/VPS atau dipublish ke Vercel.

## Struktur folder

```text
.
├── css/
├── js/
├── dashboard.html
├── database.html
├── index.html
├── logs.html
├── pricing.html
├── profile.html
├── sessions.html
├── system.html
├── tools.html
├── vercel.json
├── whatsapp.html
├── xmessage.html
└── {css,js}/
```

## Cara deploy ke Vercel

1. Upload folder `frontend/` ini ke GitHub.
2. Buka Vercel.
3. Import repository tersebut.
4. Saat setting project, pilih:
   - Framework: Other

- Root Directory: `frontend`

5. Deploy.

## Konfigurasi backend URL

File yang perlu disesuaikan adalah `vercel.json`.

Buka file ini:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR_BACKEND_DOMAIN/api/$1"
    }
  ]
}
```

Ganti `YOUR_BACKEND_DOMAIN` dengan URL backend yang benar.

Contoh:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "http://45.32.145.20:3000/api/$1"
    }
  ]
}
```

Atau jika backend sudah punya domain publik:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://api.onion-dark-panel.my.id/api/$1"
    }
  ]
}
```

## Catatan penting

- `vercel.json` saat ini memakai rewrite hardcoded.
- Artinya jika backend URL berubah, maka frontend juga perlu update `vercel.json` dan redeploy ke Vercel.
- Jadi untuk setup yang paling sederhana, backend sebaiknya punya URL publik yang stabil.

## Kalau backend nanti ganti URL

Yang perlu dilakukan:

1. Edit `vercel.json`
2. Commit ke GitHub
3. Redeploy project Vercel

## Tips agar lebih praktis

Kalau backend sering berubah domain / tunnel, cara yang lebih praktis adalah:

- pakai env-based configuration di Vercel
- atau gunakan domain publik tetap untuk backend

## Fitur yang sudah siap

Frontend ini sudah menyiapkan semua halaman seperti:

- Dashboard
- WhatsApp
- XMessage
- Sessions
- Logs
- System
- Tools
- Profile
- Database

Semua halaman sudah menggunakan API path `/api/...` yang akan diteruskan lewat rewrite di `vercel.json`.
