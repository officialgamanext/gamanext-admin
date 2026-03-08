import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import Table from '../../../components/Table/Table';
import '../../../components/UI/UI.css';
import './LeavesTab.css';

/* ─── Helpers ─────────────────────────────────────────── */
const LEAVE_TYPES = [
  'Sick Leave', 'Casual Leave', 'Annual Leave',
  'Personal Leave', 'Maternity Leave', 'Paternity Leave', 'Compensatory Leave',
];

const daysBetween = (from, to) => {
  if (!from || !to) return 1;
  const ms = new Date(to) - new Date(from);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' }); };
const groupBy  = (arr, fn) => arr.reduce((acc, item) => { const k = fn(item); (acc[k] = acc[k] || []).push(item); return acc; }, {});

const StatusBadge = ({ status }) => {
  const map = { Approved: 'success', Rejected: 'danger', Pending: 'warning' };
  return <span className={`badge badge-${map[status] || 'neutral'}`}><span className="badge-dot" />{status}</span>;
};

const EMPTY = { type: 'Sick Leave', fromDate: '', toDate: '', reason: '', status: 'Pending' };

/* ─── Icon button ─────────────────────────────────────── */
const IconBtn = ({ onClick, title, hoverBg = '#e0e7ff', hoverColor = 'var(--primary)', children }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${hov ? hoverBg : 'var(--border)'}`, background: hov ? hoverBg : 'transparent', color: hov ? hoverColor : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
      {children}
    </button>
  );
};

/* ─── Edit Leave Modal ────────────────────────────────── */
function EditLeaveModal({ leave, empId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...leave });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.fromDate || !form.toDate) return;
    setSaving(true);
    try {
      const days = daysBetween(form.fromDate, form.toDate);
      await updateDoc(doc(db, 'employees', empId, 'leaves', leave.id), {
        ...form, days, updatedAt: new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: 500, animation: 'slideUp 0.22s ease', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>✏️ Edit Leave Request</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Leave Type', 'type', null], ['Status', 'status', null], ['From Date', 'fromDate', 'date'], ['To Date', 'toDate', 'date']].map(([label, key, type]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
              {key === 'type' ? (
                <select className="lv-form-select" value={form.type || ''} onChange={e => sf('type', e.target.value)}>
                  {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              ) : key === 'status' ? (
                <select className="lv-form-select" value={form.status || 'Pending'} onChange={e => sf('status', e.target.value)}>
                  <option>Pending</option><option>Approved</option><option>Rejected</option>
                </select>
              ) : (
                <input className="lv-form-input" type={type} value={form[key] || ''} onChange={e => sf(key, e.target.value)} />
              )}
            </div>
          ))}
          {form.fromDate && form.toDate && (
            <div style={{ gridColumn: 'span 2', background: '#f3f4f6', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              📅 Duration: {daysBetween(form.fromDate, form.toDate)} day{daysBetween(form.fromDate, form.toDate) > 1 ? 's' : ''}
            </div>
          )}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Reason</label>
            <textarea className="lv-form-textarea" style={{ height: 70, resize: 'vertical' }} placeholder="Brief reason…" value={form.reason || ''} onChange={e => sf('reason', e.target.value)} />
          </div>
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ──────────────────────────────────── */
function DeleteConfirm({ label, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxWidth: 380, width: '100%', overflow: 'hidden', animation: 'slideUp 0.22s ease' }}>
        <div style={{ background: 'linear-gradient(135deg,#fee2e2,#fff)', padding: '26px 26px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑️</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Delete Record</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Delete <strong>{label}</strong>? This cannot be undone.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="btn-spinner" /> Deleting…</> : '🗑 Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main LeavesTab ──────────────────────────────────── */
export default function LeavesTab({ empId, emp }) {
  const [sub, setSub]           = useState('list');
  const [leaves, setLeaves]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'employees', empId, 'leaves'), orderBy('fromDate', 'desc'));
      const snap = await getDocs(q);
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [empId]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.fromDate || !form.toDate) return;
    setSaving(true);
    try {
      const days = daysBetween(form.fromDate, form.toDate);
      await addDoc(collection(db, 'employees', empId, 'leaves'), {
        ...form, days, employeeName: emp?.name || '', createdAt: new Date().toISOString(),
      });
      setForm({ ...EMPTY });
      setShowForm(false);
      fetch();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'employees', empId, 'leaves', id), { status });
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'employees', empId, 'leaves', deleteTarget.id));
      setLeaves(prev => prev.filter(l => l.id !== deleteTarget.id));
    } catch (e) { console.error(e); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  /* ── Summary ── */
  const total    = leaves.length;
  const approved = leaves.filter(l => l.status === 'Approved').length;
  const pending  = leaves.filter(l => l.status === 'Pending').length;
  const totalDays = leaves.filter(l => l.status === 'Approved').reduce((s, l) => s + (l.days || 1), 0);

  /* ── Reports ── */
  const monthlyGroups = groupBy(leaves, l => l.fromDate?.slice(0, 7) || 'Unknown');
  const monthlyData   = Object.entries(monthlyGroups).sort(([a],[b])=>b.localeCompare(a))
    .map(([ym, rows]) => ({ id: ym, period: ym === 'Unknown' ? 'Unknown' : fmtMonth(ym), total: rows.length, totalDays: rows.reduce((s,r)=>s+(r.days||1),0), approved: rows.filter(r=>r.status==='Approved').length, pending: rows.filter(r=>r.status==='Pending').length, rejected: rows.filter(r=>r.status==='Rejected').length, days: rows.filter(r=>r.status==='Approved').reduce((s,r)=>s+(r.days||1),0) }));

  const yearlyGroups = groupBy(leaves, l => l.fromDate?.slice(0, 4) || 'Unknown');
  const yearlyData   = Object.entries(yearlyGroups).sort(([a],[b])=>b.localeCompare(a))
    .map(([yr, rows]) => ({ id: yr, period: yr, total: rows.length, totalDays: rows.reduce((s,r)=>s+(r.days||1),0), approved: rows.filter(r=>r.status==='Approved').length, pending: rows.filter(r=>r.status==='Pending').length, rejected: rows.filter(r=>r.status==='Rejected').length, days: rows.filter(r=>r.status==='Approved').reduce((s,r)=>s+(r.days||1),0), types: [...new Set(rows.map(r=>r.type))].join(', ') }));

  /* ── SVGs ── */
  const EditSVG  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
  const TrashSVG = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;
  const CheckSVG = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
  const XSvg    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

  const listCols = [
    { key: 'type',     label: 'Leave Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate',   label: 'To' },
    { key: 'days',     label: 'Days', render: v => `${v || 1} day${v > 1 ? 's' : ''}` },
    { key: 'reason',   label: 'Reason', render: v => <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span> },
    { key: 'status',   label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 5 }}>
          {row.status === 'Pending' && (
            <>
              <IconBtn onClick={() => updateStatus(row.id,'Approved')} title="Approve" hoverBg="#d1fae5" hoverColor="#059669"><CheckSVG /></IconBtn>
              <IconBtn onClick={() => updateStatus(row.id,'Rejected')} title="Reject"  hoverBg="#fee2e2" hoverColor="var(--danger)"><XSvg /></IconBtn>
            </>
          )}
          <IconBtn onClick={() => setEditTarget(row)}   title="Edit"   hoverBg="#e0e7ff" hoverColor="var(--primary)"><EditSVG /></IconBtn>
          <IconBtn onClick={() => setDeleteTarget(row)} title="Delete" hoverBg="#fee2e2" hoverColor="var(--danger)"><TrashSVG /></IconBtn>
        </div>
      )
    },
  ];

  const reportCols = [
    { key: 'period',    label: 'Period' },
    { key: 'total',     label: 'Total Leaves' },
    { key: 'totalDays', label: 'Total Days',   render: v => `${v||0}d` },
    { key: 'approved',  label: 'Approved',     render: v => <span style={{ color:'#059669', fontWeight:700 }}>{v}</span> },
    { key: 'pending',   label: 'Pending',      render: v => <span style={{ color:'#d97706', fontWeight:700 }}>{v}</span> },
    { key: 'rejected',  label: 'Rejected',     render: v => <span style={{ color:'var(--danger)', fontWeight:700 }}>{v}</span> },
    { key: 'days',      label: 'Approved Days', render: v => `${v}d` },
  ];

  return (
    <div>
      {/* Summary */}
      <div className="lv-summary">
        {[['Total Leaves', total, 'primary'],['Approved', approved, 'success'],['Pending', pending, 'warning'],['Days Taken', totalDays, 'danger']].map(([l,v,c]) => (
          <div key={l} className="lv-summary-card"><div className="lv-summary-label">{l}</div><div className={`lv-summary-value ${c}`}>{v}</div></div>
        ))}
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div className="lv-subtabs">
          {[['list','📋 Leave List'],['monthly','📆 Monthly Report'],['yearly','📊 Yearly Report']].map(([k,l]) => (
            <button key={k} className={`lv-subtab${sub===k?' active':''}`} onClick={() => setSub(k)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Apply Leave</>)}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="lv-add-card">
          <div className="lv-add-title">🗓️ New Leave Request</div>
          <div className="lv-form-grid">
            <div className="lv-form-group"><label className="lv-form-label">Leave Type</label><select className="lv-form-select" value={form.type} onChange={e=>sf('type',e.target.value)}>{LEAVE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="lv-form-group"><label className="lv-form-label">From Date *</label><input className="lv-form-input" type="date" value={form.fromDate} onChange={e=>sf('fromDate',e.target.value)} /></div>
            <div className="lv-form-group"><label className="lv-form-label">To Date *</label><input className="lv-form-input" type="date" value={form.toDate} onChange={e=>sf('toDate',e.target.value)} /></div>
            <div className="lv-form-group"><label className="lv-form-label">Status</label><select className="lv-form-select" value={form.status} onChange={e=>sf('status',e.target.value)}><option>Pending</option><option>Approved</option><option>Rejected</option></select></div>
            <div className="lv-form-group"><label className="lv-form-label">Reason</label><input className="lv-form-input" placeholder="Brief reason..." value={form.reason} onChange={e=>sf('reason',e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {form.fromDate && form.toDate && <span style={{ fontSize:13, color:'var(--text-secondary)', alignSelf:'center' }}>📅 {daysBetween(form.fromDate, form.toDate)} day{daysBetween(form.fromDate, form.toDate)>1?'s':''}</span>}
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?<><span className="btn-spinner"/> Saving…</>:'Submit Leave'}</button>
          </div>
        </div>
      )}

      {sub === 'list' && (loading ? <p style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>Loading leaves…</p>
        : <Table columns={listCols} data={leaves} emptyText="No leave records yet. Apply a leave above." />)}

      {sub === 'monthly' && (monthlyData.length === 0 ? <p style={{ color:'var(--text-muted)',fontSize:13 }}>No leave data to report.</p> : (
        <><div className="lv-report-grid">{monthlyData.map(m=>(
          <div className="lv-report-card" key={m.id}>
            <div className="lv-report-period">{m.period}</div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Total Leaves</span><span className="lv-report-stat-val">{m.total}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Total Days</span><span className="lv-report-stat-val" style={{color:'var(--primary)',fontWeight:800}}>{m.totalDays}d</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Approved</span><span className="lv-report-stat-val" style={{color:'#059669'}}>{m.approved}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Pending</span><span className="lv-report-stat-val" style={{color:'#d97706'}}>{m.pending}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Rejected</span><span className="lv-report-stat-val" style={{color:'var(--danger)'}}>{m.rejected}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Approved Days</span><span className="lv-report-stat-val">{m.days}d</span></div>
          </div>))}</div>
          <Table columns={reportCols} data={monthlyData} emptyText="No monthly data." /></>
      ))}

      {sub === 'yearly' && (yearlyData.length === 0 ? <p style={{ color:'var(--text-muted)',fontSize:13 }}>No leave data to report.</p> : (
        <><div className="lv-report-grid">{yearlyData.map(y=>(
          <div className="lv-report-card" key={y.id}>
            <div className="lv-report-period">{y.period}</div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Total Leaves</span><span className="lv-report-stat-val">{y.total}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Total Days</span><span className="lv-report-stat-val" style={{color:'var(--primary)',fontWeight:800}}>{y.totalDays}d</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Approved</span><span className="lv-report-stat-val" style={{color:'#059669'}}>{y.approved}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Pending</span><span className="lv-report-stat-val" style={{color:'#d97706'}}>{y.pending}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Rejected</span><span className="lv-report-stat-val" style={{color:'var(--danger)'}}>{y.rejected}</span></div>
            <div className="lv-report-stat"><span className="lv-report-stat-label">Approved Days</span><span className="lv-report-stat-val">{y.days}d</span></div>
          </div>))}</div>
          <Table columns={[...reportCols,{key:'types',label:'Leave Types Used'}]} data={yearlyData} emptyText="No yearly data." /></>
      ))}

      {editTarget && <EditLeaveModal leave={editTarget} empId={empId} onClose={() => setEditTarget(null)} onSaved={() => { fetch(); setEditTarget(null); }} />}
      {deleteTarget && <DeleteConfirm label={`${deleteTarget.type} (${deleteTarget.fromDate} → ${deleteTarget.toDate})`} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} deleting={deleting} />}
    </div>
  );
}
