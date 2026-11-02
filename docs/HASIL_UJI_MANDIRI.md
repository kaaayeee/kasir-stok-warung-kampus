# Hasil Uji Mandiri Dev — Sprint 2 (US-02, US-03, US-05)

Tanggal uji: Selasa, 27 Oktober 2026 · Lingkungan: development (Node.js 22, SQLite) · Layar uji: 390 × 844 (ukuran HP)

Ringkasan: **39/39 uji otomatis server lolos** (`npm test`) dan **30/30 pengecekan tampilan HP lolos**. Tidak ada bug fatal. Tidak ada error JavaScript di console. Screenshot ada di `docs/screenshots/`.

---

## Task 1 — EP-01 US-02: Modul stok masuk & stok keluar

**Kriteria hasil PM:** stok bisa dicatat masuk dan keluar, stok tidak bisa negatif, sisa stok tampil dengan benar, fitur sudah diuji.

| Subtask | Status |
|---|---|
| 1. Setup proyek dan koneksi database | ✅ 7 tabel sesuai ERD revisi, FK aktif, konfigurasi di `.env`, data awal Bu Mimin/Bu Sri + barang, uji tulis-baca-hapus lolos |
| 2. Form stok masuk | ✅ |
| 3. Form stok keluar + validasi tidak negatif | ✅ |
| 4. Tampilan daftar sisa stok | ✅ |
| 5. Uji mandiri | ✅ (dokumen ini) |

| Acceptance criteria | Hasil |
|---|---|
| Admin bisa mencatat stok masuk dan terjual | ✅ Lolos |
| Data tersimpan dan tetap ada setelah halaman dimuat ulang | ✅ Lolos (Teh Botol 12 tetap setelah reload) |
| Sisa stok terlihat langsung setelah pencatatan | ✅ Lolos (“Sisa stok sekarang 12 botol”) |
| Stok keluar melebihi sisa ditolak, stok tidak pernah negatif | ✅ Lolos (“Stok tidak cukup. Sisa stok: 4 porsi.”, dicek form + server + database) |
| Barang habis & menipis terlihat berbeda | ✅ Lolos (merah/kuning + label) |
| Pencarian nama barang | ✅ Lolos |
| Nyaman di HP, tanpa geser ke samping | ✅ Lolos |

## Task 2 — EP-01 US-03: Jadwal buka tutup

**Kriteria hasil PM:** admin bisa mengatur dan menyimpan jadwal per hari, melihat jadwal yang tersimpan, dan sistem menolak jam yang tidak valid.

| Acceptance criteria | Hasil |
|---|---|
| Jam buka/tutup bisa diubah per hari tanpa bantuan tim | ✅ Lolos |
| Jadwal yang sudah ada diubah, bukan digandakan | ✅ Lolos (database juga menolak tanggal ganda) |
| Pilihan libur berfungsi (jam dinonaktifkan) | ✅ Lolos |
| Perubahan tampil lagi setelah halaman dibuka ulang | ✅ Lolos |
| Jam 17.00 – 09.00 ditolak | ✅ Lolos (“Jam tutup harus setelah jam buka.”) |
| Jam tutup = jam buka ditolak | ✅ Lolos |
| Pengecekan juga berlaku di server | ✅ Lolos |
| Pegawai tidak bisa mengubah jadwal (hanya admin) | ✅ Lolos |

## Task 3 — EP-02 US-05: Pesanan & pembayaran

**Kriteria hasil PM:** pesanan bisa dicatat, total dihitung, metode bayar bisa dipilih, transaksi tersimpan, stok berkurang otomatis, transaksi selesai < 30 detik.

| Acceptance criteria | Hasil |
|---|---|
| Beberapa item dalam satu pesanan bisa ditambah, diubah, dihapus | ✅ Lolos |
| Total pesanan benar dan tampil langsung | ✅ Lolos |
| QRIS atau tunai wajib dipilih | ✅ Lolos (“Pilih metode bayar dulu”) |
| Ringkasan tampil sebelum disimpan | ✅ Lolos |
| Kembalian tunai benar | ✅ Lolos (Rp 32.000, bayar 50rb → Rp 18.000) |
| Stok berkurang otomatis | ✅ Lolos (Nasi Goreng 20 → 17) |
| Transaksi tercatat lengkap (item, jumlah, harga, metode, waktu, pencatat) | ✅ Lolos |
| Transaksi gagal tidak mengubah stok maupun log (rollback) | ✅ Lolos |
| Barang habis / jumlah melebihi stok ditolak | ✅ Lolos |
| Log penjualan tetap ada setelah muat ulang | ✅ Lolos |

**Pengukuran waktu (dari membuka Pesanan baru sampai tersimpan):**

| # | Isi | Metode | Waktu |
|---|---|---|---|
| 1 | 1 item | QRIS | 4,9 detik |
| 2 | 2 jenis item (4 porsi) + hitung kembalian | Tunai | 10,2 detik |
| 3 | 3 jenis item (5 porsi) | QRIS | 9,9 detik |

Ketiganya < 30 detik. Catatan jujur: pengukuran ini disimulasikan dengan jeda ±1,2 detik per ketukan. **Pengukuran dengan stopwatch oleh orang sungguhan (dan sesi Bu Mimin, M2) tetap perlu dilakukan.** Aplikasi sudah mencatat waktunya otomatis di menu Lainnya › Catatan waktu transaksi.

## Skenario QA (sheet Bugs)

| Skenario | Hasil |
|---|---|
| 1. Stok keluar lebih besar dari stok tersedia | ✅ Ditolak, stok tidak berubah |
| 2. Sisa stok setelah stok masuk dicatat | ✅ Langsung bertambah, tetap ada setelah refresh |
| 3. Input kosong, 0, atau desimal (2,5) | ✅ Ditolak dengan pesan jelas, data tidak rusak |
| 4. Dua barang bernama sama | ✅ Ditolak (“Barang bernama "Es Jeruk" sudah ada”), di kasir barang sama digabung |
| 5. Jam tutup lebih awal dari jam buka | ✅ Ditolak dengan pesan kesalahan |

Bug tercatat: **tidak ada**.

## Perlu konfirmasi (bukan bug)

- Daftar barang asli dari Bu Mimin (sekarang masih contoh).
- QRIS cukup dicatat sebagai metode bayar (tanpa integrasi)?
- Apakah warung pernah tutup lewat tengah malam?
