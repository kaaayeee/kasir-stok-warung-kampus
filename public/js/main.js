// Router sederhana berbasis hash (#/kasir, #/stok/masuk, ...) + pemilih pengguna.
import { api, sesi, esc, jamTitik, sekarangWIB } from './util.js';
import * as kasir from './pages/kasir.js';
import * as stok from './pages/stok.js';
import * as jadwal from './pages/jadwal.js';
import * as lainnya from './pages/lainnya.js';

const app = document.getElementById('app');
let bersihkan = null;

const rute = {
  kasir: (sub, q) => kasir.render(app, q),
  stok: (sub, q) => stok.render(app, sub || 'daftar', q),
  jadwal: (sub, q) => jadwal.render(app, q),
  lainnya: (sub, q) => lainnya.render(app, sub || 'menu', q),
};

function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [halaman, sub] = path.split('/');
  return { halaman: halaman || 'kasir', sub, q: Object.fromEntries(new URLSearchParams(query)) };
}

async function navigasi() {
  if (!sesi.pengguna) return tampilkanPemilih();
  const { halaman, sub, q } = parseHash();
  const fn = rute[halaman] || rute.kasir;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === halaman));
  if (bersihkan) { try { bersihkan(); } catch { /* */ } bersihkan = null; }
  document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
  if (halaman !== 'kasir') document.getElementById('toasts').replaceChildren();
  window.scrollTo(0, 0);
  try {
    bersihkan = (await fn(sub, q)) || null;
  } catch (e) {
    app.innerHTML = `<div class="notice err">${esc(e.message)}</div>`;
  }
}

// ---------- Pengguna aktif ----------
async function tampilkanPemilih() {
  const daftar = await api('/pengguna').catch(() => []);
  const el = document.createElement('div');
  el.className = 'picker';
  el.innerHTML = `
    <div class="box">
      <h1>Siapa yang memakai HP ini?</h1>
      <p class="muted">Nama ini tercatat otomatis sebagai pencatat setiap stok, jadwal, dan transaksi.</p>
      <div class="who">
        ${daftar.map((p) => `
          <button data-id="${p.id_pengguna}">
            <span class="avatar">${esc(p.nama.replace(/^Bu\s+/i, '')[0] || '?')}</span>
            <span><b>${esc(p.nama)}</b><span class="muted small">${p.peran === 'admin' ? 'Admin' : 'Pegawai'}</span></span>
          </button>`).join('')}
      </div>
    </div>`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    sesi.pengguna = daftar.find((p) => p.id_pengguna === Number(b.dataset.id));
    el.remove();
    perbaruiHeader();
    navigasi();
  });
  document.querySelectorAll('.picker').forEach((p) => p.remove());
  document.body.appendChild(el);
}

// ---------- Header: status warung hari ini ----------
export async function perbaruiHeader() {
  const p = sesi.pengguna;
  const av = document.getElementById('btn-user');
  av.textContent = p ? (p.nama.replace(/^Bu\s+/i, '')[0] || '?') : '?';
  av.title = p ? `${p.nama} (${p.peran})` : '';

  const chip = document.getElementById('status-warung');
  try {
    const { tanggal, jam } = sekarangWIB();
    const { jadwal: j } = await api(`/jadwal/${tanggal}`);
    let kelas = '', teks = '';
    if (!j) { teks = 'Jadwal belum diatur'; }
    else if (!j.buka) { kelas = 'tutup'; teks = 'Libur hari ini'; }
    else if (jam < j.jam_buka) { kelas = 'tutup'; teks = `Buka ${jamTitik(j.jam_buka)}`; }
    else if (jam >= j.jam_tutup) { kelas = 'tutup'; teks = 'Sudah tutup'; }
    else { kelas = 'buka'; teks = `Buka · s/d ${jamTitik(j.jam_tutup)}`; }
    chip.className = `status-chip ${kelas}`;
    chip.innerHTML = `<span class="dot"></span><span>${esc(teks)}</span>`;
  } catch {
    chip.innerHTML = '<span class="dot"></span><span>Offline</span>';
  }
}

document.getElementById('btn-user').addEventListener('click', tampilkanPemilih);
document.getElementById('status-warung').addEventListener('click', () => (location.hash = '#/jadwal'));
window.addEventListener('hashchange', navigasi);
window.addEventListener('warung:jadwal-berubah', perbaruiHeader);
window.addEventListener('warung:ganti-pengguna', tampilkanPemilih);
setInterval(perbaruiHeader, 60_000);

perbaruiHeader();
navigasi();
