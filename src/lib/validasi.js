// Validasi input yang dipakai bersama oleh semua route.
// Semua aturan dicek di SERVER, bukan hanya di form.

class ValidasiError extends Error {
  constructor(pesan, field, status = 400) {
    super(pesan);
    this.field = field;
    this.status = status;
  }
}

/**
 * Bilangan bulat positif (> 0). Menolak: kosong, 0, negatif, desimal
 * ("2.5" maupun "2,5"), teks, dan angka yang terlalu besar.
 */
function bilanganBulatPositif(nilai, field, label = 'Jumlah', maks = 100000) {
  if (nilai === undefined || nilai === null || String(nilai).trim() === '') {
    throw new ValidasiError(`${label} wajib diisi.`, field);
  }
  const s = String(nilai).trim();
  if (/[.,]/.test(s)) throw new ValidasiError(`${label} harus bilangan bulat, tidak boleh desimal.`, field);
  if (!/^-?\d+$/.test(s)) throw new ValidasiError(`${label} harus berupa angka.`, field);
  const n = Number(s);
  if (n <= 0) throw new ValidasiError(`${label} harus lebih dari 0.`, field);
  if (n > maks) throw new ValidasiError(`${label} terlalu besar (maksimal ${maks}).`, field);
  return n;
}

/** Bilangan bulat >= 0 (untuk harga, stok minimum, stok awal). */
function bilanganBulatNonNegatif(nilai, field, label, maks = 100000000) {
  if (nilai === undefined || nilai === null || String(nilai).trim() === '') {
    throw new ValidasiError(`${label} wajib diisi.`, field);
  }
  const s = String(nilai).trim();
  if (!/^\d+$/.test(s)) throw new ValidasiError(`${label} harus bilangan bulat 0 atau lebih.`, field);
  const n = Number(s);
  if (n > maks) throw new ValidasiError(`${label} terlalu besar.`, field);
  return n;
}

function teksWajib(nilai, field, label, maks = 100) {
  const s = typeof nilai === 'string' ? nilai.replace(/\s+/g, ' ').trim() : '';
  if (!s) throw new ValidasiError(`${label} wajib diisi.`, field);
  if (s.length > maks) throw new ValidasiError(`${label} maksimal ${maks} karakter.`, field);
  return s;
}

function teksOpsional(nilai, maks = 200) {
  if (nilai === undefined || nilai === null) return null;
  const s = String(nilai).trim();
  return s ? s.slice(0, maks) : null;
}

module.exports = {
  ValidasiError,
  bilanganBulatPositif,
  bilanganBulatNonNegatif,
  teksWajib,
  teksOpsional,
};
