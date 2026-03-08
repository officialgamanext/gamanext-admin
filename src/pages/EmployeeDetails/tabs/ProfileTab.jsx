import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import '../../../components/UI/UI.css';
import './ProfileTab.css';

const Field = ({ label, value }) => (
  <div className="profile-field">
    <div className="profile-field-label">{label}</div>
    <div className="profile-field-value">
      {value ? value : <span className="profile-field-empty">Not provided</span>}
    </div>
  </div>
);

const SectionCard = ({ icon, title, children, onEdit }) => (
  <div className="profile-section-card">
    <div className="profile-section-head">
      <div className="profile-section-title">
        <span className="profile-section-icon2">{icon}</span>
        {title}
      </div>
      {onEdit && (
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
          </svg>
          Edit
        </button>
      )}
    </div>
    {children}
  </div>
);

export default function ProfileTab({ emp, empId, onUpdated }) {
  const [editSection, setEditSection] = useState(null); // 'personal' | 'identity' | 'bank' | 'emergency'
  const [form, setForm]   = useState({ ...emp });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const startEdit = (section) => {
    setForm({ ...emp });
    setEditSection(section);
    setSuccess('');
  };
  const cancelEdit = () => setEditSection(null);

  const saveSection = async () => {
    setSaving(true);
    try {
      const { password, ...safeData } = form;
      await updateDoc(doc(db, 'employees', empId), {
        ...safeData,
        updatedAt: new Date().toISOString(),
      });
      setSuccess('Details saved successfully!');
      setEditSection(null);
      onUpdated();
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const EditFooter = () => (
    <div className="profile-edit-footer">
      <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
      <button className="btn btn-primary" onClick={saveSection} disabled={saving}>
        {saving ? <><span className="btn-spinner" /> Saving…</> : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <div className="profile-tab">

      {success && (
        <div className="profile-success">✅ {success}</div>
      )}

      {/* ── Login Credentials (read-only) ── */}
      <SectionCard icon="🔐" title="Login Credentials">
        <div className="profile-grid cols-2">
          <Field label="Employee ID"    value={emp.employeeId} />
          <Field label="Username (Login)" value={emp.username} />
        </div>
      </SectionCard>

      {/* ── Personal Information ── */}
      <SectionCard icon="👤" title="Personal Information" onEdit={() => startEdit('personal')}>
        {editSection === 'personal' ? (
          <>
            <div className="profile-edit-grid">
              <div className="profile-edit-group span-2">
                <label className="profile-edit-label">Full Name</label>
                <input className="profile-edit-input" value={form.name || ''} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Date of Birth</label>
                <input className="profile-edit-input" type="date" value={form.dob || ''} onChange={e => set('dob', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Mobile Number</label>
                <input className="profile-edit-input" value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Personal Email</label>
                <input className="profile-edit-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Department</label>
                <input className="profile-edit-input" value={form.department || ''} onChange={e => set('department', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Designation</label>
                <input className="profile-edit-input" value={form.designation || ''} onChange={e => set('designation', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Status</label>
                <select className="profile-edit-select" value={form.status || 'Active'} onChange={e => set('status', e.target.value)}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="profile-edit-group span-3">
                <label className="profile-edit-label">Address</label>
                <textarea className="profile-edit-textarea" value={form.address || ''} onChange={e => set('address', e.target.value)} />
              </div>
            </div>
            <EditFooter />
          </>
        ) : (
          <div className="profile-grid">
            <Field label="Full Name"     value={emp.name} />
            <Field label="Date of Birth" value={emp.dob} />
            <Field label="Mobile Number" value={emp.mobile} />
            <Field label="Personal Email" value={emp.email} />
            <Field label="Department"    value={emp.department} />
            <Field label="Designation"   value={emp.designation} />
            <Field label="Status"        value={emp.status} />
            <Field label="Address"       value={emp.address} />
          </div>
        )}
      </SectionCard>

      {/* ── Identity Documents ── */}
      <SectionCard icon="🪪" title="Identity Documents" onEdit={() => startEdit('identity')}>
        {editSection === 'identity' ? (
          <>
            <div className="profile-edit-grid cols-2">
              <div className="profile-edit-group">
                <label className="profile-edit-label">Aadhar Card Number</label>
                <input className="profile-edit-input" placeholder="XXXX XXXX XXXX" maxLength={14}
                  value={form.aadhar || ''} onChange={e => set('aadhar', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">PAN Card Number</label>
                <input className="profile-edit-input" placeholder="ABCDE1234F" maxLength={10}
                  style={{ textTransform: 'uppercase' }}
                  value={form.pan || ''} onChange={e => set('pan', e.target.value.toUpperCase())} />
              </div>
            </div>
            <EditFooter />
          </>
        ) : (
          <div className="profile-grid cols-2">
            <Field label="Aadhar Card Number" value={emp.aadhar} />
            <Field label="PAN Card Number"    value={emp.pan} />
          </div>
        )}
      </SectionCard>

      {/* ── Bank Details ── */}
      <SectionCard icon="🏦" title="Bank Details" onEdit={() => startEdit('bank')}>
        {editSection === 'bank' ? (
          <>
            <div className="profile-edit-grid cols-2">
              <div className="profile-edit-group">
                <label className="profile-edit-label">Bank Name</label>
                <input className="profile-edit-input" value={form.bankName || ''} onChange={e => set('bankName', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Account Holder Name</label>
                <input className="profile-edit-input" value={form.accountHolder || ''} onChange={e => set('accountHolder', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Account Number</label>
                <input className="profile-edit-input" value={form.accountNumber || ''} onChange={e => set('accountNumber', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">IFSC Code</label>
                <input className="profile-edit-input" placeholder="SBIN0001234" maxLength={11}
                  style={{ textTransform: 'uppercase' }}
                  value={form.ifscCode || ''} onChange={e => set('ifscCode', e.target.value.toUpperCase())} />
              </div>
            </div>
            <EditFooter />
          </>
        ) : (
          <div className="profile-grid cols-2">
            <Field label="Bank Name"          value={emp.bankName} />
            <Field label="Account Holder"     value={emp.accountHolder} />
            <Field label="Account Number"     value={emp.accountNumber} />
            <Field label="IFSC Code"          value={emp.ifscCode} />
          </div>
        )}
      </SectionCard>

      {/* ── Emergency Contact ── */}
      <SectionCard icon="🆘" title="Emergency Contact" onEdit={() => startEdit('emergency')}>
        {editSection === 'emergency' ? (
          <>
            <div className="profile-edit-grid">
              <div className="profile-edit-group">
                <label className="profile-edit-label">Contact Name</label>
                <input className="profile-edit-input" value={form.emergencyName || ''} onChange={e => set('emergencyName', e.target.value)} />
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Relation</label>
                <select className="profile-edit-select" value={form.emergencyRelation || ''} onChange={e => set('emergencyRelation', e.target.value)}>
                  <option value="">Select</option>
                  {['Father','Mother','Spouse','Sibling','Friend','Guardian','Other'].map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="profile-edit-group">
                <label className="profile-edit-label">Mobile Number</label>
                <input className="profile-edit-input" value={form.emergencyMobile || ''} onChange={e => set('emergencyMobile', e.target.value)} />
              </div>
            </div>
            <EditFooter />
          </>
        ) : (
          <div className="profile-grid">
            <Field label="Contact Name" value={emp.emergencyName} />
            <Field label="Relation"     value={emp.emergencyRelation} />
            <Field label="Mobile"       value={emp.emergencyMobile} />
          </div>
        )}
      </SectionCard>

    </div>
  );
}
