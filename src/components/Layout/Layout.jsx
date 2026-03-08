import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className={`layout-content${sidebarOpen ? ' sidebar-pushed' : ''}`}>
        <Header onMenuClick={() => setSidebarOpen(v => !v)} />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
