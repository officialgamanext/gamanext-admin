import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-content">
        <Header />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
