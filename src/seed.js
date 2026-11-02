// Data awal: 2 pengguna, daftar barang contoh, dan jadwal 7 hari ke depan.
//
// PENTING: daftar barang di bawah ini CONTOH. Daftar asli (nama, satuan,
// harga, stok awal, stok minimum) belum ada di dokumen dan perlu diambil
// dari catatan wawancara 15/09/2026 atau ditanyakan ke Bu Mimin.
// Ganti isi BARANG_AWAL lalu jalankan `npm run db:reset`.

const { hariIni, tambahHari } = require('./lib/waktu');

const PENGGUNA_AWAL = [
  { nama: 'Bu Mimin', peran: 'admin' },
  { nama: 'Bu Sri', peran: 'pegawai' },
];

// [nama, satuan, harga_jual, stok_awal, stok_minimum]
const BARANG_AWAL = [
  ['Nasi Goreng', 'porsi', 12000, 20, 5],
  ['Mie Goreng Telur', 'porsi', 10000, 15, 5],
  ['Nasi Ayam Geprek', 'porsi', 13000, 4, 5], // sengaja menipis
  ['Es Teh Manis', 'gelas', 4000, 40, 10],
  ['Es Jeruk', 'gelas', 5000, 25, 10],
  ['Kopi Hitam', 'gelas', 4000, 30, 5],
  ['Air Mineral 600ml', 'botol', 4000, 24, 6],
  ['Teh Botol', 'botol', 5000, 0, 6], // sengaja habis
  ['Gorengan', 'pcs', 1000, 50, 10],
  ['Kerupuk', 'bungkus', 1000, 30, 5],
];

// Jadwal awal: Senin-Jumat 07.00-16.00, Sabtu 08.00-13.00, Minggu libur.
function jadwalUntuk(tanggal) {
  const hari = new Date(`${tanggal}T00:00:00Z`).getUTCDay(); // 0 = Minggu
  if (hari === 0) return { buka: 0, jam_buka: null, jam_tutup: null, catatan: 'Libur hari Minggu' };
  if (hari === 6) return { buka: 1, jam_buka: '08:00', jam_tutup: '13:00', catatan: null };
  return { buka: 1, jam_buka: '07:00', jam_tutup: '16:00', catatan: null };
}

function isiDataAwal(db) {
  const hari = hariIni();
  const run = db.transaction(() => {
    const insUser = db.prepare('INSERT INTO PENGGUNA (nama, peran) VALUES (?, ?)');
    for (const u of PENGGUNA_AWAL) insUser.run(u.nama, u.peran);
    const admin = db.prepare("SELECT id_pengguna FROM PENGGUNA WHERE peran = 'admin' ORDER BY id_pengguna LIMIT 1").get().id_pengguna;

    const insBarang = db.prepare(
      'INSERT INTO BARANG (nama_barang, satuan, harga_jual, stok_saat_ini, stok_minimum, aktif) VALUES (?, ?, ?, ?, ?, 1)'
    );
    const insMasuk = db.prepare(
      'INSERT INTO STOK_MASUK (id_barang, id_pengguna, jumlah, tanggal_masuk, catatan) VALUES (?, ?, ?, ?, ?)'
    );
    for (const [nama, satuan, harga, stok, min] of BARANG_AWAL) {
      const { lastInsertRowid } = insBarang.run(nama, satuan, harga, stok, min);
      // Stok awal dicatat sebagai stok masuk, supaya riwayat cocok dengan sisa stok.
      if (stok > 0) insMasuk.run(lastInsertRowid, admin, stok, hari, 'Stok awal');
    }

    const insJadwal = db.prepare(
      'INSERT INTO JADWAL_BUKA_TUTUP (id_pengguna, tanggal, jam_buka, jam_tutup, buka, catatan) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < 7; i++) {
      const t = tambahHari(hari, i);
      const j = jadwalUntuk(t);
      insJadwal.run(admin, t, j.jam_buka, j.jam_tutup, j.buka, j.catatan);
    }
  });
  run();
}

module.exports = { isiDataAwal, BARANG_AWAL, PENGGUNA_AWAL };
