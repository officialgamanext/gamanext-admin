import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, query, orderBy, where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import '../../components/UI/UI.css';
import '../../components/Modal/Modal.css';
import './EmployeeLeaves.css';

/* ─── Constants ───────────────────────────────────────── */
const LEAVE_TYPES = [
  'Sick Leave', 'Casual Leave', 'Annual Leave',
  'Personal Leave', 'Maternity Leave', 'Paternity Leave', 'Compensatory Leave',
];

const MONTHLY_LIMIT = 2; // free leaves per month

const daysBetween = (from, to) => {
  if (!from || !to) return 1;
  const ms = new Date(to) - new Date(from);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── Status Badge ─────────────────────────────────────── */
function StatusBadge({ status }) {
  const colors = { Approved: 'badge-success', Rejected: 'badge-danger', Pending: 'badge-warning' };
  return <span className={`badge ${colors[status] || 'badge-neutral'}`}><span className="badge-dot" />{status}</span>;
}

/* ─── LOP Badge ────────────────────────────────────────── */
function LopBadge({ days }) {
  if (!days || days <= 0) return null;
  return (
    <span className="elv-lop-badge">
      ⚠️ LOP: {days} day{days > 1 ? 's' : ''}
    </span>
  );
}

/* ─── Apply Leave Modal ────────────────────────────────── */
function ApplyLeaveModal({ onClose, onSaved, employeeData, currentMonthUsed }) {
  const [form, setForm] = useState({
    type: 'Sick Leave',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const leaveDays   = form.fromDate && form.toDate ? daysBetween(form.fromDate, form.toDate) : 0;
  const lopDays     = Math.max(0, (currentMonthUsed + leaveDays) - MONTHLY_LIMIT);
  const freeDays    = leaveDays - lopDays;
  const leaveMonth  = form.fromDate ? form.fromDate.slice(0, 7) : '';
  const currentMonthLabel = form.fromDate
    ? MONTH_NAMES[parseInt(form.fromDate.slice(5, 7)) - 1] + ' ' + form.fromDate.slice(0, 4)
    : '';

  const handleSave = async () => {
    setError('');
    if (!form.fromDate) return setError('Please select a From date.');
    if (!form.toDate)   return setError('Please select a To date.');
    if (form.toDate < form.fromDate) return setError('To date cannot be before From date.');
    if (!form.reason.trim()) return setError('Please provide a reason.');

    setSaving(true);
    try {
      const days = daysBetween(form.fromDate, form.toDate);
      const lop  = Math.max(0, (currentMonthUsed + days) - MONTHLY_LIMIT);
      const ref  = collection(db, 'employees', employeeData.id, 'leaves');
      await addDoc(ref, {
        ...form,
        days,
        lopDays: lop,
        status: 'Pending',
        employeeName: employeeData.name || '',
        employeeId:   employeeData.employeeId || employeeData.id,
        department:   employeeData.department || '',
        month:        leaveMonth,
        createdAt:    new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to submit leave. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="elv-modal-box">
        <div className="elv-modal-header">
          <span className="elv-modal-title">📝 Apply for Leave</span>
          <button className="elv-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="elv-modal-body">
          <div className="elv-form-grid">
            <div className="elv-form-group">
              <label className="elv-form-label">Leave Type *</label>
              <select className="elv-form-select" value={form.type} onChange={e => sf('type', e.target.value)}>
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="elv-form-group">
              <label className="elv-form-label">From Date *</label>
              <input className="elv-form-input" type="date" value={form.fromDate} onChange={e => sf('fromDate', e.target.value)} />
            </div>
            <div className="elv-form-group">
              <label className="elv-form-label">To Date *</label>
              <input className="elv-form-input" type="date" value={form.toDate} min={form.fromDate} onChange={e => sf('toDate', e.target.value)} />
            </div>
            <div className="elv-form-group span-2">
              <label className="elv-form-label">Reason *</label>
              <textarea className="elv-form-textarea" rows={3} placeholder="Brief reason for leave…"
                value={form.reason} onChange={e => sf('reason', e.target.value)} />
            </div>
          </div>

          {/* Preview */}
          {leaveDays > 0 && (
            <div className="elv-leave-preview">
              <div className="elv-preview-row">
                <span>Total Leave Days</span>
                <strong>{leaveDays} day{leaveDays > 1 ? 's' : ''}</strong>
              </div>
              <div className="elv-preview-row">
                <span>Already used this month ({currentMonthLabel})</span>
                <strong>{currentMonthUsed} / {MONTHLY_LIMIT} days</strong>
              </div>
              <div className={`elv-preview-row${lopDays > 0 ? ' lop' : ' ok'}`}>
                <span>{lopDays > 0 ? '⚠️ Loss of Pay days' : '✅ Paid leave days'}</span>
                <strong>{lopDays > 0 ? `${lopDays} day(s) LOP` : `${freeDays} day(s) paid`}</strong>
              </div>
              {lopDays > 0 && (
                <div className="elv-lop-note">
                  You have used {currentMonthUsed} paid leave{currentMonthUsed !== 1 ? 's' : ''} this month.
                  The limit is {MONTHLY_LIMIT}/month. {lopDays} day{lopDays > 1 ? 's' : ''} will be Loss of Pay.
                </div>
              )}
            </div>
          )}

          {error && <div className="elv-error">{error}</div>}
        </div>
        <div className="elv-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Submitting…</> : '📤 Submit Leave Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Employee Leaves Page ────────────────────────── */
export default function EmployeeLeaves() {
  const { employeeData } = useAuth();
  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const empId = employeeData?.id || employeeData?.employeeId;

  const fetchLeaves = useCallback(async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const q    = query(collection(db, 'employees', empId, 'leaves'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.fromDate || '').localeCompare(a.fromDate || ''));
      setLeaves(data);
    } catch (e) {
      console.error('Fetch leaves error:', e);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  /* ── Current month usage for LOP preview ── */
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-03"
  const usedThisMonth = leaves
    .filter(l => l.status !== 'Rejected' && (l.month || l.fromDate?.slice(0, 7)) === currentMonth)
    .reduce((sum, l) => sum + (Number(l.days) || 1), 0);
  const lopThisMonth = Math.max(0, usedThisMonth - MONTHLY_LIMIT);
  const remaining    = Math.max(0, MONTHLY_LIMIT - usedThisMonth);

  /* ── Stats ── */
  const counts = {
    All:      leaves.length,
    Pending:  leaves.filter(l => l.status === 'Pending').length,
    Approved: leaves.filter(l => l.status === 'Approved').length,
    Rejected: leaves.filter(l => l.status === 'Rejected').length,
  };

  const filtered = filterStatus === 'All' ? leaves : leaves.filter(l => l.status === filterStatus);

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">My Leaves</h1>
          <p className="page-subtitle">Manage your leave requests and track your balance</p>
        </div>
        <div className="page-toolbar">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Balance Cards ── */}
      <div className="elv-balance-grid">
        <div className="elv-balance-card green">
          <div className="elv-balance-icon">✅</div>
          <div className="elv-balance-val">{remaining}</div>
          <div className="elv-balance-label">Paid Leaves Left<br /><span>This Month</span></div>
        </div>
        <div className="elv-balance-card blue">
          <div className="elv-balance-icon">📋</div>
          <div className="elv-balance-val">{usedThisMonth}</div>
          <div className="elv-balance-label">Days Applied<br /><span>This Month</span></div>
        </div>
        <div className={`elv-balance-card ${lopThisMonth > 0 ? 'red' : 'grey'}`}>
          <div className="elv-balance-icon">{lopThisMonth > 0 ? '⚠️' : '🎉'}</div>
          <div className="elv-balance-val">{lopThisMonth}</div>
          <div className="elv-balance-label">Loss of Pay Days<br /><span>This Month</span></div>
        </div>
        <div className="elv-balance-card purple">
          <div className="elv-balance-icon">📊</div>
          <div className="elv-balance-val">{counts.All}</div>
          <div className="elv-balance-label">Total Requests<br /><span>All Time</span></div>
        </div>
      </div>

      {/* ── Monthly limit info ── */}
      <div className="elv-limit-bar">
        <span>📌 Monthly leave limit: <strong>{MONTHLY_LIMIT} days/month</strong>. Any additional days taken will be marked as <strong>Loss of Pay (LOP)</strong>.</span>
      </div>

      {/* ── Status tabs ── */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {['All','Pending','Approved','Rejected'].map(s => (
          <button key={s} className={`tab-item${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
            {s} <span style={{ opacity: 0.7, fontSize: 11 }}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* ── Leave Cards ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>⏳</div>
          Loading your leaves…
        </div>
      ) : filtered.length === 0 ? (
        <div className="elv-empty">
          <div className="elv-empty-icon">📭</div>
          <div className="elv-empty-text">No {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} leave records found.</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Apply for Leave</button>
        </div>
      ) : (
        <div className="elv-list">
          {filtered.map(l => (
            <div key={l.id} className="elv-card">
              <div className="elv-card-left">
                <div className="elv-card-type">{l.type || 'Leave'}</div>
                <div className="elv-card-dates">
                  {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                </div>
                <div className="elv-card-reason">{l.reason || '—'}</div>
              </div>
              <div className="elv-card-right">
                <div className="elv-card-days">{l.days || 1} day{l.days > 1 ? 's' : ''}</div>
                <StatusBadge status={l.status || 'Pending'} />
                {l.lopDays > 0 && <LopBadge days={l.lopDays} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <ApplyLeaveModal
          onClose={() => setShowModal(false)}
          onSaved={fetchLeaves}
          employeeData={employeeData}
          currentMonthUsed={usedThisMonth}
        />
      )}
    </div>
  );
}
