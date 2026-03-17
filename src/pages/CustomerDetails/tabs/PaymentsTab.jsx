import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../../firebase';
import Table from '../../../components/Table/Table';

export default function PaymentsTab({ customerId }) {
    const [projects, setProjects] = useState([]);
    const [payments, setPayments] = useState([]);
    const [installments, setInstallments] = useState({}); // paymentId -> list of installments
    const [loading, setLoading] = useState(true);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showInstModal, setShowInstModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form States
    const [payForm, setPayForm] = useState({ projectId: '', totalAmount: '', note: '' });
    const [instForm, setInstForm] = useState({ paymentId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
    const [editingInst, setEditingInst] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Projects
            const pq = query(collection(db, 'projects'), where('customerId', '==', customerId));
            const pSnap = await getDocs(pq);
            const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProjects(pList);

            // Fetch Payments
            const payQ = query(collection(db, 'payments'), where('customerId', '==', customerId));
            const paySnap = await getDocs(payQ);
            const payList = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Client-side sorting for payments
            payList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPayments(payList);

            // Fetch All Installments for these payments
            if (payList.length > 0) {
                const instQ = query(collection(db, 'installments'), where('customerId', '==', customerId));
                const instSnap = await getDocs(instQ);
                const instData = {};
                instSnap.docs.forEach(d => {
                    const data = { id: d.id, ...d.data() };
                    if (!instData[data.paymentId]) instData[data.paymentId] = [];
                    instData[data.paymentId].push(data);
                });
                setInstallments(instData);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [customerId]);

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!payForm.projectId || !payForm.totalAmount) return toast.error('Select project and amount');
        setSaving(true);
        try {
            const project = projects.find(p => p.id === payForm.projectId);
            await addDoc(collection(db, 'payments'), {
                ...payForm,
                projectName: project.projectName,
                customerId,
                createdAt: serverTimestamp(),
            });
            setShowPayModal(false);
            setPayForm({ projectId: '', totalAmount: '', note: '' });
            fetchData();
            toast.success('Payment record created successfully');
        } catch (err) {
            console.error('Error adding payment:', err);
            toast.error('Failed to add payment record');
        } finally {
            setSaving(false);
        }
    };

    const handleAddInstallment = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingInst) {
                await updateDoc(doc(db, 'installments', editingInst.id), {
                    amount: instForm.amount,
                    date: instForm.date,
                    note: instForm.note
                });
            } else {
                await addDoc(collection(db, 'installments'), {
                    ...instForm,
                    customerId,
                    createdAt: serverTimestamp(),
                });
            }
            setShowInstModal(false);
            setEditingInst(null);
            setInstForm({ paymentId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
            fetchData();
            toast.success(editingInst ? 'Installment updated' : 'Installment added successfully');
        } catch (err) {
            console.error('Error saving installment:', err);
            toast.error('Failed to save installment');
        } finally {
            setSaving(false);
        }
    };

    const deleteInstallment = async (id) => {
        if (!window.confirm('Delete this installment?')) return;
        try {
            await deleteDoc(doc(db, 'installments', id));
            toast.success('Installment deleted');
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete installment');
        }
    };

    const editInst = (inst) => {
        setEditingInst(inst);
        setInstForm({
            paymentId: inst.paymentId,
            amount: inst.amount,
            date: inst.date,
            note: inst.note || ''
        });
        setShowInstModal(true);
    };

    return (
        <div className="tab-section">
            <div className="section-title">
                Payment Tracking
                <button className="btn btn-primary btn-sm" onClick={() => setShowPayModal(true)}>
                    + New Payment Record
                </button>
            </div>

            <div className="payments-list">
                {payments.length === 0 ? (
                    <div className="empty-state">No payment records created.</div>
                ) : (
                    payments.map(pay => {
                        const paidTotal = (installments[pay.id] || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                        const remaining = (parseFloat(pay.totalAmount) || 0) - paidTotal;
                        
                        return (
                            <div key={pay.id} className="payment-card">
                                <div className="pay-card-header">
                                    <div className="pay-info">
                                        <h4>{pay.projectName}</h4>
                                        <div className="pay-total">Total: ₹{parseFloat(pay.totalAmount).toLocaleString()}</div>
                                    </div>
                                    <div className="pay-status">
                                        <div className={`status-tag ${remaining <= 0 ? 'paid' : 'pending'}`}>
                                            {remaining <= 0 ? 'Fully Paid' : `Pending: ₹${remaining.toLocaleString()}`}
                                        </div>
                                        <button className="add-inst-btn" onClick={() => { 
                                            setInstForm({...instForm, paymentId: pay.id}); 
                                            setShowInstModal(true); 
                                        }}>
                                            + Add Installment
                                        </button>
                                    </div>
                                </div>

                                <div className="installments-area">
                                    <h5>Installment History</h5>
                                    {installments[pay.id]?.length > 0 ? (
                                        <table className="inst-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Note</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {installments[pay.id].map(inst => (
                                                    <tr key={inst.id}>
                                                        <td>{inst.date}</td>
                                                        <td style={{ fontWeight: 700 }}>₹{parseFloat(inst.amount).toLocaleString()}</td>
                                                        <td>{inst.note}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button className="mini-btn edit" onClick={() => editInst(inst)}>✏️</button>
                                                                <button className="mini-btn delete" onClick={() => deleteInstallment(inst.id)}>🗑️</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="no-inst">No installments added yet.</div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Payment Modal */}
            {showPayModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPayModal(false)}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h2 className="modal-title">Create Payment Record</h2>
                            <button className="close-btn" onClick={() => setShowPayModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddPayment} className="modal-form">
                            <div className="form-group">
                                <label>Select Project *</label>
                                <select 
                                    className="inv-input" 
                                    style={{ width: '100%', height: '42px' }} 
                                    required 
                                    value={payForm.projectId}
                                    onChange={e => setPayForm({...payForm, projectId: e.target.value})}
                                >
                                    <option value="">-- Choose Project --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Total Agreed Amount (₹) *</label>
                                <input type="number" required value={payForm.totalAmount} onChange={e => setPayForm({...payForm, totalAmount: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Note (Optional)</label>
                                <input type="text" value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>Create Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit Installment Modal */}
            {showInstModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowInstModal(false)}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingInst ? 'Edit Installment' : 'Add Installment'}</h2>
                            <button className="close-btn" onClick={() => { setShowInstModal(false); setEditingInst(null); }}>×</button>
                        </div>
                        <form onSubmit={handleAddInstallment} className="modal-form">
                            <div className="form-group">
                                <label>Paid Amount (₹) *</label>
                                <input type="number" required value={instForm.amount} onChange={e => setInstForm({...instForm, amount: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Paid Date *</label>
                                <input type="date" required value={instForm.date} onChange={e => setInstForm({...instForm, date: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Payment Note</label>
                                <input type="text" placeholder="Ex: Cash, GPay, Bank Transfer" value={instForm.note} onChange={e => setInstForm({...instForm, note: e.target.value})} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowInstModal(false); setEditingInst(null); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>Save Installment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .payments-list { display: flex; flex-direction: column; gap: 24px; margin-top: 20px; }
                .payment-card { 
                    border: 1.5px solid #f1f5f9; 
                    border-radius: 14px; 
                    overflow: hidden; 
                    background: #fff;
                    transition: border-color 0.2s;
                }
                .payment-card:hover { border-color: #cbd5e1; }
                .pay-card-header { 
                    padding: 20px; 
                    background: #f8fafc; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                }
                .pay-info h4 { margin: 0; font-size: 16px; color: #1e293b; }
                .pay-total { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; }
                .pay-status { display: flex; align-items: center; gap: 16px; }
                .status-tag { 
                    font-size: 12px; 
                    font-weight: 800; 
                    padding: 4px 10px; 
                    border-radius: 6px; 
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .status-tag.paid { background: #dcfce7; color: #15803d; }
                .status-tag.pending { background: #fee2e2; color: #b91c1c; }
                .add-inst-btn { 
                    background: #6366f1; 
                    color: white; 
                    border: none; 
                    padding: 8px 14px; 
                    border-radius: 8px; 
                    font-size: 12px; 
                    font-weight: 700; 
                    cursor: pointer;
                }
                .installments-area { padding: 20px; }
                .installments-area h5 { margin: 0 0 16px 0; font-size: 13px; color: #64748b; text-transform: uppercase; }
                .inst-table { width: 100%; border-collapse: collapse; }
                .inst-table th { text-align: left; font-size: 11px; color: #94a3b8; padding: 0 0 10px 0; border-bottom: 1px solid #f1f5f9; }
                .inst-table td { padding: 12px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #475569; }
                .mini-btn { background: none; border: none; cursor: pointer; padding: 4px; font-size: 14px; border-radius: 4px; }
                .mini-btn:hover { background: #f1f5f9; }
                .no-inst { padding: 20px 0; text-align: center; color: #94a3b8; font-size: 13px; }
            `}</style>
        </div>
    );
}
