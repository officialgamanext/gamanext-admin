import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../../../firebase';
import '../../../components/UI/UI.css';
import './AdvanceTab.css';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ── Installment row list ── */
function InstallmentList({ empId, advId, totalAmount, onUpdate }) {
  const [insts, setInsts]   = useState([]);
  const [form, setForm]     = useState({ amount: '', date: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchInsts = useCallback(async () => {
    const q    = query(collection(db, 'employees', empId, 'advances', advId, 'installments'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setInsts(data);
    // silently update paidAmount on the parent advance doc (no re-fetch of AdvanceTab)
    const paid = data.reduce((s, i) => s + Number(i.amount || 0), 0);
    await updateDoc(doc(db, 'employees', empId, 'advances', advId), {
      paidAmount:      paid,
      remainingAmount: Math.max(0, Number(totalAmount) - paid),
      status:          paid >= Number(totalAmount) ? 'Completed' : 'Ongoing',
    });
    // notify parent to refresh advance list data (for summary row only, NOT re-mount)
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

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'employees', empId, 'advances', advId, 'installments', id));
    fetchInsts();
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

      {/* Mini progress */}
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
            <input className="adv-inst-input" type="number" min="1" placeholder="e.g. 5000"
              value={form.amount} onChange={e => sf('amount', e.target.value)} />
          </div>
          <div className="adv-inst-form-group">
            <label className="adv-inst-label">Date *</label>
            <input className="adv-inst-input" type="date"
              value={form.date} onChange={e => sf('date', e.target.value)} />
          </div>
          <div className="adv-inst-form-group">
            <label className="adv-inst-label">Note</label>
            <input className="adv-inst-input" placeholder="Payment description..."
              value={form.note} onChange={e => sf('note', e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Save'}
          </button>
        </div>
      )}

      {/* List */}
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
              <button
                onClick={() => handleDelete(inst.id)}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 15 }}
                title="Delete"
              >🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Advance Card ── */
function AdvanceCard({ adv, empId, isOpen, onToggle, onRefresh }) {
  const pct = adv.totalAmount > 0
    ? Math.min(100, Math.round(((adv.paidAmount || 0) / adv.totalAmount) * 100))
    : 0;

  return (
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
        <div className="adv-card-right">
          <div className="adv-progress-wrap">
            <div className="adv-progress-bg">
              <div className="adv-progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#6366f1' }} />
            </div>
            <span className="adv-progress-text">{pct}% repaid</span>
          </div>
          <span className={`badge badge-${adv.status === 'Completed' ? 'success' : 'primary'}`}>
            <span className="badge-dot" />{adv.status || 'Ongoing'}
          </span>
          <i className={`adv-chevron${isOpen ? ' open' : ''}`}>▾</i>
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
  );
}

/* ── Main AdvanceTab ── */
export default function AdvanceTab({ empId }) {
  const [advances, setAdvances]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ amount: '', date: '', reason: '' });
  const [saving, setSaving]       = useState(false);
  // Track which advance IDs are expanded — lives in parent so fetch() doesn't collapse them
  const [openIds, setOpenIds]     = useState(new Set());

  const toggleOpen = (id) => setOpenIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  // Refresh ONLY the advances list data (amounts/status), not a full remount
  const refreshAdvances = useCallback(async () => {
    try {
      const q    = query(collection(db, 'employees', empId, 'advances'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setAdvances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, [empId]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'employees', empId, 'advances'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setAdvances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [empId]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'employees', empId, 'advances'), {
        totalAmount:     Number(form.amount),
        paidAmount:      0,
        remainingAmount: Number(form.amount),
        date:            form.date,
        reason:          form.reason,
        status:          'Ongoing',
        createdAt:       new Date().toISOString(),
      });
      setForm({ amount: '', date: '', reason: '' });
      setShowForm(false);
      fetch();
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
        <div className="adv-summary-card">
          <div className="adv-summary-label">Total Advanced</div>
          <div className="adv-summary-value blue">{fmt(totalAdvanced)}</div>
        </div>
        <div className="adv-summary-card">
          <div className="adv-summary-label">Total Paid</div>
          <div className="adv-summary-value green">{fmt(totalPaid)}</div>
        </div>
        <div className="adv-summary-card">
          <div className="adv-summary-label">Balance Remaining</div>
          <div className="adv-summary-value red">{fmt(totalRemaining)}</div>
        </div>
      </div>

      {/* Header */}
      <div className="adv-header">
        <div>
          <div className="adv-title">Advance Records</div>
          <div className="adv-subtitle">{advances.length} advance{advances.length !== 1 ? 's' : ''} · Click any to expand installments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Advance
            </>
          )}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="adv-add-form">
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>💰 New Advance Amount</div>
          <div className="adv-form-row">
            <div className="adv-form-group">
              <label className="adv-form-label">Amount (₹) *</label>
              <input className="adv-form-input" type="number" min="1" placeholder="e.g. 20000"
                value={form.amount} onChange={e => sf('amount', e.target.value)} />
            </div>
            <div className="adv-form-group">
              <label className="adv-form-label">Date *</label>
              <input className="adv-form-input" type="date"
                value={form.date} onChange={e => sf('date', e.target.value)} />
            </div>
            <div className="adv-form-group">
              <label className="adv-form-label">Reason</label>
              <input className="adv-form-input" placeholder="e.g. Medical emergency"
                value={form.reason} onChange={e => sf('reason', e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? <span className="btn-spinner" /> : 'Save Advance'}
            </button>
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
            key={adv.id}
            adv={adv}
            empId={empId}
            isOpen={openIds.has(adv.id)}
            onToggle={() => toggleOpen(adv.id)}
            onRefresh={refreshAdvances}
          />
        ))
      )}
    </div>
  );
}
