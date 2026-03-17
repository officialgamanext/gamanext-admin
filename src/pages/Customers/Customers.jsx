import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import Table from '../../components/Table/Table';
import './Customers.css';

/* --- Icons --- */
const PlusIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    // Form State
    const [form, setForm] = useState({
        name: '',
        mobile: '',
        businessName: '',
        email: ''
    });

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.mobile) return toast.error('Name and Mobile are required');
        
        setSaving(true);
        try {
            await addDoc(collection(db, 'customers'), {
                ...form,
                createdAt: serverTimestamp(),
            });
            setShowAddModal(false);
            setForm({ name: '', mobile: '', businessName: '', email: '' });
            toast.success('Customer added successfully');
            fetchCustomers();
        } catch (err) {
            console.error('Error adding customer:', err);
            toast.error('Failed to add customer');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { 
            key: 'name', 
            label: 'Customer Name',
            render: (v, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '36px', height: '36px', background: '#f1f5f9', 
                        borderRadius: '10px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', color: '#6366f1' 
                    }}>
                        <UserIcon />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{v}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{row.businessName}</div>
                    </div>
                </div>
            )
        },
        { key: 'mobile', label: 'Mobile Number' },
        { key: 'email', label: 'Email', render: v => v || '-' },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <button 
                    className="view-btn"
                    onClick={() => navigate(`/customers/${row.id}`)}
                >
                    View Details
                </button>
            )
        }
    ];

    return (
        <div className="customers-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">Manage your customer relationships and projects</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <PlusIcon /> Add Customer
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Loading customers...</div>
            ) : (
                <Table columns={columns} data={customers} />
            )}

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h2 className="modal-title">Add New Customer</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Customer Name *</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter full name" 
                                    value={form.name} 
                                    onChange={e => setForm({...form, name: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Mobile Number *</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter mobile number" 
                                    value={form.mobile} 
                                    onChange={e => setForm({...form, mobile: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Business Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: GamaNext Tech" 
                                    value={form.businessName} 
                                    onChange={e => setForm({...form, businessName: e.target.value})} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Email (Optional)</label>
                                <input 
                                    type="email" 
                                    placeholder="customer@gmail.com" 
                                    value={form.email} 
                                    onChange={e => setForm({...form, email: e.target.value})} 
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
