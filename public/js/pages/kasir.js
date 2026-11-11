// EP-02 US-05 — Kasir & Pesanan (walk-up): pilih menu, isi pesanan, pilih
// Tunai/QRIS, simpan. Target: satu transaksi selesai < 30 detik. Pengatur
// waktu menghitung dari halaman dibuka (atau transaksi sebelumnya) sampai tersimpan.
import { api, esc, rupiah, angka, toast, ikonCari, ikonMenu, kodePesanan, kapital, sekarangWIB } from '../util.js';

const KUNCI_WAKTU = 'warung.waktuTransaksi';
const TARGET_DETIK = 30;

function simpanWaktu(entri) {
  try {
    const arr = JSON.parse(localStorage.getItem(KUNCI_WAKTU) || '[]');
    arr.unshift(entri);
    localStorage.setItem(KUNCI_WAKTU, JSON.stringify(arr.slice(0, 50)));
  } catch { /* abaikan */ }
}

export async function render(app) {
  let barang = [];
  /** keranjang: Map<id_barang, jumlah> — barang yang sama digabung, tidak dobel. */
  const keranjang = new Map();
  let metode = '';
  let kata = '';
  let nomorBerikut = 1;
  let mulai = performance.now();

  app.innerHTML = `
    <section class="bantuan-card kasir-hero">
      <span class="bantuan-hero-ikon">${ikonMenu.kasir}</span>
      <h1>Kasir &amp; Pesanan</h1>
      <span class="timer num" id="timer" title="Waktu sejak pesanan dimulai (target < 30 detik)">0:00</span>
    </section>
    <div class="bantuan-card bantuan-cari">
      <label class="bantuan-cari-input">
        ${ikonCari}
        <input type="search" id="cari" placeholder="Cari nama menu…" aria-label="Cari nama menu" autocomplete="off">
      </label>
    </div>
    <div class="menu-list" id="menu-list"></div>

    <section class="bantuan-card pesanan" id="pesanan" aria-labelledby="judul-pesanan">
      <div class="pesanan-head">
        <div>
          <h2 id="judul-pesanan">Pesanan</h2>
          <span class="pesanan-kode num" id="kode"></span>
        </div>
        <button type="button" class="link-bahaya" id="bersihkan">Bersihkan</button>
      </div>
      <div class="pesanan-blok">
        <label for="nama-pelanggan">Nama Pelanggan</label>
        <input class="input" id="nama-pelanggan" maxlength="60" autocomplete="off" placeholder="Opsional, mis. Mutia">
      </div>
      <div id="lines"></div>
      <div class="pesanan-blok">
        <label for="catatan-pesanan">Catatan (Opsional)</label>
        <input class="input" id="catatan-pesanan" maxlength="200" autocomplete="off" placeholder="Contoh: Tidak Pedas">
      </div>
      <div class="pesanan-blok ringkasan num" id="ringkasan"></div>
      <div class="field">
        <span class="label">Metode Pembayaran</span>
        <div class="metode" id="metode" role="group" aria-label="Metode pembayaran">
          <button type="button" data-v="tunai" aria-pressed="false">Tunai</button>
          <button type="button" data-v="qris" aria-pressed="false">QRIS</button>
        </div>
        <div class="err" id="err-metode"></div>
      </div>
      <div class="hidden" id="tunai-box">
        <div class="field">
          <label for="uang">Uang Diterima (Rp)</label>
          <input class="input num" id="uang" inputmode="numeric" placeholder="0" autocomplete="off">
          <div class="quick" id="quick"></div>
        </div>
        <div class="pesanan-blok kembalian-baris num" id="kembalian"></div>
      </div>
      <div id="err-simpan"></div>
      <button type="button" class="btn primary block lg" id="btn-simpan">Simpan Transaksi Kasir</button>
    </section>

    <div class="cartbar hidden" id="cartbar">
      <button type="button" class="btn primary" id="lihat-pesanan"><span id="cart-info"></span><span>Lihat Pesanan ↓</span></button>
    </div>`;

  const $ = (s) => app.querySelector(s);
  const menuEl = $('#menu-list');
  const linesEl = $('#lines');
  const pesananEl = $('#pesanan');
  const cartbar = $('#cartbar');
  const timerEl = $('#timer');
  const uangEl = $('#uang');
  const errSimpan = $('#err-simpan');

  // ---------- pengatur waktu ----------
  const detik = () => Math.floor((performance.now() - mulai) / 1000);
  const tick = setInterval(() => {
    const s = detik();
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('lewat', s >= TARGET_DETIK);
  }, 250);

  // ---------- hitungan ----------
  const byId = (id) => barang.find((b) => b.id_barang === id);
  const total = () => [...keranjang].reduce((s, [id, n]) => s + (byId(id)?.harga_jual || 0) * n, 0);
  const jumlahItem = () => [...keranjang.values()].reduce((s, n) => s + n, 0);
  const melebihi = () => [...keranjang].filter(([id, n]) => n > (byId(id)?.stok_saat_ini ?? 0)).map(([id]) => byId(id));

  // ---------- gambar ----------
  function gambarMenu() {
    const k = kata.toLowerCase();
    const rows = barang.filter((b) => b.nama_barang.toLowerCase().includes(k));
    if (!rows.length) { menuEl.innerHTML = '<p class="empty">Menu tidak ditemukan.</p>'; return; }
    menuEl.innerHTML = rows.map((b) => {
      const n = keranjang.get(b.id_barang) || 0;
      const habis = b.stok_saat_ini <= 0;
      return `
        <article class="menu-item ${n ? 'in-cart' : ''} ${habis ? 'habis' : ''}">
          <div class="menu-item-baris">
            <h3>${esc(b.nama_barang)}</h3>
            <b class="num">${rupiah(b.harga_jual)}</b>
          </div>
          <p class="menu-item-satuan">Satuan: ${esc(kapital(b.satuan))}</p>
          <div class="menu-item-baris bawah">
            <span class="menu-item-stok num">${habis ? '<b class="habis-teks">Stok habis</b>' : `Stok: <b>${angka(b.stok_saat_ini)}</b>`}${n ? ` · <span class="di-pesanan">${n} di pesanan</span>` : ''}</span>
            <button type="button" class="btn-tambah" data-id="${b.id_barang}" ${habis ? 'disabled' : ''}
                    aria-label="Tambah ${esc(b.nama_barang)} ke pesanan">${habis ? 'Habis' : '+ Tambah'}</button>
          </div>
        </article>`;
    }).join('');
  }

  function gambarKode() {
    $('#kode').textContent = `WALK-UP | #${kodePesanan(sekarangWIB().tanggal, nomorBerikut)}`;
  }

  function gambarPesanan() {
    linesEl.innerHTML = keranjang.size
      ? [...keranjang].map(([id, n]) => {
        const b = byId(id);
        const lebih = n > b.stok_saat_ini;
        return `
          <div class="pesanan-blok pesanan-item ${lebih ? 'lebih' : ''}" data-id="${id}">
            <div class="menu-item-baris"><b>${esc(b.nama_barang)}</b><b class="num">${rupiah(b.harga_jual * n)}</b></div>
            <div class="menu-item-baris">
              <span class="small muted num">Jumlah: ${n}${n > 1 ? ` × ${rupiah(b.harga_jual)}` : ''}</span>
              <div class="stepper-mini">
                <button type="button" data-act="kurang" aria-label="Kurangi ${esc(b.nama_barang)}">−</button>
                <button type="button" data-act="tambah" class="plus" aria-label="Tambah ${esc(b.nama_barang)}">+</button>
              </div>
            </div>
            ${lebih ? `<div class="stok-peringatan" role="alert"><span aria-hidden="true">!</span>Stok ${esc(b.nama_barang)} tersisa ${angka(b.stok_saat_ini)} ${esc(b.satuan)}. Kurangi jumlah pesanan agar transaksi bisa disimpan.</div>` : ''}
          </div>`;
      }).join('')
      : '<p class="pesanan-kosong">Belum ada pesanan. Ketuk <b>+ Tambah</b> pada menu di atas.</p>';

    const t = total();
    $('#ringkasan').innerHTML = `
      <div><span>Subtotal Pesanan</span><span>${rupiah(t)}</span></div>
      <div><span>Pajak / Layanan (0%)</span><span>${rupiah(0)}</span></div>
      <div class="total"><span>Total Pembayaran</span><span>${rupiah(t)}</span></div>`;
    $('#quick').innerHTML = t > 0
      ? `<button type="button" data-uang="${t}">Uang pas</button>${[10000, 20000, 50000, 100000].filter((x) => x > t).slice(0, 3).map((x) => `<button type="button" data-uang="${x}">${angka(x / 1000)}rb</button>`).join('')}`
      : '';
    hitungKembalian();

    const n = jumlahItem();
    $('#cart-info').textContent = `${n} item · ${rupiah(t)}`;
    perbaruiCartbar();
    if (!melebihi().length) errSimpan.innerHTML = '';
  }

  function hitungKembalian() {
    const el = $('#kembalian');
    const raw = uangEl.value.replace(/\D/g, '');
    const k = Number(raw || 0) - total();
    el.innerHTML = raw && k < 0
      ? '<span class="kurang">Uang kurang</span><span class="kurang">' + rupiah(-k) + '</span>'
      : `<span>Kembalian</span><span>${rupiah(raw ? k : 0)}</span>`;
  }

  // Tombol melayang "Lihat Pesanan" hanya saat bagian Pesanan belum terlihat.
  let pesananTerlihat = false;
  const pengamat = new IntersectionObserver(([e]) => { pesananTerlihat = e.isIntersecting; perbaruiCartbar(); });
  pengamat.observe(pesananEl);
  function perbaruiCartbar() {
    cartbar.classList.toggle('hidden', keranjang.size === 0 || pesananTerlihat);
  }

  // ---------- aksi ----------
  function ubahJumlah(id, delta) {
    const b = byId(id);
    if (!b) return;
    const lama = keranjang.get(id) || 0;
    if (delta > 0 && b.stok_saat_ini <= 0) { toast(`${b.nama_barang} sudah habis.`, 'err'); return; }
    const baru = lama + delta;
    if (delta > 0 && baru > b.stok_saat_ini && lama <= b.stok_saat_ini) {
      toast(`Stok ${b.nama_barang} tersisa ${b.stok_saat_ini} ${b.satuan}.`, 'err');
    }
    if (baru <= 0) keranjang.delete(id); else keranjang.set(id, baru);
    gambarMenu();
    gambarPesanan();
  }

  function pilihMetode(v) {
    metode = v;
    app.querySelectorAll('#metode button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v)));
    $('#tunai-box').classList.toggle('hidden', v !== 'tunai');
    $('#err-metode').textContent = '';
  }

  function bersihkan() {
    keranjang.clear();
    $('#nama-pelanggan').value = '';
    $('#catatan-pesanan').value = '';
    uangEl.value = '';
    metode = '';
    app.querySelectorAll('#metode button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    $('#tunai-box').classList.add('hidden');
    $('#err-metode').textContent = '';
    errSimpan.innerHTML = '';
    gambarMenu();
    gambarPesanan();
  }

  menuEl.addEventListener('click', (e) => {
    const t = e.target.closest('.btn-tambah');
    if (t && !t.disabled) ubahJumlah(Number(t.dataset.id), 1);
  });
  linesEl.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    const line = e.target.closest('.pesanan-item');
    if (act && line) ubahJumlah(Number(line.dataset.id), act.dataset.act === 'tambah' ? 1 : -1);
  });
  $('#cari').addEventListener('input', (e) => { kata = e.target.value.trim(); gambarMenu(); });
  $('#metode').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) pilihMetode(b.dataset.v); });
  $('#quick').addEventListener('click', (e) => { const b = e.target.closest('[data-uang]'); if (b) { uangEl.value = b.dataset.uang; hitungKembalian(); } });
  uangEl.addEventListener('input', hitungKembalian);
  $('#bersihkan').addEventListener('click', bersihkan);
  $('#lihat-pesanan').addEventListener('click', () => pesananEl.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  $('#btn-simpan').addEventListener('click', simpan);

  // ---------- simpan ----------
  async function simpan() {
    errSimpan.innerHTML = '';
    const tunjukkan = (pesan, el) => {
      errSimpan.innerHTML = `<div class="notice err">${esc(pesan)}</div>`;
      (el || errSimpan).scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (!keranjang.size) return tunjukkan('Pesanan masih kosong. Tambahkan minimal satu menu.', menuEl);
    const lebih = melebihi();
    if (lebih.length) {
      const b = lebih[0];
      return tunjukkan(`Jumlah ${b.nama_barang} melebihi stok (tersisa ${b.stok_saat_ini} ${b.satuan}). Kurangi dulu sebelum menyimpan.`,
        linesEl.querySelector(`[data-id="${b.id_barang}"]`));
    }
    if (!metode) {
      $('#err-metode').textContent = 'Pilih metode bayar dulu: Tunai atau QRIS.';
      $('#metode').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const btn = $('#btn-simpan');
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    try {
      const trx = await api('/transaksi', {
        method: 'POST',
        body: {
          metode_bayar: metode,
          nama_pelanggan: $('#nama-pelanggan').value,
          catatan: $('#catatan-pesanan').value,
          items: [...keranjang].map(([id_barang, jumlah]) => ({ id_barang, jumlah })),
        },
      });
      const durasi = Math.round((performance.now() - mulai) / 100) / 10;
      const kode = kodePesanan(trx.waktu_transaksi, trx.nomor_harian);
      simpanWaktu({ id_transaksi: trx.id_transaksi, kode, detik: durasi, item: trx.items.length, metode, waktu: trx.waktu_transaksi });
      toast(`Transaksi #${kode} tersimpan · ${rupiah(trx.total)} · ${metode.toUpperCase()} · ${durasi} detik`, 'ok', 4500);
      // Siap untuk pesanan berikutnya
      nomorBerikut = trx.nomor_harian + 1;
      barang = (await api('/barang')).sort((a, b) => a.id_barang - b.id_barang);
      bersihkan();
      gambarKode();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      mulai = performance.now();
    } catch (err) {
      tunjukkan(err.message);
      // Stok mungkin berubah (mis. dicatat dari HP lain): segarkan.
      barang = await api('/barang').then((d) => d.sort((a, b) => a.id_barang - b.id_barang)).catch(() => barang);
      gambarMenu();
      gambarPesanan();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Transaksi Kasir';
    }
  }

  // ---------- muat awal ----------
  const [daftar, hariIni] = await Promise.all([
    api('/barang'),
    api(`/transaksi?tanggal=${sekarangWIB().tanggal}`).catch(() => null),
  ]);
  // Urutan menu = urutan barang dimasukkan (nasi → lauk → sayur), bukan abjad.
  barang = daftar.sort((a, b) => a.id_barang - b.id_barang);
  if (hariIni) nomorBerikut = hariIni.ringkasan.jumlah_transaksi + 1;
  gambarKode();
  gambarMenu();
  gambarPesanan();
  mulai = performance.now();

  return () => {
    clearInterval(tick);
    pengamat.disconnect();
  };
}
