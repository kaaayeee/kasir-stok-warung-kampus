// `npm run db:reset` — hapus database lalu buat ulang dengan data awal.
const fs = require('fs');
const config = require('./config');
const { bukaDatabase } = require('./db');
const { isiDataAwal } = require('./seed');

if (config.dbFile !== ':memory:') {
  for (const ext of ['', '-wal', '-shm']) {
    if (fs.existsSync(config.dbFile + ext)) fs.unlinkSync(config.dbFile + ext);
  }
}
const db = bukaDatabase(config.dbFile);
isiDataAwal(db);
const n = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log('Database dibuat ulang:', config.dbFile);
for (const t of ['PENGGUNA', 'BARANG', 'STOK_MASUK', 'STOK_KELUAR', 'JADWAL_BUKA_TUTUP', 'TRANSAKSI', 'DETAIL_TRANSAKSI']) {
  console.log(`  ${t.padEnd(18)} ${n(t)} baris`);
}
db.close();
