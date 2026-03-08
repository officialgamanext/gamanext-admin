import { useState } from 'react';
import Table from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import '../../components/UI/UI.css';
import '../../components/Modal/Modal.css';
import './Leaves.css';

const AVATAR_COLORS = ['avatar-purple','avatar-green','avatar-orange','avatar-pink','avatar-blue','avatar-teal'];
const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Personal Leave', 'Maternity Leave', 'Paternity Leave'];

const initialLeaves = [
  { id: 1, employee: 'Rahul Sharma', department: 'Engineering', type: 'Sick Leave', fromDate: '2026-03-10', toDate: '2026-03-12', days: 3, reason: 'Fever and cold', status: 'Pending' },
  { id: 2, employee: 'Priya Mehta', department: 'Marketing', type: 'Casual Leave', fromDate: '2026-03-15', toDate: '2026-03-15', days: 1, reason: 'Personal work', status: 'Approved' },
  { id: 3, employee: 'Kiran Kumar', department: 'Finance', type: 'Annual Leave', fromDate: '2026-03-20', toDate: '2026-03-25', days: 6, reason: 'Family vacation', status: 'Pending' },
  { id: 4, employee: 'Anjali Singh', department: 'HR', type: 'Personal Leave', fromDate: '2026-03-08', toDate: '2026-03-08', days: 1, reason: 'Medical appointment', status: 'Approved' },
  { id: 5, employee: 'Sanjay Rao', department: 'Engineering', type: 'Sick Leave', fromDate: '2026-03-05', toDate: '2026-03-07', days: 3, reason: 'Back pain', status: 'Rejected' },
  { id: 6, employee: 'Divya Thomas', department: 'Design', type: 'Casual Leave', fromDate: '2026-03-18', toDate: '2026-03-18', days: 1, reason: 'Friend wedding', status: 'Pending' },
  { id: 7, employee: 'Arjun Reddy', department: 'Sales', type: 'Annual Leave', fromDate: '2026-04-01', toDate: '2026-04-05', days: 5, reason: 'Summer holiday', status: 'Pending' },
  { id: 8, employee: 'Nisha Patel', department: 'Operations', type: 'Maternity Leave', fromDate: '2026-04-10', toDate: '2026-06-10', days: 60, reason: 'Maternity', status: 'Approved' },
  { id: 9, employee: 'Vikram Joshi', department: 'Engineering', type: 'Casual Leave', fromDate: '2026-03-22', toDate: '2026-03-22', days: 1, reason: 'Birthday', status: 'Pending' },
  { id: 10, employee: 'Meera Nair', department: 'Marketing', type: 'Sick Leave', fromDate: '2026-03-03', toDate: '2026-03-04', days: 2, reason: 'Migraine', status: 'Approved' },
];

const getInitials = name => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const getColor = id => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];

const emptyForm = { employee: '', department: '', type: 'Sick Leave', fromDate: '', toDate: '', days: '', reason: '' };

export default function Leaves() {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

  const filtered = leaves.filter(l => {
    const matchSearch = l.employee.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'All' || l.status === activeTab;
    return matchSearch && matchTab;
  });

  const counts = {
    All: leaves.length,
    Pending: leaves.filter(l => l.status === 'Pending').length,
    Approved: leaves.filter(l => l.status === 'Approved').length,
    Rejected: leaves.filter(l => l.status === 'Rejected').length,
  };

  const updateStatus = (id, status) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleSave = () => {
    if (!form.employee || !form.fromDate) return;
    setLeaves(prev => [...prev, { ...form, id: Date.now(), status: 'Pending' }]);
    setShowModal(false);
    setForm(emptyForm);
  };

  const statusBadge = (status) => {
    const map = { Pending: 'warning', Approved: 'success', Rejected: 'danger' };
    return (
      <span className={`badge badge-${map[status]}`}>
        <span className="badge-dot" />{status}
      </span>
    );
  };

  const columns = [
    {
      key: 'employee', label: 'Employee',
      render: (val, row) => (
        <div className="leaves-emp-cell">
          <div className={`avatar avatar-sm ${getColor(row.id)}`}>{getInitials(val)}</div>
          <div>
            <div className="leaves-emp-name">{val}</div>
            <div className="leaves-emp-dept">{row.department}</div>
          </div>
        </div>
      )
    },
    { key: 'type', label: 'Leave Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate', label: 'To' },
    { key: 'days', label: 'Days', render: (val) => `${val} day${val > 1 ? 's' : ''}` },
    { key: 'reason', label: 'Reason', render: (val) => <span className="leaves-reason-cell">{val}</span> },
    { key: 'status', label: 'Status', render: statusBadge },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="leaves-actions">
          {row.status === 'Pending' && (
            <>
              <button className="leaves-approve-btn" title="Approve" onClick={() => updateStatus(row.id, 'Approved')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button className="leaves-reject-btn" title="Reject" onClick={() => updateStatus(row.id, 'Rejected')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          )}
          {row.status !== 'Pending' && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">Leaves</h1>
          <p className="page-subtitle">Manage employee leave requests</p>
        </div>
        <div className="page-toolbar">
          <div className="toolbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by employee..." />
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Apply Leave
          </button>
        </div>
      </div>

      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        {['All','Pending','Approved','Rejected'].map(s => (
          <div key={s} className="stat-card" style={{ cursor: 'pointer', outline: activeTab === s ? '2px solid var(--primary)' : 'none' }} onClick={() => setActiveTab(s)}>
            <div className="stat-card-header">
              <span className="stat-card-label">{s}</span>
            </div>
            <div className="stat-card-value">{counts[s]}</div>
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} className={`tab-item${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t} <span style={{ color: 'inherit', opacity: 0.7, fontSize: 11 }}>({counts[t]})</span>
          </button>
        ))}
      </div>

      <Table columns={columns} data={filtered} emptyText="No leave requests found." />

      {showModal && (
        <Modal
          title="Apply Leave"
          onClose={() => { setShowModal(false); setForm(emptyForm); }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setForm(emptyForm); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Submit Request</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee Name *</label>
              <input className="form-input" placeholder="Full name" value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" placeholder="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Number of Days</label>
              <input className="form-input" type="number" min="1" placeholder="e.g. 2" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">From Date *</label>
              <input className="form-input" type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input className="form-input" type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Reason</label>
              <textarea className="form-textarea" placeholder="Briefly describe the reason..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
