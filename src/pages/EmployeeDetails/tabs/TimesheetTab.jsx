import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import Table from '../../../components/Table/Table';
import '../../../components/UI/UI.css';
import './TimesheetTab.css';

/* ─── Helpers ─────────────────────────────────────────── */
const toMins    = (t = '') => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const calcHours = (ci, co) => {
  if (!ci || !co) return 0;
  const diff = toMins(co) - toMins(ci);
  return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0;
};
const groupBy = (arr, fn) =>
  arr.reduce((acc, item) => { const k = fn(item); (acc[k] = acc[k] || []).push(item); return acc; }, {});
const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' }); };

const EMPTY = { date: '', checkIn: '', checkOut: '', notes: '' };

/* ─── Shared icon buttons ─────────────────────────────── */
const IconBtn = ({ onClick, title, color = 'var(--text-muted)', hoverBg = '#e0e7ff', hoverColor = 'var(--primary)', children }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 7,
        border: `1px solid ${hov ? hoverBg : 'var(--border)'}`,
        background: hov ? hoverBg : 'transparent',
        color: hov ? hoverColor : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
};

/* ─── Edit Timesheet Modal ────────────────────────────── */
function EditTimesheetModal({ record, empId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...record });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date || !form.checkIn || !form.checkOut) return;
    setSaving(true);
    try {
      const hoursWorked = calcHours(form.checkIn, form.checkOut);
      await updateDoc(doc(db, 'employees', empId, 'timesheets', record.id), {
        date: form.date, checkIn: form.checkIn, checkOut: form.checkOut,
        notes: form.notes, hoursWorked, updatedAt: new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const duration = calcHours(form.checkIn, form.checkOut);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: 480, animation: 'slideUp 0.22s ease', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>✏️ Edit Timesheet Entry</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Date','date','date'],['Check In','checkIn','time'],['Check Out','checkOut','time']].map(([label, key, type]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
              <input className="ts-form-input" type={type} value={form[key] || ''} onChange={e => sf(key, e.target.value)} />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Hours (auto)</label>
            <div style={{ height: 38, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f3f4f6', borderRadius: 8, fontSize: 13, fontWeight: 700, color: duration >= 8 ? '#059669' : '#d97706' }}>
              {duration}h
            </div>
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Notes</label>
            <input className="ts-form-input" placeholder="Optional notes" value={form.notes || ''} onChange={e => sf('notes', e.target.value)} />
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

/* ─── Delete Confirm Modal ────────────────────────────── */
function DeleteConfirm({ label, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxWidth: 380, width: '100%', overflow: 'hidden', animation: 'slideUp 0.22s ease' }}>
        <div style={{ background: 'linear-gradient(135deg,#fee2e2,#fff)', padding: '26px 26px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑️</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Delete Entry</div>
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

/* ─── Main TimesheetTab ───────────────────────────────── */
export default function TimesheetTab({ empId }) {
  const [sub, setSub]         = useState('daily');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ ...EMPTY });
  const [saving, setSaving]   = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'employees', empId, 'timesheets'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [empId]);

  useEffect(() => { fetch(); }, [fetch]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.date || !form.checkIn || !form.checkOut) return;
    setSaving(true);
    try {
      const hoursWorked = calcHours(form.checkIn, form.checkOut);
      await addDoc(collection(db, 'employees', empId, 'timesheets'), {
        ...form, hoursWorked, createdAt: new Date().toISOString(),
      });
      setForm({ ...EMPTY });
      fetch();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'employees', empId, 'timesheets', deleteTarget.id));
      setRecords(p => p.filter(r => r.id !== deleteTarget.id));
    } catch (e) { console.error(e); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  /* reports */
  const monthlyGroups = groupBy(records, r => r.date?.slice(0, 7));
  const monthlyData   = Object.entries(monthlyGroups).sort(([a],[b])=>b.localeCompare(a))
    .map(([ym, rows]) => ({ period: fmtMonth(ym), days: rows.length, hours: parseFloat(rows.reduce((s,r)=>s+(r.hoursWorked||0),0).toFixed(2)), avgIn: rows[0]?.checkIn||'—', avgOut: rows[0]?.checkOut||'—' }));

  const yearlyGroups = groupBy(records, r => r.date?.slice(0, 4));
  const yearlyData   = Object.entries(yearlyGroups).sort(([a],[b])=>b.localeCompare(a))
    .map(([yr, rows]) => ({ period: yr, days: rows.length, hours: parseFloat(rows.reduce((s,r)=>s+(r.hoursWorked||0),0).toFixed(2)), months: new Set(rows.map(r=>r.date?.slice(0,7))).size }));

  const EditSVG = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
  const TrashSVG = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;

  const dailyCols = [
    { key: 'date',        label: 'Date' },
    { key: 'checkIn',     label: 'Check In' },
    { key: 'checkOut',    label: 'Check Out' },
    { key: 'hoursWorked', label: 'Hours Worked',
      render: (v) => {
        const pct = Math.min(100, Math.round((v / 9) * 100));
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, minWidth: 36 }}>{v}h</span>
            <div className="ts-hours-bar-bg">
              <div className="ts-hours-bar" style={{ width: `${pct}%`, background: v >= 8 ? '#10b981' : '#f59e0b' }} />
            </div>
          </div>
        );
      }
    },
    { key: 'notes', label: 'Notes', render: v => v || '—' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn onClick={() => setEditTarget(row)} title="Edit" hoverBg="#e0e7ff" hoverColor="var(--primary)"><EditSVG /></IconBtn>
          <IconBtn onClick={() => setDeleteTarget(row)} title="Delete" hoverBg="#fee2e2" hoverColor="var(--danger)"><TrashSVG /></IconBtn>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="ts-subtabs">
        {[['daily','📅 Daily'],['monthly','📆 Monthly Report'],['yearly','📊 Yearly Report']].map(([k, l]) => (
          <button key={k} className={`ts-subtab${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {sub === 'daily' && (
        <>
          <div className="ts-add-card">
            <div className="ts-add-title">➕ Add Timesheet Entry</div>
            <div className="ts-form-row">
              <div className="ts-form-group"><label className="ts-form-label">Date</label><input className="ts-form-input" type="date" value={form.date} onChange={e => sf('date', e.target.value)} /></div>
              <div className="ts-form-group"><label className="ts-form-label">Check In</label><input className="ts-form-input" type="time" value={form.checkIn} onChange={e => sf('checkIn', e.target.value)} /></div>
              <div className="ts-form-group"><label className="ts-form-label">Check Out</label><input className="ts-form-input" type="time" value={form.checkOut} onChange={e => sf('checkOut', e.target.value)} /></div>
              <div className="ts-form-group"><label className="ts-form-label">Notes</label><input className="ts-form-input" placeholder="Optional notes" value={form.notes} onChange={e => sf('notes', e.target.value)} /></div>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? <span className="btn-spinner" /> : 'Save'}</button>
            </div>
          </div>
          {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading…</p>
            : <Table columns={dailyCols} data={records} emptyText="No timesheet entries yet. Add one above." />}
        </>
      )}

      {sub === 'monthly' && (
        <>
          <div className="ts-report-grid">
            {monthlyData.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet.</p>
              : monthlyData.map(m => (
                <div className="ts-report-card" key={m.period}>
                  <div className="ts-report-period">{m.period}</div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Days Present</span><span className="ts-report-stat-val">{m.days}</span></div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Total Hours</span><span className="ts-report-stat-val">{m.hours}h</span></div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Avg In</span><span className="ts-report-stat-val">{m.avgIn}</span></div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Avg Out</span><span className="ts-report-stat-val">{m.avgOut}</span></div>
                </div>
              ))}
          </div>
          {monthlyData.length > 0 && (
            <Table columns={[{key:'period',label:'Month'},{key:'days',label:'Days Present'},{key:'hours',label:'Total Hours',render:v=>`${v}h`}]}
              data={monthlyData.map((m,i)=>({...m,id:i}))} emptyText="No monthly data." />
          )}
        </>
      )}

      {sub === 'yearly' && (
        <>
          <div className="ts-report-grid">
            {yearlyData.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet.</p>
              : yearlyData.map(y => (
                <div className="ts-report-card" key={y.period}>
                  <div className="ts-report-period">{y.period}</div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Days Present</span><span className="ts-report-stat-val">{y.days}</span></div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Total Hours</span><span className="ts-report-stat-val">{y.hours}h</span></div>
                  <div className="ts-report-stat"><span className="ts-report-stat-label">Active Months</span><span className="ts-report-stat-val">{y.months}</span></div>
                </div>
              ))}
          </div>
          {yearlyData.length > 0 && (
            <Table columns={[{key:'period',label:'Year'},{key:'days',label:'Total Days'},{key:'hours',label:'Total Hours',render:v=>`${v}h`},{key:'months',label:'Months Active'}]}
              data={yearlyData.map((y,i)=>({...y,id:i}))} emptyText="No yearly data." />
          )}
        </>
      )}

      {editTarget && (
        <EditTimesheetModal record={editTarget} empId={empId}
          onClose={() => setEditTarget(null)}
          onSaved={() => { fetch(); setEditTarget(null); }} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          label={`timesheet entry on ${deleteTarget.date}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
