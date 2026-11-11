// Aplikasi Express: API + halaman web (folder public).
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { akunAdmin } = require('./config');
const { ValidasiError } = require('./lib/validasi');
const { hariIni } = require('./lib/waktu');
const layananBarang = require('./services/barang');
const layananStok = require('./services/stok');
const layananJadwal = require('./services/jadwal');
const layananTransaksi = require('./services/transaksi');

/** Bandingkan teks tanpa bocor waktu (cegah tebak kata sandi lewat lama respons). */
function samaAman(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function buatApp(db) {
  const barang = layananBarang(db);
  const stok = layananStok(db, barang);
  const jadwal = layananJadwal(db);
  const transaksi = layananTransaksi(db, barang, stok);

  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Pengguna aktif dikirim lewat header X-Pengguna-Id (dipilih di layar awal).
  // Pencatat (id_pengguna) SELALU diambil dari sini, tidak pernah dari isian form.
  const qPengguna = db.prepare('SELECT * FROM PENGGUNA WHERE id_pengguna = ?');
  function wajibPengguna(req, _res, next) {
    const id = Number(req.get('X-Pengguna-Id'));
    const p = id ? qPengguna.get(id) : null;
    if (!p) return next(new ValidasiError('Pilih pengguna dulu (Bu Mimin / Bu Sri).', 'pengguna', 401));
    req.pengguna = p;
    next();
  }
  function wajibAdmin(req, _res, next) {
    if (req.pengguna.peran !== 'admin') {
      return next(new ValidasiError('Hanya admin yang boleh mengubah jadwal buka tutup.', 'pengguna', 403));
    }
    next();
  }

  const api = express.Router();

  api.get('/info', (_req, res) => res.json({ hari_ini: hariIni(), versi: '0.2.0-sprint2' }));
  api.get('/pengguna', (_req, res) => res.json(db.prepare('SELECT * FROM PENGGUNA ORDER BY id_pengguna').all()));

  // ---------- MASUK (login admin) ----------
  // Email & kata sandi dicocokkan dengan .env (lihat config.akunAdmin).
  api.post('/masuk', (req, res) => {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const sandi = typeof body.kata_sandi === 'string' ? body.kata_sandi : '';
    if (!email) throw new ValidasiError('Email wajib diisi.', 'email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidasiError('Format email tidak valid.', 'email');
    if (!sandi) throw new ValidasiError('Kata sandi wajib diisi.', 'kata_sandi');
    const cocok = email === akunAdmin.email && samaAman(sandi, akunAdmin.kataSandi);
    if (!cocok) throw new ValidasiError('Email atau kata sandi salah.', 'kata_sandi', 401);
    const admin = db.prepare("SELECT * FROM PENGGUNA WHERE peran = 'admin' ORDER BY id_pengguna LIMIT 1").get();
    if (!admin) throw new ValidasiError('Akun admin belum ada di database.', 'email', 500);
    res.json({ pengguna: admin });
  });

  // ---------- BARANG / daftar sisa stok ----------
  api.get('/barang', (req, res) => res.json(barang.daftar({ q: req.query.q, semua: req.query.semua === '1' })));
  api.get('/barang/:id', (req, res) => res.json(barang.ambilWajib(req.params.id)));
  api.post('/barang', wajibPengguna, (req, res) => res.status(201).json(barang.tambah(req.body || {}, req.pengguna.id_pengguna)));
  api.patch('/barang/:id', wajibPengguna, (req, res) => res.json(barang.ubah(req.params.id, req.body || {})));

  // ---------- STOK (EP-01 US-02) ----------
  api.post('/stok/masuk', wajibPengguna, (req, res) => res.status(201).json(stok.catatMasuk(req.body || {}, req.pengguna.id_pengguna)));
  api.post('/stok/keluar', wajibPengguna, (req, res) => res.status(201).json(stok.catatKeluar(req.body || {}, req.pengguna.id_pengguna)));
  api.get('/stok/riwayat', (req, res) => res.json(stok.riwayat({ id_barang: req.query.id_barang, limit: req.query.limit })));

  // ---------- JADWAL (EP-01 US-03) ----------
  api.get('/jadwal', (req, res) => res.json(jadwal.rentang(req.query.dari || hariIni(), req.query.hari || 8)));
  api.get('/jadwal/:tanggal', (req, res) => res.json({ tanggal: req.params.tanggal, jadwal: jadwal.ambil(req.params.tanggal) }));
  api.put('/jadwal/:tanggal', wajibPengguna, wajibAdmin, (req, res) =>
    res.json(jadwal.simpan(req.params.tanggal, req.body || {}, req.pengguna.id_pengguna))
  );

  // ---------- TRANSAKSI (EP-02 US-05) ----------
  api.post('/transaksi', wajibPengguna, (req, res) => res.status(201).json(transaksi.simpan(req.body || {}, req.pengguna.id_pengguna)));
  api.get('/transaksi', (req, res) => res.json(transaksi.logHarian(req.query.tanggal || hariIni())));
  api.get('/transaksi/:id', (req, res) => {
    const t = transaksi.ambil(req.params.id);
    if (!t) throw new ValidasiError('Transaksi tidak ditemukan.', 'id', 404);
    res.json(t);
  });

  app.use('/api', api);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Alamat API tidak ditemukan.' }));

  // Halaman web
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

  // Penanganan error: pesan validasi dikirim apa adanya; error lain disamarkan.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ValidasiError) return res.status(err.status).json({ error: err.message, field: err.field });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Data yang dikirim tidak valid.' });
    if (err.code && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'Data ditolak karena melanggar aturan database.', detail: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  });

  return app;
}

module.exports = { buatApp };
