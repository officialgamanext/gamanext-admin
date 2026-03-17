import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import Table from '../../../components/Table/Table';

export default function ProjectsTab({ customerId }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // For Edit
    const [editingProject, setEditingProject] = useState(null);

    const [form, setForm] = useState({
        projectName: '',
        budget: '',
        status: 'Ongoing', // Ongoing, Completed, Pending
        description: ''
    });

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'projects'), 
                where('customerId', '==', customerId)
                // Temporarily disabled orderBy to avoid index issues. 
                // Will implement client-side sorting instead.
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Client-side sorting as fallback for missing firestore index
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setProjects(list);
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [customerId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingProject) {
                await updateDoc(doc(db, 'projects', editingProject.id), form);
            } else {
                await addDoc(collection(db, 'projects'), {
                    ...form,
                    customerId,
                    createdAt: serverTimestamp(),
                });
            }
            setShowAddModal(false);
            setEditingProject(null);
            setForm({ projectName: '', budget: '', status: 'Ongoing', description: '' });
            fetchProjects();
        } catch (err) {
            console.error('Error saving project:', err);
            alert('Failed to save project. Please check if all fields are correct.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        try {
            await deleteDoc(doc(db, 'projects', id));
            fetchProjects();
        } catch (err) {
            console.error('Error deleting project:', err);
        }
    };

    const handleEdit = (proj) => {
        setEditingProject(proj);
        setForm({
            projectName: proj.projectName,
            budget: proj.budget,
            status: proj.status,
            description: proj.description || ''
        });
        setShowAddModal(true);
    };

    const columns = [
        { key: 'projectName', label: 'Project Name' },
        { 
            key: 'budget', 
            label: 'Budget', 
            render: v => `₹${parseFloat(v).toLocaleString('en-IN')}` 
        },
        { 
            key: 'status', 
            label: 'Status',
            render: v => (
                <span className={`badge badge-${v.toLowerCase()}`}>
                    {v}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="action-btn edit" onClick={() => handleEdit(row)}>Edit</button>
                    <button className="action-btn delete" onClick={() => handleDelete(row.id)}>Delete</button>
                </div>
            )
        }
    ];

    return (
        <div className="tab-section">
            <div className="section-title">
                Customer Projects
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingProject(null); setForm({projectName:'', budget:'', status:'Ongoing', description:''}); setShowAddModal(true); }}>
                    + New Project
                </button>
            </div>

            {loading ? (
                <div>Loading projects...</div>
            ) : projects.length > 0 ? (
                <Table columns={columns} data={projects} />
            ) : (
                <div className="empty-state">No projects found for this customer.</div>
            )}

            {showAddModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingProject ? 'Edit Project' : 'Add New Project'}</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Project Name *</label>
                                <input required value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Budget (₹) *</label>
                                <input type="number" required value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="inv-input" style={{ width: '100%', height: '42px', padding: '0 12px' }}>
                                    <option value="Ongoing">Ongoing</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="inv-input" rows={3} style={{ width: '100%', padding: '10px' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 700;
                }
                .badge-ongoing { background: #e0f2fe; color: #0284c7; }
                .badge-completed { background: #f0fdf4; color: #16a34a; }
                .badge-pending { background: #fff7ed; color: #ea580c; }
                
                .action-btn {
                    padding: 5px 10px;
                    border-radius: 6px;
                    border: none;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .action-btn.edit { background: #f1f5f9; color: #475569; }
                .action-btn.delete { background: #fef2f2; color: #ef4444; }
                .empty-state { padding: 40px; text-align: center; color: #64748b; }
            `}</style>
        </div>
    );
}
