# BOOM - Cloudflare, no Wrangler

Versi ini memakai Cloudflare Worker + Durable Object untuk room WebSocket.
Tidak memakai Render dan tidak membutuhkan Wrangler.

## Isi
- `worker.js` = backend WebSocket + Durable Object
- `public/index.html` = UI mobile-first
- `_routes.json` = route Worker

## Setup lewat dashboard Cloudflare
1. Buat Worker baru di Cloudflare Dashboard.
2. Buka editornya dan upload/paste `worker.js` sebagai Worker entrypoint.
3. Tambahkan Static Assets dari folder `public` dan set asset binding bernama `ASSETS`.
4. Buat Durable Object binding bernama `BOOM_ROOMS`, class name `BoomRoom`, pointing ke class `BoomRoom` di `worker.js`.
5. Buat migration/tag untuk Durable Object class `BoomRoom` pada bagian Migrations di dashboard, lalu deploy.

Nama binding harus PERSIS `BOOM_ROOMS` dan nama class PERSIS `BoomRoom`.

## Catatan foto
Foto dikirim sebagai data URL melalui WebSocket dan dibatasi 1.5 MB di browser. Untuk foto besar/galeri permanen, gunakan R2 pada versi berikutnya.

## Fitur
- Menu terpisah: Buat Room / Masuk Room
- Kode room
- Username
- Realtime chat
- Kirim foto
- Tema tetap bergaya soft/candle
- Wallpaper
- Riwayat pesan sampai 200 item per room di Durable Object
