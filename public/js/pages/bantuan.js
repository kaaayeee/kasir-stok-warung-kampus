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
      ['Pilih menu yang dipesan.', 'Buka Kasir. Cari menu bila perlu, lalu ketuk + Tambah pada menu yang dipesan pelanggan. Ketuk lagi untuk menambah jumlah.'],
      ['Buka bagian Pesanan.', 'Gulir ke bawah atau ketuk Lihat Pesanan. Isi Nama Pelanggan bila perlu.'],
      ['Periksa rincian pesanan.', 'Ubah jumlah dengan tombol − dan +, isi Catatan bila perlu (mis. tidak pedas), lalu periksa Total Pembayaran.'],
      ['Pilih metode pembayaran.', 'Pilih Tunai atau QRIS. Untuk tunai, isi Uang Diterima atau pilih Uang pas untuk melihat kembalian.'],
      ['Simpan transaksi.', 'Ketuk Simpan Transaksi Kasir. Stok berkurang otomatis dan pesanan masuk ke Transaksi dengan status Belum Selesai.'],
    ],
    catatan: 'Menyimpan transaksi tidak berarti pesanan otomatis selesai. Tandai Selesai di halaman Transaksi saat pesanan sudah diantar. Jika jumlah pesanan melebihi stok, transaksi baru bisa disimpan setelah jumlahnya dikurangi.',
  },
  stok: {
    judul: 'Panduan Stok',
    ringkas: 'Cara mengelola stok barang dan mencatat stok masuk maupun keluar.',
    sub: 'Periksa persediaan dan catat setiap penambahan atau pengurangan stok barang.',
    langkah: [
      ['Periksa sisa stok.', 'Buka Stok. Angka di kanan tiap menu adalah sisa stok: kuning berarti menipis, merah berarti habis. Pakai kolom pencarian untuk menemukan menu.'],
      ['Pilih Masuk atau Keluar.', 'Ketuk Masuk saat barang datang atau selesai dimasak, atau Keluar saat barang berkurang di luar kasir (misalnya rusak).'],
      ['Pilih menu.', 'Pada kolom Menu, pilih menu yang jumlah stoknya berubah. Sisa stok sekarang tampil di bawahnya.'],
      ['Isi jumlah dan keterangan.', 'Isi jumlah dengan tombol − dan + atau ketik angkanya. Untuk stok keluar, pilih Alasan Keluar (Rusak atau Lainnya). Isi Catatan Tambahan bila perlu.'],
      ['Simpan lalu periksa riwayat.', 'Ketuk Simpan Stok Masuk atau Simpan Stok Keluar. Buka Riwayat untuk memastikan perubahan sudah tercatat beserta jamnya.'],
    ],
    catatan: 'Stok keluar tidak bisa melebihi sisa stok. Penjualan di Kasir sudah mengurangi stok otomatis, jadi tidak perlu dicatat lagi di Stok keluar.',
  },
  jadwal: {
    judul: 'Panduan Jadwal',
    ringkas: 'Cara mengatur jadwal operasional warung.',
    sub: 'Atur hari operasional, status warung, dan jam buka sesuai kebutuhan.',
    langkah: [
      ['Pilih tanggal.', 'Buka Jadwal. Ketuk Ubah pada tanggal di daftar 7 hari mendatang, atau pilih tanggal lain di kolom Tanggal.'],
      ['Tentukan status Buka atau Tutup.', 'Pada Status, pilih Buka jika warung beroperasi, atau Tutup jika tidak.'],
      ['Atur jam buka dan jam tutup.', 'Untuk status Buka, pilih jam dan menit. Jam tutup harus setelah jam buka.'],
      ['Tambahkan catatan bila perlu.', 'Isi Catatan Opsional, misalnya "tutup lebih awal, ada acara".'],
      ['Simpan perubahan.', 'Periksa tanggal, status, dan jam, lalu ketuk Simpan Perubahan. Jika tanggal itu sudah punya jadwal, jadwalnya diperbarui.'],
    ],
    catatan: 'Untuk hari tanpa operasional, gunakan status Tutup. Hanya admin yang bisa mengubah jadwal. Status hari ini juga tampil di kartu Jadwal Operasional pada Beranda.',
  },
  transaksi: {
    judul: 'Panduan Transaksi',
    ringkas: 'Cara melihat daftar transaksi, menyelesaikan pesanan, dan melihat rekap pemasukan.',
    sub: 'Tinjau pesanan, perbarui statusnya, dan lihat rekap pemasukan warung.',
    langkah: [
      ['Lihat daftar dan status transaksi.', 'Buka Transaksi. Pada Daftar Transaksi, periksa pesanan berstatus Belum Selesai atau Selesai.'],
      ['Periksa detail transaksi.', 'Ketuk Detail Transaksi pada pesanan yang ingin dilihat. Cocokkan rincian dengan pesanan pelanggan.'],
      ['Tandai pesanan yang sudah selesai.', 'Setelah pesanan diantarkan, ketuk Selesai pada pesanan berstatus Belum Selesai.'],
      ['Batalkan hanya bila diperlukan.', 'Jika perlu membatalkan, ketuk Batalkan pada pesanan Belum Selesai lalu konfirmasi. Stoknya dikembalikan otomatis.'],
      ['Lihat rekap pemasukan atau menu terlaris.', 'Pada Pemasukan Hari Ini atau Menu Terlaris, ketuk Lihat Rekap atau Lihat Daftar, lalu pilih tanggal yang ingin diperiksa.'],
    ],
    catatan: 'Batalkan bukan langkah wajib. Gunakan hanya jika pesanan Belum Selesai memang perlu dibatalkan; pesanan yang sudah Selesai tidak bisa dibatalkan.',
  },
};

const KENDALA = [
  ['Bagaimana jika stok barang tidak sesuai?',
    'Cocokkan stok fisik dengan jumlah di Stok. Periksa Riwayat Stok, lalu catat selisihnya melalui Stok Masuk, atau Stok Keluar dengan alasan Lainnya.'],
  ['Bagaimana jika transaksi belum selesai?',
    'Pesanan yang baru disimpan berstatus Belum Selesai. Setelah pesanan diantar, buka Transaksi lalu ketuk Selesai. Jika saat menyimpan muncul pesan gagal (misalnya stok tidak cukup), transaksi tidak tersimpan dan stok tidak berubah; perbaiki pesanan lalu simpan lagi.'],
  ['Bagaimana cara membatalkan pesanan?',
    'Sebelum disimpan: ketuk Bersihkan di bagian Pesanan Kasir. Setelah disimpan: buka Transaksi, ketuk Batalkan pada pesanan Belum Selesai, lalu konfirmasi. Stoknya kembali otomatis dan pesanan tidak dihitung sebagai pemasukan. Pesanan yang sudah Selesai tidak bisa dibatalkan.'],
  ['Bagaimana cara melihat rekap pemasukan?',
    'Buka Transaksi lalu ketuk Lihat Rekap. Pilih tanggal untuk melihat total pemasukan, rincian tunai dan QRIS, serta daftar transaksinya.'],
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
