import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ProfileTab from './tabs/ProfileTab';
import ProjectsTab from './tabs/ProjectsTab';
import PaymentsTab from './tabs/PaymentsTab';
import './CustomerDetails.css';

/* --- Icons --- */
const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
);

const ProfileIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);

const ProjectsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
);

const PaymentsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
);

export default function CustomerDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const docRef = doc(db, 'customers', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setCustomer({ id: snap.id, ...snap.data() });
                } else {
                    navigate('/customers');
                }
            } catch (err) {
                console.error('Error fetching customer:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomer();
    }, [id, navigate]);

    if (loading) return <div className="loading-state">Loading details...</div>;
    if (!customer) return null;

    return (
        <div className="customer-details-page">
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate('/customers')}>
                    <BackIcon />
                </button>
                <div className="header-info">
                    <h1 className="header-title">{customer.name}</h1>
                    <p className="header-subtitle">{customer.businessName || 'Regular Customer'}</p>
                </div>
            </div>

            <div className="detail-tabs">
                <button 
                    className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <ProfileIcon /> Profile
                </button>
                <button 
                    className={`tab-item ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                >
                    <ProjectsIcon /> Projects
                </button>
                <button 
                    className={`tab-item ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    <PaymentsIcon /> Payments
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'profile' && <ProfileTab customer={customer} onUpdate={setCustomer} />}
                {activeTab === 'projects' && <ProjectsTab customerId={id} />}
                {activeTab === 'payments' && <PaymentsTab customerId={id} />}
            </div>
        </div>
    );
}
