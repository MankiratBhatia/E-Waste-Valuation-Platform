import { useEffect, useState } from 'react';
import { getDashboard } from '../api';

function StatCard({ label, value, delta, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color || ''}`}>{value}</div>
      {delta && <div className="stat-delta">{delta}</div>}
    </div>
  );
}

function SegmentBar({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const segments = [
    { key: 'HIGH',    color: '#ffbf00' },
    { key: 'MEDIUM',  color: '#47eaed' },
    { key: 'LOW',     color: '#3b4949' },
    { key: 'UNKNOWN', color: '#25293a' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14, gap: 2 }}>
        {segments.map(s => {
          const pct = ((counts[s.key] || 0) / total) * 100;
          return pct > 0 ? <div key={s.key} style={{ width: `${pct}%`, background: s.color }} /> : null;
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.key} className="flex items-center" style={{ gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{s.key}</span>
            <span className="fw-600" style={{ fontSize: '0.8rem' }}>{counts[s.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(v) { return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtK(v) { return v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(1)}K` : fmt(v); }

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Loading dashboard…</div>;
  if (!data)   return <div className="empty-state">Failed to load dashboard. Is the API running at http://localhost:8000?</div>;

  const mape = (data.average_error_pct || 0).toFixed(1);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recovery Dashboard</h1>
          <div className="page-subtitle">Real-time material recovery intelligence</div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(59,73,73,0.3)' }}>
          🟢 API Online
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Batches"       value={data.total_batches.toLocaleString()} />
        <StatCard label="Total ERV (INR)"     value={fmtK(data.total_erv_usd)}            color="teal" />
        <StatCard label="Actual Recovered"    value={fmtK(data.total_actual_recovered_usd)} color="green" />
        <StatCard label="Avg Prediction Error" value={`${mape}%`}                          color={parseFloat(mape) < 10 ? 'green' : ''} />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Batch Segment Distribution</div>
          <SegmentBar counts={data.segment_counts} />
        </div>
        <div className="card">
          <div className="card-title">Processing Status</div>
          <SegmentBar counts={data.status_counts} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Top Suppliers by SVI</div>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Company</th><th>Consistency</th><th>Reliability</th><th>SVI Score</th></tr>
          </thead>
          <tbody>
            {(data.top_suppliers || []).map((s, i) => (
              <tr key={s.supplier_id}>
                <td className="text-muted fw-600">{i + 1}</td>
                <td className="fw-600">{s.name}</td>
                <td>
                  <div className="flex items-center" style={{ gap: 10 }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${s.consistency_score * 100}%` }} />
                    </div>
                    <span className="text-muted font-mono">{(s.consistency_score * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center" style={{ gap: 10 }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill gold" style={{ width: `${s.reliability_score * 100}%` }} />
                    </div>
                    <span className="text-muted font-mono">{(s.reliability_score * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td>
                  <span className={`fw-700 ${s.svi >= 0.8 ? 'text-success' : s.svi >= 0.6 ? 'text-teal' : 'text-error'}`} style={{ fontSize: '1rem' }}>
                    {s.svi.toFixed(3)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">Recent Batches</div>
        {(data.recent_batches || []).length === 0
          ? <div className="empty-state">No batches yet — submit one via Intake &amp; Valuation</div>
          : (
            <table className="data-table">
              <thead>
                <tr><th>Batch ID</th><th>Device</th><th>Company</th><th>Condition</th><th>ERV (₹)</th><th>Segment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.recent_batches.map(b => {
                  const seg = (b.segment || 'LOW').toUpperCase();
                  const segCls = seg === 'HIGH' ? 'badge-high' : seg === 'MEDIUM' ? 'badge-medium' : 'badge-low';
                  const stCls = b.status === 'completed' ? 'badge-completed' : b.status === 'processing' ? 'badge-processing' : 'badge-submitted';
                  return (
                    <tr key={b.batch_id}>
                      <td className="mono">{b.batch_id?.slice(0, 8).toUpperCase()}</td>
                      <td style={{ textTransform: 'capitalize' }}>{b.device_type}</td>
                      <td className="text-muted">{b.supplier_name || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{b.condition}</td>
                      <td className="fw-600 text-teal">{fmt(b.expected_value)}</td>
                      <td><span className={`badge ${segCls}`}>{seg}</span></td>
                      <td><span className={`badge ${stCls}`}>{b.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </>
  );
}
