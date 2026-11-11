// EP-01 US-02 — Stok: daftar sisa stok, form stok masuk, form stok keluar, riwayat.
// Stok tidak boleh minus: dicek di form, di server, dan di database.
import { api, esc, angka, rupiah, toast, cekJumlah, setErr, clearErr, ikonCari, sekarangWIB, infoTanggal, kapital } from '../util.js';
import { ikon } from './auth.js';

const ikonSegarkan = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
const ikonX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** Urutan menu = urutan barang dimasukkan (sama dengan Kasir). */
const urutMenu = (rows) => rows.sort((a, b) => a.id_barang - b.id_barang);

export async function render(app, sub, q) {
  if (sub === 'masuk') return formStok(app, q, 'masuk');
  if (sub === 'keluar') return formStok(app, q, 'keluar');
  if (sub === 'riwayat') return riwayat(app, q);
  return daftar(app);
}

/** Kolom cari dengan tombol × untuk mengosongkan. */
function kolomCari(id, placeholder) {
  return `
    <label class="bantuan-cari-input ada-hapus">
      ${ikonCari}
      <input type="search" id="${id}" placeholder="${placeholder}" aria-label="${placeholder.replace('…', '')}" autocomplete="off">
      <button type="button" class="cari-hapus hidden" aria-label="Kosongkan pencarian">${ikonX}</button>
    </label>`;
}
function pasangCari(app, id, onUbah) {
  const input = app.querySelector(`#${id}`);
  const hapus = input.parentElement.querySelector('.cari-hapus');
  const ubah = () => { hapus.classList.toggle('hidden', !input.value); onUbah(input.value.trim()); };
  input.addEventListener('input', ubah);
  hapus.addEventListener('click', () => { input.value = ''; ubah(); input.focus(); });
}

// ---------------------------------------------------------------------
// Daftar sisa stok
// ---------------------------------------------------------------------
async function daftar(app) {
  let kata = '';
  app.innerHTML = `
    <section class="bantuan-card stok-hero">
      <h1>Stok</h1>
      <nav class="stok-aksi" aria-label="Aksi stok">
        <a href="#/stok/masuk">Masuk</a>
        <a href="#/stok/keluar">Keluar</a>
        <a href="#/stok/riwayat">Riwayat</a>
      </nav>
    </section>
    <div class="bantuan-card bantuan-cari">${kolomCari('cari', 'Cari nama menu…')}</div>
    <div class="stok-list" id="list"><p class="empty">Memuat…</p></div>`;

  const listEl = app.querySelector('#list');
  let semua = [];

  function tampil() {
    const k = kata.toLowerCase();
    const rows = semua.filter((b) => b.nama_barang.toLowerCase().includes(k));
    if (!rows.length) {
      listEl.innerHTML = `<p class="empty">${kata ? `Tidak ada menu dengan nama “${esc(kata)}”.` : 'Belum ada menu.'}</p>`;
      return;
    }
    const label = { aman: 'Stok aman', menipis: 'Stok menipis', habis: 'Stok habis' };
    listEl.innerHTML = rows.map((b) => `
      <article class="stok-kartu">
        <div class="menu-item-baris">
          <h3>${esc(b.nama_barang)}</h3>
          <span class="qty-badge num ${b.status}" title="${label[b.status]} (minimum ${angka(b.stok_minimum)})"
                aria-label="${label[b.status]}: ${angka(b.stok_saat_ini)} ${esc(b.satuan)}">${angka(b.stok_saat_ini)}</span>
        </div>
        <div class="menu-item-baris bawah">
          <span class="chip-satuan">${esc(kapital(b.satuan))}</span>
          <b class="num">${rupiah(b.harga_jual)}</b>
        </div>
      </article>`).join('');
  }

  pasangCari(app, 'cari', (v) => { kata = v; tampil(); });
  semua = urutMenu(await api('/barang'));
  tampil();
}

// ---------------------------------------------------------------------
// Form stok masuk / stok keluar (satu kerangka, beda isian alasan)
// ---------------------------------------------------------------------
async function formStok(app, q, jenis) {
  const keluar = jenis === 'keluar';
  const Judul = keluar ? 'Keluar' : 'Masuk';
  const barang = urutMenu(await api('/barang'));
  const peta = new Map(barang.map((b) => [String(b.id_barang), b]));

  app.innerHTML = `
    <a href="#/stok" class="btn-kembali">${ikon.kiri} Kembali ke Stok</a>
    <form class="bantuan-card stok-form" id="f" novalidate>
      <h1>Input Stok ${Judul}</h1>
      <p class="panduan-sub">Masukkan rincian item menu dan kuantitas persediaan</p>
      <div class="field">
        <label for="id_barang">Menu <span class="wajib">*</span></label>
        <select class="input" id="id_barang" name="id_barang">
          <option value="">-- Pilih Menu --</option>
          ${barang.map((b) => `<option value="${b.id_barang}" ${String(b.id_barang) === String(q.barang) ? 'selected' : ''}>${esc(b.nama_barang)}</option>`).join('')}
        </select>
        <div class="hint" id="info-sisa"></div>
        <div class="err" data-err="id_barang"></div>
      </div>
      <div class="field">
        <label for="jumlah">Jumlah ${Judul} <span class="wajib">*</span></label>
        <div class="stepper-besar">
          <button type="button" data-langkah="-1" aria-label="Kurangi jumlah">−</button>
          <input class="num" id="jumlah" name="jumlah" inputmode="numeric" autocomplete="off" value="0">
          <button type="button" data-langkah="1" aria-label="Tambah jumlah">+</button>
        </div>
        <div class="err" data-err="jumlah"></div>
      </div>
      ${keluar ? `
      <div class="field">
        <label for="alasan">Alasan Keluar <span class="wajib">*</span></label>
        <select class="input" id="alasan" name="alasan">
          <option value="">-- Pilih Alasan --</option>
          <option value="rusak">Rusak</option>
          <option value="lainnya">Lainnya</option>
        </select>
        <div class="err" data-err="alasan"></div>
      </div>` : ''}
      <div class="field">
        <label for="catatan">Catatan Tambahan <span class="muted">(Opsional)</span></label>
        <textarea class="input" id="catatan" name="catatan" rows="3" maxlength="200" placeholder="Contoh: Stok ${jenis}"></textarea>
      </div>
      ${keluar ? '<p class="small muted stok-form-catatan">Penjualan dari Kasir sudah otomatis mengurangi stok. Form ini untuk barang yang berkurang di luar kasir.</p>' : ''}
      <button class="btn primary block" type="submit">Simpan Stok ${Judul}</button>
      <a href="#/stok" class="btn block btn-batal">Batal</a>
    </form>`;

  const f = app.querySelector('#f');
  const info = app.querySelector('#info-sisa');
  const labelJumlah = `Jumlah ${jenis}`;

  const tampilSisa = () => {
    const b = peta.get(f.id_barang.value);
    info.innerHTML = b ? `Sisa stok sekarang: <b class="num">${angka(b.stok_saat_ini)} ${esc(b.satuan)}</b>` : '';
  };

  /** Validasi jumlah; pesan "belum diisi" untuk kosong/0 seperti di desain. */
  function cekJumlahForm() {
    const raw = f.jumlah.value.trim();
    if (!raw || raw === '0') return [null, `${kapital(labelJumlah)} belum diisi`];
    const [n, err] = cekJumlah(raw, kapital(labelJumlah));
    if (err) return [null, err];
    const b = peta.get(f.id_barang.value);
    if (keluar && b && n > b.stok_saat_ini) return [null, `Stok tidak cukup. Sisa stok: ${b.stok_saat_ini} ${b.satuan}.`];
    return [n, ''];
  }

  f.id_barang.addEventListener('change', () => {
    tampilSisa();
    setErr(f, 'id_barang', '');
    if (keluar && f.jumlah.value !== '0') setErr(f, 'jumlah', cekJumlahForm()[1]);
  });
  f.addEventListener('click', (e) => {
    const t = e.target.closest('[data-langkah]');
    if (!t) return;
    const n = Number(f.jumlah.value.replace(/\D/g, '')) || 0;
    f.jumlah.value = String(Math.max(0, n + Number(t.dataset.langkah)));
    setErr(f, 'jumlah', f.jumlah.value === '0' ? '' : cekJumlahForm()[1]);
  });
  f.jumlah.addEventListener('focus', () => { if (f.jumlah.value === '0') f.jumlah.select(); });
  f.jumlah.addEventListener('input', () => setErr(f, 'jumlah', f.jumlah.value.trim() && f.jumlah.value !== '0' ? cekJumlahForm()[1] : ''));
  if (keluar) f.alasan.addEventListener('change', () => setErr(f, 'alasan', ''));
  tampilSisa();

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr(f);
    let ok = true;
    const b = peta.get(f.id_barang.value);
    if (!b) { setErr(f, 'id_barang', 'Menu belum dipilih'); ok = false; }
    const [jumlah, errJ] = cekJumlahForm();
    if (errJ) { setErr(f, 'jumlah', errJ); ok = false; }
    if (keluar && !f.alasan.value) { setErr(f, 'alasan', 'Alasan keluar belum dipilih'); ok = false; }
    if (!ok) { f.querySelector('[aria-invalid="true"]')?.focus(); return; }

    const tombol = f.querySelector('button[type=submit]');
    tombol.disabled = true;
    try {
      const body = { id_barang: b.id_barang, jumlah, catatan: f.catatan.value };
      if (keluar) body.alasan = f.alasan.value;
      const r = await api(`/stok/${jenis}`, { method: 'POST', body });
      peta.set(String(r.barang.id_barang), r.barang);
      toast(`Stok ${jenis} berhasil disimpan`, 'ok');
      // Siap untuk input berikutnya: menu tetap terpilih, sisa stok diperbarui.
      f.jumlah.value = '0';
      f.catatan.value = '';
      if (keluar) f.alasan.value = '';
      tampilSisa();
    } catch (err) {
      // Penolakan server (mis. stok berubah karena transaksi lain) tampil di field terkait.
      if (err.field && f.querySelector(`[data-err="${err.field}"]`)) setErr(f, err.field, err.message);
      else toast(err.message, 'err');
      const segar = await api('/barang').catch(() => null);
      if (segar) { segar.forEach((x) => peta.set(String(x.id_barang), x)); tampilSisa(); }
    } finally {
      tombol.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------
// Riwayat stok masuk & keluar per tanggal
// ---------------------------------------------------------------------
async function riwayat(app) {
  const hariIni = sekarangWIB().tanggal;
  let kata = '';
  let rows = [];
  app.innerHTML = `
    <a href="#/stok" class="btn-kembali">${ikon.kiri} Kembali ke Stok</a>
    <h1 class="page-title riwayat-judul">Riwayat Stok</h1>
    <div class="bantuan-card riwayat-filter">
      ${kolomCari('cari', 'Cari nama menu…')}
      <div class="riwayat-tgl">
        <input class="input num" type="date" id="tgl" value="${hariIni}" max="${hariIni}" aria-label="Tanggal riwayat">
        <button type="button" class="btn-ikon" id="segarkan" aria-label="Muat ulang riwayat">${ikonSegarkan}</button>
      </div>
    </div>
    <div class="riwayat-list" id="list"><p class="empty">Memuat…</p></div>`;
  const listEl = app.querySelector('#list');
  const tgl = app.querySelector('#tgl');

  function keterangan(r) {
    if (r.jenis === 'masuk') return r.catatan || '-';
    if (r.alasan === 'terjual') return r.id_transaksi ? 'Terjual lewat Kasir' : 'Terjual';
    return kapital(r.alasan) + (r.catatan ? ` · ${r.catatan}` : '');
  }
  function waktu(w) {
    const t = infoTanggal(w.slice(0, 10));
    return `${t.tgl} ${t.bulan} ${t.tahun}${w.length > 10 ? `, ${w.slice(11, 16)} WIB` : ''}`;
  }

  function tampil() {
    const k = kata.toLowerCase();
    const pilih = rows.filter((r) => r.nama_barang.toLowerCase().includes(k));
    if (!pilih.length) {
      listEl.innerHTML = `<p class="empty">${kata ? `Tidak ada riwayat untuk “${esc(kata)}” pada tanggal ini.` : 'Belum ada riwayat stok pada tanggal ini.'}</p>`;
      return;
    }
    listEl.innerHTML = pilih.map((r) => {
      const masuk = r.jenis === 'masuk';
      return `
        <article class="bantuan-card riwayat-item">
          <div class="menu-item-baris">
            <div><b>${esc(r.nama_barang)}</b><span class="riwayat-waktu num">${waktu(r.waktu)}</span></div>
            <b class="riwayat-jml num ${masuk ? 'masuk' : 'keluar'}" aria-label="${masuk ? 'Masuk' : 'Keluar'} ${angka(r.jumlah)} ${esc(r.satuan)}">${masuk ? '+' : '-'}${angka(r.jumlah)}</b>
          </div>
          <p class="riwayat-ket">${esc(keterangan(r))}</p>
        </article>`;
    }).join('');
  }

  async function muat() {
    if (!tgl.value) return;
    listEl.innerHTML = '<p class="empty">Memuat…</p>';
    try {
      rows = await api(`/stok/riwayat?tanggal=${tgl.value}&limit=500`);
      tampil();
    } catch (err) {
      listEl.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
    }
  }

  pasangCari(app, 'cari', (v) => { kata = v; tampil(); });
  tgl.addEventListener('change', muat);
  app.querySelector('#segarkan').addEventListener('click', muat);
  await muat();
}
