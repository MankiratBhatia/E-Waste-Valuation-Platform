import { useEffect, useState, useCallback } from 'react';
import { getDashboard, updateBatchStatus } from '../api';

const TIMELINE_STEPS = ['Submitted', 'Valuation Complete', 'Processing', 'Recovery Complete'];
const ALL_STATUSES   = ['submitted', 'processing', 'completed'];

function fmt(v) {
  return `₹${(v||0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getStepIndex(status) {
  if (status === 'completed') return 3;
  if (status === 'processing') return 2;
  return 1;
}

function BatchTimeline({ status }) {
  const done = getStepIndex(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0 4px' }}>
      {TIMELINE_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < TIMELINE_STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 90 }}>
            <div className={`timeline-dot ${i < done ? 'done' : i === done ? 'active' : ''}`} />
            <span className="timeline-label">{step}</span>
          </div>
          {i < TIMELINE_STEPS.length - 1 && (
            <div className={`timeline-line${i < done - 1 ? ' done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusOverride({ batch, onUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === batch.status) return;
    setUpdating(true); setMsg('');
    try {
      const res = await updateBatchStatus(batch.batch_id, newStatus);
      setMsg(`✓ ${res.message}`);
      onUpdated(batch.batch_id, newStatus, res.completed_at);
    } catch (err) {
      setMsg(`✗ ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
        Override Status
      </span>
      <select className="form-input" style={{ width: 160, padding: '6px 10px', fontSize: '0.8rem' }}
        value={batch.status} onChange={handleChange} disabled={updating}>
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
      {updating && <div className="spinner" />}
      {msg && <span style={{ fontSize: '0.78rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{msg}</span>}
    </div>
  );
}

function CertButton({ batchId }) {
  const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/certificate/${batchId}`;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,191,0,0.12)', border: '1px solid rgba(255,191,0,0.3)',
        color: 'var(--secondary)', fontSize: '0.78rem', fontWeight: 600,
        textDecoration: 'none', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,191,0,0.22)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,191,0,0.12)'}
    >
      📄 Download EPR + Receipt
    </a>
  );
}

export default function BatchTracker() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getDashboard().then(d => setBatches(d.recent_batches || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRow = (id) => setExpanded(e => e === id ? null : id);

  const handleStatusUpdated = (batchId, newStatus, completedAt) => {
    setBatches(prev => prev.map(b =>
      b.batch_id === batchId ? { ...b, status: newStatus, completed_at: completedAt || b.completed_at } : b
    ));
  };

  const filtered = filter === 'all' ? batches : batches.filter(b => b.status === filter);
  const counts = batches.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});

  if (loading) return <div className="loading"><div className="spinner" />Loading batches…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Batch Lifecycle Tracker</h1>
          <div className="page-subtitle">Monitor every batch from submission to recovery</div>
        </div>
        <button className="btn btn-ghost" onClick={load} style={{ padding: '7px 16px', fontSize: '0.8rem' }}>↻ Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'all',        label: 'All Batches',  count: batches.length },
          { key: 'submitted',  label: 'Submitted',    count: counts.submitted  || 0 },
          { key: 'processing', label: 'Processing',   count: counts.processing || 0 },
          { key: 'completed',  label: 'Completed',    count: counts.completed  || 0 },
        ].map(f => (
          <button key={f.key} className={`condition-btn${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
            <span style={{ marginLeft: 6, fontSize: '0.7rem', padding: '1px 7px', background: filter===f.key?'rgba(71,234,237,0.2)':'rgba(255,255,255,0.07)', borderRadius: 'var(--radius-pill)' }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Batch ID</th><th>Device</th><th>Company</th><th>Weight</th>
              <th>Segment</th><th>ERV (₹)</th><th>Offer (₹)</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>No batches in this filter</td></tr>
            )}
            {filtered.map(b => {
              const seg = (b.segment || 'LOW').toUpperCase();
              const segCls = seg==='HIGH'?'badge-high':seg==='MEDIUM'?'badge-medium':'badge-low';
              const stCls = b.status==='completed'?'badge-completed':b.status==='processing'?'badge-processing':'badge-submitted';
              const isOpen = expanded === b.batch_id;
              return [
                <tr key={b.batch_id} style={{ cursor: 'pointer' }} onClick={() => toggleRow(b.batch_id)}>
                  <td className="mono">{b.batch_id?.slice(0,8).toUpperCase()}</td>
                  <td style={{ textTransform:'capitalize' }}>{b.device_type}</td>
                  <td className="text-muted" style={{ fontSize:'0.78rem' }}>{b.supplier_name || '—'}</td>
                  <td className="text-muted">{b.weight}kg</td>
                  <td><span className={`badge ${segCls}`}>{seg}</span></td>
                  <td className="fw-600 text-teal">{fmt(b.expected_value)}</td>
                  <td className="text-muted">{b.offer_price ? fmt(b.offer_price) : '—'}</td>
                  <td><span className={`badge ${stCls}`}>{b.status}</span></td>
                  <td className="text-teal" style={{ fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</td>
                </tr>,
                isOpen && (
                  <tr key={b.batch_id + '_exp'}>
                    <td colSpan={9} style={{ background: 'var(--surface-low)', padding: '20px 28px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Batch Lifecycle — <span className="font-mono" style={{ color: 'var(--primary)' }}>{b.batch_id}</span>
                      </div>
                      <BatchTimeline status={b.status} />

                      <div style={{ display:'flex', gap:24, marginTop:12, fontSize:'0.8rem', flexWrap:'wrap', paddingTop:12, borderTop:'1px solid rgba(59,73,73,0.2)' }}>
                        <span><span className="text-muted">Submitted: </span>{new Date(b.submitted_at).toLocaleString('en-IN')}</span>
                        {b.completed_at && <span><span className="text-muted">Completed: </span>{new Date(b.completed_at).toLocaleString('en-IN')}</span>}
                        {b.actual_value && <span><span className="text-muted">Actual Recovery: </span><span className="text-success fw-600">{fmt(b.actual_value)}</span></span>}
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:16, paddingTop:12, borderTop:'1px solid rgba(59,73,73,0.15)', marginTop:12, flexWrap:'wrap' }}>
                        <StatusOverride batch={b} onUpdated={handleStatusUpdated} />
                        <CertButton batchId={b.batch_id} />
                      </div>
                    </td>
                  </tr>
                )
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
