import { useEffect, useState } from 'react';
import { api } from './api.js';

const TABS = [
  { type: 'daily', label: 'Daily' },
  { type: 'month-to-date', label: 'Month to date' },
  { type: 'monthly', label: 'Previous month' },
];

export default function Reports({ token, date, refreshKey }) {
  const [type, setType] = useState('daily');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api(`/reports/${type}?date=${date}`, { token }).then(setReport).catch((e) => setError(e.message));
  }, [type, date, refreshKey]);

  return (
    <div className="card">
      <h2>Reports</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.type} className={t.type === type ? 'active' : 'secondary'} onClick={() => setType(t.type)}>
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {report && (
        <>
          <p className="muted">{report.from === report.to ? report.from : `${report.from} to ${report.to}`}</p>
          {report.empty ? (
            <p>No readings in this period yet. Add a reading to see your report.</p>
          ) : (
            <ul className="stats">
              <li><span>Highest</span><b>{report.highest}</b> mg/dl</li>
              <li><span>Lowest</span><b>{report.lowest}</b> mg/dl</li>
              <li><span>Average</span><b>{report.average.toFixed(1)}</b> mg/dl</li>
              <li><span>Readings</span><b>{report.count}</b></li>
            </ul>
          )}
        </>
      )}
    </div>
  );
}
