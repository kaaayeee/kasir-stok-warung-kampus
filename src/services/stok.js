// EP-01 US-02: stok masuk & stok keluar.
// Setiap pencatatan menulis riwayat DAN memperbarui stok_saat_ini
// dalam SATU transaksi database. Bila salah satu gagal, keduanya batal.
const v = require('../lib/validasi');
const { hariIni, sekarang, tanggalValid } = require('../lib/waktu');

const ALASAN = ['terjual', 'rusak', 'lainnya'];

module.exports = function layananStok(db, barang) {
  const insMasuk = db.prepare(
    'INSERT INTO STOK_MASUK (id_barang, id_pengguna, jumlah, tanggal_masuk, catatan) VALUES (?, ?, ?, ?, ?)'
  );
  const tambahStok = db.prepare('UPDATE BARANG SET stok_saat_ini = stok_saat_ini + ? WHERE id_barang = ?');

  const insKeluar = db.prepare(
    'INSERT INTO STOK_KELUAR (id_barang, id_pengguna, id_transaksi, jumlah, alasan, waktu_keluar, catatan) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  // Pengurangan hanya terjadi bila stok cukup (WHERE stok_saat_ini >= ?).
  // Ini lapis pengaman kedua setelah pengecekan di atas; lapis ketiga
  // adalah CHECK (stok_saat_ini >= 0) di tabel.
  const kurangiStok = db.prepare(
    'UPDATE BARANG SET stok_saat_ini = stok_saat_ini - ? WHERE id_barang = ? AND stok_saat_ini >= ?'
  );

  function catatMasuk(input, idPengguna) {
    const b = barang.ambilWajib(input.id_barang);
    if (!b.aktif) throw new v.ValidasiError('Barang ini sudah tidak aktif.', 'id_barang');
    const jumlah = v.bilanganBulatPositif(input.jumlah, 'jumlah', 'Jumlah');
    // Tanggal masuk opsional: bila kosong, diisi otomatis tanggal + jam sekarang
    // (form Stok Masuk tidak punya isian tanggal). Bila diisi (YYYY-MM-DD),
    // tidak boleh di masa depan — untuk mencatat stok hari sebelumnya.
    const isian = input.tanggal_masuk === undefined || input.tanggal_masuk === null ? '' : String(input.tanggal_masuk).trim();
    let tanggal = sekarang();
    if (isian) {
      if (!tanggalValid(isian)) throw new v.ValidasiError('Format tanggal tidak valid.', 'tanggal_masuk');
      if (isian > hariIni()) throw new v.ValidasiError('Tanggal masuk tidak boleh di masa depan.', 'tanggal_masuk');
      tanggal = isian;
    }
    const catatan = v.teksOpsional(input.catatan);

    const id = db.transaction(() => {
      const r = insMasuk.run(b.id_barang, idPengguna, jumlah, tanggal, catatan);
      tambahStok.run(jumlah, b.id_barang);
      return r.lastInsertRowid;
    })();
    return { id_masuk: id, barang: barang.ambil(b.id_barang) };
  }

  /**
   * Kurangi stok satu barang. Dipakai oleh form stok keluar DAN oleh
   * transaksi penjualan (EP-02 US-05). Harus dipanggil di dalam db.transaction.
   */
  function kurangiDalamTransaksi({ id_barang, jumlah, alasan, id_transaksi = null, catatan = null }, idPengguna, waktu) {
    const r = kurangiStok.run(jumlah, id_barang, jumlah);
    if (r.changes !== 1) {
      const sisa = barang.ambil(id_barang);
      throw new v.ValidasiError(
        `Stok tidak cukup untuk ${sisa.nama_barang}. Sisa stok: ${sisa.stok_saat_ini} ${sisa.satuan}.`,
        'jumlah',
        409
      );
    }
    insKeluar.run(id_barang, idPengguna, id_transaksi, jumlah, alasan, waktu, catatan);
  }

  function catatKeluar(input, idPengguna) {
    const b = barang.ambilWajib(input.id_barang);
    const jumlah = v.bilanganBulatPositif(input.jumlah, 'jumlah', 'Jumlah');
    const alasan = String(input.alasan || '').toLowerCase();
    if (!ALASAN.includes(alasan)) throw new v.ValidasiError('Alasan keluar belum dipilih.', 'alasan');
    const catatan = v.teksOpsional(input.catatan, 200);

    // Pengecekan di server: jumlah tidak boleh melebihi sisa stok.
    if (jumlah > b.stok_saat_ini) {
      throw new v.ValidasiError(`Stok tidak cukup. Sisa stok: ${b.stok_saat_ini} ${b.satuan}.`, 'jumlah', 409);
    }

    db.transaction(() => {
      kurangiDalamTransaksi({ id_barang: b.id_barang, jumlah, alasan, catatan }, idPengguna, sekarang());
    })();
    return { barang: barang.ambil(b.id_barang) };
  }

  /**
   * Riwayat gabungan masuk + keluar, terbaru di atas. Bisa disaring per
   * barang dan/atau per tanggal ('YYYY-MM-DD').
   * Stok masuk lama yang hanya punya tanggal (tanpa jam) diurutkan di akhir hari itu.
   */
  function riwayat({ id_barang = null, tanggal = null, limit = 30 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 30, 1), 500);
    const idb = id_barang ? Number(id_barang) : null;
    if (tanggal && !tanggalValid(tanggal)) throw new v.ValidasiError('Tanggal tidak valid.', 'tanggal');
    const tgl = tanggal || null;
    return db
      .prepare(
        `SELECT * FROM (
           SELECT 'masuk' AS jenis, m.id_masuk AS id, m.id_barang, b.nama_barang, b.satuan, m.jumlah,
                  m.tanggal_masuk AS waktu,
                  CASE WHEN length(m.tanggal_masuk) = 10 THEN m.tanggal_masuk || ' 24' ELSE m.tanggal_masuk END AS urut,
                  NULL AS alasan, m.catatan, p.nama AS pencatat, NULL AS id_transaksi
             FROM STOK_MASUK m JOIN BARANG b USING (id_barang) JOIN PENGGUNA p USING (id_pengguna)
           UNION ALL
           SELECT 'keluar', k.id_keluar, k.id_barang, b.nama_barang, b.satuan, k.jumlah,
                  k.waktu_keluar, k.waktu_keluar, k.alasan, k.catatan, p.nama, k.id_transaksi
             FROM STOK_KELUAR k JOIN BARANG b USING (id_barang) JOIN PENGGUNA p USING (id_pengguna)
         )
         WHERE (? IS NULL OR id_barang = ?)
           AND (? IS NULL OR substr(waktu, 1, 10) = ?)
         ORDER BY urut DESC, id DESC
         LIMIT ?`
      )
      .all(idb, idb, tgl, tgl, lim);
  }

  /**
   * Kembalikan stok (mis. pesanan dibatalkan): dicatat sebagai STOK_MASUK
   * supaya riwayat tetap cocok dengan sisa stok. Harus di dalam db.transaction.
   */
  function kembalikanDalamTransaksi({ id_barang, jumlah, catatan }, idPengguna) {
    insMasuk.run(id_barang, idPengguna, jumlah, sekarang(), catatan);
    tambahStok.run(jumlah, id_barang);
  }

  return { catatMasuk, catatKeluar, kurangiDalamTransaksi, kembalikanDalamTransaksi, riwayat, ALASAN };
};
