# Sebenarnya PM minta apa? (versi bahasa sederhana)

Proyeknya: aplikasi di HP untuk **Bu Mimin** (pemilik warung kampus) supaya tidak pakai buku lagi. Sprint 2 minggu lalu belum dikerjakan, jadi sekarang dikejar dalam 3 task.

## Task 1 (hari ini) — "Buku stok" digital
Bayangkan buku catatan barang di warung.
- **Stok masuk** = barang datang (beli 24 botol teh) → angka stok naik.
- **Stok keluar** = barang berkurang di luar kasir (rusak, dll) → angka stok turun. **Tidak boleh minus**: kalau sisa 4 lalu diketik keluar 10, aplikasi menolak.
- **Daftar sisa stok** = Bu Mimin bisa lihat sisa semua barang dalam beberapa detik, yang habis/menipis diberi warna.
- "Setup proyek & database" = bikin aplikasinya dan tabel-tabelnya sesuai ERD yang sudah kamu revisi.
- "Uji mandiri" = kamu sendiri coba semuanya dulu dan catat hasilnya sebelum QA mengetes.

## Task 2 (besok) — Jam buka tutup
Jam buka warung Bu Mimin tidak tetap ("kadang"). Jadi dia perlu bisa mengatur sendiri: tanggal 28 buka jam 08.00–14.30, tanggal 1 libur, dst. Aplikasi harus **menolak jam yang tidak masuk akal**, misalnya buka 17.00 tapi tutup 09.00.

## Task 3 (besok) — Kasir
Pembeli datang → Bu Mimin ketuk menu yang dibeli → pilih bayar QRIS atau tunai → simpan. Setelah disimpan:
- tercatat sebagai penjualan (log),
- stok barang otomatis berkurang (tidak perlu dicatat dua kali),
- seluruh proses harus bisa selesai **kurang dari 30 detik** (karena antrean).

## Pesan PM soal komunikasi
Intinya: kalau Task 1 belum selesai hari ini, dahulukan Task 1 dan **kabari di grup**. Kalau merasa tidak sanggup, **bilang dari awal** supaya pembagian kerja bisa diatur ulang. Jangan menghilang.

## Revisi Sprint 1-mu
ERD revisi yang kamu kirim **sudah benar dan sudah sesuai** dokumen task (7 tabel: tambahan harga_jual, TRANSAKSI, DETAIL_TRANSAKSI, id_transaksi di STOK_KELUAR, dan sudah ada bukti persetujuan BA). Prototype ini dibangun persis dari ERD itu, tidak ada kolom tambahan.
