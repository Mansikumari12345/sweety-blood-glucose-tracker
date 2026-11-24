const test = require('node:test');
const assert = require('node:assert');
const { validateReading } = require('../src/validation');
const { reportRange } = require('../src/ranges');

const today = '2026-11-24';
const ok = { date: '2026-11-24', slot: 'after_lunch', value: 120 };

test('valid reading passes', () => assert.strictEqual(validateReading(ok, [], today), null));
test('value required', () =>
  assert.strictEqual(validateReading({ ...ok, value: '' }, [], today), 'Please enter a glucose value.'));
test('value below 40 rejected', () =>
  assert.strictEqual(validateReading({ ...ok, value: 39 }, [], today), 'Value must be between 40 and 600 mg/dl.'));
test('value above 600 rejected', () =>
  assert.strictEqual(validateReading({ ...ok, value: 601 }, [], today), 'Value must be between 40 and 600 mg/dl.'));
test('decimal value rejected', () =>
  assert.strictEqual(validateReading({ ...ok, value: 99.5 }, [], today), 'Value must be between 40 and 600 mg/dl.'));
test('future date rejected', () =>
  assert.strictEqual(validateReading({ ...ok, date: '2026-11-25' }, [], today), 'Date cannot be in the future.'));
test('duplicate slot rejected', () =>
  assert.strictEqual(
    validateReading(ok, [{ slot: 'after_lunch' }], today),
    'You already have an After lunch reading for this date.'
  ));
test('max 4 per day', () =>
  assert.strictEqual(
    validateReading(ok, [{ slot: 'morning' }, { slot: 'after_breakfast' }, { slot: 'after_dinner' }, { slot: 'x' }], today),
    'You can add only 4 readings per day.'
  ));

test('report ranges', () => {
  assert.deepStrictEqual(reportRange('daily', '2026-10-15'), { from: '2026-10-15', to: '2026-10-15' });
  assert.deepStrictEqual(reportRange('month-to-date', '2026-10-15'), { from: '2026-10-01', to: '2026-10-15' });
  assert.deepStrictEqual(reportRange('monthly', '2026-10-15'), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepStrictEqual(reportRange('monthly', '2026-01-10'), { from: '2025-12-01', to: '2025-12-31' });
});
