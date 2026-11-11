// EP-02 US-05: catat pesanan & pembayaran (QRIS atau tunai).
// Satu transaksi database berisi: TRANSAKSI + DETAIL_TRANSAKSI tiap item
// + STOK_KELUAR (alasan "terjual") tiap item + pengurangan stok_saat_ini.
// Bila satu item saja stoknya tidak cukup, SELURUH transaksi dibatalkan.
const v = require('../lib/validasi');
const { sekarang, hariIni, tanggalValid } = require('../lib/waktu');

const METODE = ['qris', 'tunai'];
const STATUS_AKHIR = ['selesai', 'dibatalkan'];

/** Kode pesanan WU-YYMMDD-NNN (sama dengan tampilan). */
function kodePesanan(waktu, nomor) {
  const [y, m, d] = String(waktu).slice(0, 10).split('-');
  return `WU-${y.slice(2)}${m}${d}-${String(nomor).padStart(3, '0')}`;
}

module.exports = function layananTransaksi(db, barang, stok) {
  const insTrx = db.prepare(
    `INSERT INTO TRANSAKSI (id_pengguna, waktu_transaksi, metode_bayar, total, nama_pelanggan, catatan, status, uang_diterima)
     VALUES (?, ?, ?, ?, ?, ?, 'belum_selesai', ?)`
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
    const namaPelanggan = v.teksOpsional(input.nama_pelanggan, 60);
    const catatan = v.teksOpsional(input.catatan, 200);
    // Uang diterima hanya untuk tunai, opsional (untuk mencatat kembalian).
    const adaUang = metode === 'tunai' && input.uang_diterima !== undefined && input.uang_diterima !== null && String(input.uang_diterima).trim() !== '';
    const uang = adaUang ? v.bilanganBulatNonNegatif(input.uang_diterima, 'uang_diterima', 'Uang diterima') : null;

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
      if (uang !== null && uang < total) {
        throw new v.ValidasiError(`Uang diterima kurang dari total pembayaran (Rp${total.toLocaleString('id-ID')}).`, 'uang_diterima');
      }

      const idTrx = insTrx.run(idPengguna, waktu, metode, total, namaPelanggan, catatan, uang).lastInsertRowid;
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
        // nomor_harian: urutan transaksi pada tanggal yang sama (1, 2, 3, ...),
        // dipakai untuk kode pesanan WU-YYMMDD-NNN. Dihitung, tidak disimpan.
        `SELECT t.*, p.nama AS pencatat,
                (SELECT COUNT(*) FROM TRANSAKSI x
                  WHERE substr(x.waktu_transaksi, 1, 10) = substr(t.waktu_transaksi, 1, 10)
                    AND x.id_transaksi <= t.id_transaksi) AS nomor_harian
           FROM TRANSAKSI t JOIN PENGGUNA p USING (id_pengguna) WHERE id_transaksi = ?`
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
    // Pemasukan = semua transaksi yang tidak dibatalkan (pembayaran sudah diterima di kasir).
    const ringkasan = {
      jumlah_transaksi: daftar.length, // semua, termasuk dibatalkan
      jumlah_dihitung: 0, belum_selesai: 0, selesai: 0, dibatalkan: 0,
      total: 0, total_qris: 0, total_tunai: 0,
    };
    for (const t of daftar) {
      ringkasan[t.status] += 1;
      if (t.status === 'dibatalkan') continue;
      ringkasan.jumlah_dihitung += 1;
      ringkasan.total += t.total;
      ringkasan[t.metode_bayar === 'qris' ? 'total_qris' : 'total_tunai'] += t.total;
    }
    return { tanggal, ringkasan, transaksi: daftar };
  }

  const qUbahStatus = db.prepare("UPDATE TRANSAKSI SET status = ? WHERE id_transaksi = ? AND status = 'belum_selesai'");

  /**
   * Ubah status pesanan: hanya dari belum_selesai ke selesai atau dibatalkan.
   * Pembatalan mengembalikan stok setiap item (dicatat di riwayat stok).
   */
  function ubahStatus(id, input, idPengguna) {
    const status = String(input.status || '').toLowerCase();
    if (!STATUS_AKHIR.includes(status)) throw new v.ValidasiError('Status harus selesai atau dibatalkan.', 'status');
    const t = ambil(id);
    if (!t) throw new v.ValidasiError('Transaksi tidak ditemukan.', 'id', 404);
    if (t.status !== 'belum_selesai') {
      throw new v.ValidasiError(`Transaksi ini sudah ${t.status === 'selesai' ? 'selesai' : 'dibatalkan'}, statusnya tidak bisa diubah lagi.`, 'status', 409);
    }
    db.transaction(() => {
      if (qUbahStatus.run(status, t.id_transaksi).changes !== 1) {
        throw new v.ValidasiError('Status transaksi baru saja berubah. Muat ulang halaman.', 'status', 409);
      }
      if (status === 'dibatalkan') {
        const kode = kodePesanan(t.waktu_transaksi, t.nomor_harian);
        for (const it of t.items) {
          stok.kembalikanDalamTransaksi({ id_barang: it.id_barang, jumlah: it.jumlah, catatan: `Pembatalan pesanan ${kode}` }, idPengguna);
        }
      }
    })();
    return ambil(t.id_transaksi);
  }

  /** Menu terlaris satu tanggal: hanya dari transaksi SELESAI, terbanyak di atas. */
  function terlaris(tanggal = hariIni()) {
    if (!tanggalValid(tanggal)) throw new v.ValidasiError('Tanggal tidak valid.', 'tanggal');
    const menu = db
      .prepare(
        `SELECT d.id_barang, b.nama_barang, b.satuan, SUM(d.jumlah) AS jumlah, SUM(d.subtotal) AS pemasukan
           FROM DETAIL_TRANSAKSI d
           JOIN TRANSAKSI t USING (id_transaksi)
           JOIN BARANG b ON b.id_barang = d.id_barang
          WHERE t.status = 'selesai' AND substr(t.waktu_transaksi, 1, 10) = ?
          GROUP BY d.id_barang
          ORDER BY jumlah DESC, b.nama_barang COLLATE NOCASE`
      )
      .all(tanggal);
    return { tanggal, menu };
  }

  return { simpan, ambil, logHarian, ubahStatus, terlaris, METODE };
};
