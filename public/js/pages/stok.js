// EP-01 US-02 — Stok: daftar sisa stok, form stok masuk, form stok keluar, riwayat.
import { api, esc, angka, toast, cekJumlah, setErr, clearErr, ikonCari, badgeStatus, sekarangWIB, infoTanggal } from '../util.js';

const TAB = [
  ['daftar', 'Sisa stok'],
  ['masuk', 'Masuk'],
  ['keluar', 'Keluar'],
  ['riwayat', 'Riwayat'],
];

function tabs(aktif) {
  return `<nav class="seg">${TAB.map(([k, l]) => `<a href="#/stok/${k}" class="${k === aktif ? 'active' : ''}">${l}</a>`).join('')}</nav>`;
}

export async function render(app, sub, q) {
  if (sub === 'masuk') return formMasuk(app, q);
  if (sub === 'keluar') return formKeluar(app, q);
  if (sub === 'riwayat') return riwayat(app, q);
  return daftar(app, q);
}

// ---------------------------------------------------------------------
// Daftar sisa stok
// ---------------------------------------------------------------------
async function daftar(app, q) {
  let filter = q.filter || 'semua';
  let kata = '';
  app.innerHTML = `
    <h1 class="page-title">Stok</h1>
    ${tabs('daftar')}
    <div class="summary-strip" id="ringkas"></div>
    <div class="search">${ikonCari}<input class="input" id="cari" type="search" placeholder="Cari nama barang…" autocomplete="off"></div>
    <ul class="list" id="list"><li class="empty">Memuat…</li></ul>`;

  const listEl = app.querySelector('#list');
  const ringkas = app.querySelector('#ringkas');
  let semua = [];

  function tampil() {
    const n = { semua: semua.length, menipis: 0, habis: 0 };
    semua.forEach((b) => { if (b.status === 'habis') n.habis++; else if (b.status === 'menipis') n.menipis++; });
    ringkas.innerHTML = [
      ['semua', 'Barang aktif'],
      ['menipis', 'Menipis'],
      ['habis', 'Habis'],
    ].map(([k, l]) => `<button data-f="${k}" aria-pressed="${filter === k}"><b class="num">${n[k]}</b><span>${l}</span></button>`).join('');

    const k = kata.toLowerCase();
    const rows = semua.filter((b) => (filter === 'semua' || b.status === filter) && b.nama_barang.toLowerCase().includes(k));
    if (!rows.length) {
      listEl.innerHTML = `<li class="empty">${kata ? `Tidak ada barang dengan nama “${esc(kata)}”.` : 'Tidak ada barang di kategori ini.'}</li>`;
      return;
    }
    listEl.innerHTML = rows.map((b) => `
      <li class="stok-item ${b.status}" data-id="${b.id_barang}">
        <div class="row">
          <div class="grow">
            <div class="ellipsis"><b>${esc(b.nama_barang)}</b></div>
            <div class="small muted">${badgeStatus(b.status)} min. ${angka(b.stok_minimum)} ${esc(b.satuan)}</div>
          </div>
          <div class="qty num">${angka(b.stok_saat_ini)}<small>${esc(b.satuan)}</small></div>
        </div>
        <div class="mini-actions">
          <a class="btn sm" href="#/stok/masuk?barang=${b.id_barang}">+ Masuk</a>
          <a class="btn sm" href="#/stok/keluar?barang=${b.id_barang}">− Keluar</a>
        </div>
      </li>`).join('');
  }

  ringkas.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    tampil();
  });
  app.querySelector('#cari').addEventListener('input', (e) => { kata = e.target.value.trim(); tampil(); });

  semua = await api('/barang');
  tampil();
}

// ---------------------------------------------------------------------
// Pilihan barang (dipakai form masuk & keluar)
// ---------------------------------------------------------------------
function opsiBarang(barang, terpilih) {
  return `<option value="">— Pilih barang —</option>` + barang.map((b) =>
    `<option value="${b.id_barang}" ${String(b.id_barang) === String(terpilih) ? 'selected' : ''}>${esc(b.nama_barang)} (sisa ${angka(b.stok_saat_ini)} ${esc(b.satuan)})</option>`
  ).join('');
}

// ---------------------------------------------------------------------
// Form stok masuk
// ---------------------------------------------------------------------
async function formMasuk(app, q) {
  const barang = await api('/barang');
  const hariIni = sekarangWIB().tanggal;
  app.innerHTML = `
    <h1 class="page-title">Stok</h1>
    ${tabs('masuk')}
    <div id="hasil"></div>
    <form class="card" id="f" novalidate>
      <div class="field">
        <label for="id_barang">Barang</label>
        <select class="input" id="id_barang" name="id_barang">${opsiBarang(barang, q.barang)}</select>
        <div class="err" data-err="id_barang"></div>
      </div>
      <div class="field">
        <label for="jumlah">Jumlah masuk</label>
        <input class="input big num" id="jumlah" name="jumlah" type="text" inputmode="numeric" autocomplete="off" placeholder="0">
        <div class="hint" id="info-sisa"></div>
        <div class="err" data-err="jumlah"></div>
      </div>
      <div class="field">
        <label for="tanggal_masuk">Tanggal masuk</label>
        <input class="input" id="tanggal_masuk" name="tanggal_masuk" type="date" value="${hariIni}" max="${hariIni}">
        <div class="err" data-err="tanggal_masuk"></div>
      </div>
      <div class="field">
        <label for="catatan">Catatan <span class="muted">(opsional)</span></label>
        <input class="input" id="catatan" name="catatan" type="text" maxlength="200" placeholder="mis. dari supplier Pak Budi">
      </div>
      <button class="btn primary block lg" type="submit">Simpan stok masuk</button>
    </form>`;

  const f = app.querySelector('#f');
  const hasil = app.querySelector('#hasil');
  const info = app.querySelector('#info-sisa');
  const peta = new Map(barang.map((b) => [String(b.id_barang), b]));
  const tampilSisa = () => {
    const b = peta.get(f.id_barang.value);
    info.textContent = b ? `Sisa stok sekarang: ${angka(b.stok_saat_ini)} ${b.satuan}` : '';
  };
  f.id_barang.addEventListener('change', tampilSisa);
  tampilSisa();
  if (q.barang) f.jumlah.focus();

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr(f);
    hasil.innerHTML = '';
    let ok = true;
    if (!f.id_barang.value) { setErr(f, 'id_barang', 'Barang wajib dipilih.'); ok = false; }
    const [jumlah, errJ] = cekJumlah(f.jumlah.value);
    if (errJ) { setErr(f, 'jumlah', errJ); ok = false; }
    if (!f.tanggal_masuk.value) { setErr(f, 'tanggal_masuk', 'Tanggal masuk wajib diisi.'); ok = false; }
    if (!ok) return;

    const tombol = f.querySelector('button[type=submit]');
    tombol.disabled = true;
    try {
      const r = await api('/stok/masuk', {
        method: 'POST',
        body: { id_barang: Number(f.id_barang.value), jumlah, tanggal_masuk: f.tanggal_masuk.value, catatan: f.catatan.value },
      });
      const b = r.barang;
      peta.set(String(b.id_barang), b);
      hasil.innerHTML = `<div class="notice ok">Tersimpan: +${angka(jumlah)} ${esc(b.satuan)} ${esc(b.nama_barang)}. Sisa stok sekarang <b>${angka(b.stok_saat_ini)} ${esc(b.satuan)}</b>.</div>`;
      toast('Stok masuk tersimpan', 'ok');
      // Kosongkan form untuk input berikutnya; perbarui angka sisa di pilihan barang.
      f.id_barang.innerHTML = opsiBarang([...peta.values()].sort((a, c) => a.nama_barang.localeCompare(c.nama_barang)), '');
      f.jumlah.value = '';
      f.catatan.value = '';
      f.tanggal_masuk.value = sekarangWIB().tanggal;
      tampilSisa();
    } catch (err) {
      if (err.field && f.querySelector(`[data-err="${err.field}"]`)) setErr(f, err.field, err.message);
      else hasil.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
    } finally {
      tombol.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------
// Form stok keluar (tidak boleh membuat stok negatif)
// ---------------------------------------------------------------------
async function formKeluar(app, q) {
  const barang = await api('/barang');
  app.innerHTML = `
    <h1 class="page-title">Stok</h1>
    ${tabs('keluar')}
    <div id="hasil"></div>
    <form class="card" id="f" novalidate>
      <div class="field">
        <label for="id_barang">Barang</label>
        <select class="input" id="id_barang" name="id_barang">${opsiBarang(barang, q.barang)}</select>
        <div class="err" data-err="id_barang"></div>
      </div>
      <div class="field">
        <label for="jumlah">Jumlah keluar</label>
        <input class="input big num" id="jumlah" name="jumlah" type="text" inputmode="numeric" autocomplete="off" placeholder="0">
        <div class="hint" id="info-sisa"></div>
        <div class="err" data-err="jumlah"></div>
      </div>
      <div class="field">
        <span class="label">Alasan</span>
        <div class="pills" id="alasan">
          <button type="button" class="pill" data-v="terjual" aria-pressed="false">Terjual</button>
          <button type="button" class="pill" data-v="rusak" aria-pressed="false">Rusak</button>
          <button type="button" class="pill" data-v="lainnya" aria-pressed="false">Lainnya</button>
        </div>
        <input type="hidden" name="alasan" value="">
        <div class="hint">Penjualan dari menu Kasir sudah otomatis mengurangi stok. Form ini untuk pencatatan di luar kasir.</div>
        <div class="err" data-err="alasan"></div>
      </div>
      <p class="small muted" style="margin:-4px 0 14px">Waktu keluar dan pencatat terisi otomatis.</p>
      <button class="btn primary block lg" type="submit">Simpan stok keluar</button>
    </form>`;

  const f = app.querySelector('#f');
  const hasil = app.querySelector('#hasil');
  const info = app.querySelector('#info-sisa');
  const peta = new Map(barang.map((b) => [String(b.id_barang), b]));

  const tampilSisa = () => {
    const b = peta.get(f.id_barang.value);
    info.innerHTML = b
      ? `Sisa stok: <b class="num">${angka(b.stok_saat_ini)} ${esc(b.satuan)}</b> — jumlah keluar tidak boleh lebih dari ini.`
      : '';
    f.jumlah.max = b ? b.stok_saat_ini : '';
  };
  f.id_barang.addEventListener('change', () => { tampilSisa(); setErr(f, 'jumlah', ''); });
  tampilSisa();
  if (q.barang) f.jumlah.focus();

  app.querySelector('#alasan').addEventListener('click', (e) => {
    const b = e.target.closest('.pill');
    if (!b) return;
    app.querySelectorAll('#alasan .pill').forEach((p) => p.setAttribute('aria-pressed', String(p === b)));
    f.alasan.value = b.dataset.v;
    setErr(f, 'alasan', '');
  });

  // Peringatan langsung saat mengetik jumlah yang melebihi sisa.
  f.jumlah.addEventListener('input', () => {
    const b = peta.get(f.id_barang.value);
    const [n] = cekJumlah(f.jumlah.value);
    if (b && n && n > b.stok_saat_ini) setErr(f, 'jumlah', `Stok tidak cukup. Sisa stok: ${b.stok_saat_ini} ${b.satuan}.`);
    else setErr(f, 'jumlah', '');
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr(f);
    hasil.innerHTML = '';
    let ok = true;
    const b = peta.get(f.id_barang.value);
    if (!b) { setErr(f, 'id_barang', 'Barang wajib dipilih.'); ok = false; }
    const [jumlah, errJ] = cekJumlah(f.jumlah.value);
    if (errJ) { setErr(f, 'jumlah', errJ); ok = false; }
    else if (b && jumlah > b.stok_saat_ini) { setErr(f, 'jumlah', `Stok tidak cukup. Sisa stok: ${b.stok_saat_ini} ${b.satuan}.`); ok = false; }
    if (!f.alasan.value) { setErr(f, 'alasan', 'Alasan wajib dipilih.'); ok = false; }
    if (!ok) return;

    const tombol = f.querySelector('button[type=submit]');
    tombol.disabled = true;
    try {
      const r = await api('/stok/keluar', { method: 'POST', body: { id_barang: b.id_barang, jumlah, alasan: f.alasan.value } });
      const nb = r.barang;
      peta.set(String(nb.id_barang), nb);
      hasil.innerHTML = `<div class="notice ok">Tersimpan: −${angka(jumlah)} ${esc(nb.satuan)} ${esc(nb.nama_barang)} (${esc(f.alasan.value)}). Sisa stok sekarang <b>${angka(nb.stok_saat_ini)} ${esc(nb.satuan)}</b>.</div>`;
      toast('Stok keluar tersimpan', 'ok');
      f.id_barang.innerHTML = opsiBarang([...peta.values()].sort((a, c) => a.nama_barang.localeCompare(c.nama_barang)), '');
      f.jumlah.value = '';
      f.alasan.value = '';
      app.querySelectorAll('#alasan .pill').forEach((p) => p.setAttribute('aria-pressed', 'false'));
      tampilSisa();
    } catch (err) {
      // Penolakan dari server (mis. stok berubah karena transaksi lain) tampil di field jumlah.
      if (err.field && f.querySelector(`[data-err="${err.field}"]`)) setErr(f, err.field, err.message);
      else hasil.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
      // Muat ulang sisa stok terbaru.
      const segar = await api('/barang').catch(() => null);
      if (segar) { segar.forEach((x) => peta.set(String(x.id_barang), x)); tampilSisa(); }
    } finally {
      tombol.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------
// Riwayat stok masuk & keluar
// ---------------------------------------------------------------------
async function riwayat(app, q) {
  const barang = await api('/barang?semua=1');
  app.innerHTML = `
    <h1 class="page-title">Stok</h1>
    ${tabs('riwayat')}
    <div class="field">
      <select class="input" id="fb"><option value="">Semua barang</option>${barang.map((b) => `<option value="${b.id_barang}" ${String(q.barang) === String(b.id_barang) ? 'selected' : ''}>${esc(b.nama_barang)}</option>`).join('')}</select>
    </div>
    <ul class="list" id="list"><li class="empty">Memuat…</li></ul>`;
  const listEl = app.querySelector('#list');
  const fb = app.querySelector('#fb');

  async function muat() {
    const rows = await api(`/stok/riwayat?limit=60${fb.value ? `&id_barang=${fb.value}` : ''}`);
    if (!rows.length) { listEl.innerHTML = '<li class="empty">Belum ada riwayat.</li>'; return; }
    listEl.innerHTML = rows.map((r) => {
      const masuk = r.jenis === 'masuk';
      const t = infoTanggal(r.waktu.slice(0, 10));
      const jam = masuk ? '' : ' ' + r.waktu.slice(11, 16).replace(':', '.');
      const ket = masuk ? (r.keterangan || 'Stok masuk') : (r.id_transaksi ? `Terjual · transaksi #${r.id_transaksi}` : r.keterangan[0].toUpperCase() + r.keterangan.slice(1));
      return `
        <li><div class="row">
          <div class="grow">
            <div class="ellipsis"><b>${esc(r.nama_barang)}</b></div>
            <div class="small muted ellipsis">${esc(ket)} · ${t.tgl} ${t.bulan}${jam} · ${esc(r.pencatat)}</div>
          </div>
          <div class="num" style="font-weight:800;color:${masuk ? 'var(--ok)' : 'var(--danger)'}">${masuk ? '+' : '−'}${angka(r.jumlah)}</div>
        </div></li>`;
    }).join('');
  }
  fb.addEventListener('change', muat);
  await muat();
}
