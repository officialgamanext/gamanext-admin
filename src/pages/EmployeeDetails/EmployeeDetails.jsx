import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ProfileTab from './tabs/ProfileTab';
import TimesheetTab from './tabs/TimesheetTab';
import LeavesTab from './tabs/LeavesTab';
import AdvanceTab from './tabs/AdvanceTab';
import '../../components/UI/UI.css';
import './EmployeeDetails.css';

const AVATAR_COLORS = ['avatar-purple','avatar-green','avatar-orange','avatar-pink','avatar-blue','avatar-teal'];
const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const getColor   = (empId = '') => AVATAR_COLORS[(parseInt(empId, 10) || 1 - 1) % AVATAR_COLORS.length];

const TABS = [
  { key: 'profile',    label: 'Profile',    icon: '👤' },
  { key: 'timesheet',  label: 'Timesheet',  icon: '⏱️' },
  { key: 'leaves',     label: 'Leaves',     icon: '🏖️' },
  { key: 'advance',    label: 'Advance',    icon: '💰' },
];

export default function EmployeeDetails() {
  const { empId }    = useParams();
  const navigate     = useNavigate();
  const [emp, setEmp]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'employees', empId));
      if (snap.exists()) setEmp({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error('Fetch employee error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployee(); }, [empId]);

  if (loading) return (
    <div className="ed-loading">
      <div className="ed-loading-emoji">⏳</div>
      Loading employee details…
    </div>
  );

  if (!emp) return (
    <div className="ed-loading">
      <div className="ed-loading-emoji">😕</div>
      Employee not found.
    </div>
  );

  return (
    <div className="ed-page">
      {/* Back */}
      <button className="ed-back-btn" onClick={() => navigate('/employees')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Employees
      </button>

      {/* Hero */}
      <div className="ed-hero">
        <div className={`ed-hero-avatar ${getColor(emp.employeeId)}`}>
          {getInitials(emp.name)}
        </div>
        <div className="ed-hero-info">
          <div className="ed-hero-name">{emp.name}</div>
          <div className="ed-hero-meta">
            <span className="ed-hero-meta-item">🆔 {emp.employeeId}</span>
            {emp.designation && <span className="ed-hero-meta-item">💼 {emp.designation}</span>}
            {emp.department  && <span className="ed-hero-meta-item">🏢 {emp.department}</span>}
            {emp.mobile      && <span className="ed-hero-meta-item">📞 {emp.mobile}</span>}
          </div>
        </div>
        <div className="ed-hero-actions">
          <span className={`badge badge-${emp.status === 'Active' ? 'success' : 'neutral'}`}>
            <span className="badge-dot" />{emp.status || 'Active'}
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="ed-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`ed-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="ed-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile'   && <ProfileTab   emp={emp} empId={empId} onUpdated={fetchEmployee} />}
      {activeTab === 'timesheet' && <TimesheetTab  empId={empId} emp={emp} />}
      {activeTab === 'leaves'    && <LeavesTab     empId={empId} emp={emp} />}
      {activeTab === 'advance'   && <AdvanceTab    empId={empId} emp={emp} />}
    </div>
  );
}
