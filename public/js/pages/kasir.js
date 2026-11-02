// EP-02 US-05 — Pesanan baru: pilih item, pilih QRIS/tunai, simpan.
// Target: satu transaksi selesai < 30 detik. Timer di pojok kanan
// menghitung dari halaman dibuka sampai transaksi tersimpan.
import { api, esc, rupiah, angka, toast, cekJumlah, ikonCari, bukaSheet } from '../util.js';

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
  let mulai = performance.now();
  let sheet = null;

  app.innerHTML = `
    <div class="kasir-head">
      <h1 class="page-title">Pesanan baru</h1>
      <span class="timer num" id="timer" title="Waktu sejak pesanan dimulai (target < 30 detik)">⏱ 0:00</span>
    </div>
    <div class="search">${ikonCari}<input class="input" id="cari" type="search" placeholder="Cari menu…" autocomplete="off"></div>
    <div class="tiles" id="tiles"></div>
    <div class="cartbar hidden" id="cartbar">
      <button class="btn primary" id="btn-bayar"><span id="cart-info"></span><span>Bayar ›</span></button>
    </div>`;

  const tilesEl = app.querySelector('#tiles');
  const cartbar = app.querySelector('#cartbar');
  const timerEl = app.querySelector('#timer');

  const detik = () => Math.floor((performance.now() - mulai) / 1000);
  const tick = setInterval(() => {
    const s = detik();
    timerEl.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('lewat', s >= TARGET_DETIK);
  }, 250);

  const byId = (id) => barang.find((b) => b.id_barang === id);
  const total = () => [...keranjang].reduce((s, [id, n]) => s + byId(id).harga_jual * n, 0);
  const jumlahItem = () => [...keranjang.values()].reduce((s, n) => s + n, 0);

  function gambarTiles() {
    const k = kata.toLowerCase();
    const rows = barang.filter((b) => b.nama_barang.toLowerCase().includes(k));
    if (!rows.length) { tilesEl.innerHTML = `<p class="empty" style="grid-column:1/-1">Menu tidak ditemukan.</p>`; return; }
    tilesEl.innerHTML = rows.map((b) => {
      const n = keranjang.get(b.id_barang) || 0;
      const habis = b.stok_saat_ini <= 0;
      return `
        <button class="tile ${habis ? 'habis' : ''} ${n ? 'in-cart' : ''}" data-id="${b.id_barang}" ${habis ? 'aria-disabled="true"' : ''}>
          ${n ? `<span class="count num">${n}</span>` : ''}
          <span class="nm">${esc(b.nama_barang)}</span>
          <span class="pr num">${rupiah(b.harga_jual)}</span>
          <span class="st num">${habis ? 'Habis' : `Sisa ${angka(b.stok_saat_ini - n)} ${esc(b.satuan)}`}</span>
        </button>`;
    }).join('');
  }

  function gambarCartbar() {
    const n = jumlahItem();
    cartbar.classList.toggle('hidden', n === 0);
    app.querySelector('#cart-info').innerHTML = `<span class="num">${n} item · ${rupiah(total())}</span>`;
  }

  function tambah(id, delta = 1) {
    const b = byId(id);
    if (!b) return;
    if (b.stok_saat_ini <= 0) { toast(`${b.nama_barang} sudah habis.`, 'err'); return; }
    const baru = (keranjang.get(id) || 0) + delta;
    if (baru > b.stok_saat_ini) { toast(`Stok tidak cukup. Sisa stok ${b.nama_barang}: ${b.stok_saat_ini} ${b.satuan}.`, 'err'); return; }
    if (baru <= 0) keranjang.delete(id); else keranjang.set(id, baru);
    gambarTiles(); gambarCartbar();
    if (sheet) gambarSheet();
  }

  tilesEl.addEventListener('click', (e) => {
    const t = e.target.closest('.tile');
    if (t) tambah(Number(t.dataset.id));
  });
  app.querySelector('#cari').addEventListener('input', (e) => { kata = e.target.value.trim(); gambarTiles(); });
  app.querySelector('#btn-bayar').addEventListener('click', bukaRingkasan);

  // ---------------- Ringkasan + pembayaran ----------------
  function bukaRingkasan() {
    if (!keranjang.size) return;
    sheet = bukaSheet('<div id="sheet-body"></div>', { onClose: () => { sheet = null; } });
    gambarSheet();
  }

  function gambarSheet() {
    if (!sheet) return;
    if (!keranjang.size) { sheet.tutup(); return; }
    const body = sheet.el.querySelector('#sheet-body');
    const uangLama = body.querySelector('#uang')?.value || '';
    const t = total();
    body.innerHTML = `
      <h2>Ringkasan pesanan</h2>
      <div id="lines">
        ${[...keranjang].map(([id, n]) => {
          const b = byId(id);
          return `
            <div class="cart-line" data-id="${id}">
              <div><div class="nm">${esc(b.nama_barang)}</div><div class="sub num">${rupiah(b.harga_jual)} × ${n} = <b>${rupiah(b.harga_jual * n)}</b></div></div>
              <div class="stepper">
                <button type="button" data-act="kurang" aria-label="Kurangi">${n === 1 ? '🗑' : '−'}</button>
                <input class="num" inputmode="numeric" value="${n}" aria-label="Jumlah ${esc(b.nama_barang)}">
                <button type="button" data-act="tambah" aria-label="Tambah">+</button>
              </div>
              <div class="err"></div>
            </div>`;
        }).join('')}
      </div>
      <div class="total-row"><span>Total</span><span class="num" id="total">${rupiah(t)}</span></div>
      <div class="field">
        <span class="label">Metode bayar</span>
        <div class="pills" id="metode">
          <button type="button" class="pill" data-v="qris" aria-pressed="${metode === 'qris'}">QRIS</button>
          <button type="button" class="pill" data-v="tunai" aria-pressed="${metode === 'tunai'}">Tunai</button>
        </div>
        <div class="err" id="err-metode"></div>
      </div>
      <div class="field ${metode === 'tunai' ? '' : 'hidden'}" id="tunai-box">
        <label for="uang">Uang diterima <span class="muted">(opsional, untuk hitung kembalian)</span></label>
        <input class="input num" id="uang" inputmode="numeric" placeholder="0" value="${esc(uangLama)}">
        <div class="quick">
          <button type="button" data-uang="${t}">Uang pas</button>
          ${[10000, 20000, 50000, 100000].filter((x) => x > t).slice(0, 3).map((x) => `<button type="button" data-uang="${x}">${angka(x / 1000)}rb</button>`).join('')}
        </div>
        <div class="kembalian num" id="kembalian"></div>
      </div>
      <div id="err-simpan"></div>
      <button class="btn primary block lg" id="btn-simpan">Simpan transaksi</button>`;
    hitungKembalian();
  }

  function hitungKembalian() {
    const el = sheet?.el.querySelector('#kembalian');
    if (!el) return;
    const raw = sheet.el.querySelector('#uang').value.replace(/\D/g, '');
    if (!raw) { el.innerHTML = '<span>Kembalian</span><span>—</span>'; return; }
    const k = Number(raw) - total();
    el.innerHTML = k >= 0
      ? `<span>Kembalian</span><span>${rupiah(k)}</span>`
      : `<span style="color:var(--danger)">Uang kurang</span><span style="color:var(--danger)">${rupiah(-k)}</span>`;
  }

  // Satu listener untuk seluruh isi sheet (dipasang sekali per sheet via delegasi di document).
  function onSheetClick(e) {
    if (!sheet || !sheet.el.contains(e.target)) return;
    const line = e.target.closest('.cart-line');
    const act = e.target.closest('[data-act]');
    if (line && act) {
      const id = Number(line.dataset.id);
      tambah(id, act.dataset.act === 'tambah' ? 1 : -1);
      return;
    }
    const m = e.target.closest('#metode .pill');
    if (m) {
      metode = m.dataset.v;
      sheet.el.querySelectorAll('#metode .pill').forEach((p) => p.setAttribute('aria-pressed', String(p === m)));
      sheet.el.querySelector('#tunai-box').classList.toggle('hidden', metode !== 'tunai');
      sheet.el.querySelector('#err-metode').textContent = '';
      return;
    }
    const u = e.target.closest('[data-uang]');
    if (u) { sheet.el.querySelector('#uang').value = u.dataset.uang; hitungKembalian(); return; }
    if (e.target.closest('#btn-simpan')) simpan();
  }
  function onSheetInput(e) {
    if (!sheet || !sheet.el.contains(e.target)) return;
    if (e.target.id === 'uang') { hitungKembalian(); return; }
  }
  function onSheetChange(e) {
    if (!sheet || !sheet.el.contains(e.target)) return;
    const line = e.target.closest('.cart-line');
    if (!line || e.target.tagName !== 'INPUT') return;
    const id = Number(line.dataset.id);
    const b = byId(id);
    const errEl = line.querySelector('.err');
    const [n, err] = cekJumlah(e.target.value);
    if (err) { errEl.textContent = err; e.target.value = keranjang.get(id); return; }
    if (n > b.stok_saat_ini) { errEl.textContent = `Stok tidak cukup. Sisa stok: ${b.stok_saat_ini} ${b.satuan}.`; e.target.value = keranjang.get(id); return; }
    keranjang.set(id, n);
    gambarTiles(); gambarCartbar(); gambarSheet();
  }
  document.addEventListener('click', onSheetClick);
  document.addEventListener('input', onSheetInput);
  document.addEventListener('change', onSheetChange);

  async function simpan() {
    const errBox = sheet.el.querySelector('#err-simpan');
    errBox.innerHTML = '';
    if (!metode) { sheet.el.querySelector('#err-metode').textContent = 'Pilih metode bayar dulu: QRIS atau tunai.'; return; }
    const btn = sheet.el.querySelector('#btn-simpan');
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    try {
      const trx = await api('/transaksi', {
        method: 'POST',
        body: { metode_bayar: metode, items: [...keranjang].map(([id_barang, jumlah]) => ({ id_barang, jumlah })) },
      });
      const durasi = Math.round((performance.now() - mulai) / 100) / 10;
      simpanWaktu({ id_transaksi: trx.id_transaksi, detik: durasi, item: trx.items.length, metode, waktu: trx.waktu_transaksi });
      sheet.tutup();
      toast(`Transaksi #${trx.id_transaksi} tersimpan · ${rupiah(trx.total)} · ${metode.toUpperCase()} · ${durasi} detik`, 'ok', 4500);
      // Siap untuk pesanan berikutnya
      keranjang.clear();
      metode = '';
      barang = await api('/barang');
      gambarTiles(); gambarCartbar();
      mulai = performance.now();
    } catch (err) {
      errBox.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'Simpan transaksi';
      // Stok mungkin berubah (mis. dicatat dari HP lain): segarkan.
      barang = await api('/barang').catch(() => barang);
      gambarTiles();
    }
  }

  barang = await api('/barang');
  gambarTiles();
  gambarCartbar();
  mulai = performance.now();

  return () => {
    clearInterval(tick);
    document.removeEventListener('click', onSheetClick);
    document.removeEventListener('input', onSheetInput);
    document.removeEventListener('change', onSheetChange);
  };
}
