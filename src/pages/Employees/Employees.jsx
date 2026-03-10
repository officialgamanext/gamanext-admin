import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { db, auth, secondaryAuth } from '../../firebase';
import Table from '../../components/Table/Table';
import '../../components/UI/UI.css';
import '../../components/Modal/Modal.css';
import './Employees.css';

/* ─── Constants ───────────────────────────────────────── */
const AVATAR_COLORS = ['avatar-purple','avatar-green','avatar-orange','avatar-pink','avatar-blue','avatar-teal'];

const EJSVC  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EJTPL  = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EJPKEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/* ─── Helpers ─────────────────────────────────────────── */
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const getColor = (empId = '') => {
  const num = parseInt(empId, 10) || 1;
  return AVATAR_COLORS[(num - 1) % AVATAR_COLORS.length];
};

const genEmployeeId = () => String(Math.floor(1000000 + Math.random() * 9000000));

const sendWelcomeMail = async ({ name, employeeId, username, password, email }) => {
  if (!EJSVC || EJSVC === 'YOUR_SERVICE_ID') return; // skip if not configured
  await emailjs.send(
    EJSVC, EJTPL,
    {
      to_name:     name,
      to_email:    email,
      employee_id: employeeId,
      username,
      password,
    },
    EJPKEY
  );
};

const EMPTY_FORM = {
  employeeId: '', username: '', password: '',
  name: '', mobile: '', email: '', address: '',
  dob: '', aadhar: '', pan: '',
  bankName: '', accountNumber: '', ifscCode: '', accountHolder: '',
  emergencyName: '', emergencyRelation: '', emergencyMobile: '',
  department: '', designation: '', status: 'Active',
};

/* ─── Icons ───────────────────────────────────────────── */
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const EditSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);
const TrashSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);
const SaveSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const CheckSVG = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ViewSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ─── Toast ───────────────────────────────────────────── */
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="emp-toast">
      <div className={`emp-toast-icon${type === 'warn' ? ' warn' : ''}`}>
        <CheckSVG />
      </div>
      {message}
    </div>
  );
}

/* ─── Delete Confirm ──────────────────────────────────── */
function DeleteConfirm({ employee, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="delete-confirm-box">
        <div className="delete-confirm-top">
          <div className="delete-confirm-emoji">🗑️</div>
          <div className="delete-confirm-title">Delete Employee</div>
          <p className="delete-confirm-sub">
            Are you sure you want to delete{' '}
            <span className="delete-confirm-name">{employee.name}</span>?
            <br />This action cannot be undone.
          </p>
        </div>
        <div className="delete-confirm-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="btn-spinner" /> Deleting…</> : <><TrashSVG /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Form Body ────────────────────────────────── */
function EmpFormBody({ form, set, isEdit = false, showPassword, setShowPassword }) {
  return (
    <>
      {/* ── 1. Login Credentials ── */}
      <div className="emp-section">
        <div className="emp-section-header">
          <div className="emp-section-icon" style={{ background: '#e0e7ff' }}>🔐</div>
          <span className="emp-section-label">Login Credentials</span>
          <div className="emp-section-line" />
        </div>
        <div className="emp-form-grid cols-2">
          <div className="emp-form-group">
            <label className="emp-form-label">
              Employee ID
              <span className="emp-autogen-badge">Auto-generated</span>
            </label>
            <input className="emp-form-input" value={form.employeeId} readOnly disabled />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">
              Username
              <span className="emp-autogen-badge">Auto-generated</span>
            </label>
            <input className="emp-form-input" value={form.username} readOnly disabled />
          </div>
          {!isEdit && (
            <div className="emp-form-group span-2">
              <label className="emp-form-label">Password <span>*</span></label>
              <div className="emp-password-wrap">
                <input
                  className="emp-form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                />
                <button type="button" className="emp-password-toggle"
                  onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Personal Information ── */}
      <div className="emp-section">
        <div className="emp-section-header">
          <div className="emp-section-icon" style={{ background: '#d1fae5' }}>👤</div>
          <span className="emp-section-label">Personal Information</span>
          <div className="emp-section-line" />
        </div>
        <div className="emp-form-grid">
          <div className="emp-form-group span-2">
            <label className="emp-form-label">Full Name <span>*</span></label>
            <input className="emp-form-input" placeholder="e.g. Rahul Sharma"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Date of Birth</label>
            <input className="emp-form-input" type="date"
              value={form.dob} onChange={e => set('dob', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Mobile Number <span>*</span></label>
            <input className="emp-form-input" placeholder="+91 XXXXX XXXXX" maxLength={13}
              value={form.mobile} onChange={e => set('mobile', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Personal Email <span>*</span></label>
            <input className="emp-form-input" type="email" placeholder="personal@email.com"
              value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Department</label>
            <input className="emp-form-input" placeholder="e.g. Engineering"
              value={form.department} onChange={e => set('department', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Designation</label>
            <input className="emp-form-input" placeholder="e.g. Software Engineer"
              value={form.designation} onChange={e => set('designation', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Status</label>
            <select className="emp-form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="emp-form-group span-3">
            <label className="emp-form-label">Address</label>
            <textarea className="emp-form-textarea" placeholder="Full residential address..."
              value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── 3. Identity Documents ── */}
      <div className="emp-section">
        <div className="emp-section-header">
          <div className="emp-section-icon" style={{ background: '#fef3c7' }}>🪪</div>
          <span className="emp-section-label">Identity Documents</span>
          <div className="emp-section-line" />
        </div>
        <div className="emp-form-grid cols-2">
          <div className="emp-form-group">
            <label className="emp-form-label">Aadhar Card Number</label>
            <input className="emp-form-input" placeholder="XXXX XXXX XXXX" maxLength={14}
              value={form.aadhar} onChange={e => set('aadhar', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">PAN Card Number</label>
            <input className="emp-form-input" placeholder="ABCDE1234F" maxLength={10}
              style={{ textTransform: 'uppercase' }}
              value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* ── 4. Bank Details ── */}
      <div className="emp-section">
        <div className="emp-section-header">
          <div className="emp-section-icon" style={{ background: '#ede9fe' }}>🏦</div>
          <span className="emp-section-label">Bank Details</span>
          <div className="emp-section-line" />
        </div>
        <div className="emp-form-grid cols-2">
          <div className="emp-form-group">
            <label className="emp-form-label">Bank Name</label>
            <input className="emp-form-input" placeholder="e.g. State Bank of India"
              value={form.bankName} onChange={e => set('bankName', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Account Holder Name</label>
            <input className="emp-form-input" placeholder="Name as per bank"
              value={form.accountHolder} onChange={e => set('accountHolder', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Account Number</label>
            <input className="emp-form-input" placeholder="Account number"
              value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">IFSC Code</label>
            <input className="emp-form-input" placeholder="e.g. SBIN0001234" maxLength={11}
              style={{ textTransform: 'uppercase' }}
              value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* ── 5. Emergency Contact ── */}
      <div className="emp-section">
        <div className="emp-section-header">
          <div className="emp-section-icon" style={{ background: '#fee2e2' }}>🆘</div>
          <span className="emp-section-label">Emergency Contact</span>
          <div className="emp-section-line" />
        </div>
        <div className="emp-form-grid">
          <div className="emp-form-group">
            <label className="emp-form-label">Contact Name</label>
            <input className="emp-form-input" placeholder="Full name"
              value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} />
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Relation</label>
            <select className="emp-form-select" value={form.emergencyRelation}
              onChange={e => set('emergencyRelation', e.target.value)}>
              <option value="">Select relation</option>
              {['Father','Mother','Spouse','Sibling','Friend','Guardian','Other'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="emp-form-group">
            <label className="emp-form-label">Mobile Number</label>
            <input className="emp-form-input" placeholder="+91 XXXXX XXXXX" maxLength={13}
              value={form.emergencyMobile} onChange={e => set('emergencyMobile', e.target.value)} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Add Employee Modal ───────────────────────────────── */
function AddEmployeeModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState(() => {
    const empId = genEmployeeId();
    return { ...EMPTY_FORM, employeeId: empId, username: `${empId}@gamanext.com` };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim())   return setError('Full name is required.');
    if (!form.mobile.trim()) return setError('Mobile number is required.');
    if (!form.email.trim())  return setError('Personal email is required.');
    if (!form.password || form.password.length < 6)
      return setError('Password must be at least 6 characters.');

    setSaving(true);
    try {
      // 1) Create Firebase Auth user on the SECONDARY app so the
      //    admin session on the primary app is never disturbed.
      await createUserWithEmailAndPassword(secondaryAuth, form.username, form.password);

      // 2) Immediately sign the secondary app out — we don't need it signed in.
      await secondarySignOut(secondaryAuth);

      // 3) Save to Firestore (password NOT stored)
      const { password, ...safeData } = form;
      await setDoc(doc(db, 'employees', form.employeeId), {
        ...safeData,
        createdAt: new Date().toISOString(),
      });

      onSaved();
      onClose();
    } catch (err) {
      // If Firestore save failed but auth user was created, still sign out secondary
      try { await secondarySignOut(secondaryAuth); } catch (_) {}
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="emp-modal-box">
        <div className="emp-modal-header">
          <span className="emp-modal-title">➕ Add New Employee</span>
          <button className="emp-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="emp-modal-body">
          <EmpFormBody form={form} set={set} isEdit={false}
            showPassword={showPassword} setShowPassword={setShowPassword} />
          {error && (
            <div className="emp-error-banner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>
        <div className="emp-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : <><SaveSVG /> Save Employee</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Employee Modal ──────────────────────────────── */
function EditEmployeeModal({ employee, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({ ...employee });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim())   return setError('Full name is required.');
    if (!form.mobile.trim()) return setError('Mobile number is required.');
    if (!form.email.trim())  return setError('Personal email is required.');

    setSaving(true);
    try {
      const { password, ...safeData } = form;
      await updateDoc(doc(db, 'employees', employee.employeeId), {
        ...safeData,
        updatedAt: new Date().toISOString(),
      });
      onSaved();
      onClose();
      showToast(`✏️ ${form.name}'s details updated successfully.`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="emp-modal-box">
        <div className="emp-modal-header">
          <span className="emp-modal-title">✏️ Edit Employee — {employee.name}</span>
          <button className="emp-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="emp-modal-body">
          <EmpFormBody form={form} set={set} isEdit={true} />
          {error && (
            <div className="emp-error-banner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>
        <div className="emp-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : <><SaveSVG /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Employees Page ──────────────────────────────── */
export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget]     = useState(null);  // employee to edit
  const [deleteTarget, setDeleteTarget] = useState(null);  // employee to delete
  const [deleting, setDeleting]         = useState(false);
  const [toast, setToast]               = useState('');

  /* fetch */
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  /* delete */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'employees', deleteTarget.employeeId || deleteTarget.id));
      setEmployees(prev => prev.filter(e =>
        e.employeeId !== (deleteTarget.employeeId || deleteTarget.id)
      ));
      setToast(`🗑️ ${deleteTarget.name} has been deleted.`);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* filter */
  const filtered = employees.filter(e => {
    const matchSearch =
      (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.employeeId || '').includes(search) ||
      (e.email || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept.trim() ||
      (e.department || '').toLowerCase().includes(filterDept.toLowerCase());
    return matchSearch && matchDept;
  });

  /* table columns */
  const columns = [
    {
      key: 'name', label: 'Employee',
      render: (val, row) => (
        <div className="employees-name-cell">
          <div className={`avatar avatar-sm ${getColor(row.employeeId)}`}>
            {getInitials(val)}
          </div>
          <div>
            <div className="employees-name-text">{val}</div>
            <div className="employees-email">{row.username}</div>
          </div>
        </div>
      )
    },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'department',  label: 'Department',  render: v => v || '—' },
    { key: 'designation', label: 'Designation', render: v => v || '—' },
    { key: 'mobile',      label: 'Mobile',      render: v => v || '—' },
    {
      key: 'status', label: 'Status',
      render: val => (
        <span className={`badge badge-${val === 'Active' ? 'success' : 'neutral'}`}>
          <span className="badge-dot" />{val || 'Active'}
        </span>
      )
    },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="employees-actions">
          <button
            className="action-icon-btn"
            title="View Details"
            onClick={() => navigate(`/employees/${row.employeeId || row.id}`)}
          >
            <ViewSVG />
          </button>
          <button
            className="action-icon-btn"
            title="Edit Employee"
            onClick={() => setEditTarget(row)}
          >
            <EditSVG />
          </button>
          <button
            className="action-icon-btn danger"
            title="Delete Employee"
            onClick={() => setDeleteTarget(row)}
          >
            <TrashSVG />
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
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${filtered.length} employee${filtered.length !== 1 ? 's' : ''} listed`}
          </p>
        </div>
        <div className="page-toolbar">
          <div className="toolbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, email…" />
          </div>
          {/* Department text filter */}
          <div className="toolbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input value={filterDept} onChange={e => setFilterDept(e.target.value)}
              placeholder="Filter by department…" />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Employee
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading employees from Firestore…
        </div>
      ) : (
        <Table columns={columns} data={filtered} emptyText="No employees found. Add one to get started." />
      )}

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSaved={fetchEmployees}
          showToast={msg => setToast(msg)}
        />
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditEmployeeModal
          employee={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchEmployees}
          showToast={msg => setToast(msg)}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          employee={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          deleting={deleting}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast} onDone={() => setToast('')} />
      )}
    </div>
  );
}
