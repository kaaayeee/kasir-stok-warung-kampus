// Koneksi database + pembuatan tabel.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function bukaDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

/** true bila database belum punya data awal */
function masihKosong(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM PENGGUNA').get().n === 0;
}

module.exports = { bukaDatabase, masihKosong };
