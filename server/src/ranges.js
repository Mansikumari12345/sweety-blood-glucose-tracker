// Date ranges for the three reports. All dates are 'YYYY-MM-DD' strings.
function pad(n) { return String(n).padStart(2, '0'); }
function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m is 1-12

function reportRange(type, date) {
  const [y, m] = date.split('-').map(Number);
  if (type === 'daily') return { from: date, to: date };
  if (type === 'month-to-date') return { from: `${y}-${pad(m)}-01`, to: date };
  if (type === 'monthly') {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(lastDay(py, pm))}` };
  }
  return null;
}

module.exports = { reportRange };
