// EP-01 US-03 — Atur jadwal buka/tutup per tanggal (hari ini + 6 hari ke depan).
// Hanya admin yang boleh mengubah; aturan jam dicek di form, server, dan database.
import { api, esc, toast, sesi, sekarangWIB, infoTanggal } from '../util.js';

const JAM = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MENIT = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const JUMLAH_HARI = 7;

const tanggalLengkap = (t) => { const i = infoTanggal(t); return `${i.hariPanjang}, ${i.tgl} ${BULAN_PANJANG[Number(t.slice(5, 7)) - 1]} ${i.tahun}`; };
const tanggalSedang = (t) => { const i = infoTanggal(t); return `${i.hariPanjang}, ${i.tgl} ${i.bulan} ${i.tahun}`; };

function pilihJam(nama, label) {
  const opsi = (arr) => arr.map((x) => `<option value="${x}">${x}</option>`).join('');
  return `
    <div class="field jam-field">
      <span class="label" id="lbl-${nama}">${label}</span>
      <div class="jam-pilih" role="group" aria-labelledby="lbl-${nama}">
        <select class="input num" name="${nama}_h" aria-label="${label}: jam">${opsi(JAM)}</select>
        <select class="input num" name="${nama}_m" aria-label="${label}: menit">${opsi(MENIT)}</select>
      </div>
    </div>`;
}

function pilStatus(j) {
  if (!j) return '<span class="status-pill">Belum diatur</span>';
  return j.buka ? '<span class="status-pill buka"><i></i>Buka</span>' : '<span class="status-pill tutup"><i></i>Tutup</span>';
}

/**
 * Aturan sama dengan server (src/services/jadwal.js):
 * bila buka, jam tutup harus setelah jam buka (sama persis juga ditolak).
 */
function cekJadwal(buka, jb, jt) {
  if (!buka) return '';
  if (jt === jb) return `Jam tutup tidak boleh sama dengan jam buka (${jb}). Periksa kembali jadwal sebelum menyimpan.`;
  if (jt < jb) return `Jam tutup ${jt} lebih awal dari jam buka ${jb}. Periksa kembali jadwal sebelum menyimpan.`;
  return '';
}

export async function render(app, q) {
  const admin = sesi.pengguna?.peran === 'admin';
  const hariIni = sekarangWIB().tanggal;
  let dipilih = q.tanggal || hariIni;
  let data = [];
  let buka = true;

  app.innerHTML = `
    <div class="jadwal-head">
      <h1>Atur Jadwal</h1>
      <p>Tentukan jadwal dan status operasional warung</p>
    </div>
    <section class="bantuan-card jadwal-hariini" id="today"></section>
    ${admin ? '' : '<div class="notice warn">Hanya admin (Bu Mimin) yang bisa mengubah jadwal. Kamu tetap bisa melihatnya.</div>'}
    <form class="bantuan-card stok-form jadwal-form" id="f" novalidate ${admin ? '' : 'inert'}>
      <div class="field">
        <label for="tanggal">Tanggal</label>
        <input class="input num" type="date" id="tanggal" name="tanggal" value="${dipilih}">
        <div class="err" data-err="tanggal"></div>
      </div>
      <div class="field">
        <span class="label" id="lbl-status">Status</span>
        <div class="status-seg" id="status" role="group" aria-labelledby="lbl-status">
          <button type="button" data-v="1"><i class="buka"></i>Buka</button>
          <button type="button" data-v="0"><i></i>Tutup</button>
        </div>
      </div>
      <div class="jam-grid" id="jam-wrap">
        ${pilihJam('jam_buka', 'Jam Buka')}
        ${pilihJam('jam_tutup', 'Jam Tutup')}
      </div>
      <div class="err jam-err" data-err="jam" role="alert"></div>
      <div class="field">
        <label for="catatan">Catatan Opsional</label>
        <textarea class="input" id="catatan" name="catatan" rows="3" maxlength="200" placeholder="Tambahkan catatan jika diperlukan..."></textarea>
      </div>
      <button class="btn primary block" type="submit" id="simpan">Simpan Perubahan</button>
    </form>
    <section class="bantuan-card jadwal-daftar">
      <p class="jadwal-daftar-judul">Daftar jadwal operasional untuk ${JUMLAH_HARI} hari mendatang</p>
      <div id="list"><p class="empty">Memuat…</p></div>
    </section>`;

  const f = app.querySelector('#f');
  const jamWrap = app.querySelector('#jam-wrap');
  const errJam = app.querySelector('[data-err="jam"]');
  const errTgl = app.querySelector('[data-err="tanggal"]');

  const setJam = (nama, nilai) => {
    const [h, m] = (nilai || '').split(':');
    f[`${nama}_h`].value = h || '00';
    // Menit di luar kelipatan 5 (data lama) tetap bisa tampil
    const sel = f[`${nama}_m`];
    if (m && ![...sel.options].some((o) => o.value === m)) sel.add(new Option(m, m));
    sel.value = m || '00';
  };
  const bacaJam = (nama) => `${f[`${nama}_h`].value}:${f[`${nama}_m`].value}`;

  function tandaiJam(pesan) {
    errJam.textContent = pesan || '';
    jamWrap.classList.toggle('salah', !!pesan);
    jamWrap.querySelectorAll('select').forEach((s) => s.setAttribute('aria-invalid', pesan ? 'true' : 'false'));
  }

  function setStatus(v) {
    buka = v;
    app.querySelectorAll('#status button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === (v ? '1' : '0'))));
    // Status Tutup: kolom jam dinonaktifkan dan tidak wajib.
    jamWrap.classList.toggle('mati', !v);
    jamWrap.querySelectorAll('select').forEach((s) => (s.disabled = !v));
    tandaiJam(v ? cekJadwal(true, bacaJam('jam_buka'), bacaJam('jam_tutup')) : '');
  }

  function isiForm(tanggal) {
    dipilih = tanggal;
    const j = data.find((d) => d.tanggal === tanggal)?.jadwal || null;
    f.tanggal.value = tanggal;
    setJam('jam_buka', j?.jam_buka || '08:00');
    setJam('jam_tutup', j?.jam_tutup || '16:00');
    f.catatan.value = j?.catatan || '';
    errTgl.textContent = '';
    setStatus(j ? j.buka : true);
    app.querySelectorAll('.jadwal-baris').forEach((r) => r.classList.toggle('dipilih', r.dataset.t === tanggal));
  }

  async function muat() {
    data = await api(`/jadwal?dari=${hariIni}&hari=${JUMLAH_HARI}`);
    const today = data[0]?.jadwal;
    app.querySelector('#today').innerHTML = `
      <div>
        <span class="label-kecil">HARI INI</span>
        <b>${esc(tanggalLengkap(hariIni))}</b>
        ${today?.catatan ? `<span class="small muted">${esc(today.catatan)}</span>` : ''}
      </div>
      ${pilStatus(today)}`;
    app.querySelector('#list').innerHTML = data.map(({ tanggal, jadwal: j }) => `
      <div class="jadwal-baris ${tanggal === hariIni ? 'hari-ini' : ''} ${tanggal === dipilih ? 'dipilih' : ''}" data-t="${tanggal}">
        <div class="jadwal-baris-atas">
          <div>
            <span class="jadwal-tgl">${esc(tanggalSedang(tanggal))}</span>
            ${tanggal === hariIni ? '<span class="chip-hariini">Hari ini</span>' : ''}
          </div>
          ${pilStatus(j)}
        </div>
        <div class="jadwal-baris-bawah">
          <b class="num">${j && j.buka ? `${j.jam_buka} - ${j.jam_tutup}` : '-'}</b>
          ${admin ? `<button type="button" class="link-ubah" data-ubah="${tanggal}" aria-label="Ubah jadwal ${esc(tanggalSedang(tanggal))}">Ubah</button>` : ''}
        </div>
        ${j?.catatan ? `<p class="jadwal-catatan">${esc(j.catatan)}</p>` : ''}
      </div>`).join('');
  }

  app.querySelector('#list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ubah]');
    if (!b || !admin) return;
    isiForm(b.dataset.ubah);
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  app.querySelector('#status').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (b) setStatus(b.dataset.v === '1');
  });

  f.tanggal.addEventListener('change', async () => {
    if (!f.tanggal.value) return;
    if (!data.some((d) => d.tanggal === f.tanggal.value)) {
      // Tanggal di luar daftar: ambil dari server supaya jadwalnya diubah, bukan digandakan.
      const r = await api(`/jadwal/${f.tanggal.value}`).catch(() => null);
      data.push({ tanggal: f.tanggal.value, jadwal: r ? r.jadwal : null });
    }
    isiForm(f.tanggal.value);
  });

  // Validasi langsung saat jam diubah
  jamWrap.addEventListener('change', () => tandaiJam(cekJadwal(buka, bacaJam('jam_buka'), bacaJam('jam_tutup'))));

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    errTgl.textContent = '';
    if (!f.tanggal.value) { errTgl.textContent = 'Tanggal wajib diisi.'; return; }
    const jb = bacaJam('jam_buka'), jt = bacaJam('jam_tutup');
    const pesan = cekJadwal(buka, jb, jt);
    tandaiJam(pesan);
    if (pesan) { jamWrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const tombol = app.querySelector('#simpan');
    tombol.disabled = true;
    try {
      const r = await api(`/jadwal/${f.tanggal.value}`, {
        method: 'PUT',
        body: { buka, jam_buka: buka ? jb : null, jam_tutup: buka ? jt : null, catatan: f.catatan.value },
      });
      toast(r.diubah ? 'Perubahan jadwal berhasil disimpan' : 'Jadwal berhasil disimpan', 'ok');
      const ent = data.find((d) => d.tanggal === r.jadwal.tanggal);
      if (ent) ent.jadwal = r.jadwal;
      await muat();
      isiForm(r.jadwal.tanggal);
      window.dispatchEvent(new Event('warung:jadwal-berubah'));
    } catch (err) {
      if (err.field === 'jam_buka' || err.field === 'jam_tutup') tandaiJam(err.message);
      else if (err.field === 'tanggal') errTgl.textContent = err.message;
      else toast(err.message, 'err');
    } finally {
      tombol.disabled = false;
    }
  });

  await muat();
  isiForm(dipilih);
}
