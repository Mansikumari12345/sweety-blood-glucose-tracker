import { useEffect, useState } from 'react';
import { api, SLOTS, slotLabel, today } from './api.js';

export default function Readings({ token, date, onChange }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ slot: 'morning', value: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setList(await api(`/readings?date=${date}`, { token }));
  }
  useEffect(() => { setError(''); load(); }, [date]);

  function reset() {
    setError('');
    setEditingId(null);
    setForm({ slot: 'morning', value: '' });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { date, slot: form.slot, value: form.value };
      if (editingId) await api(`/readings/${editingId}`, { method: 'PUT', body, token });
      else await api('/readings', { method: 'POST', body, token });
      reset();
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this reading?')) return;
    setError('');
    await api(`/readings/${id}`, { method: 'DELETE', token });
    await load();
    onChange();
  }

  function edit(r) {
    setEditingId(r.id);
    setForm({ slot: r.slot, value: String(r.value) });
    setError('');
  }

  return (
    <div className="card">
      <h2>Readings for {date}</h2>
      <form onSubmit={save} className="row">
        <select value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
          {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input
          placeholder="mg/dl"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" className="secondary" onClick={reset}>Cancel</button>}
      </form>
      {error && <p className="error">{error}</p>}
      {list.length === 0 ? (
        <p className="muted">No readings for this date yet.</p>
      ) : (
        <table>
          <thead><tr><th>Slot</th><th>Value (mg/dl)</th><th></th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>{slotLabel(r.slot)}</td>
                <td>{r.value}</td>
                <td>
                  <button className="link" onClick={() => edit(r)}>Edit</button>
                  <button className="link" onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
