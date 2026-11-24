// API tests. They run against a SEPARATE database named <DB_NAME>_test (for example sweety_test),
// which is created automatically. Your real app data is never touched.
require('dotenv').config();
process.env.DB_NAME = `${process.env.DB_NAME || 'sweety'}_test`;

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');
const { Client } = require('pg');
const app = require('../src/app');
const pool = require('../src/db');
const { todayString } = require('../src/validation');

let server, base, token;
const email = `test-${Date.now()}@example.com`;
assert.ok(process.env.DB_NAME.endsWith('_test'), 'tests must use a *_test database');

async function call(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test.before(async () => {
  // Create the test database if it does not exist yet, then make sure the tables are there.
  const admin = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [process.env.DB_NAME]);
  if (!exists.rows.length) await admin.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
  await admin.end();
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});

test.after(async () => {
  await pool.query('DELETE FROM users');
  await pool.end();
  server.close();
});

test('signup stores a hashed password and returns a token', async () => {
  const r = await call('/auth/signup', { method: 'POST', auth: false, body: { name: 'Tester', email, password: 'secret123' } });
  assert.strictEqual(r.status, 201);
  token = r.body.token;
  const row = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
  assert.notStrictEqual(row.rows[0].password_hash, 'secret123');
  assert.match(row.rows[0].password_hash, /^\$2[aby]\$/);
});

test('login rejects a wrong password', async () => {
  const r = await call('/auth/login', { method: 'POST', auth: false, body: { email, password: 'wrong' } });
  assert.strictEqual(r.status, 401);
});

test('readings need a login', async () => {
  const r = await call('/readings', { auth: false });
  assert.strictEqual(r.status, 401);
});

test('add reading, reject duplicate slot and bad value, then report', async () => {
  const date = todayString();
  const ok = await call('/readings', { method: 'POST', body: { date, slot: 'morning', value: 100 } });
  assert.strictEqual(ok.status, 201);
  const second = await call('/readings', { method: 'POST', body: { date, slot: 'after_lunch', value: 151 } });
  assert.strictEqual(second.status, 201);

  const dup = await call('/readings', { method: 'POST', body: { date, slot: 'morning', value: 110 } });
  assert.strictEqual(dup.status, 400);
  assert.strictEqual(dup.body.error, 'You already have a Morning (fasting) reading for this date.');

  const bad = await call('/readings', { method: 'POST', body: { date, slot: 'after_dinner', value: 700 } });
  assert.strictEqual(bad.body.error, 'Value must be between 40 and 600 mg/dl.');

  const rep = await call(`/reports/daily?date=${date}`);
  assert.strictEqual(rep.body.count, 2);
  assert.strictEqual(rep.body.highest, 151);
  assert.strictEqual(rep.body.lowest, 100);
  assert.strictEqual(rep.body.average, 125.5);
});

test('max 4 readings per day and no future dates', async () => {
  const date = todayString();
  await call('/readings', { method: 'POST', body: { date, slot: 'after_breakfast', value: 120 } });
  await call('/readings', { method: 'POST', body: { date, slot: 'after_dinner', value: 130 } });
  const fifth = await call('/readings', { method: 'POST', body: { date, slot: 'morning', value: 90 } });
  assert.strictEqual(fifth.body.error, 'You can add only 4 readings per day.');
  const future = await call('/readings', { method: 'POST', body: { date: '2999-01-01', slot: 'morning', value: 90 } });
  assert.strictEqual(future.body.error, 'Date cannot be in the future.');
});

test('a user cannot see or delete another user\'s readings', async () => {
  const other = await call('/auth/signup', { method: 'POST', auth: false, body: { name: 'Other', email: `test-other-${Date.now()}@example.com`, password: 'secret123' } });
  const mine = await call('/readings');
  const id = mine.body[0].id;
  const saved = token;
  token = other.body.token;
  const list = await call('/readings');
  assert.strictEqual(list.body.length, 0);
  const del = await call(`/readings/${id}`, { method: 'DELETE' });
  assert.strictEqual(del.status, 404);
  token = saved;
});

test('empty report shows count 0', async () => {
  const r = await call('/reports/monthly?date=2020-05-10');
  assert.strictEqual(r.body.empty, true);
  assert.strictEqual(r.body.count, 0);
});
