import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../../firebase';

export default function ProfileTab({ customer, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ ...customer });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'customers', customer.id);
            await updateDoc(docRef, form);
            onUpdate(form);
            setIsEditing(false);
            toast.success('Profile updated successfully');
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="tab-section">
            <div className="section-title">
                Profile Details
                {!isEditing && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                        Edit Profile
                    </button>
                )}
            </div>

            <div className="profile-grid">
                <div className="form-group">
                    <label>Full Name</label>
                    {isEditing ? (
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    ) : (
                        <div className="display-val">{customer.name}</div>
                    )}
                </div>
                <div className="form-group">
                    <label>Mobile Number</label>
                    {isEditing ? (
                        <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
                    ) : (
                        <div className="display-val">{customer.mobile}</div>
                    )}
                </div>
                <div className="form-group">
                    <label>Business Name</label>
                    {isEditing ? (
                        <input value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} />
                    ) : (
                        <div className="display-val">{customer.businessName || 'N/A'}</div>
                    )}
                </div>
                <div className="form-group">
                    <label>Email Address</label>
                    {isEditing ? (
                        <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    ) : (
                        <div className="display-val">{customer.email || 'N/A'}</div>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="profile-actions">
                    <button className="btn btn-secondary" onClick={() => { setForm({...customer}); setIsEditing(false); }}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}

            <style>{`
                .profile-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }
                .display-val {
                    padding: 10px 0;
                    font-size: 15px;
                    font-weight: 600;
                    color: #1e293b;
                    border-bottom: 1px solid #f1f5f9;
                }
                .profile-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid #f1f5f9;
                }
                .btn-sm {
                    padding: 6px 12px;
                    font-size: 13px;
                }
            `}</style>
        </div>
    );
}
