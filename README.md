# PERJUANGAN — Peta Perjuangan
### v2.1 · Road to Merdeka (flat files)

Semua file **satu level** (tidak ada subfolder).

## Cara menjalankan

```bash
python3 -m http.server 8080
# buka http://localhost:8080
```

atau double-click `index.html`.

## Daftar file (upload semua ke root repo)

```
index.html
style.css
data.js
flag.js
modal.js
map.js
main.js
stage-sumpah-pemuda.js
README.md
```

Tidak ada folder `stages/`. Stage Sumpah Pemuda ada di `stage-sumpah-pemuda.js`.

## Fitur

- Entrance 1: bendera kain + judul → klik / spasi / touch
- Entrance 2: credits + CTA
- Peta 5 misi (Sumpah Pemuda → … → Agresi & Gerilya)
- Stage playable: Sumpah Pemuda (“Satukan Suara”)
- Progress di localStorage
- Hook: `startMission(id)` / `markMissionComplete(id)`
- Dev: Ctrl+Shift+D

## Perbaikan klik / touch

Tombol transparan full-screen `#e1Hit` di atas semua layer dekoratif.
Flag, vignette, teks tidak menangkap event.
