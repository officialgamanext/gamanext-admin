import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './EmployeePortal.css';

/* ── Sidebar content (shared between desktop and drawer) ── */
function SidebarContent({ onClose }) {
  const { employeeData, logout } = useAuth();
  const name     = employeeData?.name || 'Employee';
  const empId    = employeeData?.employeeId || '';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleNav = () => { if (onClose) onClose(); };

  return (
    <aside className="ep-sidebar">
      <div className="ep-sidebar-logo">
        <img src="/fav.png" alt="logo" className="ep-sidebar-logo-img" />
        <div>
          <div className="ep-sidebar-brand">GamaNext</div>
          <div className="ep-sidebar-brand-sub">Employee Portal</div>
        </div>
      </div>

      <div className="ep-sidebar-profile">
        <div className="ep-sidebar-avatar">{initials}</div>
        <div>
          <div className="ep-sidebar-name">{name}</div>
          <div className="ep-sidebar-empid">ID: {empId}</div>
        </div>
      </div>

      <div className="ep-sidebar-label">My Portal</div>
      <nav className="ep-sidebar-nav">
        <NavLink to="/my/leaves" onClick={handleNav}
          className={({ isActive }) => `ep-nav-item${isActive ? ' active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          My Leaves
        </NavLink>
        <NavLink to="/my/timesheet" onClick={handleNav}
          className={({ isActive }) => `ep-nav-item${isActive ? ' active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          My Timesheet
        </NavLink>
      </nav>

      <div className="ep-sidebar-footer">
        <button className="ep-logout-btn" onClick={logout}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

/* ── Full Employee Portal Layout (sidebar + header + content) ── */
export default function EmployeePortalLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { employeeData } = useAuth();
  const name     = employeeData?.name || 'Employee';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="ep-shell">
      {/* ── Desktop sidebar ── */}
      <div className="ep-desktop-sidebar">
        <SidebarContent />
      </div>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="ep-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`ep-drawer${drawerOpen ? ' open' : ''}`}>
        <SidebarContent onClose={() => setDrawerOpen(false)} />
      </div>

      {/* ── Main area ── */}
      <div className="ep-main-col">
        {/* Mobile top header */}
        <header className="ep-mobile-header">
          <button className="ep-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <div className="ep-mobile-brand">
            <img src="/fav.png" alt="logo" className="ep-mobile-logo" />
            <span>GamaNext</span>
          </div>
          <div className="ep-mobile-avatar">{initials}</div>
        </header>

        <main className="ep-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
