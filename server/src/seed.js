const bcrypt = require('bcryptjs');
const pool = require('./db');

// Creates demo@example.com / demo1234 with a few days of sample readings.
(async () => {
  const hash = await bcrypt.hash('demo1234', 10);
  const u = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ('Demo User', 'demo@example.com', $1)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id`,
    [hash]
  );
  const id = u.rows[0].id;
  await pool.query('DELETE FROM readings WHERE user_id=$1', [id]);
  const slots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
  const base = [95, 140, 125, 130];
  for (let d = 1; d <= 40; d++) {
    for (let s = 0; s < 4; s++) {
      if ((d + s) % 5 === 0) continue; // leave some gaps
      const value = base[s] + ((d * 7 + s * 3) % 25);
      await pool.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, CURRENT_DATE - $2::int, $3, $4)',
        [id, d, slots[s], value]
      );
    }
  }
  console.log('Seeded demo user: demo@example.com / demo1234');
  await pool.end();
})().catch((e) => {
  console.error('Seeding failed:', e.message);
  process.exit(1);
});
