import { useEffect, useState } from 'react';
import { getSuppliers, submitBatch } from '../api';

const DEVICE_TYPES = ['smartphone','laptop','tablet','desktop','server','monitor'];
const CONDITIONS   = ['excellent','good','fair','poor','damaged'];
const MATERIAL_COLORS = {
  copper: '#f97316', aluminum: '#60a5fa', pcb: '#a78bfa',
  lithium: '#34d399', precious_metals: '#ffbf00', plastic: '#9ca3af', glass: '#7dd3fc',
};

function fmt(v) {
  return `₹${(v||0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

export default function Intake() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({
    supplier_id: '', device_type: 'laptop', weight: '', condition: 'good',
    age_years: 3, battery_health: 75,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getSuppliers('change-me-super-secret-key').then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.supplier_id)             return setToast({ msg: 'Select a company', type: 'error' });
    if (!form.weight || +form.weight <= 0) return setToast({ msg: 'Enter a valid weight', type: 'error' });
    setLoading(true);
    try {
      const res = await submitBatch({
        supplier_id: form.supplier_id,
        device_type: form.device_type,
        weight: parseFloat(form.weight),
        condition: form.condition,
        specs: { age_years: form.age_years, battery_health: form.battery_health },
      });
      setResult(res);
      setToast({ msg: 'Valuation complete!', type: 'success' });
    } catch (e) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const breakdown = result?.erv_breakdown || {};
  const maxBV = Math.max(...Object.values(breakdown), 0.001);

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Intake Valuation Panel</h1>
          <div className="page-subtitle">Submit a batch for pre-arrival valuation (INR)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, paddingBottom: 12, borderBottom: '1px solid rgba(59,73,73,0.2)' }}>
            Batch Entry
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <select className="form-input" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                <option value="">— Select company —</option>
                {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Device Category</label>
              <select className="form-input" value={form.device_type} onChange={e => set('device_type', e.target.value)}>
                {DEVICE_TYPES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Net Weight (kg)</label>
            <input className="form-input" type="number" min="0.1" step="0.1" placeholder="e.g. 45.20"
              value={form.weight} onChange={e => set('weight', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Asset Condition</label>
            <div className="condition-group">
              {CONDITIONS.map(c => (
                <button key={c} className={`condition-btn${form.condition === c ? ' active' : ''}`}
                  onClick={() => set('condition', c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <div className="slider-row">
              <label className="form-label" style={{ marginBottom: 0 }}>Equipment Age (years)</label>
              <span className="slider-value">{form.age_years} yr</span>
            </div>
            <input className="slider" type="range" min="0" max="15" value={form.age_years}
              onChange={e => set('age_years', parseInt(e.target.value))} />
          </div>

          <div className="form-group">
            <div className="slider-row">
              <label className="form-label" style={{ marginBottom: 0 }}>Battery Health Index</label>
              <span className="slider-value">{form.battery_health}%</span>
            </div>
            <input className="slider" type="range" min="0" max="100" value={form.battery_health}
              onChange={e => set('battery_health', parseInt(e.target.value))} />
          </div>

          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" />Computing…</> : '⚡ Compute Valuation Intelligence'}
          </button>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!result ? (
            <div className="card" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, padding:48, opacity:0.5 }}>
              <div style={{ fontSize: '2.5rem' }}>⚗️</div>
              <div className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                Fill in batch details and click<br />Compute Valuation Intelligence
              </div>
            </div>
          ) : (
            <>
              <div className="erv-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div className="erv-label">Expected Recovery Value (INR)</div>
                    <div className="erv-value">{fmt(result.expected_value)}</div>
                  </div>
                  <span className={`badge ${result.segment==='HIGH'?'badge-high':result.segment==='MEDIUM'?'badge-medium':'badge-low'}`}
                    style={{ fontSize:'0.8rem', padding:'6px 14px' }}>
                    {result.segment}
                  </span>
                </div>
                <div className="erv-meta">
                  <div className="erv-meta-item">
                    <div className="erv-meta-label">Guaranteed Offer</div>
                    <div className="erv-meta-value text-teal">{fmt(result.offer_price)}</div>
                  </div>
                  <div className="erv-meta-item">
                    <div className="erv-meta-label">Batch ID</div>
                    <div className="erv-meta-value font-mono" style={{ fontSize:'0.8rem' }}>{result.batch_id?.slice(0,8).toUpperCase()}</div>
                  </div>
                  <div className="erv-meta-item">
                    <div className="erv-meta-label">Status</div>
                    <div className="erv-meta-value"><span className="badge badge-submitted">{result.status}</span></div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Material Composition Profile (INR)</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(breakdown).sort((a,b)=>b[1]-a[1]).map(([mat, val]) => (
                    <div key={mat} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: MATERIAL_COLORS[mat]||'#60a5fa', flexShrink:0 }} />
                      <span className="text-muted" style={{ fontSize:'0.78rem', width:120, textTransform:'capitalize' }}>{mat.replace('_',' ')}</span>
                      <div className="progress-bar" style={{ flex:1 }}>
                        <div className="progress-fill" style={{ width:`${(val/maxBV)*100}%`, background: MATERIAL_COLORS[mat]||'var(--primary)' }} />
                      </div>
                      <span className="fw-600" style={{ fontSize:'0.8rem', width:80, textAlign:'right' }}>{fmt(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-ghost" onClick={() => setResult(null)}>← Submit another batch</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
