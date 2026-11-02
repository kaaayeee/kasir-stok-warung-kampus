// EP-01 US-03 — Jadwal buka tutup per tanggal (hari ini + 7 hari ke depan).
import { api, esc, toast, setErr, clearErr, sesi, sekarangWIB, infoTanggal, tanggalPanjang, jamTitik } from '../util.js';

const JAM = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MENIT = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function pilihJam(nama, nilai) {
  const [h, m] = (nilai || '').split(':');
  return `
    <div class="time-pick">
      <select class="input num" name="${nama}_h" aria-label="Jam">
        <option value="">--</option>${JAM.map((x) => `<option ${x === h ? 'selected' : ''}>${x}</option>`).join('')}
      </select>
      <b>.</b>
      <select class="input num" name="${nama}_m" aria-label="Menit">
        <option value="">--</option>${MENIT.map((x) => `<option ${x === m ? 'selected' : ''}>${x}</option>`).join('')}
      </select>
    </div>`;
}

function teksJadwal(j) {
  if (!j) return '<span class="muted">Belum diatur</span>';
  if (!j.buka) return '<span class="badge habis">Libur</span>';
  return `<b class="num">${jamTitik(j.jam_buka)} – ${jamTitik(j.jam_tutup)}</b>`;
}

/**
 * Aturan sama dengan server (src/services/jadwal.js):
 * jam tutup harus setelah jam buka; bila buka, kedua jam wajib.
 */
function cekJadwal(buka, jb, jt) {
  if (!buka) return {};
  if (!jb) return { field: 'jam_buka', pesan: 'Jam buka wajib diisi bila warung buka.' };
  if (!jt) return { field: 'jam_tutup', pesan: 'Jam tutup wajib diisi bila warung buka.' };
  if (jt === jb) return { field: 'jam_tutup', pesan: 'Jam tutup tidak boleh sama dengan jam buka.' };
  if (jt < jb) return { field: 'jam_tutup', pesan: 'Jam tutup harus setelah jam buka.' };
  return {};
}

export async function render(app, q) {
  const admin = sesi.pengguna?.peran === 'admin';
  const hariIni = sekarangWIB().tanggal;
  let dipilih = q.tanggal || hariIni;
  let data = [];

  app.innerHTML = `
    <h1 class="page-title">Jadwal buka tutup</h1>
    <div class="card today-card" id="today"></div>
    <h2>Atur jadwal</h2>
    ${admin ? '' : '<div class="notice warn">Hanya admin (Bu Mimin) yang bisa mengubah jadwal. Kamu tetap bisa melihatnya.</div>'}
    <div id="hasil"></div>
    <form class="card" id="f" novalidate ${admin ? '' : 'inert'}>
      <div class="field">
        <label for="tanggal">Tanggal</label>
        <input class="input" type="date" id="tanggal" name="tanggal" value="${dipilih}">
        <div class="hint" id="mode"></div>
        <div class="err" data-err="tanggal"></div>
      </div>
      <div class="field">
        <span class="label">Status</span>
        <div class="pills" id="status">
          <button type="button" class="pill" data-v="1">Buka</button>
          <button type="button" class="pill" data-v="0">Libur</button>
        </div>
      </div>
      <div id="jam-wrap">
        <div class="two">
          <div class="field">
            <span class="label">Jam buka</span>
            <div id="jb"></div>
            <input type="hidden" name="jam_buka">
            <div class="err" data-err="jam_buka"></div>
          </div>
          <div class="field">
            <span class="label">Jam tutup</span>
            <div id="jt"></div>
            <input type="hidden" name="jam_tutup">
            <div class="err" data-err="jam_tutup"></div>
          </div>
        </div>
        <p class="hint small muted" style="margin:-6px 0 14px">Format 24 jam. Jam tutup harus setelah jam buka.</p>
      </div>
      <div class="field">
        <label for="catatan">Catatan <span class="muted">(opsional)</span></label>
        <input class="input" id="catatan" name="catatan" maxlength="200" placeholder="mis. tutup lebih awal, ada acara">
      </div>
      <button class="btn primary block lg" type="submit" id="simpan">Simpan jadwal</button>
    </form>
    <h2>8 hari ke depan</h2>
    <ul class="list" id="list"><li class="empty">Memuat…</li></ul>`;

  const f = app.querySelector('#f');
  const hasil = app.querySelector('#hasil');
  let buka = true;

  function setStatus(v) {
    buka = v;
    app.querySelectorAll('#status .pill').forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.v === (v ? '1' : '0'))));
    // Bila libur, kolom jam dinonaktifkan dan tidak wajib.
    app.querySelector('#jam-wrap').style.opacity = v ? '1' : '0.4';
    app.querySelectorAll('#jam-wrap select').forEach((s) => (s.disabled = !v));
    if (!v) { setErr(f, 'jam_buka', ''); setErr(f, 'jam_tutup', ''); }
  }

  function bacaJam(nama) {
    const h = f[`${nama}_h`].value, m = f[`${nama}_m`].value;
    if (!h && !m) return '';
    return `${h || '00'}:${m || '00'}`;
  }

  function isiForm(tanggal) {
    dipilih = tanggal;
    const ent = data.find((d) => d.tanggal === tanggal);
    const j = ent ? ent.jadwal : null;
    f.tanggal.value = tanggal;
    app.querySelector('#jb').innerHTML = pilihJam('jam_buka', j?.jam_buka || (j ? '' : '07:00'));
    app.querySelector('#jt').innerHTML = pilihJam('jam_tutup', j?.jam_tutup || (j ? '' : '16:00'));
    f.catatan.value = j?.catatan || '';
    setStatus(j ? j.buka : true);
    app.querySelector('#mode').textContent = j
      ? `${tanggalPanjang(tanggal)} sudah punya jadwal — menyimpan akan mengubahnya.`
      : `${tanggalPanjang(tanggal)} belum punya jadwal.`;
    app.querySelector('#simpan').textContent = j ? 'Simpan perubahan' : 'Simpan jadwal';
    clearErr(f);
    app.querySelectorAll('.day-row').forEach((r) => r.classList.toggle('selected', r.dataset.t === tanggal));
  }

  async function muat() {
    data = await api(`/jadwal?dari=${hariIni}&hari=8`);
    const today = data[0]?.jadwal;
    app.querySelector('#today').innerHTML = `
      <div class="grow">
        <div class="small muted">Hari ini · ${esc(tanggalPanjang(hariIni))}</div>
        <div class="big">${today ? (today.buka ? `${jamTitik(today.jam_buka)} – ${jamTitik(today.jam_tutup)}` : 'Libur') : 'Belum diatur'}</div>
        ${today?.catatan ? `<div class="small">${esc(today.catatan)}</div>` : ''}
      </div>`;
    app.querySelector('#list').innerHTML = data.map(({ tanggal, jadwal: j }) => {
      const i = infoTanggal(tanggal);
      return `
        <li class="day-row ${tanggal === dipilih ? 'selected' : ''}" data-t="${tanggal}">
          <div class="d"><span>${i.hari}</span><b class="num">${i.tgl}</b></div>
          <div class="grow">
            <div>${teksJadwal(j)}${tanggal === hariIni ? ' <span class="badge netral">Hari ini</span>' : ''}</div>
            <div class="small muted ellipsis">${j?.catatan ? esc(j.catatan) + ' · ' : ''}${j ? 'diatur ' + esc(j.diatur_oleh) : ''}</div>
          </div>
          ${admin ? '<span class="muted">Ubah ›</span>' : ''}
        </li>`;
    }).join('');
  }

  app.querySelector('#list').addEventListener('click', (e) => {
    const r = e.target.closest('.day-row');
    if (!r || !admin) return;
    isiForm(r.dataset.t);
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  app.querySelector('#status').addEventListener('click', (e) => {
    const p = e.target.closest('.pill');
    if (p) setStatus(p.dataset.v === '1');
  });

  f.tanggal.addEventListener('change', async () => {
    if (!f.tanggal.value) return;
    const ent = data.find((d) => d.tanggal === f.tanggal.value);
    if (!ent) {
      // Tanggal di luar 8 hari: ambil dari server supaya tetap diubah, bukan digandakan.
      const r = await api(`/jadwal/${f.tanggal.value}`).catch(() => null);
      data.push({ tanggal: f.tanggal.value, jadwal: r ? r.jadwal : null });
    }
    isiForm(f.tanggal.value);
  });

  // Validasi langsung saat jam diubah
  f.addEventListener('change', (e) => {
    if (!e.target.name || !/^jam_/.test(e.target.name)) return;
    setErr(f, 'jam_buka', ''); setErr(f, 'jam_tutup', '');
    const jb = bacaJam('jam_buka'), jt = bacaJam('jam_tutup');
    if (jb && jt) {
      const r = cekJadwal(buka, jb, jt);
      if (r.field) setErr(f, r.field, r.pesan);
    }
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr(f);
    hasil.innerHTML = '';
    if (!f.tanggal.value) return setErr(f, 'tanggal', 'Tanggal wajib diisi.');
    const jb = bacaJam('jam_buka'), jt = bacaJam('jam_tutup');
    const cek = cekJadwal(buka, jb, jt);
    if (cek.field) return setErr(f, cek.field, cek.pesan);

    const tombol = app.querySelector('#simpan');
    tombol.disabled = true;
    try {
      const r = await api(`/jadwal/${f.tanggal.value}`, {
        method: 'PUT',
        body: { buka, jam_buka: buka ? jb : null, jam_tutup: buka ? jt : null, catatan: f.catatan.value },
      });
      const j = r.jadwal;
      hasil.innerHTML = `<div class="notice ok">${r.diubah ? 'Jadwal diubah' : 'Jadwal disimpan'}: ${esc(tanggalPanjang(j.tanggal))} — ${j.buka ? `buka ${jamTitik(j.jam_buka)}–${jamTitik(j.jam_tutup)}` : 'libur'}.</div>`;
      toast(r.diubah ? 'Perubahan jadwal tersimpan' : 'Jadwal tersimpan', 'ok');
      const ent = data.find((d) => d.tanggal === j.tanggal);
      if (ent) ent.jadwal = j;
      await muat();
      isiForm(j.tanggal);
      window.dispatchEvent(new Event('warung:jadwal-berubah'));
    } catch (err) {
      if (err.field && f.querySelector(`[data-err="${err.field}"]`)) setErr(f, err.field, err.message);
      else hasil.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
    } finally {
      tombol.disabled = false;
    }
  });

  await muat();
  isiForm(dipilih);
}
