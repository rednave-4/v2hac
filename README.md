# PERJUANGAN — Peta Perjuangan
### v2.1 · Road to Merdeka

Cinematic entrance + campaign map + one playable stage (Sumpah Pemuda).

## Cara menjalankan

```bash
cd perjuangan-v2
python3 -m http.server 8080
# buka http://localhost:8080
```

atau `npx serve .`

Tidak ada build step / dependency.

## Struktur folder

```
perjuangan-v2/
├── index.html
├── style.css
├── data.js
├── flag.js
├── modal.js
├── map.js
├── main.js
├── stages/
│   └── sumpah-pemuda/
│       └── stage.js          ← game stage terpisah
└── README.md
```

Stage gameplay disimpan di folder `stages/` agar terpisah dari shell utama.

## Perbaikan v2.1

1. **Mouse & touch**
   - Flag canvas & flag-wrap sekarang `pointer-events: none` sehingga klik/tap selalu sampai ke layar entrance.
   - Advance entrance memakai **pointerup** (mouse + touch + pen) + keyboard, bukan mix click/touchend yang sering saling mengunci.
   - CTA “Masuk ke Peta” juga memakai pointerup.

2. **Stage Sumpah Pemuda**
   - File dipindah ke `stages/sumpah-pemuda/stage.js`.
   - Visual dinaikkan: palet tenang (emas, parchment, merah dalam), label daerah, thread cahaya organik, debu partikel, pusat yang lebih khidmat.
   - Teks completion: “Satu Nusa · Satu Bangsa · Satu Bahasa”.
   - Masih tetap bisa dimainkan hanya dengan ketuk / klik / Enter (aksesibel).

## Hook untuk stage baru

```js
window.startMission(stageId)
window.markMissionComplete(stageId)
```

Daftarkan stage baru:

```js
PJ.Stages["rengasdengklok"] = {
  open({ onComplete }) { /* ... */ onComplete(); }
};
```

## Dev

- `Ctrl+Shift+D` → toggle dev mode (tombol “Tandai selesai” di panel).
- `PERJUANGAN` progress key: `perjuangan_v2_progress`.
