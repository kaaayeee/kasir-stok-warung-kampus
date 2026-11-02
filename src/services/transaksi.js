// EP-02 US-05: catat pesanan & pembayaran (QRIS atau tunai).
// Satu transaksi database berisi: TRANSAKSI + DETAIL_TRANSAKSI tiap item
// + STOK_KELUAR (alasan "terjual") tiap item + pengurangan stok_saat_ini.
// Bila satu item saja stoknya tidak cukup, SELURUH transaksi dibatalkan.
const v = require('../lib/validasi');
const { sekarang, hariIni, tanggalValid } = require('../lib/waktu');

const METODE = ['qris', 'tunai'];

module.exports = function layananTransaksi(db, barang, stok) {
  const insTrx = db.prepare(
    'INSERT INTO TRANSAKSI (id_pengguna, waktu_transaksi, metode_bayar, total) VALUES (?, ?, ?, ?)'
  );
  const insDetail = db.prepare(
    'INSERT INTO DETAIL_TRANSAKSI (id_transaksi, id_barang, jumlah, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)'
  );

  /** Gabungkan item yang barangnya sama supaya tidak terhitung ganda. */
  function rapikanItem(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new v.ValidasiError('Pesanan masih kosong. Tambahkan minimal satu barang.', 'items');
    }
    if (items.length > 100) throw new v.ValidasiError('Terlalu banyak item dalam satu pesanan.', 'items');
    const peta = new Map();
    for (const it of items) {
      const b = barang.ambilWajib(it && it.id_barang, 'items');
      if (!b.aktif) throw new v.ValidasiError(`${b.nama_barang} sudah tidak dijual.`, 'items');
      const jumlah = v.bilanganBulatPositif(it.jumlah, 'items', `Jumlah ${b.nama_barang}`);
      peta.set(b.id_barang, (peta.get(b.id_barang) || 0) + jumlah);
    }
    return [...peta.entries()].map(([id_barang, jumlah]) => ({ id_barang, jumlah }));
  }

  function simpan(input, idPengguna) {
    const metode = String(input.metode_bayar || '').toLowerCase();
    if (!METODE.includes(metode)) {
      throw new v.ValidasiError('Pilih metode bayar: QRIS atau tunai.', 'metode_bayar');
    }
    const items = rapikanItem(input.items);

    const id = db.transaction(() => {
      const waktu = sekarang();
      // Harga diambil dari database (bukan dari HP), lalu disalin ke
      // harga_satuan supaya perubahan harga nanti tidak mengubah transaksi lama.
      const baris = items.map((it) => {
        const b = barang.ambil(it.id_barang);
        // Cek ulang sisa stok tepat sebelum menyimpan.
        if (it.jumlah > b.stok_saat_ini) {
          throw new v.ValidasiError(
            b.stok_saat_ini === 0
              ? `${b.nama_barang} sudah habis.`
              : `Stok tidak cukup untuk ${b.nama_barang}. Sisa stok: ${b.stok_saat_ini} ${b.satuan}.`,
            'items',
            409
          );
        }
        return { ...it, harga_satuan: b.harga_jual, subtotal: b.harga_jual * it.jumlah };
      });
      const total = baris.reduce((s, x) => s + x.subtotal, 0);

      const idTrx = insTrx.run(idPengguna, waktu, metode, total).lastInsertRowid;
      for (const x of baris) {
        insDetail.run(idTrx, x.id_barang, x.jumlah, x.harga_satuan, x.subtotal);
        stok.kurangiDalamTransaksi(
          { id_barang: x.id_barang, jumlah: x.jumlah, alasan: 'terjual', id_transaksi: idTrx },
          idPengguna,
          waktu
        );
      }
      return idTrx;
    })();

    return ambil(id);
  }

  function ambil(id) {
    const t = db
      .prepare(
        `SELECT t.*, p.nama AS pencatat FROM TRANSAKSI t JOIN PENGGUNA p USING (id_pengguna) WHERE id_transaksi = ?`
      )
      .get(Number(id));
    if (!t) return null;
    t.items = db
      .prepare(
        `SELECT d.*, b.nama_barang, b.satuan FROM DETAIL_TRANSAKSI d JOIN BARANG b USING (id_barang)
         WHERE id_transaksi = ? ORDER BY id_detail`
      )
      .all(t.id_transaksi);
    return t;
  }

  /** Log penjualan satu tanggal + ringkasan QRIS/tunai (dipakai juga untuk EP-03). */
  function logHarian(tanggal = hariIni()) {
    if (!tanggalValid(tanggal)) throw new v.ValidasiError('Tanggal tidak valid.', 'tanggal');
    const daftar = db
      .prepare(
        `SELECT t.id_transaksi FROM TRANSAKSI t
         WHERE substr(t.waktu_transaksi, 1, 10) = ? ORDER BY t.waktu_transaksi DESC, t.id_transaksi DESC`
      )
      .all(tanggal)
      .map((r) => ambil(r.id_transaksi));
    const ringkasan = { jumlah_transaksi: daftar.length, total: 0, total_qris: 0, total_tunai: 0 };
    for (const t of daftar) {
      ringkasan.total += t.total;
      ringkasan[t.metode_bayar === 'qris' ? 'total_qris' : 'total_tunai'] += t.total;
    }
    return { tanggal, ringkasan, transaksi: daftar };
  }

  return { simpan, ambil, logHarian, METODE };
};
