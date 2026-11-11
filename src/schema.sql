-- =====================================================================
-- Skema database Kasir & Stok Warung Kampus (Kelompok 7)
-- Mengikuti ERD revisi EP-01 US-01 (disetujui BA, 26 Oktober 2026):
-- 7 entitas: PENGGUNA, BARANG, STOK_MASUK, STOK_KELUAR,
--            JADWAL_BUKA_TUTUP, TRANSAKSI, DETAIL_TRANSAKSI
--
-- Tidak ada kolom baru di luar ERD. Yang ditambahkan hanya ATURAN
-- (constraint) supaya data tidak bisa rusak:
--   - stok_saat_ini tidak boleh negatif (CHECK)
--   - jumlah masuk/keluar/terjual harus > 0 (CHECK)
--   - nama_barang unik, tidak peka huruf besar/kecil (QA skenario 4)
--   - satu tanggal hanya punya satu jadwal (UNIQUE tanggal)
--   - jam_tutup harus setelah jam_buka bila status buka (CHECK)
--
-- Tambahan setelah ERD revisi (desain halaman Kasir, Nov 2026):
--   TRANSAKSI.nama_pelanggan dan TRANSAKSI.catatan (keduanya opsional).
--   Database lama otomatis ditambah kolomnya oleh src/db.js.
--
-- Catatan tipe: SQLite tidak punya tipe date/time/decimal/boolean asli.
--   date     -> TEXT 'YYYY-MM-DD'
--   time     -> TEXT 'HH:MM' (24 jam)
--   datetime -> TEXT 'YYYY-MM-DD HH:MM:SS' (waktu WIB)
--   decimal  -> INTEGER rupiah (rupiah tidak memakai sen)
--   boolean  -> INTEGER 0/1
-- =====================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS PENGGUNA (
  id_pengguna   INTEGER PRIMARY KEY AUTOINCREMENT,
  nama          TEXT    NOT NULL,
  peran         TEXT    NOT NULL CHECK (peran IN ('admin', 'pegawai'))
);

CREATE TABLE IF NOT EXISTS BARANG (
  id_barang     INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_barang   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  satuan        TEXT    NOT NULL,
  harga_jual    INTEGER NOT NULL DEFAULT 0 CHECK (harga_jual >= 0),
  stok_saat_ini INTEGER NOT NULL DEFAULT 0 CHECK (stok_saat_ini >= 0),
  stok_minimum  INTEGER NOT NULL DEFAULT 0 CHECK (stok_minimum >= 0),
  aktif         INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1))
);

CREATE TABLE IF NOT EXISTS STOK_MASUK (
  id_masuk      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_barang     INTEGER NOT NULL REFERENCES BARANG(id_barang),
  id_pengguna   INTEGER NOT NULL REFERENCES PENGGUNA(id_pengguna),
  jumlah        INTEGER NOT NULL CHECK (jumlah > 0),
  tanggal_masuk TEXT    NOT NULL,
  catatan       TEXT
);

CREATE TABLE IF NOT EXISTS TRANSAKSI (
  id_transaksi    INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pengguna     INTEGER NOT NULL REFERENCES PENGGUNA(id_pengguna),
  waktu_transaksi TEXT    NOT NULL,
  metode_bayar    TEXT    NOT NULL CHECK (metode_bayar IN ('qris', 'tunai')),
  total           INTEGER NOT NULL CHECK (total >= 0),
  nama_pelanggan  TEXT,   -- opsional (desain Kasir)
  catatan         TEXT    -- opsional, mis. "tidak pedas"
);

CREATE TABLE IF NOT EXISTS DETAIL_TRANSAKSI (
  id_detail     INTEGER PRIMARY KEY AUTOINCREMENT,
  id_transaksi  INTEGER NOT NULL REFERENCES TRANSAKSI(id_transaksi),
  id_barang     INTEGER NOT NULL REFERENCES BARANG(id_barang),
  jumlah        INTEGER NOT NULL CHECK (jumlah > 0),
  harga_satuan  INTEGER NOT NULL CHECK (harga_satuan >= 0),
  subtotal      INTEGER NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS STOK_KELUAR (
  id_keluar     INTEGER PRIMARY KEY AUTOINCREMENT,
  id_barang     INTEGER NOT NULL REFERENCES BARANG(id_barang),
  id_pengguna   INTEGER NOT NULL REFERENCES PENGGUNA(id_pengguna),
  id_transaksi  INTEGER          REFERENCES TRANSAKSI(id_transaksi), -- boleh kosong (rusak/lainnya)
  jumlah        INTEGER NOT NULL CHECK (jumlah > 0),
  alasan        TEXT    NOT NULL CHECK (alasan IN ('terjual', 'rusak', 'lainnya')),
  waktu_keluar  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS JADWAL_BUKA_TUTUP (
  id_jadwal     INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pengguna   INTEGER NOT NULL REFERENCES PENGGUNA(id_pengguna),
  tanggal       TEXT    NOT NULL UNIQUE,
  jam_buka      TEXT,
  jam_tutup     TEXT,
  buka          INTEGER NOT NULL DEFAULT 1 CHECK (buka IN (0, 1)),
  catatan       TEXT,
  CHECK (
    buka = 0
    OR (jam_buka IS NOT NULL AND jam_tutup IS NOT NULL AND jam_tutup > jam_buka)
  )
);

CREATE INDEX IF NOT EXISTS idx_masuk_barang   ON STOK_MASUK(id_barang);
CREATE INDEX IF NOT EXISTS idx_keluar_barang  ON STOK_KELUAR(id_barang);
CREATE INDEX IF NOT EXISTS idx_keluar_trx     ON STOK_KELUAR(id_transaksi);
CREATE INDEX IF NOT EXISTS idx_detail_trx     ON DETAIL_TRANSAKSI(id_transaksi);
CREATE INDEX IF NOT EXISTS idx_trx_waktu      ON TRANSAKSI(waktu_transaksi);
