// Helper bersama: API, format angka/tanggal, toast, validasi form.

const KUNCI_PENGGUNA = 'warung.sesi';
// Kunci lama dari layar "pilih pengguna" (sebelum ada login) dibuang supaya wajib masuk ulang.
try { localStorage.removeItem('warung.pengguna'); } catch { /* abaikan */ }

const KUNCI_ONBOARDING = 'warung.onboarding-selesai';

function baca(store, kunci) {
  try { return JSON.parse(store.getItem(kunci) || 'null'); } catch { return null; }
}

/**
 * Sesi masuk. "Ingat saya" → localStorage (tetap ada setelah browser ditutup);
 * tanpa "Ingat saya" → sessionStorage (hilang saat tab/browser ditutup).
 */
export const sesi = {
  get pengguna() {
    return baca(sessionStorage, KUNCI_PENGGUNA) || baca(localStorage, KUNCI_PENGGUNA);
  },
  masuk(p, ingat = false) {
    this.keluar();
    try { (ingat ? localStorage : sessionStorage).setItem(KUNCI_PENGGUNA, JSON.stringify(p)); } catch { /* abaikan */ }
  },
  keluar() {
    try { localStorage.removeItem(KUNCI_PENGGUNA); } catch { /* abaikan */ }
    try { sessionStorage.removeItem(KUNCI_PENGGUNA); } catch { /* abaikan */ }
  },
  get onboardingSelesai() {
    try { return localStorage.getItem(KUNCI_ONBOARDING) === '1'; } catch { return false; }
  },
  set onboardingSelesai(v) {
    try { v ? localStorage.setItem(KUNCI_ONBOARDING, '1') : localStorage.removeItem(KUNCI_ONBOARDING); } catch { /* abaikan */ }
  },
};

export class ApiError extends Error {
  constructor(msg, field, status) { super(msg); this.field = field; this.status = status; }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const p = sesi.pengguna;
  if (p) headers['X-Pengguna-Id'] = String(p.id_pengguna);
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Tidak bisa terhubung ke server. Cek koneksi Wi-Fi.', null, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Terjadi kesalahan.', data.field, res.status);
  return data;
}

export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
export const angka = (n) => Number(n || 0).toLocaleString('id-ID');

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function infoTanggal(t) {
  const [y, m, d] = t.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { hari: HARI[dow], hariPanjang: HARI_PANJANG[dow], tgl: d, bulan: BULAN[m - 1], tahun: y };
}
export function tanggalPanjang(t) {
  const i = infoTanggal(t);
  return `${i.hariPanjang}, ${i.tgl} ${i.bulan} ${i.tahun}`;
}
export const jamTitik = (j) => (j ? j.replace(':', '.') : '');

/** Tanggal & jam sekarang di WIB, sama dengan server. */
export function sekarangWIB() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { tanggal: `${p.year}-${p.month}-${p.day}`, jam: `${p.hour}:${p.minute}` };
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(pesan, jenis = '', ms = 3200) {
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${jenis}`;
  el.setAttribute('role', 'status');
  el.textContent = pesan;
  wrap.replaceChildren(el);
  setTimeout(() => el.remove(), ms);
}

/**
 * Validasi jumlah di sisi form — aturan & pesannya sama dengan server
 * (src/lib/validasi.js). Mengembalikan [angka, pesanError].
 */
export function cekJumlah(raw, label = 'Jumlah') {
  const s = String(raw ?? '').trim();
  if (!s) return [null, `${label} wajib diisi.`];
  if (/[.,]/.test(s)) return [null, `${label} harus bilangan bulat, tidak boleh desimal.`];
  if (!/^-?\d+$/.test(s)) return [null, `${label} harus berupa angka.`];
  const n = Number(s);
  if (n <= 0) return [null, `${label} harus lebih dari 0.`];
  if (n > 100000) return [null, `${label} terlalu besar (maksimal 100000).`];
  return [n, ''];
}

/** Tampilkan pesan error di bawah field tertentu. */
export function setErr(form, field, pesan) {
  const box = form.querySelector(`[data-err="${field}"]`);
  const input = form.querySelector(`[name="${field}"]`);
  if (box) box.textContent = pesan || '';
  if (input) input.setAttribute('aria-invalid', pesan ? 'true' : 'false');
}
export function clearErr(form) {
  form.querySelectorAll('[data-err]').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((e) => e.setAttribute('aria-invalid', 'false'));
}

/** Ikon menu utama (isi penuh), dipakai di bottom nav dan kartu Beranda. */
const ikonIsi = (d) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg>`;
export const ikonMenu = {
  kasir: ikonIsi('M7 2h7a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2v1h7.2a1.5 1.5 0 0 1 1.47 1.2L21.6 14H2.4l.93-4.8A1.5 1.5 0 0 1 4.8 8H10V7H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM6.5 10.3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM2 15.5h20V20a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 20zM9 17.8h6v1.4H9z'),
  stok: ikonIsi('M8 2.5h8v7.5H8zM10.8 2.5h2.4v2.8h-2.4zM2 11.5h9.2v9H2zM5.4 11.5h2.4v2.8H5.4zM12.8 11.5H22v9h-9.2zM16.2 11.5h2.4v2.8h-2.4z'),
  jadwal: ikonIsi('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5a1 1 0 1 0-2 0v5.4l3.8 2.3a1 1 0 1 0 1-1.7L13 11.3z'),
  transaksi: ikonIsi('M5 2.5h14v19l-2.33-1.5-2.34 1.5L12 20l-2.33 1.5L7.33 20 5 21.5zM8 7h8v1.6H8zm0 4h8v1.6H8zm0 4h5v1.6H8z'),
};

/** Inisial nama untuk avatar: "Bu Mimin" → "BM". */
export function inisial(nama) {
  const kata = String(nama || '').trim().split(/\s+/).filter(Boolean);
  return (kata.slice(0, 2).map((k) => k[0]).join('') || '?').toUpperCase();
}

/**
 * Kode pesanan walk-up: WU-YYMMDD-NNN.
 * tanggal 'YYYY-MM-DD' (atau waktu 'YYYY-MM-DD HH:MM:SS'), nomor = urutan transaksi hari itu.
 */
export function kodePesanan(tanggal, nomor) {
  const [y, m, d] = String(tanggal).slice(0, 10).split('-');
  return `WU-${y.slice(2)}${m}${d}-${String(nomor).padStart(3, '0')}`;
}

/** "porsi" → "Porsi" */
export const kapital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/** Status warung saat ini menurut jadwal hari ini (WIB). */
export async function statusWarung() {
  const { tanggal, jam } = sekarangWIB();
  const { jadwal: j } = await api(`/jadwal/${tanggal}`);
  if (!j) return { kelas: '', teks: 'Jadwal belum diatur' };
  if (!j.buka) return { kelas: 'tutup', teks: 'Libur hari ini' };
  if (jam < j.jam_buka) return { kelas: 'tutup', teks: `Tutup · buka ${jamTitik(j.jam_buka)}` };
  if (jam >= j.jam_tutup) return { kelas: 'tutup', teks: 'Sudah tutup' };
  return { kelas: 'buka', teks: `Buka · s/d ${jamTitik(j.jam_tutup)}` };
}

export const ikonCari = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

export function badgeStatus(status) {
  if (status === 'habis') return '<span class="badge habis">Habis</span>';
  if (status === 'menipis') return '<span class="badge menipis">Menipis</span>';
  return '';
}

/** Buka bottom sheet. Mengembalikan { el, tutup }. */
export function bukaSheet(html, { onClose } = {}) {
  const bd = document.createElement('div');
  bd.className = 'sheet-backdrop';
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  const tutup = () => { bd.remove(); onClose && onClose(); };
  bd.addEventListener('click', (e) => { if (e.target === bd) tutup(); });
  document.body.appendChild(bd);
  return { el: bd.querySelector('.sheet'), tutup };
}
