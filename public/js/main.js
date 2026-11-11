// Router sederhana berbasis hash (#/kasir, #/stok/masuk, ...) + layar masuk & onboarding.
import { api, sesi, esc, jamTitik, sekarangWIB } from './util.js';
import * as kasir from './pages/kasir.js';
import * as stok from './pages/stok.js';
import * as jadwal from './pages/jadwal.js';
import * as lainnya from './pages/lainnya.js';
import { tampilkanMasuk } from './pages/auth.js';
import { tampilkanOnboarding } from './pages/onboarding.js';

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
  if (!sesi.pengguna) return mulaiMasuk();
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

// ---------- Masuk & onboarding ----------
let sedangMasuk = false;
async function mulaiMasuk() {
  if (sedangMasuk) return;
  sedangMasuk = true;
  try {
    await tampilkanMasuk();
    if (!sesi.onboardingSelesai) await tampilkanOnboarding();
  } finally {
    sedangMasuk = false;
  }
  perbaruiHeader();
  navigasi();
}

function keluar() {
  sesi.keluar();
  app.replaceChildren();
  mulaiMasuk();
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

document.getElementById('btn-user').addEventListener('click', () => (location.hash = '#/lainnya'));
document.getElementById('status-warung').addEventListener('click', () => (location.hash = '#/jadwal'));
window.addEventListener('hashchange', navigasi);
window.addEventListener('warung:jadwal-berubah', perbaruiHeader);
window.addEventListener('warung:keluar', keluar);
setInterval(perbaruiHeader, 60_000);

perbaruiHeader();
navigasi();
