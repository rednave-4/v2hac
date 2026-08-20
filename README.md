# PERJUANGAN — Peta Perjuangan
### v2.2 · Mode Belajar + Mode Game + ID/EN

Semua file **satu level** (flat).

## Cara menjalankan

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## File

```
index.html
style.css
i18n.js
data.js
flag.js
modal.js
map.js
learn.js
main.js
stage-sumpah-pemuda.js
README.md
```

## Alur

1. Entrance 1 — bendera
2. Entrance 2 — credits + **switch bahasa** (pojok kanan atas)
3. **Pilih Mode** — Belajar | Game
4. Mode Belajar — artikel lengkap 5 bab, progress tersimpan
5. Mode Game — peta + stage Sumpah Pemuda

## Bahasa

- Indonesia / English
- Default: bahasa browser
- Tersimpan di localStorage
- Switcher di Entrance 2, Mode Select, header Belajar & Game

## Upload ke GitHub

Hapus file lama, upload **semua file di atas** ke root repo (jangan buat subfolder).
