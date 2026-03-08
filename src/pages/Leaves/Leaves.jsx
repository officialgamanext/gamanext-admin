import { useState, useEffect, useCallback } from 'react';
import {
  collectionGroup, getDocs, doc, updateDoc, deleteDoc, query
} from 'firebase/firestore';
import { db } from '../../firebase';
import Table from '../../components/Table/Table';
import '../../components/UI/UI.css';
import '../../components/Modal/Modal.css';
import './Leaves.css';

/* ─── Constants ───────────────────────────────────────── */
const LEAVE_TYPES = [
  'Sick Leave', 'Casual Leave', 'Annual Leave',
  'Personal Leave', 'Maternity Leave', 'Paternity Leave', 'Compensatory Leave',
];

const MONTHS = [
  { v: '', l: 'All Months' },
  { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
  { v: '04', l: 'April' },   { v: '05', l: 'May' },      { v: '06', l: 'June' },
  { v: '07', l: 'July' },    { v: '08', l: 'August' },   { v: '09', l: 'September' },
  { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' },
];

const AVATAR_COLORS = ['avatar-purple','avatar-green','avatar-orange','avatar-pink','avatar-blue','avatar-teal'];
const getInitials  = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const getColor     = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const daysBetween = (from, to) => {
  if (!from || !to) return 1;
  const ms = new Date(to) - new Date(from);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const StatusBadge = ({ status }) => {
  const map = { Approved: 'success', Rejected: 'danger', Pending: 'warning' };
  return (
    <span className={`badge badge-${map[status] || 'neutral'}`}>
      <span className="badge-dot" />{status}
    </span>
  );
};

/* ─── Edit Modal ──────────────────────────────────────── */
function EditLeaveModal({ leave, onClose, onSaved }) {
  const [form, setForm] = useState({ ...leave });
  const [saving, setSaving] = useState(false);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.fromDate || !form.toDate) return;
    setSaving(true);
    try {
      const days = daysBetween(form.fromDate, form.toDate);
      // path: employees/{empId}/leaves/{leaveId}
      const ref = doc(db, 'employees', leave._empId, 'leaves', leave.id);
      await updateDoc(ref, { ...form, days, updatedAt: new Date().toISOString() });
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: 540, animation: 'slideUp 0.22s ease', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>✏️ Edit Leave — {leave.employeeName}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div className="lv-edit-grid">
            <div className="lv-edit-group">
              <label className="lv-edit-label">Leave Type</label>
              <select className="lv-edit-select" value={form.type || ''} onChange={e => sf('type', e.target.value)}>
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="lv-edit-group">
              <label className="lv-edit-label">Status</label>
              <select className="lv-edit-select" value={form.status || 'Pending'} onChange={e => sf('status', e.target.value)}>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
            <div className="lv-edit-group">
              <label className="lv-edit-label">From Date *</label>
              <input className="lv-edit-input" type="date" value={form.fromDate || ''} onChange={e => sf('fromDate', e.target.value)} />
            </div>
            <div className="lv-edit-group">
              <label className="lv-edit-label">To Date *</label>
              <input className="lv-edit-input" type="date" value={form.toDate || ''} onChange={e => sf('toDate', e.target.value)} />
            </div>
            {form.fromDate && form.toDate && (
              <div className="lv-edit-group span-2">
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: '#f3f4f6', borderRadius: 6, padding: '6px 10px', fontWeight: 600 }}>
                  📅 Duration: {daysBetween(form.fromDate, form.toDate)} day{daysBetween(form.fromDate, form.toDate) > 1 ? 's' : ''}
                </div>
              </div>
            )}
            <div className="lv-edit-group span-2">
              <label className="lv-edit-label">Reason</label>
              <textarea className="lv-edit-textarea" placeholder="Brief reason..." value={form.reason || ''} onChange={e => sf('reason', e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
function DeleteConfirm({ leave, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="lv-del-box">
        <div className="lv-del-top">
          <div className="lv-del-emoji">🗑️</div>
          <div className="lv-del-title">Delete Leave Record</div>
          <p className="lv-del-sub">
            Delete the {leave.type} request for <strong>{leave.employeeName}</strong>?
            <br />This action cannot be undone.
          </p>
        </div>
        <div className="lv-del-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="btn-spinner" /> Deleting…</> : '🗑 Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Leaves Page ────────────────────────────────── */
export default function Leaves() {
  const [leaves, setLeaves]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  /* filters */
  const [statusTab, setStatusTab]   = useState('All');
  const [searchEmp, setSearchEmp]   = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear]   = useState('');

  /* modals */
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  /* ── Fetch all leaves via collectionGroup (no orderBy = no index needed) ── */
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      // Simple collectionGroup query — no orderBy to avoid requiring a Firestore index
      const q    = query(collectionGroup(db, 'leaves'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const empId = d.ref.parent.parent?.id || ''; // employees/{empId}/leaves/{id}
        return { id: d.id, _empId: empId, ...d.data() };
      });
      // Sort client-side: newest fromDate first
      data.sort((a, b) => (b.fromDate || '').localeCompare(a.fromDate || ''));
      setLeaves(data);
    } catch (e) {
      console.error('Fetch leaves error:', e);
      setFetchError(e.message || 'Failed to load leaves. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  /* ── Status update ── */
  const updateStatus = async (leave, status) => {
    await updateDoc(doc(db, 'employees', leave._empId, 'leaves', leave.id), { status });
    setLeaves(prev => prev.map(l => l.id === leave.id && l._empId === leave._empId ? { ...l, status } : l));
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'employees', deleteTarget._empId, 'leaves', deleteTarget.id));
      setLeaves(prev => prev.filter(l => !(l.id === deleteTarget.id && l._empId === deleteTarget._empId)));
    } catch (e) { console.error(e); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  /* ── Computed years from data ── */
  const availableYears = [...new Set(leaves.map(l => l.fromDate?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);

  /* ── Filter ── */
  const filtered = leaves.filter(l => {
    const matchStatus = statusTab === 'All' || l.status === statusTab;
    const matchEmp    = !searchEmp.trim() ||
      (l.employeeName || '').toLowerCase().includes(searchEmp.toLowerCase());
    const matchMonth  = !filterMonth || l.fromDate?.slice(5, 7) === filterMonth;
    const matchYear   = !filterYear  || l.fromDate?.slice(0, 4) === filterYear;
    return matchStatus && matchEmp && matchMonth && matchYear;
  });

  /* ── Counts ── */
  const counts = {
    All:      leaves.length,
    Pending:  leaves.filter(l => l.status === 'Pending').length,
    Approved: leaves.filter(l => l.status === 'Approved').length,
    Rejected: leaves.filter(l => l.status === 'Rejected').length,
  };

  /* ── Table columns ── */
  const columns = [
    {
      key: 'employeeName', label: 'Employee',
      render: (val, row) => (
        <div className="leaves-emp-cell">
          <div className={`avatar avatar-sm ${getColor(val)}`}>{getInitials(val)}</div>
          <div>
            <div className="leaves-emp-name">{val || '—'}</div>
            <div className="leaves-emp-dept">{row._empId}</div>
          </div>
        </div>
      )
    },
    { key: 'type',     label: 'Leave Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate',   label: 'To' },
    { key: 'days',     label: 'Days', render: v => `${v || 1} day${v > 1 ? 's' : ''}` },
    {
      key: 'reason', label: 'Reason',
      render: v => <span className="leaves-reason-cell">{v || '—'}</span>
    },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="leaves-actions">
          {/* Approve */}
          {row.status === 'Pending' && (
            <>
              <button className="leaves-approve-btn" title="Approve" onClick={() => updateStatus(row, 'Approved')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button className="leaves-reject-btn" title="Reject" onClick={() => updateStatus(row, 'Rejected')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </>
          )}
          {/* Edit */}
          <button className="leaves-edit-btn" title="Edit" onClick={() => setEditTarget(row)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
            </svg>
          </button>
          {/* Delete */}
          <button className="leaves-delete-btn" title="Delete" onClick={() => setDeleteTarget(row)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">Leaves</h1>
          <p className="page-subtitle">All employee leave requests across the organisation</p>
        </div>
      </div>

      {/* ── Status Cards ── */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        {['All','Pending','Approved','Rejected'].map(s => (
          <div
            key={s}
            className="stat-card"
            style={{ cursor: 'pointer', outline: statusTab === s ? '2px solid var(--primary)' : 'none' }}
            onClick={() => setStatusTab(s)}
          >
            <div className="stat-card-header"><span className="stat-card-label">{s}</span></div>
            <div className="stat-card-value">{counts[s]}</div>
          </div>
        ))}
      </div>

      {/* ── Status Tab bar ── */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {['All','Pending','Approved','Rejected'].map(t => (
          <button key={t} className={`tab-item${statusTab === t ? ' active' : ''}`} onClick={() => setStatusTab(t)}>
            {t} <span style={{ opacity: 0.7, fontSize: 11 }}>({counts[t]})</span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="leaves-filters">
        {/* Employee search */}
        <div className="leaves-filter-group">
          <label className="leaves-filter-label">Employee</label>
          <div className="toolbar-search" style={{ margin: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={searchEmp} onChange={e => setSearchEmp(e.target.value)} placeholder="Search employee…" />
          </div>
        </div>

        {/* Month filter */}
        <div className="leaves-filter-group">
          <label className="leaves-filter-label">Month</label>
          <select className="leaves-filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>

        {/* Year filter */}
        <div className="leaves-filter-group">
          <label className="leaves-filter-label">Year</label>
          <select className="leaves-filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {availableYears.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Clear filters */}
        {(searchEmp || filterMonth || filterYear || statusTab !== 'All') && (
          <div className="leaves-filter-group" style={{ justifyContent: 'flex-end' }}>
            <label className="leaves-filter-label">&nbsp;</label>
            <button className="btn btn-secondary" style={{ height: 36, alignSelf: 'flex-end' }}
              onClick={() => { setSearchEmp(''); setFilterMonth(''); setFilterYear(''); setStatusTab('All'); }}>
              ✕ Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="leaves-count-bar">
        {loading
          ? 'Loading leaves…'
          : `Showing ${filtered.length} of ${leaves.length} leave record${leaves.length !== 1 ? 's' : ''}`
        }
      </div>

      {/* ── Error banner ── */}
      {fetchError && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#b91c1c',
          display: 'flex', alignItems: 'flex-start', gap: 10
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <strong>Error loading leaves:</strong> {fetchError}
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              If this says "index required", open the browser DevTools console and click the Firestore link to create the index, or remove the orderBy (already done).
            </span>
          </div>
        </div>
      )}

      {/* ── Table (32 per page) ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>⏳</div>
          Fetching all leave records from Firestore…
        </div>
      ) : (
        <Table columns={columns} data={filtered} emptyText="No leave records found for the selected filters." />
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditLeaveModal
          leave={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { fetchLeaves(); setEditTarget(null); }}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          leave={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
