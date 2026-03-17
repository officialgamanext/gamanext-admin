import { useState, useEffect, useCallback } from 'react';
import { collectionGroup, getDocs, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import Table from '../../components/Table/Table';
import '../../components/UI/UI.css';
import './Timesheet.css';

/* ─── Constants ─────────────────────────────────────── */
const MONTHS_LIST = [
  { v: '', l: 'All Months' },
  { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
  { v: '04', l: 'April' },   { v: '05', l: 'May' },      { v: '06', l: 'June' },
  { v: '07', l: 'July' },    { v: '08', l: 'August' },   { v: '09', l: 'September' },
  { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' },
];

const AVATAR_COLORS = ['avatar-purple','avatar-green','avatar-orange','avatar-pink','avatar-blue','avatar-teal'];
const getInitials   = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const getAvatarColor = (empId = '') => AVATAR_COLORS[empId.charCodeAt(0) % AVATAR_COLORS.length];

const groupBy = (arr, fn) =>
  arr.reduce((acc, item) => { const k = fn(item); (acc[k] = acc[k] || []).push(item); return acc; }, {});

const fmtMonth = (ym) => {
  if (!ym || !ym.includes('-')) return ym;
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

/* ─── Main Timesheet Page ─────────────────────────── */
export default function Timesheet() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  /* filters */
  const [sub, setSub]               = useState('daily');
  const [searchEmp, setSearchEmp]   = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear]   = useState('');

  /* Edit state */
  const [showEdit, setShowEdit] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', hoursWorked: '', notes: '' });
  const [saving, setSaving] = useState(false);

  /* ── Fetch all timesheets via collectionGroup (no orderBy = no index needed) ── */
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const q    = query(collectionGroup(db, 'timesheets'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const empId = d.ref.parent.parent?.id || '';
        return { id: d.id, _empId: empId, ...d.data() };
      });
      // Sort newest date first client-side
      data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRecords(data);
    } catch (e) {
      console.error('Fetch timesheets error:', e);
      setFetchError(e.message || 'Failed to load timesheets. Check console.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete this entry for ${row.date}?`)) return;
    try {
      await deleteDoc(doc(db, 'employees', row._empId, 'timesheets', row.id));
      toast.success('Entry deleted successfully');
      fetchRecords();
    } catch (e) {
      console.error('Delete error:', e);
      toast.error('Failed to delete entry');
    }
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setEditForm({
      checkIn: row.checkIn || '',
      checkOut: row.checkOut || '',
      hoursWorked: row.hoursWorked || '',
      notes: row.notes || ''
    });
    setShowEdit(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, 'employees', editingRow._empId, 'timesheets', editingRow.id);
      await updateDoc(docRef, {
        ...editForm,
        hoursWorked: Number(editForm.hoursWorked)
      });
      setShowEdit(false);
      toast.success('Entry updated successfully');
      fetchRecords();
    } catch (e) {
      console.error('Update error:', e);
      toast.error('Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  /* ── Computed years from data ── */
  const availableYears = [...new Set(records.map(r => r.date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);

  /* ── Unique employees for filter dropdown ── */
  const employeeNames = [...new Set(records.map(r => r._empId).filter(Boolean))].sort();

  /* ── Filter ── */
  const filtered = records.filter(r => {
    const matchEmp   = !searchEmp    || r._empId === searchEmp;
    const matchMonth = !filterMonth  || r.date?.slice(5, 7) === filterMonth;
    const matchYear  = !filterYear   || r.date?.slice(0, 4) === filterYear;
    return matchEmp && matchMonth && matchYear;
  });

  /* ── Summary stats ── */
  const totalHours   = filtered.reduce((s, r) => s + Number(r.hoursWorked || 0), 0).toFixed(1);
  const totalEntries = filtered.length;
  const avgHours     = totalEntries ? (totalHours / totalEntries).toFixed(1) : 0;
  const uniqueEmps   = new Set(filtered.map(r => r._empId)).size;

  /* ── Monthly report data ── */
  const monthlyGroups = groupBy(filtered, r => r.date?.slice(0, 7) || 'Unknown');
  const monthlyData   = Object.entries(monthlyGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([ym, rows]) => ({
      id:        ym,
      period:    ym === 'Unknown' ? 'Unknown' : fmtMonth(ym),
      employees: new Set(rows.map(r => r._empId)).size,
      entries:   rows.length,
      hours:     parseFloat(rows.reduce((s, r) => s + Number(r.hoursWorked || 0), 0).toFixed(2)),
      avgIn:     (() => { const times = rows.map(r=>r.checkIn).filter(Boolean); return times.length ? times[Math.floor(times.length/2)] : '—'; })(),
      avgOut:    (() => { const times = rows.map(r=>r.checkOut).filter(Boolean); return times.length ? times[Math.floor(times.length/2)] : '—'; })(),
    }));

  /* ── Yearly report data ── */
  const yearlyGroups = groupBy(filtered, r => r.date?.slice(0, 4) || 'Unknown');
  const yearlyData   = Object.entries(yearlyGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([yr, rows]) => ({
      id:        yr,
      period:    yr,
      employees: new Set(rows.map(r => r._empId)).size,
      entries:   rows.length,
      hours:     parseFloat(rows.reduce((s, r) => s + Number(r.hoursWorked || 0), 0).toFixed(2)),
      months:    new Set(rows.map(r => r.date?.slice(0, 7))).size,
    }));

  /* ── Table columns — daily list ── */
  const dailyCols = [
    {
      key: '_empId', label: 'Employee',
      render: (val) => (
        <div className="timesheet-emp-cell">
          <div className={`avatar avatar-sm ${getAvatarColor(val)}`}>{getInitials(val)}</div>
          <div>
            <div className="timesheet-emp-name">{val}</div>
            <div className="timesheet-emp-id">Employee ID</div>
          </div>
        </div>
      )
    },
    { key: 'date',     label: 'Date' },
    { key: 'checkIn',  label: 'Check In',  render: v => v || '—' },
    { key: 'checkOut', label: 'Check Out', render: v => v || '—' },
    {
      key: 'hoursWorked', label: 'Hours Worked',
      render: (v) => {
        const hrs = Number(v || 0);
        const pct = Math.min(100, Math.round((hrs / 9) * 100));
        const color = hrs >= 9 ? '#10b981' : hrs >= 7 ? '#f59e0b' : '#ef4444';
        return (
          <div className="timesheet-progress">
            <span className="timesheet-hours">{hrs}h</span>
            <div className="timesheet-progress-bar-bg">
              <div className="timesheet-progress-bar" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="timesheet-progress-text">{pct}% of 9h</span>
          </div>
        );
      }
    },
    { key: 'notes', label: 'Notes', render: v => (
      <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: v ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {v || '—'}
      </span>
    )},
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ts-action-btn edit" onClick={() => handleEdit(row)} title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="ts-action-btn delete" onClick={() => handleDelete(row)} title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      )
    },
  ];

  const monthlyCols = [
    { key: 'period',    label: 'Month' },
    { key: 'employees', label: 'Employees' },
    { key: 'entries',   label: 'Total Entries' },
    { key: 'hours',     label: 'Total Hours',    render: v => `${v}h` },
    { key: 'avgIn',     label: 'Typical In' },
    { key: 'avgOut',    label: 'Typical Out' },
  ];

  const yearlyCols = [
    { key: 'period',    label: 'Year' },
    { key: 'employees', label: 'Employees' },
    { key: 'entries',   label: 'Total Entries' },
    { key: 'hours',     label: 'Total Hours', render: v => `${v}h` },
    { key: 'months',    label: 'Active Months' },
  ];

  const hasFilter = searchEmp || filterMonth || filterYear;

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">Timesheet</h1>
          <p className="page-subtitle">All employee attendance records across the organisation</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Employees</span><div className="stat-card-icon" style={{ background: '#e0e7ff' }}>👥</div></div>
          <div className="stat-card-value">{uniqueEmps}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Total Entries</span><div className="stat-card-icon" style={{ background: '#d1fae5' }}>📋</div></div>
          <div className="stat-card-value">{totalEntries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Total Hours</span><div className="stat-card-icon" style={{ background: '#fef3c7' }}>⏱️</div></div>
          <div className="stat-card-value">{totalHours}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Avg Hours / Entry</span><div className="stat-card-icon" style={{ background: '#ede9fe' }}>📊</div></div>
          <div className="stat-card-value">{avgHours}h</div>
        </div>
      </div>

      {/* ── Sub-tabs + Filters ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div className="ts-page-subtabs">
          {[['daily','📅 Daily List'],['monthly','📆 Monthly Report'],['yearly','📊 Yearly Report']].map(([k, l]) => (
            <button key={k} className={`ts-page-subtab${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div className="ts-page-filters">
        {/* Employee filter */}
        <div className="ts-page-filter-group">
          <label className="ts-page-filter-label">Employee</label>
          <div className="toolbar-search" style={{ margin: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={searchEmp === '' ? '' : searchEmp}
              onChange={e => setSearchEmp(e.target.value)}
              placeholder="Search by Emp ID…"
            />
          </div>
        </div>

        {/* Employee dropdown (from available IDs) */}
        {employeeNames.length > 0 && (
          <div className="ts-page-filter-group">
            <label className="ts-page-filter-label">Select Employee</label>
            <select className="ts-page-filter-select" value={searchEmp} onChange={e => setSearchEmp(e.target.value)}>
              <option value="">All Employees</option>
              {employeeNames.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
        )}

        {/* Month */}
        <div className="ts-page-filter-group">
          <label className="ts-page-filter-label">Month</label>
          <select className="ts-page-filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {MONTHS_LIST.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>

        {/* Year */}
        <div className="ts-page-filter-group">
          <label className="ts-page-filter-label">Year</label>
          <select className="ts-page-filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {availableYears.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Clear */}
        {hasFilter && (
          <div className="ts-page-filter-group">
            <label className="ts-page-filter-label">&nbsp;</label>
            <button className="btn btn-secondary" style={{ height: 36 }}
              onClick={() => { setSearchEmp(''); setFilterMonth(''); setFilterYear(''); }}>
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Count bar ── */}
      <div className="ts-count-bar">
        {loading ? 'Loading timesheet records…'
          : `Showing ${filtered.length} of ${records.length} record${records.length !== 1 ? 's' : ''}`}
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#b91c1c', display: 'flex', gap: 10 }}>
          <span>⚠️</span>
          <span><strong>Error:</strong> {fetchError}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>⏳</div>
          Fetching all timesheet records…
        </div>
      ) : (
        <>
          {/* Daily List */}
          {sub === 'daily' && (
            <Table columns={dailyCols} data={filtered} emptyText="No timesheet records found for the selected filters." />
          )}

          {/* Monthly Report */}
          {sub === 'monthly' && (
            monthlyData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No timesheet data to report.</p>
            ) : (
              <>
                <div className="ts-page-report-grid">
                  {monthlyData.map(m => (
                    <div className="ts-page-report-card" key={m.id}>
                      <div className="ts-page-report-period">{m.period}</div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Employees</span><span className="ts-page-report-stat-val">{m.employees}</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Entries</span><span className="ts-page-report-stat-val">{m.entries}</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Total Hours</span><span className="ts-page-report-stat-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>{m.hours}h</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Typical In</span><span className="ts-page-report-stat-val">{m.avgIn}</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Typical Out</span><span className="ts-page-report-stat-val">{m.avgOut}</span></div>
                    </div>
                  ))}
                </div>
                <Table columns={monthlyCols} data={monthlyData} emptyText="No monthly data." />
              </>
            )
          )}

          {/* Yearly Report */}
          {sub === 'yearly' && (
            yearlyData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No timesheet data to report.</p>
            ) : (
              <>
                <div className="ts-page-report-grid">
                  {yearlyData.map(y => (
                    <div className="ts-page-report-card" key={y.id}>
                      <div className="ts-page-report-period">{y.period}</div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Employees</span><span className="ts-page-report-stat-val">{y.employees}</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Entries</span><span className="ts-page-report-stat-val">{y.entries}</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Total Hours</span><span className="ts-page-report-stat-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>{y.hours}h</span></div>
                      <div className="ts-page-report-stat"><span className="ts-page-report-stat-label">Active Months</span><span className="ts-page-report-stat-val">{y.months}</span></div>
                    </div>
                  ))}
                </div>
                <Table columns={yearlyCols} data={yearlyData} emptyText="No yearly data." />
              </>
            )
          )}
        </>
      )}

      {/* ── Edit Modal ── */}
      {showEdit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Edit Entry - {editingRow.date}</h2>
              <button className="close-btn" onClick={() => setShowEdit(false)}>×</button>
            </div>
            <form onSubmit={handleUpdate} className="modal-form">
              <div className="form-group">
                <label>Check In Time</label>
                <input type="time" value={editForm.checkIn} onChange={e => setEditForm({...editForm, checkIn: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Check Out Time</label>
                <input type="time" value={editForm.checkOut} onChange={e => setEditForm({...editForm, checkOut: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Hours Worked</label>
                <input type="number" step="0.1" required value={editForm.hoursWorked} onChange={e => setEditForm({...editForm, hoursWorked: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={3} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #e2e8f0' }} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
