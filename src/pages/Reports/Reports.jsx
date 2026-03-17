import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import './Reports.css';

export default function Reports() {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalProjects: 0,
        totalAgreedAmount: 0,
        totalReceivedAmount: 0,
        projectStatus: { Ongoing: 0, Completed: 0, Pending: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all'); // all, thisMonth, lastMonth, thisYear, lastYear, custom
    const [customDate, setCustomDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    const isDateInRange = (timestamp) => {
        if (!timestamp) return false;
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 1-12

        if (timeFilter === 'all') return true;

        if (timeFilter === 'thisMonth') {
            return year === now.getFullYear() && month === (now.getMonth() + 1);
        }
        if (timeFilter === 'lastMonth') {
            const lastM = now.getMonth() === 0 ? 12 : now.getMonth();
            const lastY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            return year === lastY && month === lastM;
        }
        if (timeFilter === 'thisYear') {
            return year === now.getFullYear();
        }
        if (timeFilter === 'lastYear') {
            return year === (now.getFullYear() - 1);
        }
        if (timeFilter === 'custom') {
            return year === parseInt(customDate.year) && month === parseInt(customDate.month);
        }
        return true;
    };

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const customers = await getDocs(collection(db, 'customers'));
                const projects = await getDocs(collection(db, 'projects'));
                const payments = await getDocs(collection(db, 'payments'));
                const installments = await getDocs(collection(db, 'installments'));

                let agreed = 0;
                let received = 0;
                let filteredCustCount = 0;
                let filteredProjCount = 0;
                const statusCount = { Ongoing: 0, Completed: 0, Pending: 0 };

                customers.docs.forEach(d => {
                    if (isDateInRange(d.data().createdAt)) filteredCustCount++;
                });

                projects.docs.forEach(d => {
                    const data = d.data();
                    if (isDateInRange(data.createdAt)) {
                        filteredProjCount++;
                        statusCount[data.status] = (statusCount[data.status] || 0) + 1;
                    }
                });

                payments.docs.forEach(d => {
                    if (isDateInRange(d.data().createdAt)) {
                        agreed += parseFloat(d.data().totalAmount) || 0;
                    }
                });

                installments.docs.forEach(d => {
                    if (isDateInRange(d.data().createdAt)) {
                        received += parseFloat(d.data().amount) || 0;
                    }
                });

                setStats({
                    totalCustomers: filteredCustCount,
                    totalProjects: filteredProjCount,
                    totalAgreedAmount: agreed,
                    totalReceivedAmount: received,
                    projectStatus: statusCount
                });
            } catch (err) {
                console.error('Error fetching reports:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [timeFilter, customDate]);

    if (loading) return <div className="loading-state">Generating reports...</div>;

    const outstanding = stats.totalAgreedAmount - stats.totalReceivedAmount;

    return (
        <div className="reports-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Business Reports</h1>
                    <p className="page-subtitle">Overview of customers, projects, and financial health</p>
                </div>
                <div className="report-controls">
                    <select className="filter-select" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                        <option value="all">All Time</option>
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="thisYear">This Year</option>
                        <option value="lastYear">Last Year</option>
                        <option value="custom">Custom Month & Year</option>
                    </select>

                    {timeFilter === 'custom' && (
                        <div className="custom-date-inputs">
                            <select value={customDate.month} onChange={e => setCustomDate({...customDate, month: e.target.value})}>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select value={customDate.year} onChange={e => setCustomDate({...customDate, year: e.target.value})}>
                                {[...Array(5)].map((_, i) => {
                                    const y = new Date().getFullYear() - i;
                                    return <option key={y} value={y}>{y}</option>
                                })}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Customers</div>
                    <div className="stat-value">{stats.totalCustomers}</div>
                    <div className="stat-icon">👥</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Projects</div>
                    <div className="stat-value">{stats.totalProjects}</div>
                    <div className="stat-icon">🏗️</div>
                </div>
                <div className="stat-card highlight">
                    <div className="stat-label">Received Revenue</div>
                    <div className="stat-value">₹{stats.totalReceivedAmount.toLocaleString()}</div>
                    <div className="stat-icon">💰</div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-label">Outstanding Balance</div>
                    <div className="stat-value">₹{outstanding.toLocaleString()}</div>
                    <div className="stat-icon">⏳</div>
                </div>
            </div>

            <div className="reports-layout">
                <div className="report-section">
                    <h3>Project Status Distribution</h3>
                    <div className="status-bars">
                        {Object.entries(stats.projectStatus).map(([status, count]) => {
                            const percentage = stats.totalProjects > 0 ? (count / stats.totalProjects) * 100 : 0;
                            return (
                                <div key={status} className="status-row">
                                    <div className="status-info">
                                        <span>{status}</span>
                                        <span>{count} ({percentage.toFixed(0)}%)</span>
                                    </div>
                                    <div className="status-bar-bg">
                                        <div 
                                            className={`status-bar-fill bar-${status.toLowerCase()}`} 
                                            style={{ width: `${percentage}%` }} 
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="report-section">
                    <h3>Financial Summary</h3>
                    <div className="summary-list">
                        <div className="summary-item">
                            <span>Total Business Value</span>
                            <span className="val">₹{stats.totalAgreedAmount.toLocaleString()}</span>
                        </div>
                        <div className="summary-item">
                            <span>Collected Amount</span>
                            <span className="val success">₹{stats.totalReceivedAmount.toLocaleString()}</span>
                        </div>
                        <div className="summary-item">
                            <span>Collection Rate</span>
                            <span className="val">
                                {stats.totalAgreedAmount > 0 
                                    ? ((stats.totalReceivedAmount / stats.totalAgreedAmount) * 100).toFixed(1) 
                                    : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
