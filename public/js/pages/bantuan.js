// Pusat Bantuan (#/bantuan) + halaman panduan (#/bantuan/kasir, /stok, /jadwal, /transaksi).
// Isi panduan mengikuti cara kerja aplikasi yang SEBENARNYA (nama tombol & menu sama
// dengan yang tampil di layar), supaya tidak menyesatkan pengguna.
import { api, esc, ikonMenu, ikonCari, bukaSheet } from '../util.js';
import { ikon } from './auth.js';
import { tampilkanOnboarding } from './onboarding.js';

const svg = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ik = {
  chevKanan: svg('<path d="m9 6 6 6-6 6"/>'),
  chevBawah: svg('<path d="m6 9 6 6 6-6"/>'),
  info: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5M12 7.6h.01"/>'),
  chat: svg('<path d="M4 19.5 5.3 16A8 8 0 1 1 8.4 18.9z"/>'),
  surat: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
};

export const PANDUAN = {
  kasir: {
    judul: 'Panduan Kasir',
    ringkas: 'Cara mencatat pesanan dan memproses pembayaran pelanggan.',
    sub: 'Catat pesanan pelanggan dan simpan pembayaran melalui halaman Kasir.',
    langkah: [
      ['Pilih barang yang dipesan.', 'Buka Kasir. Cari menu bila perlu, lalu ketuk kartu barang yang dipesan pelanggan.'],
      ['Atur jumlah barang.', 'Ketuk kartu yang sama lagi untuk menambah jumlah. Angka di pojok kartu menunjukkan jumlah di pesanan.'],
      ['Periksa rincian pesanan.', 'Ketuk Bayar di bagian bawah. Di Ringkasan pesanan, ubah jumlah dengan tombol − dan +, lalu periksa total.'],
      ['Pilih metode pembayaran.', 'Pilih QRIS atau Tunai. Untuk tunai, isi Uang diterima atau pilih Uang pas untuk melihat kembalian.'],
      ['Simpan transaksi.', 'Ketuk Simpan transaksi. Stok barang berkurang otomatis dan transaksi masuk ke Riwayat Transaksi.'],
    ],
    catatan: 'Barang yang stoknya habis tidak bisa dipilih. Pengatur waktu di kanan atas membantu menjaga transaksi tetap di bawah 30 detik.',
  },
  stok: {
    judul: 'Panduan Stok',
    ringkas: 'Cara mengelola stok barang dan mencatat stok masuk maupun keluar.',
    sub: 'Periksa persediaan dan catat setiap penambahan atau pengurangan stok barang.',
    langkah: [
      ['Periksa sisa stok.', 'Buka Stok › Sisa stok. Barang habis ditandai merah dan barang menipis ditandai kuning. Pakai kolom pencarian untuk menemukan barang.'],
      ['Pilih stok masuk atau keluar.', 'Pilih tab Masuk saat barang datang, atau Keluar saat barang berkurang di luar kasir (misalnya rusak). Bisa juga lewat tombol + Masuk / − Keluar di daftar.'],
      ['Pilih barang.', 'Pada kolom Barang, pilih barang yang jumlah stoknya berubah.'],
      ['Isi jumlah dan keterangan.', 'Isi jumlah dengan bilangan bulat. Untuk stok masuk, isi Tanggal masuk dan Catatan bila perlu. Untuk stok keluar, pilih alasan Terjual, Rusak, atau Lainnya.'],
      ['Simpan lalu periksa riwayat.', 'Ketuk Simpan stok masuk atau Simpan stok keluar. Buka tab Riwayat untuk memastikan perubahan sudah tercatat.'],
    ],
    catatan: 'Stok keluar tidak bisa melebihi sisa stok. Penjualan di Kasir sudah mengurangi stok otomatis, jadi tidak perlu dicatat lagi di Stok keluar.',
  },
  jadwal: {
    judul: 'Panduan Jadwal',
    ringkas: 'Cara mengatur jadwal operasional warung.',
    sub: 'Atur hari operasional, status warung, dan jam buka sesuai kebutuhan.',
    langkah: [
      ['Pilih tanggal.', 'Buka Jadwal. Ketuk tanggal di daftar 8 hari ke depan, atau pilih tanggal lain di kolom Tanggal.'],
      ['Tentukan status Buka atau Libur.', 'Pada Status, pilih Buka jika warung beroperasi, atau Libur jika tidak.'],
      ['Atur jam buka dan jam tutup.', 'Untuk status Buka, pilih jam dan menit. Jam tutup harus setelah jam buka.'],
      ['Tambahkan catatan bila perlu.', 'Isi Catatan (opsional), misalnya "tutup lebih awal, ada acara".'],
      ['Simpan jadwal.', 'Periksa tanggal, status, dan jam, lalu ketuk Simpan jadwal. Jika tanggal itu sudah punya jadwal, jadwalnya diperbarui.'],
    ],
    catatan: 'Hanya admin yang bisa mengubah jadwal. Status buka/tutup hari ini juga tampil di kartu Jadwal Operasional pada Beranda.',
  },
  transaksi: {
    judul: 'Panduan Transaksi',
    ringkas: 'Cara melihat daftar transaksi dan rekap pemasukan harian.',
    sub: 'Tinjau transaksi penjualan dan lihat rekap pemasukan warung.',
    langkah: [
      ['Buka Riwayat Transaksi.', 'Ketuk Transaksi di menu bawah. Transaksi hari ini langsung tampil, yang terbaru di atas.'],
      ['Pilih tanggal.', 'Ubah tanggal di bagian atas untuk melihat transaksi pada hari lain.'],
      ['Lihat rekap pemasukan.', 'Kotak Pemasukan, Transaksi, QRIS, dan Tunai menunjukkan total pada tanggal yang dipilih.'],
      ['Periksa detail transaksi.', 'Ketuk sebuah transaksi untuk melihat barang, jumlah, dan subtotalnya, beserta jam dan pencatatnya.'],
    ],
    catatan: 'Transaksi yang sudah disimpan belum bisa diubah atau dibatalkan. Periksa Ringkasan pesanan sebelum menekan Simpan transaksi.',
  },
};

const KENDALA = [
  ['Bagaimana jika stok barang tidak sesuai?',
    'Cocokkan stok fisik dengan jumlah di Stok. Periksa Riwayat Stok, lalu catat selisihnya melalui Stok Masuk, atau Stok Keluar dengan alasan Lainnya.'],
  ['Bagaimana jika transaksi belum selesai?',
    'Jika muncul pesan gagal (misalnya stok tidak cukup atau koneksi terputus), transaksi tidak tersimpan dan stok tidak berubah. Perbaiki pesanan lalu ketuk Simpan transaksi lagi, kemudian pastikan transaksinya muncul di Riwayat Transaksi.'],
  ['Bagaimana cara membatalkan pesanan?',
    'Sebelum disimpan: di Ringkasan pesanan, kurangi jumlah barang sampai terhapus. Transaksi yang sudah disimpan belum bisa dibatalkan; hubungi tim pengembang bila ada kesalahan pencatatan.'],
  ['Bagaimana cara melihat rekap pemasukan?',
    'Buka Transaksi lalu pilih tanggal. Total pemasukan beserta rincian QRIS dan tunai tampil di bagian atas.'],
  ['Bagaimana jika data transaksi tidak muncul?',
    'Pastikan tanggal yang dipilih benar (waktu memakai WIB). Jika masih kosong, periksa koneksi Wi-Fi ke laptop yang menjalankan aplikasi, lalu muat ulang halaman.'],
];

export async function render(app, sub) {
  if (sub && PANDUAN[sub]) return halamanPanduan(app, sub);
  return halamanUtama(app);
}

// ---------------------------------------------------------------------
function halamanUtama(app) {
  app.innerHTML = `
    <a href="#/beranda" class="btn-kembali">${ikon.kiri} Kembali</a>
    <section class="bantuan-card bantuan-hero">
      <div class="bantuan-hero-judul">
        <span class="bantuan-hero-ikon">${ikon.tanya}</span>
        <h1>Pusat Bantuan</h1>
      </div>
      <p>Temukan panduan dan solusi untuk kendala penggunaan aplikasi.</p>
    </section>
    <div class="bantuan-card bantuan-cari">
      <label class="bantuan-cari-input">
        ${ikonCari}
        <input type="search" id="cari" placeholder="Cari bantuan atau kendala dialami…" aria-label="Cari bantuan" autocomplete="off">
      </label>
    </div>

    <h2 class="bantuan-h2" id="h-panduan">Panduan Penggunaan</h2>
    <ul class="bantuan-card bantuan-list" id="daftar-panduan" aria-labelledby="h-panduan">
      ${Object.entries(PANDUAN).map(([k, p]) => `
        <li data-cari="${esc(teksCari(p.judul, p.ringkas, p.sub, ...p.langkah.flat(), p.catatan))}">
          <a href="#/bantuan/${k}">
            <span class="bantuan-list-ikon">${ikonMenu[k]}</span>
            <span class="grow"><b>${p.judul}</b><span>${p.ringkas}</span></span>
            ${ik.chevKanan}
          </a>
        </li>`).join('')}
    </ul>

    <h2 class="bantuan-h2" id="h-kendala">Kendala Umum</h2>
    <div class="bantuan-card bantuan-faq" id="daftar-kendala">
      ${KENDALA.map(([t, j], i) => `
        <details ${i === 0 ? 'open' : ''} data-cari="${esc(teksCari(t, j))}">
          <summary><span>${t}</span>${ik.chevBawah}</summary>
          <p>${j}</p>
        </details>`).join('')}
    </div>

    <p class="bantuan-kosong hidden" id="kosong" role="status"></p>

    <section class="bantuan-card bantuan-kontak">
      <h2>Masih Butuh Bantuan?</h2>
      <p>Jika kendala belum teratasi, hubungi tim pengembang untuk mendapatkan informasi lebih lanjut.</p>
      <button type="button" class="btn primary block" id="hubungi">${ik.chat} Hubungi Tim Pengembang</button>
      <button type="button" class="auth-link center bantuan-onb" id="ulang-onb">Lihat pengenalan aplikasi lagi</button>
    </section>`;

  const cari = app.querySelector('#cari');
  const kosong = app.querySelector('#kosong');
  const barisPanduan = [...app.querySelectorAll('#daftar-panduan li')];
  const barisKendala = [...app.querySelectorAll('#daftar-kendala details')];
  const bukaAwal = barisKendala.map((d) => d.open);

  cari.addEventListener('input', () => {
    const kata = teksCari(cari.value).split(' ').filter(Boolean);
    const cocok = (el) => kata.every((k) => el.dataset.cari.includes(k));
    let nPanduan = 0, nKendala = 0;
    barisPanduan.forEach((li) => { const ok = cocok(li); li.hidden = !ok; nPanduan += ok; });
    barisKendala.forEach((d, i) => {
      const ok = cocok(d);
      d.hidden = !ok;
      nKendala += ok;
      d.open = kata.length ? ok : bukaAwal[i]; // saat mencari, jawaban yang cocok langsung terbuka
    });
    for (const [id, n] of [['panduan', nPanduan], ['kendala', nKendala]]) {
      app.querySelector(`#h-${id}`).hidden = !n;
      app.querySelector(`#daftar-${id}`).hidden = !n;
    }
    kosong.classList.toggle('hidden', nPanduan + nKendala > 0);
    kosong.textContent = `Tidak ada bantuan yang cocok dengan "${cari.value.trim()}". Coba kata lain, misalnya "stok" atau "bayar".`;
  });

  app.querySelector('#hubungi').addEventListener('click', hubungiPengembang);
  app.querySelector('#ulang-onb').addEventListener('click', () => tampilkanOnboarding());
}

/** Huruf kecil, tanpa tanda baca — untuk pencarian sederhana. */
function teksCari(...isi) {
  return isi.join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

async function hubungiPengembang() {
  let kontak = {};
  try { kontak = (await api('/info')).kontak || {}; } catch { /* tetap tampilkan sheet */ }
  const pilihan = [];
  if (kontak.whatsapp) {
    pilihan.push(`<a class="btn primary block" href="https://wa.me/${esc(kontak.whatsapp)}" target="_blank" rel="noopener">${ik.chat} Chat WhatsApp</a>`);
  }
  if (kontak.email) {
    pilihan.push(`<a class="btn block" href="mailto:${esc(kontak.email)}?subject=${encodeURIComponent('Bantuan aplikasi Dapoer Bu Mimin')}">${ik.surat} Kirim email</a>`);
  }
  const { el, tutup } = bukaSheet(`
    <h2>Hubungi Tim Pengembang</h2>
    ${pilihan.length
      ? `<p class="small muted" style="margin:0 0 14px">Ceritakan kendala yang dialami, halaman yang dibuka, dan pesan error yang muncul (bila ada).</p>
         <div class="kontak-pilihan">${pilihan.join('')}</div>`
      : `<div class="notice warn">Kontak tim pengembang belum diatur. Isi <b>KONTAK_WA</b> atau <b>KONTAK_EMAIL</b> di berkas .env, atau hubungi langsung lewat grup kelompok.</div>`}
    <button type="button" class="btn block" id="tutup-kontak" style="margin-top:10px">Tutup</button>`);
  el.querySelector('#tutup-kontak').addEventListener('click', tutup);
}

// ---------------------------------------------------------------------
function halamanPanduan(app, k) {
  const p = PANDUAN[k];
  app.innerHTML = `
    <a href="#/bantuan" class="btn-kembali">${ikon.kiri} Kembali ke Pusat Bantuan</a>
    <article class="bantuan-card panduan">
      <h1>${p.judul}</h1>
      <p class="panduan-sub">${p.sub}</p>
      <ol class="panduan-langkah">
        ${p.langkah.map(([t, d], i) => `
          <li><span class="panduan-no">${i + 1}.</span><div><b>${t}</b><p>${d}</p></div></li>`).join('')}
      </ol>
    </article>
    <aside class="panduan-catatan">${ik.info}<p>${p.catatan}</p></aside>`;
}
