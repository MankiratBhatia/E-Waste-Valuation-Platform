import { useEffect, useState } from 'react';
import { getDashboard } from '../api';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function fmt(v) {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(dt) {
  if (!dt) return new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
  return new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
}

function Field({ label, value, highlight }) {
  return (
    <div style={{ display:'flex', padding:'8px 0', borderBottom:'1px solid rgba(59,73,73,0.18)' }}>
      <span style={{ width:220, fontSize:'0.78rem', color:'var(--on-surface-variant)', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:'0.82rem', fontWeight: highlight ? 700 : 500, color: highlight ? 'var(--primary)' : 'var(--on-surface)' }}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{
        background: accent === 'gold' ? 'rgba(255,191,0,0.08)' : 'rgba(71,234,237,0.07)',
        borderLeft: `3px solid ${accent === 'gold' ? 'var(--secondary)' : 'var(--primary)'}`,
        padding: '6px 14px', fontSize:'0.7rem', fontWeight:700,
        letterSpacing:'0.08em', textTransform:'uppercase',
        color: accent === 'gold' ? 'var(--secondary)' : 'var(--primary)',
        marginBottom:12,
      }}>
        {title}
      </div>
      <div style={{ paddingLeft:4 }}>{children}</div>
    </div>
  );
}

function CertificateView({ batch, supplierName, certNum, certDate }) {
  const gst18  = (batch.offer_price || 0) * 0.18;
  const total  = (batch.offer_price || 0) + gst18;

  return (
    <div id="cert-print-area" style={{ display:'flex', flexDirection:'column', gap:28 }}>

      {/* ─── EPR Certificate ─────────────────────────── */}
      <div className="card" style={{ position:'relative', overflow:'hidden' }}>
        {/* Watermark */}
        <div style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-35deg)',
          fontSize:'5rem', fontWeight:900, opacity:0.025, color:'var(--primary)',
          pointerEvents:'none', whiteSpace:'nowrap', userSelect:'none',
        }}>
          TERIONIX EPR
        </div>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid rgba(59,73,73,0.2)' }}>
          <div style={{ fontSize:'0.72rem', letterSpacing:'0.15em', color:'var(--primary)', fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>
            TERIONIX Material Recovery Pvt. Ltd.
          </div>
          <div style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--on-surface)', letterSpacing:'-0.01em' }}>
            EXTENDED PRODUCER RESPONSIBILITY
          </div>
          <div style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--primary)' }}>
            (EPR) CERTIFICATE
          </div>
          <div style={{ fontSize:'0.72rem', color:'var(--on-surface-variant)', marginTop:6 }}>
            Issued under E-Waste (Management) Rules 2022 · Ministry of Environment, Forest &amp; Climate Change, Govt. of India
          </div>
        </div>

        {/* Meta badges */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
          {[
            { label:'Certificate No.', value: certNum },
            { label:'Issue Date',      value: certDate },
            { label:'EPR Reg. No.',    value:'CPCB/EPR/TRX/2024/0047' },
          ].map(b => (
            <div key={b.label} style={{ background:'var(--surface-container)', borderRadius:'var(--radius-sm)', padding:'8px 16px', flex:1, minWidth:180 }}>
              <div style={{ fontSize:'0.62rem', color:'var(--on-surface-variant)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{b.label}</div>
              <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--primary)', fontFamily:'monospace' }}>{b.value}</div>
            </div>
          ))}
        </div>

        <Section title="1. Recycler / Collector Details">
          <Field label="Name"              value="Terionix Material Recovery Pvt. Ltd." />
          <Field label="Category"          value="Authorized Dismantler & Recycler (Category A — CPCB)" />
          <Field label="EPR Reg. No."      value="CPCB/EPR/TRX/2024/0047" />
          <Field label="Issuing Authority" value="Central Pollution Control Board (CPCB)" />
        </Section>

        <Section title="2. Producer / IT Company Details">
          <Field label="Company Name"     value={supplierName} highlight />
          <Field label="Producer Category" value="IT Equipment / Consumer Electronics" />
          <Field label="EPR Portal"        value="MoEFCC EPR Portal (eprewaste.gov.in)" />
        </Section>

        <Section title="3. E-Waste Description">
          <Field label="Device Category"          value={batch.device_type?.replace('_',' ')?.replace(/\b\w/g,c=>c.toUpperCase())} />
          <Field label="Condition at Intake"       value={batch.condition?.charAt(0).toUpperCase() + batch.condition?.slice(1)} />
          <Field label="Gross Weight Collected"    value={`${batch.weight} kg`} />
          <Field label="Batch Ref. ID"             value={batch.batch_id?.toUpperCase()} />
          <Field label="Segment Classification"    value={batch.segment || 'N/A'} />
          <Field label="Collection Date"           value={fmtDate(batch.submitted_at)} />
          {batch.completed_at && <Field label="Recovery Completion" value={fmtDate(batch.completed_at)} />}
        </Section>

        <Section title="5. Compliance Declaration">
          <div style={{ fontSize:'0.8rem', color:'var(--on-surface-variant)', lineHeight:1.7, background:'var(--surface-container)', padding:'12px 16px', borderRadius:'var(--radius-sm)' }}>
            This is to certify that the e-waste described above has been collected, transported, and processed in
            compliance with the <strong style={{color:'var(--on-surface)'}}>E-Waste (Management) Rules 2022</strong> and
            all applicable directives issued by MoEFCC, Government of India. The producer named herein has fulfilled
            their Extended Producer Responsibility (EPR) obligations for the quantity specified in this certificate.
          </div>
        </Section>

        {/* Signature row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, marginTop:24, paddingTop:20, borderTop:'1px solid rgba(59,73,73,0.2)' }}>
          {[supplierName, 'Terionix Material Recovery Pvt. Ltd.'].map(name => (
            <div key={name}>
              <div style={{ borderTop:'1px solid var(--on-surface-variant)', paddingTop:8, marginTop:32 }}>
                <div style={{ fontSize:'0.72rem', color:'var(--on-surface-variant)' }}>Authorized Signatory</div>
                <div style={{ fontSize:'0.82rem', fontWeight:600, marginTop:2 }}>{name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Offer Receipt ───────────────────────────── */}
      <div className="card">
        <div style={{ textAlign:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid rgba(59,73,73,0.2)' }}>
          <div style={{ fontSize:'0.72rem', letterSpacing:'0.15em', color:'var(--secondary)', fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>
            TERIONIX Material Recovery Pvt. Ltd. · GSTIN: 27AAACT1234F1ZK
          </div>
          <div style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--secondary)' }}>
            OFFER AMOUNT RECEIPT
          </div>
          <div style={{ fontSize:'0.72rem', color:'var(--on-surface-variant)', marginTop:4 }}>
            Receipt No: RCP/{batch.batch_id?.slice(0,6).toUpperCase()}/{new Date().toISOString().slice(0,7).replace('-','')}&nbsp;&nbsp;·&nbsp;&nbsp;Date: {certDate}
          </div>
        </div>

        <Section title="Bill To" accent="gold">
          <Field label="Company" value={supplierName} highlight />
          <Field label="Batch Reference" value={batch.batch_id?.toUpperCase()} />
        </Section>

        {/* Line items table */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px 120px', gap:0, marginBottom:2 }}>
            {['Description','Qty / Wt','Unit','Amount (₹)'].map(h => (
              <div key={h} style={{ background:'var(--surface-container)', padding:'8px 12px', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--primary)' }}>
                {h}
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px 120px', background:'var(--surface-high)' }}>
            {[
              `${batch.device_type?.charAt(0).toUpperCase() + batch.device_type?.slice(1)} (${batch.condition} condition)`,
              `${batch.weight} kg`,
              'Batch',
              fmt(batch.offer_price),
            ].map((v, i) => (
              <div key={i} style={{ padding:'10px 12px', fontSize:'0.82rem', fontWeight: i===3?700:400, color: i===3?'var(--primary)':'var(--on-surface)' }}>
                {v}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, marginBottom:16 }}>
          {[
            { label:'Sub-Total',    value: fmt(batch.offer_price),      bold:false },
            { label:'GST @ 18%',   value: fmt(gst18),                  bold:false },
            { label:'TOTAL PAYABLE', value: fmt(total),                 bold:true  },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', gap:32, width:320, justifyContent:'space-between', padding: row.bold?'10px 16px':'4px 16px', background: row.bold?'rgba(71,234,237,0.08)':'transparent', borderRadius: row.bold?'var(--radius-sm)':0, borderTop: row.bold?'1px solid rgba(71,234,237,0.2)':0 }}>
              <span style={{ fontSize:'0.8rem', color: row.bold?'var(--primary)':'var(--on-surface-variant)', fontWeight: row.bold?700:400 }}>{row.label}</span>
              <span style={{ fontSize: row.bold?'1rem':'0.82rem', fontWeight:700, color: row.bold?'var(--primary)':'var(--on-surface)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <Section title="Payment Details" accent="gold">
          <Field label="Bank Name"     value="HDFC Bank Ltd." />
          <Field label="Account Name"  value="Terionix Material Recovery Pvt. Ltd." />
          <Field label="Account No."   value="XXXX XXXX 4892" />
          <Field label="IFSC Code"     value="HDFC0001234" />
          <Field label="Payment Mode"  value="NEFT / RTGS / Bank Transfer" />
          <Field label="Due Date"      value="Within 7 working days of receipt" />
        </Section>

        <div style={{ fontSize:'0.72rem', color:'var(--on-surface-variant)', background:'var(--surface-container)', padding:'10px 14px', borderRadius:'var(--radius-sm)', lineHeight:1.6 }}>
          This is a computer-generated receipt and does not require a physical signature. For disputes contact support@terionix.in · +91-80-4567-8901
        </div>
      </div>
    </div>
  );
}

export default function Certificate({ onNav }) {
  const [batches, setBatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    getDashboard().then(d => {
      setBatches(d.recent_batches || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const batch = batches.find(b => b.batch_id === selected);
  // Find supplier name — it comes from dashboard's recent_batches
  const supplierName = batch?.supplier_name || batch?.supplier_id || '—';
  const certNum = batch ? `TRX/EPR/${batch.batch_id.slice(0,8).toUpperCase()}/${new Date().getFullYear()}` : '';
  const certDate = fmtDate(batch?.completed_at || batch?.submitted_at);

  const handlePrint = () => {
    window.print();
  };

  const handlePdfDownload = () => {
    if (!batch) return;
    window.open(`${API}/certificate/${batch.batch_id}`, '_blank');
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .card { border: 1px solid #ccc !important; background: white !important; box-shadow: none !important; }
          #cert-print-area * { color: black !important; background: transparent !important; }
        }
      `}</style>

      <div className="page-header no-print">
        <div>
          <h1 className="page-title">EPR Certificates</h1>
          <div className="page-subtitle">View, print, or download EPR certificates &amp; offer receipts</div>
        </div>
        {batch && (
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost no-print" onClick={handlePrint} style={{ fontSize:'0.8rem' }}>
              🖨️ Print
            </button>
            <button className="btn btn-primary no-print" onClick={handlePdfDownload} style={{ fontSize:'0.8rem' }}>
              ⬇️ Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Batch selector */}
      <div className="card no-print" style={{ marginBottom: 0 }}>
        <div className="card-title">Select Batch</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <select className="form-input" style={{ flex:1, maxWidth:480 }}
            value={selected || ''}
            onChange={e => setSelected(e.target.value || null)}>
            <option value="">— Select a batch to generate certificate —</option>
            {batches.map(b => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_id.slice(0,8).toUpperCase()} · {b.device_type} · {b.weight}kg · {b.status} · {fmt(b.expected_value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading batches…</div>}

      {!loading && !selected && (
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:48, opacity:0.5 }}>
          <div style={{ fontSize:'3rem' }}>📄</div>
          <div className="text-muted" style={{ fontSize:'0.9rem', textAlign:'center' }}>
            Select a batch above to preview its<br />EPR Certificate and Offer Receipt
          </div>
        </div>
      )}

      {batch && (
        <CertificateView
          batch={batch}
          supplierName={supplierName}
          certNum={certNum}
          certDate={certDate}
        />
      )}
    </>
  );
}
