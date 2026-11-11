// Onboarding admin: 5 layar pengenalan, tampil sekali setelah pertama kali masuk.
import { sesi } from '../util.js';
import { ikon } from './auth.js';

// ---------- Ilustrasi (SVG inline, warna lewat CSS supaya ikut mode gelap) ----------
const LOGO = '/img/Logo.png';

const ik = {
  dok: '<rect x="1" y="0" width="8" height="10" rx="1.3"/><path d="M3 3.2h4M3 5.4h4M3 7.6h2.5"/>',
  turun: '<path d="M5 0.5v6.5M2 4.4 5 7.4l3-3M0.5 9.5h9"/>',
  naik: '<path d="M5 9.5V3M2 5.6 5 2.6l3 3M0.5 0.5h9"/>',
  kotak: '<path d="M5 0.6 9.4 3v4.6L5 10 0.6 7.6V3z"/><path d="M0.6 3 5 5.4 9.4 3M5 5.4V10"/>',
  kal: '<rect x="0.5" y="1.5" width="9" height="8.3" rx="1.5"/><path d="M0.5 4.4h9M3 0v2.6M7 0v2.6"/>',
  rekap: '<rect x="0.5" y="0.5" width="9" height="9" rx="1.5"/><path d="M0.5 3.4h9M3.4 3.4v6.1"/>',
  piala: '<circle cx="5" cy="3.8" r="3.3"/><path d="M3.2 6.6 2.4 10 5 8.8 7.6 10 6.8 6.6"/>',
  struk: '<path d="M1.2 0.5h7.6v9l-1.9-1-1.9 1-1.9-1-1.9 1z"/><path d="M3 3.3h4M3 5.5h4"/>',
};

function chip(x, y, w, label, icon) {
  return `
    <g class="il-chip">
      <rect x="${x}" y="${y}" width="${w}" height="22" rx="5" class="il-chipbg"/>
      <g transform="translate(${x + 8} ${y + 6})" class="il-ico">${icon}</g>
      <text x="${x + 23}" y="${y + 14.6}">${label}</text>
    </g>`;
}

function dekor(plus, dots) {
  const p = plus.map(([x, y]) => `<path d="M${x - 5} ${y}h10M${x} ${y - 5}v10" class="il-plus"/>`).join('');
  const d = dots.map(([x, y, r = 2.5]) => `<circle cx="${x}" cy="${y}" r="${r}" class="il-soft"/>`).join('');
  return p + d;
}

const awning = Array.from({ length: 6 }, (_, i) => {
  const w = 136 / 6;
  const x = 70 + i * w;
  return `<path d="M${x} 99h${w}v12a${w / 2} 6 0 0 1 -${w} 0z" class="${i % 2 ? 'il-soft' : 'il-navy'}"/>`;
}).join('');

const ILUSTRASI = {
  toko: `
    <circle cx="150" cy="108" r="82" class="il-bg"/>
    ${dekor([[218, 46]], [[60, 92], [236, 150, 2]])}
    <rect x="62" y="176" width="176" height="4" rx="2" class="il-soft"/>
    <rect x="80" y="104" width="116" height="73" class="il-white il-stroke"/>
    <rect x="90" y="122" width="52" height="34" rx="2" class="il-pale il-stroke2"/>
    <rect x="86" y="155" width="60" height="5" rx="2" class="il-navy"/>
    <rect x="154" y="122" width="32" height="55" rx="2" class="il-pale il-stroke2"/>
    <circle cx="160" cy="150" r="2" class="il-navy"/>
    <rect x="68" y="93" width="140" height="7" rx="2" class="il-navy"/>
    ${awning}
    <rect x="94" y="70" width="88" height="21" rx="3" class="il-navy"/>
    <text x="138" y="84.2" text-anchor="middle" class="il-sign">Dapoer Bu Mimin</text>
    <rect x="206" y="98" width="48" height="84" rx="9" class="il-navy"/>
    <rect x="211" y="107" width="38" height="66" rx="4" class="il-screen"/>
    <image href="${LOGO}" x="217" y="113" width="26" height="26"/>
    <rect x="219" y="148" width="22" height="15" rx="4" class="il-pale"/>
    <path d="M224 153h12l-1 6.5h-10z M226.5 153v-1.5a3.5 3.5 0 0 1 7 0V153" class="il-ico-n"/>`,

  kasir: `
    <circle cx="150" cy="104" r="82" class="il-bg"/>
    ${dekor([[236, 40]], [[60, 96], [244, 150, 2]])}
    <g transform="rotate(8 205 85)">
      <rect x="166" y="28" width="80" height="112" rx="5" class="il-white il-stroke-soft"/>
      <g transform="translate(178 42)" class="il-ico">${ik.dok}</g>
      <text x="193" y="51" class="il-label">Pesanan</text>
      ${[66, 80, 94, 108].map((y, i) => `<rect x="178" y="${y}" width="9" height="5" rx="2" class="il-soft"/><rect x="192" y="${y}" width="${i % 2 ? 30 : 42}" height="5" rx="2" class="il-pale"/>`).join('')}
    </g>
    <rect x="86" y="70" width="96" height="70" rx="7" class="il-navy"/>
    <rect x="94" y="78" width="80" height="54" rx="3" class="il-screen"/>
    <path d="M121 101h26l-3 13h-20z M126 101l5-8M142 101l-5-8M128 106v4M134 106v4M140 106v4" class="il-ico-n" transform="translate(0 0)"/>
    <rect x="126" y="140" width="16" height="9" class="il-mid"/>
    <path d="M78 162 92 148h84l14 14z" class="il-mid"/>
    <rect x="70" y="161" width="128" height="10" rx="3" class="il-navy"/>
    <circle cx="200" cy="150" r="11" class="il-navy"/>
    <path d="m195 150 3.5 3.5 6.5-7" class="il-check"/>
    ${chip(118, 180, 64, 'Kasir', ik.struk)}`,

  stok: `
    <circle cx="150" cy="104" r="82" class="il-bg"/>
    ${dekor([[240, 38]], [[54, 110]])}
    <rect x="82" y="56" width="5" height="126" rx="2" class="il-mid"/>
    <rect x="213" y="56" width="5" height="126" rx="2" class="il-mid"/>
    <rect x="78" y="118" width="144" height="5" rx="2" class="il-mid"/>
    <rect x="78" y="174" width="144" height="5" rx="2" class="il-mid"/>
    <rect x="96" y="76" width="48" height="42" rx="3" class="il-pale il-stroke-soft"/>
    <rect x="114" y="76" width="12" height="11" class="il-soft"/>
    <rect x="108" y="103" width="24" height="5" rx="2" class="il-white"/>
    <rect x="154" y="68" width="52" height="50" rx="3" class="il-navy"/>
    <rect x="174" y="68" width="12" height="11" class="il-mid"/>
    <rect x="168" y="104" width="24" height="5" rx="2" class="il-white"/>
    <rect x="96" y="128" width="50" height="46" rx="3" class="il-navy"/>
    <rect x="115" y="128" width="12" height="11" class="il-mid"/>
    <rect x="109" y="160" width="24" height="5" rx="2" class="il-white"/>
    <rect x="156" y="134" width="46" height="40" rx="3" class="il-pale il-stroke-soft"/>
    <rect x="173" y="134" width="12" height="10" class="il-soft"/>
    <rect x="167" y="160" width="24" height="5" rx="2" class="il-white"/>
    ${chip(58, 30, 78, 'Stok masuk', ik.turun)}
    ${chip(188, 112, 82, 'Stok keluar', ik.naik)}
    ${chip(120, 186, 60, 'Stok', ik.kotak)}`,

  jadwal: `
    <circle cx="150" cy="104" r="82" class="il-bg"/>
    ${dekor([[240, 40]], [[56, 104], [238, 150, 2]])}
    <rect x="80" y="50" width="132" height="116" rx="7" class="il-white il-stroke-soft"/>
    <path d="M80 57a7 7 0 0 1 7-7h118a7 7 0 0 1 7 7v24H80z" class="il-navy"/>
    <rect x="106" y="42" width="5" height="16" rx="2.5" class="il-navy"/>
    <rect x="181" y="42" width="5" height="16" rx="2.5" class="il-navy"/>
    ${[0, 1, 2].map((j) => [0, 1, 2, 3].map((i) => (i === 1 && j === 1 ? '' : `<rect x="${95 + i * 28}" y="${95 + j * 22}" width="17" height="9" rx="2.5" class="il-pale"/>`)).join('')).join('')}
    <rect x="121" y="112" width="21" height="17" rx="3.5" class="il-navy"/>
    <path d="m126 120.5 3.5 3.5 6.5-7" class="il-check"/>
    <circle cx="206" cy="146" r="29" class="il-white"/>
    <circle cx="206" cy="146" r="27" class="il-ring"/>
    <path d="M206 146v-17M206 146l11 7" class="il-hand"/>
    <circle cx="206" cy="146" r="3" class="il-navy"/>
    ${chip(114, 182, 68, 'Jadwal', ik.kal)}`,

  transaksi: `
    <circle cx="150" cy="104" r="82" class="il-bg"/>
    ${dekor([[244, 40]], [[240, 152, 2.2]])}
    <ellipse cx="152" cy="176" rx="66" ry="4" class="il-pale"/>
    <rect x="118" y="26" width="70" height="146" rx="12" class="il-screen il-phone"/>
    <rect x="143" y="34" width="20" height="4" rx="2" class="il-navy"/>
    <image href="${LOGO}" x="131" y="58" width="44" height="44"/>
    <rect x="134" y="118" width="38" height="24" rx="4" class="il-pale"/>
    ${chip(50, 52, 72, 'Transaksi', ik.dok)}
    ${chip(170, 98, 102, 'Rekap Pemasukan', ik.rekap)}
    ${chip(60, 150, 92, 'Menu Terlaris', ik.piala)}`,
};

const LANGKAH = [
  { il: 'toko', judul: 'Selamat Datang di Dapoer Bu Mimin!', isi: 'Kelola operasional warung dengan lebih mudah melalui satu aplikasi.' },
  { il: 'kasir', judul: 'Pesanan Warung Lebih Terorganisir', isi: 'Catat pesanan pelanggan, pantau status pesanan, dan kelola transaksi melalui fitur Kasir.' },
  { il: 'stok', judul: 'Stok Barang Lebih Terkontrol', isi: 'Pantau ketersediaan barang dan catat stok masuk maupun keluar agar persediaan warung tetap terjaga.' },
  { il: 'jadwal', judul: 'Atur Jadwal Warung', isi: 'Kelola waktu operasional warung dan atur jadwal layanan sesuai kebutuhan.' },
  { il: 'transaksi', judul: 'Operasional Warung', isi: 'Lihat daftar transaksi, pantau pemasukan harian, dan ketahui menu yang paling banyak terjual.' },
];

/** Tampilkan onboarding. Promise selesai saat pengguna menekan Mulai atau Lewati. */
export function tampilkanOnboarding() {
  document.querySelectorAll('.auth').forEach((el) => el.remove());
  const root = document.createElement('div');
  root.className = 'auth onb';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Pengenalan aplikasi');
  root.innerHTML = `
    <header class="onb-top">
      <span class="logo-mark" role="img" aria-label="Logo"></span>
      <div><b>Dapoer Bu Mimin</b><small>Operasional Warung</small></div>
    </header>
    <div class="onb-body">
      <div class="onb-nav">
        <button type="button" class="onb-back" aria-label="Sebelumnya">${ikon.kiri}</button>
        <button type="button" class="onb-skip">Lewati</button>
      </div>
      <div class="onb-slide" aria-live="polite">
        <svg class="onb-ill" viewBox="0 0 300 210" role="img"></svg>
        <h1></h1>
        <p></p>
      </div>
      <div class="onb-steps">
        <span class="onb-dots">${LANGKAH.map(() => '<i></i>').join('')}</span>
        <span class="onb-count"></span>
      </div>
      <button type="button" class="auth-btn onb-next"></button>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('auth-open');

  const slide = root.querySelector('.onb-slide');
  const gambar = root.querySelector('.onb-ill');
  const judul = slide.querySelector('h1');
  const isi = slide.querySelector('p');
  const kembali = root.querySelector('.onb-back');
  const lanjut = root.querySelector('.onb-next');
  const titik = [...root.querySelectorAll('.onb-dots i')];
  const hitung = root.querySelector('.onb-count');

  let i = 0;
  function tampil(arah = 0) {
    const s = LANGKAH[i];
    gambar.innerHTML = ILUSTRASI[s.il];
    gambar.setAttribute('aria-label', `Ilustrasi: ${s.judul}`);
    judul.textContent = s.judul;
    isi.textContent = s.isi;
    titik.forEach((t, n) => t.classList.toggle('on', n === i));
    hitung.textContent = `${i + 1}/${LANGKAH.length}`;
    kembali.style.visibility = i === 0 ? 'hidden' : 'visible';
    const akhir = i === LANGKAH.length - 1;
    lanjut.innerHTML = `${akhir ? 'Mulai' : 'Lanjut'} ${ikon.kanan}`;
    if (arah) {
      slide.classList.remove('dari-kanan', 'dari-kiri');
      void slide.offsetWidth; // mulai ulang animasi
      slide.classList.add(arah > 0 ? 'dari-kanan' : 'dari-kiri');
    }
  }

  return new Promise((selesai) => {
    function tutup() {
      sesi.onboardingSelesai = true;
      document.removeEventListener('keydown', tombolPanah);
      root.remove();
      document.body.classList.remove('auth-open');
      selesai();
    }
    const maju = () => (i < LANGKAH.length - 1 ? (i++, tampil(1)) : tutup());
    const mundur = () => { if (i > 0) { i--; tampil(-1); } };
    function tombolPanah(e) {
      if (e.key === 'ArrowRight') maju();
      else if (e.key === 'ArrowLeft') mundur();
    }

    lanjut.addEventListener('click', maju);
    kembali.addEventListener('click', mundur);
    root.querySelector('.onb-skip').addEventListener('click', tutup);
    document.addEventListener('keydown', tombolPanah);

    // Geser kiri/kanan di HP
    let x0 = null;
    slide.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    slide.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) (dx < 0 ? maju : mundur)();
    });

    tampil();
    lanjut.focus({ preventScroll: true });
  });
}
