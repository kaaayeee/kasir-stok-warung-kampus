// Beranda: sapaan + pintasan ke 4 menu utama + tautan Pusat Bantuan.
import { esc, ikonMenu, sekarangWIB, statusWarung } from '../util.js';
import { ikon } from './auth.js';

const MENU = [
  {
    ikon: 'kasir', judul: 'Kasir Walk-up', href: '#/kasir', tombol: 'Buka Halaman Kasir',
    isi: 'Input transaksi langsung untuk pelanggan langsung di kasir warung.',
  },
  {
    ikon: 'stok', judul: 'Kelola Stok', href: '#/stok', tombol: 'Buka Halaman Stok',
    isi: 'Pantau sisa persediaan porsi hidangan dan kesiapan menu harian.',
  },
  {
    ikon: 'jadwal', judul: 'Jadwal Operasional', href: '#/jadwal', tombol: 'Atur Jadwal Buka/Tutup',
    isi: 'Atur waktu operasional layanan warung dan penerimaan pesanan.',
  },
  {
    ikon: 'transaksi', judul: 'Riwayat Transaksi', href: '#/transaksi', tombol: 'Buka Halaman Transaksi',
    isi: 'Lihat dan kelola catatan transaksi penjualan.',
  },
];

/** Sapaan sesuai jam WIB. */
export function sapaan(jam = sekarangWIB().jam) {
  const h = Number(jam.slice(0, 2));
  if (h >= 4 && h < 11) return 'Selamat Pagi!';
  if (h >= 11 && h < 15) return 'Selamat Siang!';
  if (h >= 15 && h < 18) return 'Selamat Sore!';
  return 'Selamat Malam!';
}

export async function render(app) {
  app.innerHTML = `
    <div class="beranda-head">
      <h1>${sapaan()}</h1>
      <a class="btn-bantuan" href="#/bantuan">${ikon.tanya}<span>Pusat Bantuan</span></a>
    </div>
    <div class="menu-cards">
      ${MENU.map((m) => `
        <section class="menu-card" aria-labelledby="mc-${m.ikon}">
          <div class="menu-card-top">
            <span class="menu-ikon">${ikonMenu[m.ikon]}</span>
            ${m.ikon === 'jadwal' ? '<span class="status-chip" id="status-hari-ini"><span class="dot"></span><span>Memuat…</span></span>' : ''}
          </div>
          <h2 id="mc-${m.ikon}">${m.judul}</h2>
          <p>${m.isi}</p>
          <a class="btn primary block" href="${m.href}">${m.tombol} ${ikon.kanan}</a>
        </section>`).join('')}
    </div>`;

  // Status buka/tutup hari ini di kartu Jadwal (sebelumnya ada di header).
  const chip = app.querySelector('#status-hari-ini');
  try {
    const s = await statusWarung();
    chip.className = `status-chip ${s.kelas}`;
    chip.innerHTML = `<span class="dot"></span><span>${esc(s.teks)}</span>`;
  } catch {
    chip.innerHTML = '<span class="dot"></span><span>Offline</span>';
  }
}
