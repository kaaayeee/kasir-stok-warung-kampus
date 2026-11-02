// Uji mandiri otomatis (sisi server). Jalankan: npm test
// Setiap kelompok uji memakai database baru di memori, jadi tidak mengganggu data asli.
process.env.DB_FILE = ':memory:';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { bukaDatabase } = require('../src/db');
const { isiDataAwal } = require('../src/seed');
const { buatApp } = require('../src/app');
const { hariIni, tambahHari } = require('../src/lib/waktu');

function siapkan() {
  const ctx = {};
  before(async () => {
    ctx.db = bukaDatabase(':memory:');
    isiDataAwal(ctx.db);
    ctx.server = buatApp(ctx.db).listen(0);
    await new Promise((r) => ctx.server.once('listening', r));
    ctx.base = `http://127.0.0.1:${ctx.server.address().port}/api`;
    ctx.call = async (method, path, body, user = 1) => {
      const res = await fetch(ctx.base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(user ? { 'X-Pengguna-Id': String(user) } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    };
    ctx.barang = (nama) => ctx.db.prepare('SELECT * FROM BARANG WHERE nama_barang = ?').get(nama);
    ctx.hitung = (t) => ctx.db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
  });
  after(() => { ctx.server.close(); ctx.db.close(); });
  return ctx;
}

// =====================================================================
describe('Setup: database sesuai ERD revisi', () => {
  const c = siapkan();

  test('7 tabel ERD terbentuk', () => {
    const t = c.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name).sort();
    assert.deepEqual(t, ['BARANG', 'DETAIL_TRANSAKSI', 'JADWAL_BUKA_TUTUP', 'PENGGUNA', 'STOK_KELUAR', 'STOK_MASUK', 'TRANSAKSI']);
  });

  test('kolom tiap tabel persis seperti data dictionary', () => {
    const kolom = (t) => c.db.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name);
    assert.deepEqual(kolom('PENGGUNA'), ['id_pengguna', 'nama', 'peran']);
    assert.deepEqual(kolom('BARANG'), ['id_barang', 'nama_barang', 'satuan', 'harga_jual', 'stok_saat_ini', 'stok_minimum', 'aktif']);
    assert.deepEqual(kolom('STOK_MASUK'), ['id_masuk', 'id_barang', 'id_pengguna', 'jumlah', 'tanggal_masuk', 'catatan']);
    assert.deepEqual(kolom('STOK_KELUAR'), ['id_keluar', 'id_barang', 'id_pengguna', 'id_transaksi', 'jumlah', 'alasan', 'waktu_keluar']);
    assert.deepEqual(kolom('JADWAL_BUKA_TUTUP'), ['id_jadwal', 'id_pengguna', 'tanggal', 'jam_buka', 'jam_tutup', 'buka', 'catatan']);
    assert.deepEqual(kolom('TRANSAKSI'), ['id_transaksi', 'id_pengguna', 'waktu_transaksi', 'metode_bayar', 'total']);
    assert.deepEqual(kolom('DETAIL_TRANSAKSI'), ['id_detail', 'id_transaksi', 'id_barang', 'jumlah', 'harga_satuan', 'subtotal']);
  });

  test('foreign key aktif dan relasi benar', () => {
    assert.equal(c.db.pragma('foreign_keys', { simple: true }), 1);
    const fk = (t) => c.db.prepare(`PRAGMA foreign_key_list(${t})`).all().map((r) => `${r.from}->${r.table}`).sort();
    assert.deepEqual(fk('STOK_KELUAR'), ['id_barang->BARANG', 'id_pengguna->PENGGUNA', 'id_transaksi->TRANSAKSI']);
    assert.deepEqual(fk('DETAIL_TRANSAKSI'), ['id_barang->BARANG', 'id_transaksi->TRANSAKSI']);
  });

  test('data awal: Bu Mimin (admin), Bu Sri (pegawai), barang, jadwal 7 hari', async () => {
    const r = await c.call('GET', '/pengguna');
    assert.deepEqual(r.body.map((p) => [p.nama, p.peran]), [['Bu Mimin', 'admin'], ['Bu Sri', 'pegawai']]);
    assert.ok(c.hitung('BARANG') >= 5);
    assert.equal(c.hitung('JADWAL_BUKA_TUTUP'), 7);
  });

  test('uji koneksi: tulis, baca, hapus satu data contoh', () => {
    const { lastInsertRowid } = c.db.prepare("INSERT INTO PENGGUNA (nama, peran) VALUES ('Uji Koneksi', 'pegawai')").run();
    assert.equal(c.db.prepare('SELECT nama FROM PENGGUNA WHERE id_pengguna = ?').get(lastInsertRowid).nama, 'Uji Koneksi');
    c.db.prepare('DELETE FROM PENGGUNA WHERE id_pengguna = ?').run(lastInsertRowid);
    assert.equal(c.db.prepare('SELECT * FROM PENGGUNA WHERE id_pengguna = ?').get(lastInsertRowid), undefined);
  });
});

// =====================================================================
describe('Task 1 (EP-01 US-02): stok masuk, stok keluar, sisa stok', () => {
  const c = siapkan();

  test('stok masuk tersimpan + stok_saat_ini bertambah + pencatat dari pengguna aktif', async () => {
    const b = c.barang('Nasi Goreng');
    const r = await c.call('POST', '/stok/masuk', { id_barang: b.id_barang, jumlah: 5, tanggal_masuk: hariIni(), catatan: 'uji' }, 2);
    assert.equal(r.status, 201);
    assert.equal(r.body.barang.stok_saat_ini, b.stok_saat_ini + 5);
    const row = c.db.prepare('SELECT * FROM STOK_MASUK WHERE id_masuk = ?').get(r.body.id_masuk);
    assert.equal(row.id_pengguna, 2);
    assert.equal(row.tanggal_masuk, hariIni());
    assert.equal(row.jumlah, 5);
  });

  test('QA-3: stok masuk kosong / 0 / negatif / desimal / teks ditolak, data tidak berubah', async () => {
    const b = c.barang('Es Jeruk');
    const masukSebelum = c.hitung('STOK_MASUK');
    for (const jumlah of ['', null, 0, '0', -3, '2,5', 2.5, '2.5', 'abc']) {
      const r = await c.call('POST', '/stok/masuk', { id_barang: b.id_barang, jumlah, tanggal_masuk: hariIni() });
      assert.equal(r.status, 400, `jumlah=${JSON.stringify(jumlah)} harus ditolak`);
      assert.equal(r.body.field, 'jumlah');
    }
    assert.equal(c.hitung('STOK_MASUK'), masukSebelum);
    assert.equal(c.barang('Es Jeruk').stok_saat_ini, b.stok_saat_ini);
  });

  test('stok masuk: barang wajib dipilih dan tanggal tidak boleh kosong', async () => {
    let r = await c.call('POST', '/stok/masuk', { jumlah: 1, tanggal_masuk: hariIni() });
    assert.equal(r.status, 400); assert.equal(r.body.field, 'id_barang');
    r = await c.call('POST', '/stok/masuk', { id_barang: 1, jumlah: 1, tanggal_masuk: '' });
    assert.equal(r.status, 400); assert.equal(r.body.field, 'tanggal_masuk');
  });

  test('stok keluar tersimpan dengan alasan & waktu, stok berkurang', async () => {
    const b = c.barang('Kopi Hitam');
    const r = await c.call('POST', '/stok/keluar', { id_barang: b.id_barang, jumlah: 3, alasan: 'rusak' });
    assert.equal(r.status, 201);
    assert.equal(r.body.barang.stok_saat_ini, b.stok_saat_ini - 3);
    const row = c.db.prepare('SELECT * FROM STOK_KELUAR ORDER BY id_keluar DESC LIMIT 1').get();
    assert.equal(row.alasan, 'rusak');
    assert.equal(row.id_transaksi, null);
    assert.match(row.waktu_keluar, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  test('QA-1: stok keluar melebihi sisa ditolak dengan pesan sisa stok, stok tidak berubah', async () => {
    const b = c.barang('Nasi Ayam Geprek'); // stok awal 4
    const keluarSebelum = c.hitung('STOK_KELUAR');
    const r = await c.call('POST', '/stok/keluar', { id_barang: b.id_barang, jumlah: b.stok_saat_ini + 1, alasan: 'terjual' });
    assert.equal(r.status, 409);
    assert.match(r.body.error, new RegExp(`Sisa stok: ${b.stok_saat_ini}`));
    assert.equal(c.barang('Nasi Ayam Geprek').stok_saat_ini, b.stok_saat_ini);
    assert.equal(c.hitung('STOK_KELUAR'), keluarSebelum);
  });

  test('stok keluar tepat sama dengan sisa boleh → stok jadi 0, tidak pernah negatif', async () => {
    const b = c.barang('Nasi Ayam Geprek');
    const r = await c.call('POST', '/stok/keluar', { id_barang: b.id_barang, jumlah: b.stok_saat_ini, alasan: 'terjual' });
    assert.equal(r.status, 201);
    assert.equal(r.body.barang.stok_saat_ini, 0);
    assert.equal(r.body.barang.status, 'habis');
    const r2 = await c.call('POST', '/stok/keluar', { id_barang: b.id_barang, jumlah: 1, alasan: 'terjual' });
    assert.equal(r2.status, 409);
  });

  test('database sendiri menolak stok negatif (lapis pengaman terakhir)', () => {
    assert.throws(() => c.db.prepare('UPDATE BARANG SET stok_saat_ini = -1 WHERE id_barang = 1').run(), /CHECK constraint/);
  });

  test('stok keluar: nilai tidak valid & alasan kosong ditolak', async () => {
    for (const jumlah of ['', 0, -1, '1,5']) {
      const r = await c.call('POST', '/stok/keluar', { id_barang: 1, jumlah, alasan: 'rusak' });
      assert.equal(r.status, 400);
    }
    const r = await c.call('POST', '/stok/keluar', { id_barang: 1, jumlah: 1 });
    assert.equal(r.status, 400); assert.equal(r.body.field, 'alasan');
  });

  test('tanpa pengguna aktif, pencatatan ditolak', async () => {
    const r = await c.call('POST', '/stok/masuk', { id_barang: 1, jumlah: 1, tanggal_masuk: hariIni() }, null);
    assert.equal(r.status, 401);
  });

  test('QA-2: daftar sisa stok langsung berubah setelah stok masuk', async () => {
    const sebelum = (await c.call('GET', '/barang')).body.find((b) => b.nama_barang === 'Teh Botol');
    assert.equal(sebelum.status, 'habis');
    await c.call('POST', '/stok/masuk', { id_barang: sebelum.id_barang, jumlah: 12, tanggal_masuk: hariIni() });
    const sesudah = (await c.call('GET', '/barang')).body.find((b) => b.nama_barang === 'Teh Botol');
    assert.equal(sesudah.stok_saat_ini, 12);
    assert.equal(sesudah.status, 'aman');
  });

  test('daftar sisa stok: penanda habis & menipis, pencarian nama', async () => {
    const semua = (await c.call('GET', '/barang')).body;
    for (const b of semua) {
      const harap = b.stok_saat_ini === 0 ? 'habis' : b.stok_saat_ini <= b.stok_minimum ? 'menipis' : 'aman';
      assert.equal(b.status, harap, b.nama_barang);
    }
    const cari = (await c.call('GET', '/barang?q=es')).body.map((b) => b.nama_barang);
    assert.ok(cari.includes('Es Jeruk') && cari.includes('Es Teh Manis'));
    assert.ok(!cari.includes('Kopi Hitam'));
  });

  test('QA-4: barang bernama sama (beda huruf besar/spasi) tidak bisa ditambah dua kali', async () => {
    const n = c.hitung('BARANG');
    let r = await c.call('POST', '/barang', { nama_barang: 'Pisang Goreng', satuan: 'pcs', harga_jual: 2000, stok_minimum: 5, stok_awal: 10 });
    assert.equal(r.status, 201);
    r = await c.call('POST', '/barang', { nama_barang: '  pisang   GORENG ', satuan: 'pcs', harga_jual: 2000, stok_minimum: 5, stok_awal: 10 });
    assert.equal(r.status, 409);
    assert.equal(c.hitung('BARANG'), n + 1);
    // stok awal tercatat sebagai stok masuk, tidak terhitung ganda
    const pg = c.barang('Pisang Goreng');
    assert.equal(pg.stok_saat_ini, 10);
    assert.equal(c.db.prepare('SELECT SUM(jumlah) s FROM STOK_MASUK WHERE id_barang = ?').get(pg.id_barang).s, 10);
  });

  test('konsistensi: stok_saat_ini = total masuk − total keluar untuk semua barang', () => {
    const rows = c.db.prepare(`
      SELECT b.nama_barang, b.stok_saat_ini,
        COALESCE((SELECT SUM(jumlah) FROM STOK_MASUK m WHERE m.id_barang = b.id_barang), 0)
      - COALESCE((SELECT SUM(jumlah) FROM STOK_KELUAR k WHERE k.id_barang = b.id_barang), 0) AS hitung
      FROM BARANG b`).all();
    for (const r of rows) assert.equal(r.stok_saat_ini, r.hitung, r.nama_barang);
  });
});

// =====================================================================
describe('Task 2 (EP-01 US-03): jadwal buka tutup', () => {
  const c = siapkan();
  const besok = tambahHari(hariIni(), 1);
  const jauh = tambahHari(hariIni(), 20);

  test('admin bisa menyimpan jadwal tanggal baru dan melihatnya lagi', async () => {
    const r = await c.call('PUT', `/jadwal/${jauh}`, { buka: true, jam_buka: '08:00', jam_tutup: '15:30', catatan: 'uji' });
    assert.equal(r.status, 200);
    assert.equal(r.body.diubah, false);
    const g = await c.call('GET', `/jadwal/${jauh}`);
    assert.equal(g.body.jadwal.jam_buka, '08:00');
    assert.equal(g.body.jadwal.jam_tutup, '15:30');
  });

  test('menyimpan tanggal yang sudah ada = mengubah, bukan menggandakan', async () => {
    const n = c.hitung('JADWAL_BUKA_TUTUP');
    const r = await c.call('PUT', `/jadwal/${besok}`, { buka: true, jam_buka: '09:00', jam_tutup: '14:00' });
    assert.equal(r.body.diubah, true);
    assert.equal(c.hitung('JADWAL_BUKA_TUTUP'), n);
    assert.equal(c.db.prepare('SELECT COUNT(*) n FROM JADWAL_BUKA_TUTUP WHERE tanggal = ?').get(besok).n, 1);
  });

  test('database menolak dua jadwal di tanggal yang sama', () => {
    assert.throws(
      () => c.db.prepare("INSERT INTO JADWAL_BUKA_TUTUP (id_pengguna, tanggal, jam_buka, jam_tutup, buka) VALUES (1, ?, '07:00', '08:00', 1)").run(besok),
      /UNIQUE/
    );
  });

  test('QA-5: jam buka 17.00 dan jam tutup 09.00 ditolak', async () => {
    const sebelum = (await c.call('GET', `/jadwal/${besok}`)).body.jadwal;
    const r = await c.call('PUT', `/jadwal/${besok}`, { buka: true, jam_buka: '17:00', jam_tutup: '09:00' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'Jam tutup harus setelah jam buka.');
    const sesudah = (await c.call('GET', `/jadwal/${besok}`)).body.jadwal;
    assert.deepEqual(sesudah, sebelum);
  });

  test('jam tutup sama dengan jam buka ditolak', async () => {
    const r = await c.call('PUT', `/jadwal/${besok}`, { buka: true, jam_buka: '10:00', jam_tutup: '10:00' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /tidak boleh sama/);
  });

  test('status buka: jam wajib diisi; format harus 24 jam', async () => {
    for (const body of [
      { buka: true, jam_buka: '', jam_tutup: '16:00' },
      { buka: true, jam_buka: '07:00' },
      { buka: true, jam_buka: '7 pagi', jam_tutup: '16:00' },
      { buka: true, jam_buka: '07:00', jam_tutup: '25:00' },
    ]) {
      const r = await c.call('PUT', `/jadwal/${besok}`, body);
      assert.equal(r.status, 400, JSON.stringify(body));
    }
  });

  test('pilihan libur: jam boleh kosong dan dikosongkan', async () => {
    const r = await c.call('PUT', `/jadwal/${besok}`, { buka: false, jam_buka: '17:00', jam_tutup: '09:00' });
    assert.equal(r.status, 200);
    assert.equal(r.body.jadwal.buka, false);
    assert.equal(r.body.jadwal.jam_buka, null);
    // kembali ke buka
    const r2 = await c.call('PUT', `/jadwal/${besok}`, { buka: true, jam_buka: '07:00', jam_tutup: '16:00' });
    assert.equal(r2.body.jadwal.buka, true);
  });

  test('database sendiri menolak jam tutup sebelum jam buka', () => {
    assert.throws(
      () => c.db.prepare("UPDATE JADWAL_BUKA_TUTUP SET jam_buka = '17:00', jam_tutup = '09:00' WHERE tanggal = ?").run(besok),
      /CHECK constraint/
    );
  });

  test('pegawai (Bu Sri) tidak bisa mengubah jadwal', async () => {
    const r = await c.call('PUT', `/jadwal/${besok}`, { buka: true, jam_buka: '07:00', jam_tutup: '16:00' }, 2);
    assert.equal(r.status, 403);
  });

  test('daftar jadwal hari ini + 7 hari ke depan', async () => {
    const r = await c.call('GET', '/jadwal?hari=8');
    assert.equal(r.body.length, 8);
    assert.equal(r.body[0].tanggal, hariIni());
    assert.equal(r.body[7].tanggal, tambahHari(hariIni(), 7));
  });
});

// =====================================================================
describe('Task 3 (EP-02 US-05): pesanan & pembayaran', () => {
  const c = siapkan();

  test('transaksi beberapa item: total benar, metode tersimpan, stok berkurang, log lengkap', async () => {
    const ng = c.barang('Nasi Goreng'), et = c.barang('Es Teh Manis');
    const r = await c.call('POST', '/transaksi', {
      metode_bayar: 'qris',
      items: [{ id_barang: ng.id_barang, jumlah: 2 }, { id_barang: et.id_barang, jumlah: 3 }],
    }, 2);
    assert.equal(r.status, 201);
    const t = r.body;
    assert.equal(t.total, 2 * ng.harga_jual + 3 * et.harga_jual);
    assert.equal(t.metode_bayar, 'qris');
    assert.equal(t.id_pengguna, 2);
    assert.match(t.waktu_transaksi, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(t.items.length, 2);
    assert.deepEqual(t.items.map((i) => [i.jumlah, i.harga_satuan, i.subtotal]), [[2, ng.harga_jual, 2 * ng.harga_jual], [3, et.harga_jual, 3 * et.harga_jual]]);
    assert.equal(c.barang('Nasi Goreng').stok_saat_ini, ng.stok_saat_ini - 2);
    assert.equal(c.barang('Es Teh Manis').stok_saat_ini, et.stok_saat_ini - 3);
    const sk = c.db.prepare('SELECT * FROM STOK_KELUAR WHERE id_transaksi = ? ORDER BY id_keluar').all(t.id_transaksi);
    assert.deepEqual(sk.map((x) => [x.id_barang, x.jumlah, x.alasan]), [[ng.id_barang, 2, 'terjual'], [et.id_barang, 3, 'terjual']]);
  });

  test('transaksi tunai tersimpan', async () => {
    const r = await c.call('POST', '/transaksi', { metode_bayar: 'tunai', items: [{ id_barang: c.barang('Gorengan').id_barang, jumlah: 1 }] });
    assert.equal(r.status, 201);
    assert.equal(r.body.metode_bayar, 'tunai');
  });

  test('metode bayar wajib dipilih', async () => {
    const n = c.hitung('TRANSAKSI');
    for (const m of [undefined, '', 'debit']) {
      const r = await c.call('POST', '/transaksi', { metode_bayar: m, items: [{ id_barang: 1, jumlah: 1 }] });
      assert.equal(r.status, 400);
      assert.equal(r.body.field, 'metode_bayar');
    }
    assert.equal(c.hitung('TRANSAKSI'), n);
  });

  test('pesanan kosong ditolak', async () => {
    const r = await c.call('POST', '/transaksi', { metode_bayar: 'qris', items: [] });
    assert.equal(r.status, 400);
  });

  test('barang sama ditambah dua kali digabung (tidak terhitung ganda)', async () => {
    const k = c.barang('Kerupuk');
    const r = await c.call('POST', '/transaksi', { metode_bayar: 'qris', items: [{ id_barang: k.id_barang, jumlah: 1 }, { id_barang: k.id_barang, jumlah: 2 }] });
    assert.equal(r.body.items.length, 1);
    assert.equal(r.body.items[0].jumlah, 3);
    assert.equal(c.barang('Kerupuk').stok_saat_ini, k.stok_saat_ini - 3);
  });

  test('barang habis ditolak', async () => {
    const r = await c.call('POST', '/transaksi', { metode_bayar: 'qris', items: [{ id_barang: c.barang('Teh Botol').id_barang, jumlah: 1 }] });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /habis/);
  });

  test('ROLLBACK: satu item stoknya kurang → seluruh transaksi batal, stok & log tidak berubah', async () => {
    const ng = c.barang('Nasi Goreng'), ag = c.barang('Nasi Ayam Geprek');
    const sebelum = { trx: c.hitung('TRANSAKSI'), det: c.hitung('DETAIL_TRANSAKSI'), keluar: c.hitung('STOK_KELUAR') };
    const r = await c.call('POST', '/transaksi', {
      metode_bayar: 'tunai',
      items: [{ id_barang: ng.id_barang, jumlah: 1 }, { id_barang: ag.id_barang, jumlah: ag.stok_saat_ini + 1 }],
    });
    assert.equal(r.status, 409);
    assert.match(r.body.error, new RegExp(`Sisa stok: ${ag.stok_saat_ini}`));
    assert.equal(c.barang('Nasi Goreng').stok_saat_ini, ng.stok_saat_ini, 'item pertama tidak boleh ikut berkurang');
    assert.equal(c.barang('Nasi Ayam Geprek').stok_saat_ini, ag.stok_saat_ini);
    assert.deepEqual({ trx: c.hitung('TRANSAKSI'), det: c.hitung('DETAIL_TRANSAKSI'), keluar: c.hitung('STOK_KELUAR') }, sebelum);
  });

  test('harga diambil dari database, bukan dari HP; transaksi lama tidak berubah saat harga naik', async () => {
    const ng = c.barang('Nasi Goreng');
    const r = await c.call('POST', '/transaksi', { metode_bayar: 'qris', items: [{ id_barang: ng.id_barang, jumlah: 1, harga_satuan: 1 }] });
    assert.equal(r.body.total, ng.harga_jual);
    await c.call('PATCH', `/barang/${ng.id_barang}`, { harga_jual: ng.harga_jual + 3000 });
    const lama = await c.call('GET', `/transaksi/${r.body.id_transaksi}`);
    assert.equal(lama.body.total, ng.harga_jual);
    assert.equal(lama.body.items[0].harga_satuan, ng.harga_jual);
  });

  test('log penjualan harian: daftar transaksi + total QRIS & tunai', async () => {
    const r = await c.call('GET', `/transaksi?tanggal=${hariIni()}`);
    const s = r.body.ringkasan;
    assert.equal(s.jumlah_transaksi, r.body.transaksi.length);
    assert.equal(s.total, s.total_qris + s.total_tunai);
    const dariDb = c.db.prepare('SELECT SUM(total) s FROM TRANSAKSI').get().s;
    assert.equal(s.total, dariDb);
  });

  test('konsistensi: total transaksi = jumlah subtotal; stok_saat_ini = masuk − keluar', () => {
    const salah = c.db.prepare(`SELECT t.id_transaksi FROM TRANSAKSI t
      WHERE t.total != (SELECT SUM(subtotal) FROM DETAIL_TRANSAKSI d WHERE d.id_transaksi = t.id_transaksi)`).all();
    assert.deepEqual(salah, []);
    const rows = c.db.prepare(`SELECT b.nama_barang, b.stok_saat_ini,
        COALESCE((SELECT SUM(jumlah) FROM STOK_MASUK m WHERE m.id_barang = b.id_barang), 0)
      - COALESCE((SELECT SUM(jumlah) FROM STOK_KELUAR k WHERE k.id_barang = b.id_barang), 0) AS hitung FROM BARANG b`).all();
    for (const r of rows) assert.equal(r.stok_saat_ini, r.hitung, r.nama_barang);
  });

  test('waktu proses server per transaksi jauh di bawah 30 detik (rata-rata 20 transaksi)', async () => {
    const id = c.barang('Gorengan').id_barang;
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      const r = await c.call('POST', '/transaksi', { metode_bayar: i % 2 ? 'qris' : 'tunai', items: [{ id_barang: id, jumlah: 1 }] });
      assert.equal(r.status, 201);
    }
    const rata = (performance.now() - t0) / 20;
    assert.ok(rata < 1000, `rata-rata ${rata.toFixed(1)} ms`);
  });
});
