import { useState } from 'react';
import Table from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import '../../components/UI/UI.css';
import '../../components/Modal/Modal.css';
import './Timesheet.css';

const AVATAR_COLORS = ['avatar-purple','avatar-green','avatar-orange','avatar-pink','avatar-blue','avatar-teal'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const REQUIRED_HOURS = 160;

const initialTimesheet = [
  { id: 1, employee: 'Rahul Sharma', empId: 'GN-001', department: 'Engineering', checkIn: '09:02', checkOut: '18:15', totalDays: 22, hoursWorked: 172, overtimeHours: 12 },
  { id: 2, employee: 'Priya Mehta', empId: 'GN-002', department: 'Marketing', checkIn: '09:30', checkOut: '18:00', totalDays: 21, hoursWorked: 155, overtimeHours: 0 },
  { id: 3, employee: 'Kiran Kumar', empId: 'GN-003', department: 'Finance', checkIn: '08:45', checkOut: '17:45', totalDays: 23, hoursWorked: 184, overtimeHours: 24 },
  { id: 4, employee: 'Anjali Singh', empId: 'GN-004', department: 'HR', checkIn: '10:00', checkOut: '19:00', totalDays: 20, hoursWorked: 160, overtimeHours: 0 },
  { id: 5, employee: 'Sanjay Rao', empId: 'GN-005', department: 'Engineering', checkIn: '09:00', checkOut: '18:00', totalDays: 22, hoursWorked: 168, overtimeHours: 8 },
  { id: 6, employee: 'Divya Thomas', empId: 'GN-006', department: 'Design', checkIn: '09:15', checkOut: '18:30', totalDays: 21, hoursWorked: 163, overtimeHours: 3 },
  { id: 7, employee: 'Arjun Reddy', empId: 'GN-007', department: 'Sales', checkIn: '09:00', checkOut: '17:30', totalDays: 18, hoursWorked: 132, overtimeHours: 0 },
  { id: 8, employee: 'Nisha Patel', empId: 'GN-008', department: 'Operations', checkIn: '08:30', checkOut: '17:00', totalDays: 10, hoursWorked: 75, overtimeHours: 0 },
  { id: 9, employee: 'Vikram Joshi', empId: 'GN-009', department: 'Engineering', checkIn: '09:05', checkOut: '18:05', totalDays: 22, hoursWorked: 170, overtimeHours: 10 },
  { id: 10, employee: 'Meera Nair', empId: 'GN-010', department: 'Marketing', checkIn: '09:00', checkOut: '18:45', totalDays: 22, hoursWorked: 178, overtimeHours: 18 },
];

const CURRENT_YEAR = 2026;
const getInitials = name => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const getColor = id => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];

const emptyForm = { employee: '', empId: '', department: '', checkIn: '', checkOut: '', totalDays: '', hoursWorked: '', overtimeHours: 0 };

export default function Timesheet() {
  const [records, setRecords] = useState(initialTimesheet);
  const [month, setMonth] = useState(2); // March (0-indexed)
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = records.filter(r =>
    r.employee.toLowerCase().includes(search.toLowerCase()) ||
    r.empId.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditRow(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = row => { setEditRow(row); setForm({ ...row }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditRow(null); };

  const handleSave = () => {
    if (!form.employee) return;
    if (editRow) {
      setRecords(prev => prev.map(r => r.id === editRow.id ? { ...form, id: editRow.id } : r));
    } else {
      setRecords(prev => [...prev, { ...form, id: Date.now() }]);
    }
    closeModal();
  };

  const totalHours = filtered.reduce((s, r) => s + (r.hoursWorked || 0), 0);
  const totalOT = filtered.reduce((s, r) => s + (r.overtimeHours || 0), 0);
  const avgHours = filtered.length ? Math.round(totalHours / filtered.length) : 0;

  const columns = [
    {
      key: 'employee', label: 'Employee',
      render: (val, row) => (
        <div className="timesheet-emp-cell">
          <div className={`avatar avatar-sm ${getColor(row.id)}`}>{getInitials(val)}</div>
          <div>
            <div className="timesheet-emp-name">{val}</div>
            <div className="timesheet-emp-id">{row.empId} · {row.department}</div>
          </div>
        </div>
      )
    },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'totalDays', label: 'Days Present', render: v => `${v} days` },
    {
      key: 'hoursWorked', label: 'Hours Worked',
      render: (val) => {
        const pct = Math.min(100, Math.round((val / REQUIRED_HOURS) * 100));
        const color = val >= REQUIRED_HOURS ? '#10b981' : val >= 140 ? '#f59e0b' : '#ef4444';
        return (
          <div className="timesheet-progress">
            <span className="timesheet-hours">{val}h</span>
            <div className="timesheet-progress-bar-bg">
              <div className="timesheet-progress-bar" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="timesheet-progress-text">{pct}% of {REQUIRED_HOURS}h</span>
          </div>
        );
      }
    },
    {
      key: 'overtimeHours', label: 'Overtime',
      render: (val) => val > 0
        ? <span className="timesheet-overtime">+{val}h OT</span>
        : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
    },
    {
      key: 'status', label: 'Status',
      render: (_, row) => {
        if (row.hoursWorked >= REQUIRED_HOURS) return <span className="badge badge-success"><span className="badge-dot" />On Track</span>;
        if (row.hoursWorked >= 140) return <span className="badge badge-warning"><span className="badge-dot" />Below Target</span>;
        return <span className="badge badge-danger"><span className="badge-dot" />Under Hours</span>;
      }
    },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="employees-actions">
          <button className="action-icon-btn" title="Edit" onClick={() => openEdit(row)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">Timesheet</h1>
          <p className="page-subtitle">Track working hours for {MONTHS[month]} {CURRENT_YEAR}</p>
        </div>
        <div className="page-toolbar">
          <div className="timesheet-month-nav">
            <button className="timesheet-nav-btn" onClick={() => setMonth(m => Math.max(0, m - 1))}>‹</button>
            <span className="timesheet-month-display">{MONTHS[month]} {CURRENT_YEAR}</span>
            <button className="timesheet-nav-btn" onClick={() => setMonth(m => Math.min(11, m + 1))}>›</button>
          </div>
          <div className="toolbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." />
          </div>
          <button className="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Record
          </button>
        </div>
      </div>

      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Total Employees</span><div className="stat-card-icon" style={{ background: '#e0e7ff' }}>👥</div></div>
          <div className="stat-card-value">{filtered.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Total Hours</span><div className="stat-card-icon" style={{ background: '#d1fae5' }}>⏱️</div></div>
          <div className="stat-card-value">{totalHours}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Avg Hours / Person</span><div className="stat-card-icon" style={{ background: '#fef3c7' }}>📊</div></div>
          <div className="stat-card-value">{avgHours}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><span className="stat-card-label">Total Overtime</span><div className="stat-card-icon" style={{ background: '#ede9fe' }}>🚀</div></div>
          <div className="stat-card-value">{totalOT}h</div>
        </div>
      </div>

      <Table columns={columns} data={filtered} emptyText="No timesheet records found." />

      {showModal && (
        <Modal
          title={editRow ? 'Edit Timesheet Record' : 'Add Timesheet Record'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editRow ? 'Save Changes' : 'Add Record'}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee Name *</label>
              <input className="form-input" placeholder="Full name" value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-input" placeholder="e.g. GN-001" value={form.empId} onChange={e => setForm(f => ({ ...f, empId: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" placeholder="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Check In Time</label>
              <input className="form-input" type="time" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Check Out Time</label>
              <input className="form-input" type="time" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Days Present</label>
              <input className="form-input" type="number" min="0" max="31" placeholder="e.g. 22" value={form.totalDays} onChange={e => setForm(f => ({ ...f, totalDays: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Hours Worked</label>
              <input className="form-input" type="number" min="0" placeholder="e.g. 168" value={form.hoursWorked} onChange={e => setForm(f => ({ ...f, hoursWorked: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Overtime Hours</label>
              <input className="form-input" type="number" min="0" placeholder="e.g. 8" value={form.overtimeHours} onChange={e => setForm(f => ({ ...f, overtimeHours: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
