import { Link } from 'react-router-dom';
import '../../components/UI/UI.css';
import './Dashboard.css';

const stats = [
  { label: 'Total Employees', value: 48, change: '+3', up: true, icon: '👥', color: '#e0e7ff' },
  { label: 'On Leave Today', value: 5, change: '-2', up: false, icon: '🏖️', color: '#fef3c7' },
  { label: 'Present Today', value: 43, change: '+2', up: true, icon: '✅', color: '#d1fae5' },
  { label: 'Pending Leaves', value: 7, change: '+5', up: false, icon: '⏳', color: '#fee2e2' },
];

const recentActivity = [
  { id: 1, name: 'Rahul Sharma', action: 'submitted a leave request', time: '5m ago', avatar: 'RS', color: 'avatar-purple' },
  { id: 2, name: 'Priya Mehta', action: 'clocked in at 9:02 AM', time: '1h ago', avatar: 'PM', color: 'avatar-green' },
  { id: 3, name: 'Kiran Kumar', action: 'updated timesheet for Feb', time: '2h ago', avatar: 'KK', color: 'avatar-orange' },
  { id: 4, name: 'Anjali Singh', action: 'leave approved by Admin', time: '3h ago', avatar: 'AS', color: 'avatar-pink' },
  { id: 5, name: 'DevOps Team', action: '3 members checked out early', time: '4h ago', avatar: 'DT', color: 'avatar-blue' },
];

const onLeaveToday = [
  { id: 1, name: 'Arjun Reddy', dept: 'Engineering', type: 'Sick Leave', avatar: 'AR', color: 'avatar-purple' },
  { id: 2, name: 'Nisha Patel', dept: 'Marketing', type: 'Casual Leave', avatar: 'NP', color: 'avatar-pink' },
  { id: 3, name: 'Sanjay Rao', dept: 'Finance', type: 'Annual Leave', avatar: 'SR', color: 'avatar-teal' },
  { id: 4, name: 'Divya Thomas', dept: 'HR', type: 'Personal Leave', avatar: 'DT', color: 'avatar-orange' },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h2>Welcome back, Admin 👋</h2>
          <p>Here's what's happening at GamaNext today — Sunday, March 8, 2026</p>
        </div>
        <div className="dashboard-welcome-emoji">🏢</div>
      </div>

      <div className="stat-cards">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-header">
              <span className="stat-card-label">{s.label}</span>
              <div className="stat-card-icon" style={{ background: s.color }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
              </div>
            </div>
            <div className="stat-card-value">{s.value}</div>
            <div className={`stat-card-change ${s.up ? 'up' : 'down'}`}>
              {s.up ? '↑' : '↓'} {s.change} from yesterday
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-title">
            Recent Activity
            <Link to="/employees">View all</Link>
          </div>
          <div className="activity-list">
            {recentActivity.map(a => (
              <div className="activity-item" key={a.id}>
                <div className={`avatar avatar-sm ${a.color}`}>{a.avatar}</div>
                <div className="activity-content">
                  <div className="activity-name">{a.name}</div>
                  <div className="activity-sub">{a.action}</div>
                </div>
                <div className="activity-time">{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-title">
            On Leave Today
            <Link to="/leaves">View all</Link>
          </div>
          <div className="leave-today-list">
            {onLeaveToday.map(l => (
              <div className="leave-today-item" key={l.id}>
                <div className={`avatar avatar-sm ${l.color}`}>{l.avatar}</div>
                <div className="leave-today-info">
                  <div className="leave-today-name">{l.name}</div>
                  <div className="leave-today-dept">{l.dept}</div>
                </div>
                <span className="badge badge-warning">
                  <span className="badge-dot" />
                  {l.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
