import { useEffect, useState } from 'react';
import { getSuppliers, createSupplier } from '../api';

const ADMIN_KEY = 'change-me-super-secret-key';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    getSuppliers(ADMIN_KEY).then(setSuppliers).catch(() => setSuppliers([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createSupplier(newName.trim());
      setNewName('');
      setToast({ msg: 'Company registered successfully', type: 'success' });
      load();
    } catch (e) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const avg = suppliers.length
    ? (suppliers.reduce((s, x) => s + x.svi, 0) / suppliers.length).toFixed(3) : '—';
  const top = suppliers[0]?.name || '—';

  if (loading) return <div className="loading"><div className="spinner" />Loading companies…</div>;

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier Intelligence</h1>
          <div className="page-subtitle">SVI Rankings — IT Company E-Waste Partners</div>
        </div>
        <div style={{ background:'rgba(255,191,0,0.1)', border:'1px solid rgba(255,191,0,0.3)', borderRadius:'var(--radius-pill)', padding:'6px 16px', fontSize:'0.72rem', color:'var(--secondary)', fontWeight:600 }}>
          🔒 Admin Access
        </div>
      </div>

      <div className="three-col">
        <div className="stat-card"><div className="stat-label">Total Companies</div><div className="stat-value">{suppliers.length}</div></div>
        <div className="stat-card"><div className="stat-label">Avg SVI Score</div><div className="stat-value teal">{avg}</div></div>
        <div className="stat-card"><div className="stat-label">Top Performer</div><div className="stat-value" style={{ fontSize:'0.9rem', paddingTop:4 }}>{top}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Register New IT Company</div>
        <div style={{ display:'flex', gap:12 }}>
          <input className="form-input" style={{ flex:1 }} placeholder="Company name…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button className="btn btn-primary" onClick={handleAdd} disabled={adding}>
            {adding ? <><div className="spinner" />Adding…</> : '+ Register'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px 0' }}><div className="card-title">Company Leaderboard</div></div>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Company</th><th>Consistency</th><th>Reliability</th><th>SVI Score</th><th>Registered</th></tr>
          </thead>
          <tbody>
            {suppliers.map((s, i) => {
              const sviColor = s.svi>=0.8?'var(--success)':s.svi>=0.6?'var(--primary)':'var(--error)';
              return (
                <tr key={s.supplier_id}>
                  <td>
                    <span style={{ fontWeight:700, color:i===0?'var(--secondary)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--on-surface-variant)', fontSize:'0.9rem' }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </span>
                  </td>
                  <td className="fw-600">{s.name}</td>
                  <td>
                    <div className="flex items-center" style={{ gap:10, minWidth:160 }}>
                      <div className="progress-bar" style={{ flex:1 }}>
                        <div className="progress-fill" style={{ width:`${s.consistency_score*100}%` }} />
                      </div>
                      <span className="text-muted font-mono">{(s.consistency_score*100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center" style={{ gap:10, minWidth:160 }}>
                      <div className="progress-bar" style={{ flex:1 }}>
                        <div className="progress-fill gold" style={{ width:`${s.reliability_score*100}%` }} />
                      </div>
                      <span className="text-muted font-mono">{(s.reliability_score*100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td><span style={{ fontSize:'1.3rem', fontWeight:800, color:sviColor, letterSpacing:'-0.02em' }}>{s.svi.toFixed(3)}</span></td>
                  <td className="text-muted" style={{ fontSize:'0.75rem' }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
