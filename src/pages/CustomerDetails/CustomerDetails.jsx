import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
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

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
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
                    toast.error('Customer not found');
                    navigate('/customers');
                }
            } catch (err) {
                console.error('Error fetching customer:', err);
                toast.error('Failed to load customer details');
            } finally {
                setLoading(false);
            }
        };
        fetchCustomer();
    }, [id, navigate]);

    const handleDeleteCustomer = async () => {
        if (!window.confirm('Are you sure you want to delete this customer? All data will be lost.')) return;
        
        try {
            setLoading(true);
            await deleteDoc(doc(db, 'customers', id));
            toast.success('Customer deleted successfully');
            navigate('/customers');
        } catch (err) {
            console.error('Error deleting customer:', err);
            toast.error('Failed to delete customer');
            setLoading(false);
        }
    };

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
                <button className="delete-customer-btn" onClick={handleDeleteCustomer} title="Delete Customer">
                    <TrashIcon /> Delete Customer
                </button>
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
