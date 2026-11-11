# Kasir & Stok Warung Kampus — Kelompok 7

Prototype Sprint 2 (yang tertinggal), dikerjakan urut sesuai arahan PM:

| Task | User story | Isi | Halaman di aplikasi |
|---|---|---|---|
| Task 1 | EP-01 US-02 | Stok masuk, stok keluar (tidak boleh negatif), daftar sisa stok | menu **Stok** |
| Task 2 | EP-01 US-03 | Jadwal buka tutup per hari + validasi jam | menu **Jadwal** |
| Task 3 | EP-02 US-05 | Pesanan, QRIS/tunai, stok berkurang otomatis, log penjualan, < 30 detik | menu **Kasir** + Lainnya › Log penjualan |

Database mengikuti **ERD revisi EP-01 US-01 (disetujui BA 26 Okt 2026)**: 7 tabel. Satu-satunya tambahan: kolom opsional `nama_pelanggan` dan `catatan` di `TRANSAKSI` (dari desain halaman Kasir, Nov 2026 — **perlu dikabarkan ke BA**). Database lama otomatis ditambah kolomnya saat aplikasi dijalankan, data lama tetap aman. Lihat `src/schema.sql`.

## Cara menjalankan

Butuh **Node.js 22 atau lebih baru** (cek: `node -v`; unduh versi LTS dari nodejs.org bila masih versi lama).

```bash
npm install          # sekali saja
cp .env.example .env # Windows: copy .env.example .env
npm start
```

Terminal akan menampilkan dua alamat:

- `Laptop : http://localhost:3000` — buka di browser laptop
- `HP     : http://192.168.x.x:3000` — buka di browser HP (**HP dan laptop harus di Wi-Fi yang sama**)

Saat pertama dijalankan, database (`data/warung.db`) dibuat otomatis dan diisi data awal. Buka aplikasi → masuk dengan akun admin dari `.env` (`ADMIN_EMAIL` / `ADMIN_KATA_SANDI`; contohnya ada di `.env.example`). Setelah masuk pertama kali, muncul onboarding 5 layar (bisa dilewati). Kontak di tombol **Hubungi Tim Pengembang** (Pusat Bantuan) diatur lewat `KONTAK_WA` / `KONTAK_EMAIL` di `.env`.

> Kalau dari HP tidak bisa dibuka: izinkan Node.js di Windows Firewall (jaringan Private), atau pastikan Wi-Fi kampus tidak memblokir antar-perangkat (pakai hotspot HP sebagai alternatif).

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalan + otomatis restart saat kode diubah |
| `npm run db:reset` | Hapus database dan isi ulang data awal |
| `npm test` | Uji mandiri otomatis (46 uji, pakai database sementara, data asli aman) |

## Struktur

```
src/
  schema.sql          tabel sesuai ERD revisi + aturan (CHECK/UNIQUE/FK)
  config.js           baca pengaturan dari .env (bukan di dalam kode)
  db.js               koneksi database
  seed.js             data awal (pengguna, barang CONTOH, jadwal 7 hari)
  app.js              daftar alamat API
  services/
    barang.js         daftar sisa stok, tambah/ubah barang
    stok.js           Task 1: stok masuk & keluar
    jadwal.js         Task 2: jadwal buka tutup
    transaksi.js      Task 3: pesanan & pembayaran
  lib/validasi.js     aturan validasi (dipakai server)
public/               tampilan HP (HTML/CSS/JS biasa, tanpa build)
test/api.test.js      uji mandiri otomatis
docs/                 penjelasan, hasil uji, screenshot
```

## Aturan penting yang sudah dipasang

- **Stok tidak bisa negatif** — dicek 3 lapis: di form, di server, dan di database (`CHECK stok_saat_ini >= 0`).
- **Pencatatan stok & transaksi selalu satu paket** (transaksi database). Kalau satu langkah gagal, semuanya dibatalkan.
- **Pencatat otomatis** dari pengguna yang dipilih, bukan diisi manual.
- **Harga transaksi diambil dari database**, lalu disalin ke `harga_satuan`, supaya naik-turun harga tidak mengubah transaksi lama.
- **Satu tanggal = satu jadwal** (`UNIQUE tanggal`). Menyimpan tanggal yang sudah ada berarti mengubah.
- **Jam tutup harus setelah jam buka** (jam sama juga ditolak), dicek di form, server, dan database.
- **Nama barang tidak boleh kembar** (tidak peka huruf besar/kecil dan spasi).

## Yang masih perlu dikonfirmasi (bukan bug)

1. **Daftar menu** diambil dari desain Kasir (13 menu). Stok awal mengikuti desain, stok minimum masih perkiraan (5). Ubah di `src/seed.js` (`BARANG_AWAL`) lalu `npm run db:reset`, atau lewat Lainnya › Kelola barang. Uji otomatis memakai data ujinya sendiri, jadi tidak terpengaruh.
2. **QRIS hanya dicatat sebagai metode bayar**, tidak ada integrasi pembayaran.
3. **Kembalian tunai** hanya dihitung di layar, tidak disimpan (tidak ada kolomnya di ERD).
4. **Warung tutup lewat tengah malam** belum didukung (aturan jam tutup > jam buka).
5. **Login** hanya untuk admin. Email & kata sandi disimpan di `.env` (ERD belum punya kolomnya). Server masih memercayai header `X-Pengguna-Id` tanpa token sesi, dan "Lupa kata sandi" belum mengirim email. Cukup untuk prototype, perlu diputuskan untuk versi rilis.
6. **Teknologi**: Node.js + Express + SQLite dipilih karena paling ringan dijalankan semua anggota. Kalau tim pakai stack lain, logika & aturan di `src/services/` bisa dipindah apa adanya.
