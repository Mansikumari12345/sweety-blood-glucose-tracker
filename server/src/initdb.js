const fs = require('fs');
const path = require('path');
const pool = require('./db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Tables ready.');
  await pool.end();
})().catch((e) => {
  console.error('Database setup failed:', e.message);
  process.exit(1);
});
