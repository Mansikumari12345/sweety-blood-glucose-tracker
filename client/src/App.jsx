import { useState } from 'react';
import Auth from './Auth.jsx';
import Readings from './Readings.jsx';
import Reports from './Reports.jsx';
import { today } from './api.js';

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('sweety') || 'null'));
  const [date, setDate] = useState(today());
  const [refreshKey, setRefreshKey] = useState(0);

  function login(token, user) {
    const s = { token, user };
    localStorage.setItem('sweety', JSON.stringify(s));
    setSession(s);
  }
  function logout() {
    localStorage.removeItem('sweety');
    setSession(null);
  }

  return (
    <main>
      <header>
        <h1>Sweety</h1>
        {session && (
          <div>
            <span className="muted">Hi, {session.user.name} </span>
            <button className="secondary" onClick={logout}>Log out</button>
          </div>
        )}
      </header>
      {!session ? (
        <Auth onLogin={login} />
      ) : (
        <>
          <div className="card">
            <label>Date
              <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
          </div>
          <Readings token={session.token} date={date} onChange={() => setRefreshKey((k) => k + 1)} />
          <Reports token={session.token} date={date} refreshKey={refreshKey} />
        </>
      )}
    </main>
  );
}
