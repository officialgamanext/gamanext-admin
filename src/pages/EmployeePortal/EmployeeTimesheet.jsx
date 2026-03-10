import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, query
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import '../../components/UI/UI.css';
import '../../components/Modal/Modal.css';
import './EmployeeTimesheet.css';

/* ─── Helpers ─────────────────────────────────────── */
const todayStr = () => new Date().toISOString().split('T')[0];

const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  return Math.max(0, parseFloat((diff / 60).toFixed(2)));
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── Add Entry Modal ────────────────────────────── */
function AddTimesheetModal({ onClose, onSaved, employeeData, existingDates }) {
  const [form, setForm] = useState({
    date:      todayStr(),
    checkIn:   '09:00',
    checkOut:  '18:00',
    notes:     '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const hoursWorked = calcHours(form.checkIn, form.checkOut);
  const alreadyLogged = existingDates.includes(form.date);

  const handleSave = async () => {
    setError('');
    if (!form.date)     return setError('Please select a date.');
    if (!form.checkIn)  return setError('Please enter Check In time.');
    if (!form.checkOut) return setError('Please enter Check Out time.');
    if (form.checkOut <= form.checkIn) return setError('Check Out must be after Check In.');
    if (alreadyLogged) return setError(`You already have a timesheet entry for ${fmtDate(form.date)}.`);

    setSaving(true);
    try {
      const hrs = calcHours(form.checkIn, form.checkOut);
      const ref = collection(db, 'employees', employeeData.id, 'timesheets');
      await addDoc(ref, {
        ...form,
        hoursWorked: hrs,
        employeeId:   employeeData.employeeId || employeeData.id,
        employeeName: employeeData.name || '',
        department:   employeeData.department || '',
        createdAt:    new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pct   = Math.min(100, Math.round((hoursWorked / 9) * 100));
  const color = hoursWorked >= 9 ? '#10b981' : hoursWorked >= 7 ? '#f59e0b' : '#ef4444';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ets-modal-box">
        <div className="ets-modal-header">
          <span className="ets-modal-title">⏱️ Add Timesheet Entry</span>
          <button className="ets-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ets-modal-body">
          <div className="ets-form-grid">
            <div className="ets-form-group span-2">
              <label className="ets-form-label">Date *</label>
              <input className="ets-form-input" type="date" value={form.date}
                max={todayStr()}
                onChange={e => sf('date', e.target.value)} />
              {alreadyLogged && (
                <div className="ets-warn">⚠️ You already have an entry for this date. Choose a different date.</div>
              )}
            </div>
            <div className="ets-form-group">
              <label className="ets-form-label">Check In Time *</label>
              <input className="ets-form-input" type="time" value={form.checkIn}
                onChange={e => sf('checkIn', e.target.value)} />
            </div>
            <div className="ets-form-group">
              <label className="ets-form-label">Check Out Time *</label>
              <input className="ets-form-input" type="time" value={form.checkOut}
                onChange={e => sf('checkOut', e.target.value)} />
            </div>
            <div className="ets-form-group span-2">
              <label className="ets-form-label">Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <textarea className="ets-form-textarea" rows={3} placeholder="What did you work on today?"
                value={form.notes} onChange={e => sf('notes', e.target.value)} />
            </div>
          </div>

          {/* Hours preview */}
          <div className="ets-preview">
            <div className="ets-preview-row">
              <span>Hours worked</span>
              <strong style={{ color }}>{hoursWorked}h</strong>
            </div>
            <div className="ets-progress-bg">
              <div className="ets-progress-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="ets-preview-note">
              {pct >= 100 ? '✅ Full day completed' : pct >= 78 ? '🟡 Short shift' : '🔴 Under minimum hours'}
              {' '}— Target: 9 hours/day
            </div>
          </div>

          {error && <div className="ets-error">{error}</div>}
        </div>
        <div className="ets-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || alreadyLogged}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : '✅ Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Employee Timesheet Page ───────────────── */
export default function EmployeeTimesheet() {
  const { employeeData } = useAuth();
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [filterMonth, setFilterMonth] = useState('');

  const empId = employeeData?.id || employeeData?.employeeId;

  const fetchRecords = useCallback(async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const q    = query(collection(db, 'employees', empId, 'timesheets'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRecords(data);
    } catch (e) {
      console.error('Fetch timesheets error:', e);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  /* ── Stats ── */
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = records.filter(r => r.date?.startsWith(currentMonth));
  const totalHoursMonth  = thisMonthRecords.reduce((s, r) => s + Number(r.hoursWorked || 0), 0);
  const workingDays      = thisMonthRecords.length;
  const avgHours         = workingDays ? (totalHoursMonth / workingDays).toFixed(1) : '0';

  /* ── Filter ── */
  const filtered = filterMonth
    ? records.filter(r => r.date?.slice(5, 7) === filterMonth)
    : records;

  const existingDates = records.map(r => r.date);

  /* ── Available months ── */
  const months = [...new Set(records.map(r => r.date?.slice(5, 7)).filter(Boolean))].sort();

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">My Timesheet</h1>
          <p className="page-subtitle">Log your daily work hours</p>
        </div>
        <div className="page-toolbar">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Today's Entry
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ets-stat-grid">
        <div className="ets-stat-card">
          <div className="ets-stat-icon" style={{ background: '#e0e7ff' }}>📅</div>
          <div className="ets-stat-val">{workingDays}</div>
          <div className="ets-stat-label">Days Logged<br /><span>This Month</span></div>
        </div>
        <div className="ets-stat-card">
          <div className="ets-stat-icon" style={{ background: '#d1fae5' }}>⏱️</div>
          <div className="ets-stat-val">{totalHoursMonth.toFixed(1)}h</div>
          <div className="ets-stat-label">Total Hours<br /><span>This Month</span></div>
        </div>
        <div className="ets-stat-card">
          <div className="ets-stat-icon" style={{ background: '#fef3c7' }}>📊</div>
          <div className="ets-stat-val">{avgHours}h</div>
          <div className="ets-stat-label">Avg Hours/Day<br /><span>This Month</span></div>
        </div>
        <div className="ets-stat-card">
          <div className="ets-stat-icon" style={{ background: '#ede9fe' }}>🗂️</div>
          <div className="ets-stat-val">{records.length}</div>
          <div className="ets-stat-label">Total Entries<br /><span>All Time</span></div>
        </div>
      </div>

      {/* Month filter */}
      {months.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button className={`tab-item${filterMonth === '' ? ' active' : ''}`} onClick={() => setFilterMonth('')}>All</button>
          {months.map(m => (
            <button key={m} className={`tab-item${filterMonth === m ? ' active' : ''}`} onClick={() => setFilterMonth(m)}>
              {MONTH_NAMES[parseInt(m) - 1]}
            </button>
          ))}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>⏳</div>
          Loading your timesheet…
        </div>
      ) : filtered.length === 0 ? (
        <div className="ets-empty">
          <div style={{ fontSize: 40 }}>📋</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No entries yet. Add today's timesheet!</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Entry</button>
        </div>
      ) : (
        <div className="ets-list">
          {filtered.map(r => {
            const hrs   = Number(r.hoursWorked || 0);
            const pct   = Math.min(100, Math.round((hrs / 9) * 100));
            const color = hrs >= 9 ? '#10b981' : hrs >= 7 ? '#f59e0b' : '#ef4444';
            return (
              <div key={r.id} className="ets-card">
                <div className="ets-card-date">
                  <div className="ets-card-day">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                  <div className="ets-card-datenum">{fmtDate(r.date)}</div>
                </div>
                <div className="ets-card-times">
                  <span className="ets-time-badge in">🟢 {r.checkIn || '—'}</span>
                  <span className="ets-time-sep">→</span>
                  <span className="ets-time-badge out">🔴 {r.checkOut || '—'}</span>
                </div>
                <div className="ets-card-progress">
                  <span style={{ fontSize: 15, fontWeight: 800, color }}>{hrs}h</span>
                  <div className="ets-mini-bar-bg">
                    <div className="ets-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
                {r.notes && <div className="ets-card-notes">{r.notes}</div>}
                <div className="ets-card-status">
                  {hrs >= 9
                    ? <span className="badge badge-success"><span className="badge-dot" />On Track</span>
                    : hrs >= 7
                    ? <span className="badge badge-warning"><span className="badge-dot" />Short</span>
                    : <span className="badge badge-danger"><span className="badge-dot" />Under Hours</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddTimesheetModal
          onClose={() => setShowModal(false)}
          onSaved={fetchRecords}
          employeeData={employeeData}
          existingDates={existingDates}
        />
      )}
    </div>
  );
}
