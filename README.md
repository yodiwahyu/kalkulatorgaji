# Simulasi Gaji & Lembur (UMK Jepara)

Website statis (HTML/CSS/JS, tanpa build) untuk menghitung:

- **Gaji**: gaji pokok bisa diketik sendiri. Kalau dikosongkan, otomatis memakai UMK Jepara sesuai tahun berjalan.
- **Lembur**: pilihan 0,5 / 1 / 1,5 / 2 / 2,5 / 3 jam (atau jam manual), untuk hari kerja, hari libur, dan hari pendek. Pengali bisa diubah.
- **BPJS karyawan**: Kesehatan 1% (batas upah Rp12 juta), JHT 2%, JP 1% (ada batas upah). Masing-masing bisa dimatikan.
- **Potongan**: alpa, izin tanpa upah, terlambat, IPC (izin pulang cepat), dan potongan lain (kasbon dll.).
- Cetak/PDF dan salin ringkasan. Isian tersimpan di browser (localStorage).

## Cara pasang di GitHub Pages

1. Buat repository baru di GitHub, lalu upload semua file di folder ini (termasuk folder `.github`).
2. Buka **Settings → Pages**.
3. Pada *Build and deployment*, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit. Alamat web: `https://<username>.github.io/<nama-repo>/`.

## UMK otomatis tiap tahun

Website membaca `umk.json` dan memakai UMK **sesuai tahun berjalan**. Cukup tambah satu baris saat UMK baru ditetapkan (biasanya Desember), tanpa mengubah kode:

```json
"umk": {
  "2026": 2756501,
  "2027": 0000000
}
```

Sebelum baris tahun baru ditambahkan, website memakai UMK tahun terakhir yang ada dan menampilkan catatan.
Workflow `.github/workflows/umk-reminder.yml` otomatis membuat Issue pengingat setiap 1 Desember dan 5 Januari agar `umk.json` diperbarui.

Batas upah BPJS (`kesehatanBatasUpah`, `jpBatasUpah`) juga ada di `umk.json`. Batas JP biasanya naik tiap Maret.

## Rumus

| Komponen | Rumus |
|---|---|
| Upah per jam | (gaji pokok + tunjangan tetap) ÷ 173 |
| Lembur hari kerja | jam ke-1 × 1,5 ; jam ke-2 dst × 2 |
| Lembur hari libur | jam 1–8 × 2 ; jam ke-9 × 3 ; jam ke-10 dst × 4 |
| Lembur hari pendek (6 hari kerja) | jam 1–5 × 2 ; jam ke-6 × 3 ; jam ke-7 dst × 4 |
| Potongan alpa / izin tanpa upah | (gaji pokok + tunjangan tetap) ÷ hari kerja sebulan × jumlah hari |
| Terlambat / IPC | per menit atau per jam × upah per jam, atau nominal tetap per kali |
| BPJS Kesehatan | 1% × upah (maks. batas upah) |
| BPJS JHT | 2% × upah |
| BPJS JP | 1% × upah (maks. batas upah JP) |

Pengali lembur mengikuti Kepmenaker 102/MEN/VI/2004. Setiap perusahaan bisa berbeda, jadi semua dasar hitung, pembagi, dan pengali bisa diubah di **Pengaturan lanjutan**.

## Tes

```
node test.js
```

## Catatan

Ini alat simulasi, bukan slip gaji resmi. PPh 21 tidak dihitung. Cocokkan angka dengan kebijakan HRD perusahaan dan SK UMK Gubernur Jawa Tengah.
