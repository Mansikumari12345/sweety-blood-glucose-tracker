const SLOTS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Checks one reading in isolation. existing = other readings the user already has on that date.
// Returns the first error message, or null when valid.
function validateReading({ date, slot, value }, existing = [], today = todayString()) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'Please enter a glucose value.';
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 40 || n > 600) {
    return 'Value must be between 40 and 600 mg/dl.';
  }
  if (!SLOTS[slot]) return 'Please choose a time slot.';
  if (!isRealDate(date)) return 'Please choose a valid date.';
  if (date > today) return 'Date cannot be in the future.';
  if (existing.length >= 4) return 'You can add only 4 readings per day.';
  if (existing.some((r) => r.slot === slot)) {
    return `You already have an ${SLOTS[slot]} reading for this date.`.replace('an Morning (fasting)', 'a Morning (fasting)');
  }
  return null;
}

module.exports = { SLOTS, todayString, isRealDate, validateReading };
