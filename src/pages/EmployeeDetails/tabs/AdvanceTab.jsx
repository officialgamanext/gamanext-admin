import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../../../firebase';
import '../../../components/UI/UI.css';
import './AdvanceTab.css';

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ─── Shared Icon Button ─────────────────────────────── */
const IconBtn = ({ onClick, title, hoverBg = '#e0e7ff', hoverColor = 'var(--primary)', children }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${hov ? hoverBg : 'var(--border)'}`, background: hov ? hoverBg : 'transparent', color: hov ? hoverColor : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
      {children}
    </button>
  );
};

const EditSVG  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
const TrashSVG = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;

/* ─── Delete Confirm ─────────────────────────────────── */
function DeleteConfirm({ label, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxWidth: 380, width: '100%', overflow: 'hidden', animation: 'slideUp 0.22s ease' }}>
        <div style={{ background: 'linear-gradient(135deg,#fee2e2,#fff)', padding: '26px 26px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Delete Record</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Delete <strong>{label}</strong>? This cannot be undone.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="btn-spinner" /> Deleting…</> : '🗑 Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Installment Modal ─────────────────────────── */
function EditInstallmentModal({ inst, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: inst.amount || '', date: inst.date || '', note: inst.note || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      await updateDoc(inst._ref, { amount: Number(form.amount), date: form.date, note: form.note, updatedAt: new Date().toISOString() });
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxWidth: 420, width: '100%', overflow: 'hidden', animation: 'slideUp 0.22s ease' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>✏️ Edit Installment</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Amount (₹)','amount','number'],['Date','date','date']].map(([label, key, type]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
              <input className="adv-inst-input" type={type} min={type==='number'?1:undefined} value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} />
            </div>
          ))}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Note</label>
            <input className="adv-inst-input" placeholder="Payment description…" value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} />
          </div>
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Advance Modal ─────────────────────────────── */
function EditAdvanceModal({ adv, empId, onClose, onSaved }) {
  const [form, setForm] = useState({ totalAmount: adv.totalAmount || '', date: adv.date || '', reason: adv.reason || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.totalAmount || !form.date) return;
    setSaving(true);
    try {
      const total = Number(form.totalAmount);
      const remaining = Math.max(0, total - (adv.paidAmount || 0));
      await updateDoc(doc(db, 'employees', empId, 'advances', adv.id), {
        totalAmount: total,
        remainingAmount: remaining,
        date: form.date,
        reason: form.reason,
        status: remaining <= 0 ? 'Completed' : 'Ongoing',
        updatedAt: new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxWidth: 440, width: '100%', overflow: 'hidden', animation: 'slideUp 0.22s ease' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>✏️ Edit Advance — {fmt(adv.totalAmount)}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Amount (₹) *</label>
            <input className="adv-form-input" type="number" min="1" value={form.totalAmount} onChange={e => setForm(f=>({...f,totalAmount:e.target.value}))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Date *</label>
            <input className="adv-form-input" type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Reason</label>
            <input className="adv-form-input" placeholder="e.g. Medical emergency" value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))} />
          </div>
          <div style={{ gridColumn: 'span 2', background: '#f3f4f6', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
            📌 Paid so far: {fmt(adv.paidAmount || 0)} — remaining will be recalculated automatically.
          </div>
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Installment List ───────────────────────────────── */
function InstallmentList({ empId, advId, totalAmount, onUpdate }) {
  const [insts, setInsts]   = useState([]);
  const [form, setForm]     = useState({ amount: '', date: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [editInst, setEditInst]         = useState(null);
  const [deleteInst, setDeleteInst]     = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchInsts = useCallback(async () => {
    const q    = query(collection(db, 'employees', empId, 'advances', advId, 'installments'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, _ref: d.ref, ...d.data() }));
    setInsts(data);
    const paid = data.reduce((s, i) => s + Number(i.amount || 0), 0);
    await updateDoc(doc(db, 'employees', empId, 'advances', advId), {
      paidAmount: paid,
      remainingAmount: Math.max(0, Number(totalAmount) - paid),
      status: paid >= Number(totalAmount) ? 'Completed' : 'Ongoing',
    });
    onUpdate?.();
  }, [empId, advId, totalAmount, onUpdate]);

  useEffect(() => { fetchInsts(); }, [fetchInsts]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'employees', empId, 'advances', advId, 'installments'), {
        ...form, amount: Number(form.amount), createdAt: new Date().toISOString(),
      });
      setForm({ amount: '', date: '', note: '' });
      setShowForm(false);
      fetchInsts();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const confirmDeleteInst = async () => {
    if (!deleteInst) return;
    setDeleting(true);
    try {
      await deleteDoc(deleteInst._ref);
      fetchInsts();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); setDeleteInst(null); }
  };

  const paidTotal = insts.reduce((s, i) => s + Number(i.amount || 0), 0);
  const pct       = totalAmount > 0 ? Math.min(100, Math.round((paidTotal / totalAmount) * 100)) : 0;

  return (
    <div className="adv-installments">
      <div className="adv-inst-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          💳 Installments
          <span className="badge badge-primary"><span className="badge-dot" />{insts.length} payments</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '➕ Add Payment'}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="adv-progress-bg" style={{ width: '100%' }}>
          <div className="adv-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {fmt(paidTotal)} / {fmt(totalAmount)} ({pct}%)
        </span>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="adv-inst-add-form">
          <div className="adv-inst-form-group">
            <label className="adv-inst-label">Amount (₹) *</label>
            <input className="adv-inst-input" type="number" min="1" placeholder="e.g. 5000" value={form.amount} onChange={e => sf('amount', e.target.value)} />
          </div>
          <div className="adv-inst-form-group">
            <label className="adv-inst-label">Date *</label>
            <input className="adv-inst-input" type="date" value={form.date} onChange={e => sf('date', e.target.value)} />
          </div>
          <div className="adv-inst-form-group">
            <label className="adv-inst-label">Note</label>
            <input className="adv-inst-input" placeholder="Payment description..." value={form.note} onChange={e => sf('note', e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Save'}
          </button>
        </div>
      )}

      {/* Installment list */}
      {insts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No installments recorded yet.</p>
      ) : (
        <div className="adv-inst-list">
          {insts.map((inst, idx) => (
            <div className="adv-inst-item" key={inst.id}>
              <div className="adv-inst-item-left">
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>#{idx + 1}</span>
                <span className="adv-inst-amount">{fmt(inst.amount)}</span>
                <span className="adv-inst-date">📅 {inst.date}</span>
                {inst.note && <span className="adv-inst-note">· {inst.note}</span>}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <IconBtn onClick={() => setEditInst(inst)} title="Edit" hoverBg="#e0e7ff" hoverColor="var(--primary)"><EditSVG /></IconBtn>
                <IconBtn onClick={() => setDeleteInst(inst)} title="Delete" hoverBg="#fee2e2" hoverColor="var(--danger)"><TrashSVG /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editInst && <EditInstallmentModal inst={editInst} onClose={() => setEditInst(null)} onSaved={() => { fetchInsts(); setEditInst(null); }} />}
      {deleteInst && <DeleteConfirm label={`payment of ${fmt(deleteInst.amount)} on ${deleteInst.date}`} onCancel={() => setDeleteInst(null)} onConfirm={confirmDeleteInst} deleting={deleting} />}
    </div>
  );
}

/* ─── Advance Card ───────────────────────────────────── */
function AdvanceCard({ adv, empId, isOpen, onToggle, onRefresh }) {
  const [editAdv, setEditAdv]       = useState(false);
  const [deleteAdv, setDeleteAdv]   = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const pct = adv.totalAmount > 0
    ? Math.min(100, Math.round(((adv.paidAmount || 0) / adv.totalAmount) * 100))
    : 0;

  const confirmDeleteAdv = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'employees', empId, 'advances', adv.id));
      setDeleteAdv(false);
      onRefresh();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <div className="adv-card">
        <div className="adv-card-head" onClick={onToggle}>
          <div className="adv-card-left">
            <div className="adv-card-amount">{fmt(adv.totalAmount)}</div>
            <div className="adv-card-meta">
              <span>📅 {adv.date}</span>
              {adv.reason && <span>📝 {adv.reason}</span>}
              <span>Paid: {fmt(adv.paidAmount || 0)}</span>
              <span>Remaining: {fmt(adv.remainingAmount || adv.totalAmount)}</span>
            </div>
          </div>
          <div className="adv-card-right" onClick={e => e.stopPropagation()}>
            <div className="adv-progress-wrap">
              <div className="adv-progress-bg">
                <div className="adv-progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#6366f1' }} />
              </div>
              <span className="adv-progress-text">{pct}% repaid</span>
            </div>
            <span className={`badge badge-${adv.status === 'Completed' ? 'success' : 'primary'}`}>
              <span className="badge-dot" />{adv.status || 'Ongoing'}
            </span>
            {/* Edit / Delete for the advance itself */}
            <IconBtn onClick={() => setEditAdv(true)} title="Edit Advance" hoverBg="#e0e7ff" hoverColor="var(--primary)"><EditSVG /></IconBtn>
            <IconBtn onClick={() => setDeleteAdv(true)} title="Delete Advance" hoverBg="#fee2e2" hoverColor="var(--danger)"><TrashSVG /></IconBtn>
            <i className={`adv-chevron${isOpen ? ' open' : ''}`} onClick={onToggle} style={{ cursor: 'pointer' }}>▾</i>
          </div>
        </div>

        {isOpen && (
          <InstallmentList
            empId={empId}
            advId={adv.id}
            totalAmount={adv.totalAmount}
            onUpdate={onRefresh}
          />
        )}
      </div>

      {editAdv && <EditAdvanceModal adv={adv} empId={empId} onClose={() => setEditAdv(false)} onSaved={() => { setEditAdv(false); onRefresh(); }} />}
      {deleteAdv && <DeleteConfirm label={`advance of ${fmt(adv.totalAmount)} on ${adv.date}`} onCancel={() => setDeleteAdv(false)} onConfirm={confirmDeleteAdv} deleting={deleting} />}
    </>
  );
}

/* ─── Main AdvanceTab ─────────────────────────────────── */
export default function AdvanceTab({ empId }) {
  const [advances, setAdvances]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ amount: '', date: '', reason: '' });
  const [saving, setSaving]       = useState(false);
  const [openIds, setOpenIds]     = useState(new Set());

  const toggleOpen = (id) => setOpenIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const refreshAdvances = useCallback(async () => {
    try {
      const q    = query(collection(db, 'employees', empId, 'advances'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setAdvances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, [empId]);

  const fetch = useCallback(async () => {
    setLoading(true);
    await refreshAdvances();
    setLoading(false);
  }, [refreshAdvances]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'employees', empId, 'advances'), {
        totalAmount: Number(form.amount), paidAmount: 0, remainingAmount: Number(form.amount),
        date: form.date, reason: form.reason, status: 'Ongoing', createdAt: new Date().toISOString(),
      });
      setForm({ amount: '', date: '', reason: '' });
      setShowForm(false);
      refreshAdvances();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const totalAdvanced  = advances.reduce((s, a) => s + Number(a.totalAmount || 0), 0);
  const totalPaid      = advances.reduce((s, a) => s + Number(a.paidAmount   || 0), 0);
  const totalRemaining = advances.reduce((s, a) => s + Number(a.remainingAmount ?? a.totalAmount ?? 0), 0);

  return (
    <div>
      {/* Summary */}
      <div className="adv-summary">
        <div className="adv-summary-card"><div className="adv-summary-label">Total Advanced</div><div className="adv-summary-value blue">{fmt(totalAdvanced)}</div></div>
        <div className="adv-summary-card"><div className="adv-summary-label">Total Paid</div><div className="adv-summary-value green">{fmt(totalPaid)}</div></div>
        <div className="adv-summary-card"><div className="adv-summary-label">Balance Remaining</div><div className="adv-summary-value red">{fmt(totalRemaining)}</div></div>
      </div>

      {/* Header */}
      <div className="adv-header">
        <div>
          <div className="adv-title">Advance Records</div>
          <div className="adv-subtitle">{advances.length} advance{advances.length !== 1 ? 's' : ''} · Click any to expand installments · Use ✏️ / 🗑️ to edit or delete</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Advance</>)}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="adv-add-form">
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>💰 New Advance Amount</div>
          <div className="adv-form-row">
            <div className="adv-form-group"><label className="adv-form-label">Amount (₹) *</label><input className="adv-form-input" type="number" min="1" placeholder="e.g. 20000" value={form.amount} onChange={e => sf('amount', e.target.value)} /></div>
            <div className="adv-form-group"><label className="adv-form-label">Date *</label><input className="adv-form-input" type="date" value={form.date} onChange={e => sf('date', e.target.value)} /></div>
            <div className="adv-form-group"><label className="adv-form-label">Reason</label><input className="adv-form-input" placeholder="e.g. Medical emergency" value={form.reason} onChange={e => sf('reason', e.target.value)} /></div>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? <span className="btn-spinner" /> : 'Save Advance'}</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading advances…</p>
      ) : advances.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💸</div>
          <p style={{ fontSize: 14 }}>No advances recorded yet.</p>
        </div>
      ) : (
        advances.map(adv => (
          <AdvanceCard
            key={adv.id} adv={adv} empId={empId}
            isOpen={openIds.has(adv.id)}
            onToggle={() => toggleOpen(adv.id)}
            onRefresh={refreshAdvances}
          />
        ))
      )}
    </div>
  );
}
