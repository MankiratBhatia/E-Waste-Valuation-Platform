import { useState, useEffect } from 'react';
import { getBatch, submitFeedback } from '../api';

function fmt(v) {
  return `₹${(v||0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

export default function Feedback() {
  const [batchId, setBatchId] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);

  const lookupBatch = async () => {
    if (!batchId.trim()) return;
    setPreviewLoading(true); setPreview(null);
    try {
      setPreview(await getBatch(batchId.trim()));
    } catch (e) {
      setToast({ msg: `Batch not found: ${e.message}`, type: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!batchId.trim())                   return setToast({ msg: 'Enter a Batch ID', type: 'error' });
    if (!actualValue || +actualValue <= 0) return setToast({ msg: 'Enter a valid actual value in ₹', type: 'error' });
    setLoading(true);
    try {
      const res = await submitFeedback({ batch_id: batchId.trim(), actual_value: parseFloat(actualValue) });
      setResult(res);
      setHistory(h => [{ batch_id: batchId, ...res }, ...h.slice(0, 9)]);
      setToast({ msg: res.message, type: 'success' });
      setBatchId(''); setActualValue(''); setPreview(null);
    } catch (e) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const mape = history.length
    ? (history.reduce((s, r) => s + Math.abs(r.error_ratio * 100), 0) / history.length).toFixed(1)
    : null;

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Feedback Reconciliation</h1>
          <div className="page-subtitle">Log actual recovery values (₹ INR) to close the learning loop</div>
        </div>
      </div>

      <div className="two-col" style={{ alignItems: 'flex-start' }}>
        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ fontSize:'0.85rem', fontWeight:600, paddingBottom:12, borderBottom:'1px solid rgba(59,73,73,0.2)' }}>
              Log Actual Recovery
            </div>

            <div className="form-group">
              <label className="form-label">Batch ID</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="form-input" style={{ flex:1 }} placeholder="Paste batch UUID…"
                  value={batchId} onChange={e => { setBatchId(e.target.value); setPreview(null); }} />
                <button className="btn btn-ghost" onClick={lookupBatch} disabled={previewLoading}>
                  {previewLoading ? '…' : '🔍'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Actual Recovery Value (₹ INR)</label>
              <input className="form-input" type="number" min="0.01" step="1" placeholder="e.g. 68000"
                value={actualValue} onChange={e => setActualValue(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
              {loading ? <><div className="spinner" />Submitting…</> : '✓ Submit Feedback'}
            </button>
          </div>

          {preview && (
            <div className="card" style={{ borderColor:'rgba(71,234,237,0.2)' }}>
              <div className="card-title">Batch Preview</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  ['Company',       preview.supplier_name || '—'],
                  ['Device',        preview.device_type],
                  ['Condition',     preview.condition],
                  ['Weight',        `${preview.weight}kg`],
                  ['Predicted ERV', fmt(preview.expected_value)],
                  ['Offer Price',   preview.offer_price ? fmt(preview.offer_price) : '—'],
                  ['Status',        preview.status],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between" style={{ fontSize:'0.82rem', padding:'6px 0', borderBottom:'1px solid rgba(59,73,73,0.12)' }}>
                    <span className="text-muted">{k}</span>
                    <span className="fw-600" style={{ textTransform:'capitalize' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="card" style={{ borderColor: result.trigger_learning?'rgba(255,191,0,0.3)':'rgba(102,221,139,0.3)' }}>
              <div className="card-title">Learning Report</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  ['Predicted', fmt(result.predicted_value)],
                  ['Actual', fmt(result.actual_value)],
                  ['Error Ratio', `${(result.error_ratio*100).toFixed(1)}%`],
                  ['Abs Error', `${result.abs_error_pct.toFixed(1)}%`],
                  ['SVI Adj.', result.reliability_adjustment>0?`+${result.reliability_adjustment.toFixed(3)}`:result.reliability_adjustment.toFixed(3)],
                  ['Learning', result.trigger_learning?'🔥 Triggered':'✓ Within range'],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:'var(--surface-high)', borderRadius:'var(--radius-sm)', padding:'10px 12px' }}>
                    <div style={{ fontSize:'0.65rem', color:'var(--on-surface-variant)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                    <div style={{ fontSize:'0.95rem', fontWeight:700, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {mape && (
            <div className="stat-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
              <div className="stat-card">
                <div className="stat-label">Session MAPE</div>
                <div className={`stat-value ${parseFloat(mape)<10?'green':''}`}>{mape}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Feedback Logged</div>
                <div className="stat-value teal">{history.length}</div>
              </div>
            </div>
          )}

          <div className="card" style={{ padding:0, overflow:'hidden', flex:1 }}>
            <div style={{ padding:'16px 20px 0' }}><div className="card-title">Recent Feedback Log</div></div>
            {history.length === 0
              ? <div className="empty-state">No feedback submitted yet this session</div>
              : (
                <table className="data-table">
                  <thead>
                    <tr><th>Batch</th><th>Predicted (₹)</th><th>Actual (₹)</th><th>Error %</th><th>SVI Δ</th></tr>
                  </thead>
                  <tbody>
                    {history.map((r, i) => {
                      const errPct = r.error_ratio * 100;
                      const errColor = Math.abs(errPct)<10?'var(--success)':Math.abs(errPct)<20?'var(--secondary)':'var(--error)';
                      return (
                        <tr key={i}>
                          <td className="mono">{r.batch_id?.slice(0,8).toUpperCase()}</td>
                          <td>{fmt(r.predicted_value)}</td>
                          <td className="fw-600 text-teal">{fmt(r.actual_value)}</td>
                          <td><span style={{ color:errColor, fontWeight:700 }}>{errPct.toFixed(1)}%</span></td>
                          <td><span style={{ color:r.reliability_adjustment>=0?'var(--success)':'var(--error)', fontWeight:600 }}>
                            {r.reliability_adjustment>=0?'+':''}{r.reliability_adjustment.toFixed(3)}
                          </span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
