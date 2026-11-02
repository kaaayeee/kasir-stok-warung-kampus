// Titik masuk: `npm start`
const os = require('os');
const config = require('./config');
const { bukaDatabase, masihKosong } = require('./db');
const { isiDataAwal } = require('./seed');
const { buatApp } = require('./app');

const db = bukaDatabase(config.dbFile);
if (masihKosong(db)) {
  isiDataAwal(db);
  console.log('Database baru dibuat dan diisi data awal.');
}

const app = buatApp(db);
app.listen(config.port, config.host, () => {
  console.log(`\nKasir & Stok Warung Kampus berjalan.`);
  console.log(`  Laptop : http://localhost:${config.port}`);
  // Alamat untuk dibuka dari HP (HP dan laptop harus di Wi-Fi yang sama)
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) console.log(`  HP     : http://${n.address}:${config.port}`);
    }
  }
  console.log(`  Database: ${config.dbFile}\n`);
});
