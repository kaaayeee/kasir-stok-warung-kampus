// Koneksi database + pembuatan tabel.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function bukaDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  migrasi(db);
  return db;
}

/**
 * Tambah kolom baru ke database yang dibuat sebelum kolom itu ada
 * (CREATE TABLE IF NOT EXISTS tidak mengubah tabel lama). Data lama aman.
 */
function migrasi(db) {
  const ada = (tabel, kolom) => db.prepare(`PRAGMA table_info(${tabel})`).all().some((r) => r.name === kolom);
  if (!ada('TRANSAKSI', 'nama_pelanggan')) db.exec('ALTER TABLE TRANSAKSI ADD COLUMN nama_pelanggan TEXT');
  if (!ada('TRANSAKSI', 'catatan')) db.exec('ALTER TABLE TRANSAKSI ADD COLUMN catatan TEXT');
  if (!ada('STOK_KELUAR', 'catatan')) db.exec('ALTER TABLE STOK_KELUAR ADD COLUMN catatan TEXT');
  // Transaksi lama (sebelum ada status) dianggap sudah selesai.
  if (!ada('TRANSAKSI', 'status')) {
    db.exec("ALTER TABLE TRANSAKSI ADD COLUMN status TEXT NOT NULL DEFAULT 'selesai' CHECK (status IN ('belum_selesai', 'selesai', 'dibatalkan'))");
  }
  if (!ada('TRANSAKSI', 'uang_diterima')) {
    db.exec('ALTER TABLE TRANSAKSI ADD COLUMN uang_diterima INTEGER CHECK (uang_diterima IS NULL OR uang_diterima >= 0)');
  }
}

/** true bila database belum punya data awal */
function masihKosong(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM PENGGUNA').get().n === 0;
}

module.exports = { bukaDatabase, masihKosong };
