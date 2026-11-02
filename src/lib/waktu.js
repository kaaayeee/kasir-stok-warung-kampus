// Helper tanggal & jam dalam zona waktu warung (default WIB).
const { timeZone } = require('../config');

function parts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return p;
}

/** 'YYYY-MM-DD' hari ini (WIB) */
function hariIni(date = new Date()) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 'YYYY-MM-DD HH:MM:SS' sekarang (WIB) */
function sekarang(date = new Date()) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** Tambah n hari ke tanggal 'YYYY-MM-DD' */
function tambahHari(tanggal, n) {
  const [y, m, d] = tanggal.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function tanggalValid(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function jamValid(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

module.exports = { hariIni, sekarang, tambahHari, tanggalValid, jamValid };
