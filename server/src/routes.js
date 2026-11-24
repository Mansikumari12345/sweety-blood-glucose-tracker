const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { signToken, requireAuth } = require('./auth');
const { validateReading, isRealDate, todayString } = require('./validation');
const { reportRange } = require('./ranges');

const router = express.Router();
const COLS = "id, to_char(reading_date, 'YYYY-MM-DD') AS date, slot, value";

// ---------- auth ----------
router.post('/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, lower($2), $3) RETURNING id, name, email',
      [name.trim(), email.trim(), hash]
    );
    res.status(201).json({ token: signToken(r.rows[0]), user: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    throw e;
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE email = lower($1)', [String(email || '').trim()]);
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email } });
});

// ---------- readings ----------
router.use(requireAuth);

router.get('/readings', async (req, res) => {
  const { date } = req.query;
  const r = date
    ? await pool.query(`SELECT ${COLS} FROM readings WHERE user_id=$1 AND reading_date=$2 ORDER BY reading_date, id`, [req.userId, date])
    : await pool.query(`SELECT ${COLS} FROM readings WHERE user_id=$1 ORDER BY reading_date DESC, id`, [req.userId]);
  res.json(r.rows);
});

async function othersOnDate(userId, date, exceptId) {
  const r = await pool.query(
    'SELECT slot FROM readings WHERE user_id=$1 AND reading_date=$2 AND id <> $3',
    [userId, date, exceptId || 0]
  );
  return r.rows;
}

router.post('/readings', async (req, res) => {
  const { date, slot, value } = req.body || {};
  const others = isRealDate(date) ? await othersOnDate(req.userId, date) : [];
  const error = validateReading({ date, slot, value }, others);
  if (error) return res.status(400).json({ error });
  const r = await pool.query(
    `INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4) RETURNING ${COLS}`,
    [req.userId, date, slot, Number(value)]
  );
  res.status(201).json(r.rows[0]);
});

router.put('/readings/:id', async (req, res) => {
  const { date, slot, value } = req.body || {};
  const id = Number(req.params.id);
  const own = await pool.query('SELECT id FROM readings WHERE id=$1 AND user_id=$2', [id, req.userId]);
  if (!own.rows.length) return res.status(404).json({ error: 'Reading not found.' });
  const others = isRealDate(date) ? await othersOnDate(req.userId, date, id) : [];
  const error = validateReading({ date, slot, value }, others);
  if (error) return res.status(400).json({ error });
  const r = await pool.query(
    `UPDATE readings SET reading_date=$1, slot=$2, value=$3 WHERE id=$4 AND user_id=$5 RETURNING ${COLS}`,
    [date, slot, Number(value), id, req.userId]
  );
  res.json(r.rows[0]);
});

router.delete('/readings/:id', async (req, res) => {
  const r = await pool.query('DELETE FROM readings WHERE id=$1 AND user_id=$2', [Number(req.params.id), req.userId]);
  if (!r.rowCount) return res.status(404).json({ error: 'Reading not found.' });
  res.status(204).end();
});

// ---------- reports ----------
router.get('/reports/:type', async (req, res) => {
  const date = req.query.date || todayString();
  if (!isRealDate(date)) return res.status(400).json({ error: 'Please choose a valid date.' });
  const range = reportRange(req.params.type, date);
  if (!range) return res.status(404).json({ error: 'Unknown report.' });
  const stats = await pool.query(
    `SELECT count(*)::int AS count, max(value) AS highest, min(value) AS lowest, round(avg(value), 1)::float AS average
     FROM readings WHERE user_id=$1 AND reading_date BETWEEN $2 AND $3`,
    [req.userId, range.from, range.to]
  );
  const s = stats.rows[0];
  const out = { type: req.params.type, from: range.from, to: range.to, count: s.count, empty: s.count === 0 };
  if (s.count > 0) Object.assign(out, { highest: s.highest, lowest: s.lowest, average: s.average });
  if (req.params.type === 'daily') {
    const list = await pool.query(`SELECT ${COLS} FROM readings WHERE user_id=$1 AND reading_date=$2 ORDER BY id`, [req.userId, date]);
    out.readings = list.rows;
  }
  res.json(out);
});

module.exports = router;
