// Router sederhana berbasis hash (#/kasir, #/stok/masuk, ...) + layar masuk & onboarding.
import { sesi, esc, inisial, ikonMenu } from './util.js';
import * as beranda from './pages/beranda.js';
import * as kasir from './pages/kasir.js';
import * as stok from './pages/stok.js';
import * as jadwal from './pages/jadwal.js';
import * as lainnya from './pages/lainnya.js';
import * as bantuan from './pages/bantuan.js';
import { tampilkanMasuk } from './pages/auth.js';
import { tampilkanOnboarding } from './pages/onboarding.js';

const app = document.getElementById('app');
let bersihkan = null;

const rute = {
  beranda: () => beranda.render(app),
  kasir: (sub, q) => kasir.render(app, q),
  stok: (sub, q) => stok.render(app, sub || 'daftar', q),
  jadwal: (sub, q) => jadwal.render(app, q),
  transaksi: (sub, q) => lainnya.render(app, 'transaksi', q),
  lainnya: (sub, q) => lainnya.render(app, sub || 'menu', q),
  bantuan: (sub) => bantuan.render(app, sub),
};

function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [halaman, sub] = path.split('/');
  return { halaman: halaman || 'beranda', sub, q: Object.fromEntries(new URLSearchParams(query)) };
}

async function navigasi() {
  if (!sesi.pengguna) return mulaiMasuk();
  const { halaman, sub, q } = parseHash();
  const fn = rute[halaman] || rute.beranda;
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

// ---------- Header: avatar pengguna ----------
export function perbaruiHeader() {
  const p = sesi.pengguna;
  const av = document.getElementById('btn-user');
  av.textContent = p ? inisial(p.nama) : '?';
  av.title = p ? `${p.nama} (${p.peran})` : '';
}

// Ikon bottom nav (sumber yang sama dengan kartu Beranda)
document.querySelectorAll('[data-ikon]').forEach((el) => (el.outerHTML = ikonMenu[el.dataset.ikon] || ''));

document.getElementById('btn-user').addEventListener('click', () => (location.hash = '#/lainnya'));
window.addEventListener('hashchange', navigasi);
window.addEventListener('warung:keluar', keluar);

perbaruiHeader();
navigasi();
