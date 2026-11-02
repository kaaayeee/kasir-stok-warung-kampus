// Semua pengaturan dibaca dari berkas .env (bukan ditulis di dalam kode).
// Salin .env.example menjadi .env lalu sesuaikan.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const root = path.join(__dirname, '..');

module.exports = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  // ':memory:' dipakai saat pengujian otomatis
  dbFile:
    process.env.DB_FILE === ':memory:'
      ? ':memory:'
      : path.resolve(root, process.env.DB_FILE || 'data/warung.db'),
  timeZone: process.env.APP_TZ || 'Asia/Jakarta',
};
