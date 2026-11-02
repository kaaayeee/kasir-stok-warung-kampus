// Logika data BARANG (daftar sisa stok + kelola barang).
const v = require('../lib/validasi');
const { hariIni } = require('../lib/waktu');

function statusStok(b) {
  if (b.stok_saat_ini <= 0) return 'habis';
  if (b.stok_saat_ini <= b.stok_minimum) return 'menipis';
  return 'aman';
}

function dengan_status(b) {
  return b ? { ...b, aktif: !!b.aktif, status: statusStok(b) } : b;
}

module.exports = function layananBarang(db) {
  const qAmbil = db.prepare('SELECT * FROM BARANG WHERE id_barang = ?');

  function ambil(id) {
    return dengan_status(qAmbil.get(id));
  }

  function ambilWajib(id, field = 'id_barang') {
    const idNum = Number(id);
    if (!id || !Number.isInteger(idNum)) throw new v.ValidasiError('Barang wajib dipilih.', field);
    const b = ambil(idNum);
    if (!b) throw new v.ValidasiError('Barang tidak ditemukan.', field, 404);
    return b;
  }

  /** Daftar barang. Default hanya yang aktif. */
  function daftar({ q = '', semua = false } = {}) {
    const kata = String(q || '').trim();
    const rows = db
      .prepare(
        `SELECT * FROM BARANG
         WHERE (? = 1 OR aktif = 1)
           AND (? = '' OR nama_barang LIKE '%' || ? || '%')
         ORDER BY nama_barang COLLATE NOCASE`
      )
      .all(semua ? 1 : 0, kata, kata);
    return rows.map(dengan_status);
  }

  function cekNamaUnik(nama, kecualiId = null) {
    const ada = db
      .prepare('SELECT id_barang, nama_barang FROM BARANG WHERE nama_barang = ? COLLATE NOCASE AND id_barang IS NOT ?')
      .get(nama, kecualiId);
    if (ada) {
      throw new v.ValidasiError(`Barang bernama "${ada.nama_barang}" sudah ada. Gunakan barang itu atau beri nama lain.`, 'nama_barang', 409);
    }
  }

  /** Tambah barang baru. Stok awal dicatat sebagai STOK_MASUK. */
  function tambah(input, idPengguna) {
    const nama = v.teksWajib(input.nama_barang, 'nama_barang', 'Nama barang', 60);
    const satuan = v.teksWajib(input.satuan, 'satuan', 'Satuan', 20).toLowerCase();
    const harga = v.bilanganBulatNonNegatif(input.harga_jual, 'harga_jual', 'Harga jual');
    const min = v.bilanganBulatNonNegatif(input.stok_minimum ?? 0, 'stok_minimum', 'Stok minimum', 100000);
    const awal = v.bilanganBulatNonNegatif(input.stok_awal ?? 0, 'stok_awal', 'Stok awal', 100000);
    cekNamaUnik(nama);

    const id = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO BARANG (nama_barang, satuan, harga_jual, stok_saat_ini, stok_minimum, aktif) VALUES (?, ?, ?, ?, ?, 1)')
        .run(nama, satuan, harga, awal, min);
      if (awal > 0) {
        db.prepare('INSERT INTO STOK_MASUK (id_barang, id_pengguna, jumlah, tanggal_masuk, catatan) VALUES (?, ?, ?, ?, ?)')
          .run(lastInsertRowid, idPengguna, awal, hariIni(), 'Stok awal');
      }
      return lastInsertRowid;
    })();
    return ambil(id);
  }

  /** Ubah data barang. stok_saat_ini TIDAK bisa diubah di sini (hanya lewat stok masuk/keluar). */
  function ubah(id, input) {
    const lama = ambilWajib(id);
    const nama = input.nama_barang !== undefined ? v.teksWajib(input.nama_barang, 'nama_barang', 'Nama barang', 60) : lama.nama_barang;
    const satuan = input.satuan !== undefined ? v.teksWajib(input.satuan, 'satuan', 'Satuan', 20).toLowerCase() : lama.satuan;
    const harga = input.harga_jual !== undefined ? v.bilanganBulatNonNegatif(input.harga_jual, 'harga_jual', 'Harga jual') : lama.harga_jual;
    const min = input.stok_minimum !== undefined ? v.bilanganBulatNonNegatif(input.stok_minimum, 'stok_minimum', 'Stok minimum', 100000) : lama.stok_minimum;
    const aktif = input.aktif !== undefined ? (input.aktif ? 1 : 0) : (lama.aktif ? 1 : 0);
    cekNamaUnik(nama, lama.id_barang);
    db.prepare('UPDATE BARANG SET nama_barang = ?, satuan = ?, harga_jual = ?, stok_minimum = ?, aktif = ? WHERE id_barang = ?')
      .run(nama, satuan, harga, min, aktif, lama.id_barang);
    return ambil(lama.id_barang);
  }

  return { ambil, ambilWajib, daftar, tambah, ubah, statusStok };
};
