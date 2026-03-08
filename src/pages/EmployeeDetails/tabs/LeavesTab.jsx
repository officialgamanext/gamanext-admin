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

const fmtMonth = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const groupBy = (arr, fn) =>
  arr.reduce((acc, item) => {
    const k = fn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});

const StatusBadge = ({ status }) => {
  const map = { Approved: 'success', Rejected: 'danger', Pending: 'warning' };
  return (
    <span className={`badge badge-${map[status] || 'neutral'}`}>
      <span className="badge-dot" />{status}
    </span>
  );
};

const EMPTY = { type: 'Sick Leave', fromDate: '', toDate: '', reason: '', status: 'Pending' };

/* ─── Main LeavesTab ──────────────────────────────────── */
export default function LeavesTab({ empId, emp }) {
  const [sub, setSub]         = useState('list');
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ ...EMPTY });
  const [saving, setSaving]   = useState(false);

  /* ── Fetch ── */
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const q    = query(
        collection(db, 'employees', empId, 'leaves'),
        orderBy('fromDate', 'desc')
      );
      const snap = await getDocs(q);
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [empId]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* ── Add leave ── */
  const handleAdd = async () => {
    if (!form.fromDate || !form.toDate) return;
    setSaving(true);
    try {
      const days = daysBetween(form.fromDate, form.toDate);
      await addDoc(collection(db, 'employees', empId, 'leaves'), {
        ...form,
        days,
        employeeName: emp?.name || '',
        createdAt: new Date().toISOString(),
      });
      setForm({ ...EMPTY });
      setShowForm(false);
      fetch();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  /* ── Status update ── */
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'employees', empId, 'leaves', id), { status });
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'employees', empId, 'leaves', id));
    setLeaves(prev => prev.filter(l => l.id !== id));
  };

  /* ── Computed summary ── */
  const total    = leaves.length;
  const approved = leaves.filter(l => l.status === 'Approved').length;
  const pending  = leaves.filter(l => l.status === 'Pending').length;
  const rejected = leaves.filter(l => l.status === 'Rejected').length;
  const totalDays = leaves
    .filter(l => l.status === 'Approved')
    .reduce((s, l) => s + (l.days || 1), 0);

  /* ── Monthly report ── */
  const monthlyGroups = groupBy(leaves, l => l.fromDate?.slice(0, 7) || 'Unknown');
  const monthlyData   = Object.entries(monthlyGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([ym, rows]) => ({
      id:        ym,
      period:    ym === 'Unknown' ? 'Unknown' : fmtMonth(ym),
      total:     rows.length,
      approved:  rows.filter(r => r.status === 'Approved').length,
      pending:   rows.filter(r => r.status === 'Pending').length,
      rejected:  rows.filter(r => r.status === 'Rejected').length,
      days:      rows.filter(r => r.status === 'Approved').reduce((s, r) => s + (r.days || 1), 0),
      totalDays: rows.reduce((s, r) => s + (r.days || 1), 0),
    }));

  /* ── Yearly report ── */
  const yearlyGroups = groupBy(leaves, l => l.fromDate?.slice(0, 4) || 'Unknown');
  const yearlyData   = Object.entries(yearlyGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([yr, rows]) => ({
      id:        yr,
      period:    yr,
      total:     rows.length,
      approved:  rows.filter(r => r.status === 'Approved').length,
      pending:   rows.filter(r => r.status === 'Pending').length,
      rejected:  rows.filter(r => r.status === 'Rejected').length,
      days:      rows.filter(r => r.status === 'Approved').reduce((s, r) => s + (r.days || 1), 0),
      totalDays: rows.reduce((s, r) => s + (r.days || 1), 0),
      types:     [...new Set(rows.map(r => r.type))].join(', '),
    }));

  /* ── Table columns ── */
  const listCols = [
    { key: 'type',     label: 'Leave Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate',   label: 'To' },
    { key: 'days',     label: 'Days', render: v => `${v} day${v > 1 ? 's' : ''}` },
    { key: 'reason',   label: 'Reason', render: v => (
      <span style={{ maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {v || '—'}
      </span>
    )},
    { key: 'status',   label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="lv-action-row">
          {row.status === 'Pending' && (
            <>
              <button className="lv-approve-btn" title="Approve" onClick={() => updateStatus(row.id, 'Approved')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button className="lv-reject-btn" title="Reject" onClick={() => updateStatus(row.id, 'Rejected')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </>
          )}
          <button className="lv-delete-btn" title="Delete" onClick={() => handleDelete(row.id)}>🗑</button>
        </div>
      )
    },
  ];

  const reportCols = [
    { key: 'period',    label: 'Period' },
    { key: 'total',     label: 'Total Leaves' },
    { key: 'totalDays', label: 'Total Days', render: v => `${v || 0} day${v !== 1 ? 's' : ''}` },
    { key: 'approved',  label: 'Approved',   render: v => <span style={{ color: '#059669', fontWeight: 700 }}>{v}</span> },
    { key: 'pending',   label: 'Pending',    render: v => <span style={{ color: '#d97706', fontWeight: 700 }}>{v}</span> },
    { key: 'rejected',  label: 'Rejected',   render: v => <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{v}</span> },
    { key: 'days',      label: 'Approved Days', render: v => `${v} day${v !== 1 ? 's' : ''}` },
  ];

  return (
    <div>
      {/* ── Summary Cards ── */}
      <div className="lv-summary">
        <div className="lv-summary-card">
          <div className="lv-summary-label">Total Leaves</div>
          <div className="lv-summary-value primary">{total}</div>
        </div>
        <div className="lv-summary-card">
          <div className="lv-summary-label">Approved</div>
          <div className="lv-summary-value success">{approved}</div>
        </div>
        <div className="lv-summary-card">
          <div className="lv-summary-label">Pending</div>
          <div className="lv-summary-value warning">{pending}</div>
        </div>
        <div className="lv-summary-card">
          <div className="lv-summary-label">Days Taken</div>
          <div className="lv-summary-value danger">{totalDays}</div>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div className="lv-subtabs">
          {[
            ['list',    '📋 Leave List'],
            ['monthly', '📆 Monthly Report'],
            ['yearly',  '📊 Yearly Report'],
          ].map(([k, l]) => (
            <button key={k} className={`lv-subtab${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>
              {l}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? (
            'Cancel'
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Apply Leave
            </>
          )}
        </button>
      </div>

      {/* ── Add Leave Form ── */}
      {showForm && (
        <div className="lv-add-card">
          <div className="lv-add-title">🗓️ New Leave Request</div>
          <div className="lv-form-grid">
            <div className="lv-form-group">
              <label className="lv-form-label">Leave Type</label>
              <select className="lv-form-select" value={form.type} onChange={e => sf('type', e.target.value)}>
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="lv-form-group">
              <label className="lv-form-label">From Date *</label>
              <input className="lv-form-input" type="date" value={form.fromDate}
                onChange={e => sf('fromDate', e.target.value)} />
            </div>
            <div className="lv-form-group">
              <label className="lv-form-label">To Date *</label>
              <input className="lv-form-input" type="date" value={form.toDate}
                onChange={e => sf('toDate', e.target.value)} />
            </div>
            <div className="lv-form-group">
              <label className="lv-form-label">Status</label>
              <select className="lv-form-select" value={form.status} onChange={e => sf('status', e.target.value)}>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
            <div className="lv-form-group">
              <label className="lv-form-label">Reason</label>
              <input className="lv-form-input" placeholder="Brief reason..." value={form.reason}
                onChange={e => sf('reason', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {form.fromDate && form.toDate && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                📅 {daysBetween(form.fromDate, form.toDate)} day{daysBetween(form.fromDate, form.toDate) > 1 ? 's' : ''}
              </span>
            )}
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? <><span className="btn-spinner" /> Saving…</> : 'Submit Leave'}
            </button>
          </div>
        </div>
      )}

      {/* ── List tab ── */}
      {sub === 'list' && (
        loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading leaves…</p>
        ) : (
          <Table columns={listCols} data={leaves} emptyText="No leave records yet. Apply a leave above." />
        )
      )}

      {/* ── Monthly Report ── */}
      {sub === 'monthly' && (
        monthlyData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No leave data to report.</p>
        ) : (
          <>
            <div className="lv-report-grid">
              {monthlyData.map(m => (
                <div className="lv-report-card" key={m.id}>
                  <div className="lv-report-period">{m.period}</div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Total Leaves</span><span className="lv-report-stat-val">{m.total}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Total Days</span><span className="lv-report-stat-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>{m.totalDays}d</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Approved</span><span className="lv-report-stat-val" style={{ color: '#059669' }}>{m.approved}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Pending</span><span className="lv-report-stat-val" style={{ color: '#d97706' }}>{m.pending}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Rejected</span><span className="lv-report-stat-val" style={{ color: 'var(--danger)' }}>{m.rejected}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Approved Days</span><span className="lv-report-stat-val">{m.days}d</span></div>
                </div>
              ))}
            </div>
            <Table columns={reportCols} data={monthlyData} emptyText="No monthly data." />
          </>
        )
      )}

      {/* ── Yearly Report ── */}
      {sub === 'yearly' && (
        yearlyData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No leave data to report.</p>
        ) : (
          <>
            <div className="lv-report-grid">
              {yearlyData.map(y => (
                <div className="lv-report-card" key={y.id}>
                  <div className="lv-report-period">{y.period}</div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Total Leaves</span><span className="lv-report-stat-val">{y.total}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Total Days</span><span className="lv-report-stat-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>{y.totalDays}d</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Approved</span><span className="lv-report-stat-val" style={{ color: '#059669' }}>{y.approved}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Pending</span><span className="lv-report-stat-val" style={{ color: '#d97706' }}>{y.pending}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Rejected</span><span className="lv-report-stat-val" style={{ color: 'var(--danger)' }}>{y.rejected}</span></div>
                  <div className="lv-report-stat"><span className="lv-report-stat-label">Approved Days</span><span className="lv-report-stat-val">{y.days}d</span></div>
                </div>
              ))}
            </div>
            <Table
              columns={[...reportCols, { key: 'types', label: 'Leave Types Used' }]}
              data={yearlyData}
              emptyText="No yearly data."
            />
          </>
        )
      )}
    </div>
  );
}
