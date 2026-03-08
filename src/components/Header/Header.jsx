import { useLocation } from 'react-router-dom';
import './Header.css';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/leaves': 'Leaves',
  '/timesheet': 'Timesheet',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'GamaNext';

  return (
    <header className="header">
      <div className="header-left">
        {/* Hamburger — visible on mobile only */}
        <button className="header-hamburger" onClick={onMenuClick} title="Open menu" aria-label="Open navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <span className="header-page-title">{title}</span>

        <div className="header-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search..." />
        </div>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="header-notif-dot" />
        </button>

        <div className="header-avatar" title="Admin">A</div>
      </div>
    </header>
  );
}
