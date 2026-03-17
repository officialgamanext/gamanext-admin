import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  {
    section: 'Main',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        )
      },
    ]
  },
  {
    section: 'HR Management',
    items: [
      {
        label: 'Employees',
        path: '/employees',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      },
      {
        label: 'Leaves',
        path: '/leaves',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )
      },
      {
        label: 'Timesheet',
        path: '/timesheet',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )
      },
      {
        label: 'Offer Letter',
        path: '/offer-letter',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        )
      },
      {
        label: 'Invoices',
        path: '/invoices',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
            <path d="M3 10h18" />
            <path d="M7 15h.01" />
            <path d="M11 15h.01" />
          </svg>
        )
      },
    ]
  },
  {
    section: 'CRM & Projects',
    items: [
      {
        label: 'Customers',
        path: '/customers',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      },
      {
        label: 'Reports',
        path: '/reports',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        )
      },
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const emailInitial = user?.email ? user.email[0].toUpperCase() : 'A';

  const handleLogout = () => { logout(); onClose?.(); };

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      {/* Close button — mobile only */}
      <button className="sidebar-close-btn" onClick={onClose} title="Close menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">G</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">GamaNext</span>
          <span className="sidebar-logo-sub">Admin Panel</span>
        </div>
      </div>

      {navItems.map((group) => (
        <div className="sidebar-section" key={group.section}>
          <div className="sidebar-section-label">{group.section}</div>
          <nav className="sidebar-nav">
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{emailInitial}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.email || 'Admin'}</span>
            <span className="sidebar-user-role">Admin</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-logout-btn"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
