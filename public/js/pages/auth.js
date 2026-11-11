// Layar masuk (login admin) + lupa kata sandi. Tampil penuh layar di atas aplikasi.
import { api, esc, sesi, setErr, clearErr } from '../util.js';

const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ikon = {
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
  lock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.4M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/>'),
  kanan: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  kiri: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  tanya: svg('<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.2h.01"/>'),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function merek() {
  return `
    <div class="auth-brand">
      <span class="logo-mark lg" role="img" aria-label="Logo Dapoer Bu Mimin"></span>
      <b>Dapoer Bu Mimin</b>
    </div>`;
}

function bantuan(judul, isi) {
  return `
    <aside class="auth-help">
      ${ikon.tanya}
      <div><b>${judul}</b><p>${isi}</p></div>
    </aside>`;
}

function kolomEmail(id, nilai = '') {
  return `
    <div class="auth-field">
      <label for="${id}">Email</label>
      <div class="auth-input">
        ${ikon.mail}
        <input id="${id}" name="email" type="email" inputmode="email" autocomplete="username"
               autocapitalize="off" spellcheck="false" placeholder="Masukkan email" value="${esc(nilai)}">
      </div>
      <div class="auth-err" data-err="email" aria-live="polite"></div>
    </div>`;
}

/**
 * Tampilkan layar masuk. Promise selesai (berisi data pengguna) setelah
 * berhasil masuk; layar dilepas otomatis.
 */
export function tampilkanMasuk() {
  document.querySelectorAll('.auth').forEach((el) => el.remove());
  const root = document.createElement('div');
  root.className = 'auth';
  document.body.appendChild(root);
  document.body.classList.add('auth-open');

  return new Promise((selesai) => {
    let emailTerakhir = '';

    function tutup(pengguna) {
      root.remove();
      document.body.classList.remove('auth-open');
      selesai(pengguna);
    }

    function layarMasuk() {
      root.innerHTML = `
        <div class="auth-box">
          ${merek()}
          <h1>Selamat datang kembali!</h1>
          <p class="auth-sub">Masuk sebagai admin untuk mengelola operasional warung hari ini.</p>
          <form class="auth-card" novalidate>
            <div class="auth-alert hidden" data-err="umum" role="alert"></div>
            ${kolomEmail('masuk-email', emailTerakhir)}
            <div class="auth-field">
              <label for="masuk-sandi">Kata sandi</label>
              <div class="auth-input">
                ${ikon.lock}
                <input id="masuk-sandi" name="kata_sandi" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi">
                <button type="button" class="auth-eye" aria-label="Tampilkan kata sandi" aria-pressed="false">${ikon.eye}</button>
              </div>
              <div class="auth-err" data-err="kata_sandi" aria-live="polite"></div>
            </div>
            <div class="auth-row">
              <label class="auth-check"><input type="checkbox" name="ingat"><span>Ingat saya</span></label>
              <button type="button" class="auth-link" data-ke="lupa">Lupa kata sandi?</button>
            </div>
            <button type="submit" class="auth-btn">Masuk ${ikon.kanan}</button>
          </form>
          ${bantuan('Belum punya akses admin?', 'Hubungi tim pengembang untuk mendapatkan akun atau bantuan masuk.')}
        </div>`;

      const form = root.querySelector('form');
      const sandi = form.kata_sandi;
      const mata = form.querySelector('.auth-eye');
      const umum = form.querySelector('[data-err="umum"]');
      const tombol = form.querySelector('.auth-btn');

      mata.addEventListener('click', () => {
        const lihat = sandi.type === 'password';
        sandi.type = lihat ? 'text' : 'password';
        mata.innerHTML = lihat ? ikon.eyeOff : ikon.eye;
        mata.setAttribute('aria-pressed', String(lihat));
        mata.setAttribute('aria-label', lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      });
      form.querySelector('[data-ke="lupa"]').addEventListener('click', () => {
        emailTerakhir = form.email.value.trim();
        layarLupa();
      });
      form.addEventListener('input', (e) => {
        if (e.target.name) setErr(form, e.target.name, '');
        umum.classList.add('hidden');
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErr(form);
        umum.classList.add('hidden');
        const email = form.email.value.trim();
        const kata_sandi = sandi.value;
        let gagal = false;
        if (!email) { setErr(form, 'email', 'Email wajib diisi.'); gagal = true; }
        else if (!EMAIL_RE.test(email)) { setErr(form, 'email', 'Format email tidak valid.'); gagal = true; }
        if (!kata_sandi) { setErr(form, 'kata_sandi', 'Kata sandi wajib diisi.'); gagal = true; }
        if (gagal) return form.querySelector('[aria-invalid="true"]')?.focus();

        tombol.disabled = true;
        tombol.innerHTML = 'Memeriksa…';
        try {
          const { pengguna } = await api('/masuk', { method: 'POST', body: { email, kata_sandi } });
          sesi.masuk(pengguna, form.ingat.checked);
          tutup(pengguna);
        } catch (err) {
          if (err.status === 401) {
            umum.textContent = err.message;
            umum.classList.remove('hidden');
            sandi.select();
          } else if (err.field === 'email' || err.field === 'kata_sandi') {
            setErr(form, err.field, err.message);
          } else {
            umum.textContent = err.message;
            umum.classList.remove('hidden');
          }
          tombol.disabled = false;
          tombol.innerHTML = `Masuk ${ikon.kanan}`;
        }
      });
    }

    function layarLupa() {
      root.innerHTML = `
        <div class="auth-box">
          ${merek()}
          <h1>Lupa kata sandi?</h1>
          <p class="auth-sub">Masukkan email admin untuk menerima tautan pengaturan ulang kata sandi.</p>
          <form class="auth-card" novalidate>
            <div class="auth-alert info hidden" data-err="umum" role="status"></div>
            ${kolomEmail('lupa-email', emailTerakhir)}
            <p class="auth-hint">Masukkan email yang terdaftar.</p>
            <button type="submit" class="auth-btn">Kirim tautan reset ${ikon.kanan}</button>
            <button type="button" class="auth-link center" data-ke="masuk">${ikon.kiri} Kembali ke login</button>
          </form>
          ${bantuan('Tidak dapat mengakses email?', 'Hubungi tim pengembang untuk mendapatkan akun atau bantuan masuk.')}
        </div>`;

      const form = root.querySelector('form');
      const info = form.querySelector('[data-err="umum"]');
      form.querySelector('[data-ke="masuk"]').addEventListener('click', () => {
        emailTerakhir = form.email.value.trim();
        layarMasuk();
      });
      form.addEventListener('input', () => setErr(form, 'email', ''));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErr(form);
        const email = form.email.value.trim();
        if (!email) return setErr(form, 'email', 'Email wajib diisi.'), form.email.focus();
        if (!EMAIL_RE.test(email)) return setErr(form, 'email', 'Format email tidak valid.'), form.email.focus();
        // Belum ada layanan pengiriman email di prototype ini, jadi tidak
        // berpura-pura mengirim. Pengguna diarahkan ke tim pengembang.
        info.innerHTML = '<b>Pengiriman email belum tersedia.</b> Untuk sementara, hubungi tim pengembang untuk mengatur ulang kata sandi.';
        info.classList.remove('hidden');
      });
    }

    layarMasuk();
  });
}
