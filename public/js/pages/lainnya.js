// Menu Lainnya: log penjualan, kelola barang, catatan waktu transaksi, keluar.
import { api, esc, rupiah, angka, toast, sesi, sekarangWIB, tanggalPanjang, setErr, clearErr, badgeStatus } from '../util.js';

export async function render(app, sub, q) {
  if (sub === 'penjualan') return penjualan(app, q);
  if (sub === 'barang') return kelolaBarang(app, q);
  if (sub === 'waktu') return catatanWaktu(app);
  return menu(app);
}

function kembali(judul) {
  return `<a href="#/lainnya" class="btn sm" style="margin-bottom:10px">‹ Lainnya</a><h1 class="page-title">${judul}</h1>`;
}

function menu(app) {
  const p = sesi.pengguna;
  app.innerHTML = `
    <h1 class="page-title">Lainnya</h1>
    <div class="card row">
      <span class="avatar">${esc(p.nama.replace(/^Bu\s+/i, '')[0])}</span>
      <div class="grow"><b>${esc(p.nama)}</b><div class="small muted">${p.peran === 'admin' ? 'Admin' : 'Pegawai'} · tercatat sebagai pencatat</div></div>
      <button class="btn sm" id="keluar">Keluar</button>
    </div>
    <h2>Menu</h2>
    <ul class="list link-list">
      <li><a href="#/lainnya/penjualan"><span><b>Log penjualan</b><div class="small muted">Transaksi per hari, total QRIS &amp; tunai</div></span></a></li>
      <li><a href="#/lainnya/barang"><span><b>Kelola barang</b><div class="small muted">Tambah barang, ubah harga &amp; stok minimum</div></span></a></li>
      <li><a href="#/lainnya/waktu"><span><b>Catatan waktu transaksi</b><div class="small muted">Hasil ukur &lt; 30 detik di HP ini</div></span></a></li>
    </ul>
    <p class="small muted" style="margin-top:20px">Kasir &amp; Stok Warung Kampus · Kelompok 7 · prototype Sprint 2 (US-02, US-03, US-05)</p>`;
  app.querySelector('#keluar').addEventListener('click', () => {
    if (confirm('Keluar dari akun ini?')) window.dispatchEvent(new Event('warung:keluar'));
  });
}

// ---------------------------------------------------------------------
// Log penjualan (bukti transaksi tersimpan; juga dasar rekap EP-03)
// ---------------------------------------------------------------------
async function penjualan(app, q) {
  const tgl = q.tanggal || sekarangWIB().tanggal;
  app.innerHTML = `
    ${kembali('Log penjualan')}
    <div class="field"><input class="input" type="date" id="tgl" value="${tgl}"></div>
    <div id="isi"><p class="empty">Memuat…</p></div>`;
  const isi = app.querySelector('#isi');

  async function muat(t) {
    const r = await api(`/transaksi?tanggal=${t}`);
    const s = r.ringkasan;
    isi.innerHTML = `
      <p class="small muted" style="margin-top:-4px">${esc(tanggalPanjang(t))}</p>
      <div class="stats">
        <div class="stat"><span>Pemasukan</span><b class="num">${rupiah(s.total)}</b></div>
        <div class="stat"><span>Transaksi</span><b class="num">${angka(s.jumlah_transaksi)}</b></div>
        <div class="stat"><span>QRIS</span><b class="num">${rupiah(s.total_qris)}</b></div>
        <div class="stat"><span>Tunai</span><b class="num">${rupiah(s.total_tunai)}</b></div>
      </div>
      ${r.transaksi.length ? `<ul class="list">${r.transaksi.map((t) => `
        <li><details class="trx">
          <summary class="row">
            <div class="grow">
              <b>#${t.id_transaksi}</b> <span class="badge netral">${t.metode_bayar === 'qris' ? 'QRIS' : 'Tunai'}</span>
              <div class="small muted">${t.waktu_transaksi.slice(11, 16).replace(':', '.')} · ${t.items.length} jenis item · ${esc(t.pencatat)}</div>
            </div>
            <b class="num">${rupiah(t.total)}</b>
          </summary>
          <div class="trx-items">
            ${t.items.map((i) => `<div><span>${esc(i.nama_barang)} × ${i.jumlah}</span><span class="num">${rupiah(i.subtotal)}</span></div>`).join('')}
          </div>
        </details></li>`).join('')}</ul>` : '<p class="empty">Belum ada transaksi di tanggal ini.</p>'}`;
  }
  app.querySelector('#tgl').addEventListener('change', (e) => e.target.value && muat(e.target.value));
  await muat(tgl);
}

// ---------------------------------------------------------------------
// Kelola barang (nama unik — QA skenario 4)
// ---------------------------------------------------------------------
async function kelolaBarang(app) {
  app.innerHTML = `
    ${kembali('Kelola barang')}
    <div id="hasil"></div>
    <form class="card" id="f" novalidate>
      <h2 style="margin-top:0" id="judul">Tambah barang</h2>
      <input type="hidden" name="id">
      <div class="field"><label for="nama_barang">Nama barang</label><input class="input" id="nama_barang" name="nama_barang" maxlength="60" autocomplete="off"><div class="err" data-err="nama_barang"></div></div>
      <div class="two">
        <div class="field"><label for="satuan">Satuan</label><input class="input" id="satuan" name="satuan" list="satuan-list" placeholder="porsi, gelas, pcs" maxlength="20"><div class="err" data-err="satuan"></div></div>
        <div class="field"><label for="harga_jual">Harga jual (Rp)</label><input class="input num" id="harga_jual" name="harga_jual" inputmode="numeric" placeholder="0"><div class="err" data-err="harga_jual"></div></div>
      </div>
      <div class="two">
        <div class="field"><label for="stok_minimum">Stok minimum</label><input class="input num" id="stok_minimum" name="stok_minimum" inputmode="numeric" value="0"><div class="err" data-err="stok_minimum"></div></div>
        <div class="field" id="awal-box"><label for="stok_awal">Stok awal</label><input class="input num" id="stok_awal" name="stok_awal" inputmode="numeric" value="0"><div class="err" data-err="stok_awal"></div></div>
      </div>
      <div class="field hidden" id="aktif-box"><label><input type="checkbox" name="aktif"> Masih dijual (aktif)</label>
        <div class="hint">Sisa stok tidak bisa diubah di sini — gunakan Stok Masuk / Stok Keluar supaya riwayatnya tercatat.</div></div>
      <div class="row"><button class="btn primary grow" type="submit" id="simpan">Tambah barang</button><button class="btn hidden" type="button" id="batal">Batal</button></div>
      <datalist id="satuan-list"><option>porsi</option><option>gelas</option><option>botol</option><option>pcs</option><option>bungkus</option></datalist>
    </form>
    <h2>Semua barang</h2>
    <ul class="list" id="list"></ul>`;

  const f = app.querySelector('#f');
  const hasil = app.querySelector('#hasil');
  let semua = [];

  function modeTambah() {
    f.reset(); f.id.value = '';
    app.querySelector('#judul').textContent = 'Tambah barang';
    app.querySelector('#simpan').textContent = 'Tambah barang';
    app.querySelector('#batal').classList.add('hidden');
    app.querySelector('#awal-box').classList.remove('hidden');
    app.querySelector('#aktif-box').classList.add('hidden');
    clearErr(f);
  }
  function modeUbah(b) {
    f.id.value = b.id_barang;
    f.nama_barang.value = b.nama_barang; f.satuan.value = b.satuan;
    f.harga_jual.value = b.harga_jual; f.stok_minimum.value = b.stok_minimum; f.aktif.checked = b.aktif;
    app.querySelector('#judul').textContent = `Ubah: ${b.nama_barang}`;
    app.querySelector('#simpan').textContent = 'Simpan perubahan';
    app.querySelector('#batal').classList.remove('hidden');
    app.querySelector('#awal-box').classList.add('hidden');
    app.querySelector('#aktif-box').classList.remove('hidden');
    clearErr(f);
    f.scrollIntoView({ behavior: 'smooth' });
  }

  async function muat() {
    semua = await api('/barang?semua=1');
    app.querySelector('#list').innerHTML = semua.map((b) => `
      <li class="row" data-id="${b.id_barang}" style="cursor:pointer">
        <div class="grow"><b>${esc(b.nama_barang)}</b> ${b.aktif ? badgeStatus(b.status) : '<span class="badge netral">Nonaktif</span>'}
          <div class="small muted num">${rupiah(b.harga_jual)} / ${esc(b.satuan)} · stok ${angka(b.stok_saat_ini)} · min ${angka(b.stok_minimum)}</div></div>
        <span class="muted">Ubah ›</span>
      </li>`).join('');
  }

  app.querySelector('#list').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (li) modeUbah(semua.find((b) => b.id_barang === Number(li.dataset.id)));
  });
  app.querySelector('#batal').addEventListener('click', modeTambah);

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr(f); hasil.innerHTML = '';
    const body = { nama_barang: f.nama_barang.value, satuan: f.satuan.value, harga_jual: f.harga_jual.value, stok_minimum: f.stok_minimum.value };
    // Cek nama ganda di form juga (server tetap mengecek).
    const nama = f.nama_barang.value.replace(/\s+/g, ' ').trim().toLowerCase();
    const dobel = semua.find((b) => b.nama_barang.toLowerCase() === nama && String(b.id_barang) !== f.id.value);
    if (dobel) { setErr(f, 'nama_barang', `Barang bernama "${dobel.nama_barang}" sudah ada. Gunakan barang itu atau beri nama lain.`); return; }
    try {
      let b;
      if (f.id.value) {
        b = await api(`/barang/${f.id.value}`, { method: 'PATCH', body: { ...body, aktif: f.aktif.checked } });
        toast('Perubahan barang tersimpan', 'ok');
      } else {
        b = await api('/barang', { method: 'POST', body: { ...body, stok_awal: f.stok_awal.value } });
        toast('Barang ditambahkan', 'ok');
      }
      hasil.innerHTML = `<div class="notice ok">${esc(b.nama_barang)} tersimpan · stok ${angka(b.stok_saat_ini)} ${esc(b.satuan)}.</div>`;
      modeTambah();
      await muat();
    } catch (err) {
      if (err.field && f.querySelector(`[data-err="${err.field}"]`)) setErr(f, err.field, err.message);
      else hasil.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
    }
  });

  await muat();
}

// ---------------------------------------------------------------------
// Catatan waktu transaksi (untuk uji < 30 detik, tersimpan di HP ini)
// ---------------------------------------------------------------------
function catatanWaktu(app) {
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem('warung.waktuTransaksi') || '[]'); } catch { /* */ }
  const lolos = arr.filter((x) => x.detik < 30).length;
  app.innerHTML = `
    ${kembali('Catatan waktu transaksi')}
    <p class="muted small">Diukur otomatis dari membuka halaman Pesanan baru sampai transaksi tersimpan. Target &lt; 30 detik. Data ini hanya tersimpan di HP/browser ini.</p>
    ${arr.length ? `
      <div class="stats">
        <div class="stat"><span>Lolos &lt; 30 dtk</span><b class="num">${lolos} / ${arr.length}</b></div>
        <div class="stat"><span>Rata-rata</span><b class="num">${(arr.reduce((s, x) => s + x.detik, 0) / arr.length).toFixed(1)} dtk</b></div>
      </div>
      <ul class="list">${arr.map((x) => `
        <li class="row"><div class="grow"><b>#${x.id_transaksi}</b> · ${x.item} jenis item · ${String(x.metode).toUpperCase()}<div class="small muted">${esc(x.waktu)}</div></div>
        <span class="badge ${x.detik < 30 ? 'aman' : 'habis'} num">${x.detik} dtk</span></li>`).join('')}</ul>
      <button class="btn block" id="hapus" style="margin-top:12px">Hapus catatan</button>`
    : '<p class="empty">Belum ada transaksi yang diukur di HP ini.</p>'}`;
  app.querySelector('#hapus')?.addEventListener('click', () => {
    try { localStorage.removeItem('warung.waktuTransaksi'); } catch { /* */ }
    catatanWaktu(app);
  });
}
