// Pemilih tanggal (modal kalender) sesuai desain Rekap Pemasukan / Menu Terlaris.
import { infoTanggal } from './util.js';

export const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** '2026-10-19' → '19 Oktober 2026' */
export function tanggalBulanPanjang(t) {
  const [y, m, d] = t.split('-').map(Number);
  return `${d} ${BULAN_PANJANG[m - 1]} ${y}`;
}
/** '2026-10-19' → 'Senin, 19 Oktober 2026' */
export function tanggalLengkap(t) {
  return `${infoTanggal(t).hariPanjang}, ${tanggalBulanPanjang(t)}`;
}

export const ikonKalender = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01"/></svg>';
const ikonBawah = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

/** Tombol pembuka kalender (tampilan "📅 19 Oktober 2026 ⌄"). */
export function tombolTanggal(id, nilai) {
  return `<button type="button" class="tombol-tanggal" id="${id}" aria-haspopup="dialog">
    ${ikonKalender}<span>${tanggalBulanPanjang(nilai)}</span>${ikonBawah}</button>`;
}

/**
 * Buka modal kalender. Mengembalikan Promise berisi 'YYYY-MM-DD' saat
 * Terapkan ditekan, atau null bila dibatalkan. `maks`: tanggal terakhir yang boleh dipilih.
 */
export function pilihTanggal({ nilai, maks } = {}) {
  return new Promise((selesai) => {
    let pilih = nilai;
    let [y, m] = nilai.split('-').map(Number);
    m -= 1;

    const bd = document.createElement('div');
    bd.className = 'kal-backdrop';
    bd.innerHTML = `
      <div class="kal" role="dialog" aria-modal="true" aria-labelledby="kal-judul">
        <div class="kal-head"><h2 id="kal-judul">Pilih tanggal</h2><button type="button" class="kal-x" aria-label="Tutup">✕</button></div>
        <div class="kal-terpilih" aria-live="polite"></div>
        <div class="kal-nav">
          <button type="button" data-geser="-1" aria-label="Bulan sebelumnya">‹</button>
          <b class="kal-bulan"></b>
          <button type="button" data-geser="1" aria-label="Bulan berikutnya">›</button>
        </div>
        <div class="kal-grid kal-hari">${HARI.map((h) => `<span>${h}</span>`).join('')}</div>
        <div class="kal-grid kal-tgl" role="grid"></div>
        <div class="kal-aksi"><button type="button" class="btn btn-batal" data-aksi="batal">Batal</button><button type="button" class="btn primary" data-aksi="terapkan">Terapkan</button></div>
      </div>`;

    const gambar = () => {
      bd.querySelector('.kal-terpilih').textContent = tanggalLengkap(pilih);
      bd.querySelector('.kal-bulan').textContent = `${BULAN_PANJANG[m]} ${y}`;
      const awal = new Date(Date.UTC(y, m, 1)).getUTCDay();
      const jmlHari = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const jmlLalu = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const sel = [];
      for (let i = awal - 1; i >= 0; i--) sel.push(`<span class="luar">${jmlLalu - i}</span>`);
      for (let d = 1; d <= jmlHari; d++) {
        const t = iso(y, m, d);
        const mati = maks && t > maks;
        sel.push(`<button type="button" data-t="${t}" ${mati ? 'disabled' : ''} aria-pressed="${t === pilih}" aria-label="${tanggalLengkap(t)}">${d}</button>`);
      }
      let d = 1;
      while (sel.length % 7) sel.push(`<span class="luar">${d++}</span>`);
      bd.querySelector('.kal-tgl').innerHTML = sel.join('');
      const maju = bd.querySelector('[data-geser="1"]');
      maju.disabled = !!maks && iso(y, m, jmlHari) >= maks;
    };

    const tutup = (hasil) => {
      document.removeEventListener('keydown', tombol);
      bd.remove();
      selesai(hasil);
    };
    const tombol = (e) => { if (e.key === 'Escape') tutup(null); };

    bd.addEventListener('click', (e) => {
      if (e.target === bd || e.target.closest('.kal-x') || e.target.closest('[data-aksi="batal"]')) return tutup(null);
      if (e.target.closest('[data-aksi="terapkan"]')) return tutup(pilih);
      const g = e.target.closest('[data-geser]');
      if (g && !g.disabled) {
        m += Number(g.dataset.geser);
        if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
        return gambar();
      }
      const t = e.target.closest('[data-t]');
      if (t && !t.disabled) { pilih = t.dataset.t; gambar(); }
    });
    document.addEventListener('keydown', tombol);
    document.body.appendChild(bd);
    gambar();
    bd.querySelector('[aria-pressed="true"]')?.focus();
  });
}
