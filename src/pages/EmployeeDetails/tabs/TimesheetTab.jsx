import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import Table from '../../../components/Table/Table';
import '../../../components/UI/UI.css';
import './TimesheetTab.css';

const toMins   = (t = '') => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const calcHours = (ci, co) => {
  if (!ci || !co) return 0;
  const diff = toMins(co) - toMins(ci);
  return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0;
};

const groupBy = (arr, fn) =>
  arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

const fmtMonth = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const EMPTY = { date: '', checkIn: '', checkOut: '', notes: '' };

export default function TimesheetTab({ empId }) {
  const [sub, setSub]         = useState('daily');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ ...EMPTY });
  const [saving, setSaving]   = useState(false);

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
      const hours = calcHours(form.checkIn, form.checkOut);
      await addDoc(collection(db, 'employees', empId, 'timesheets'), {
        ...form, hoursWorked: hours, createdAt: new Date().toISOString(),
      });
      setForm({ ...EMPTY });
      fetch();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'employees', empId, 'timesheets', id));
    setRecords(p => p.filter(r => r.id !== id));
  };

  /* ── Monthly report ── */
  const monthlyGroups = groupBy(records, r => r.date?.slice(0, 7));
  const monthlyData   = Object.entries(monthlyGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([ym, rows]) => ({
      period: fmtMonth(ym),
      days: rows.length,
      hours: parseFloat(rows.reduce((s, r) => s + (r.hoursWorked || 0), 0).toFixed(2)),
      avgIn:  rows[0]?.checkIn  || '—',
      avgOut: rows[0]?.checkOut || '—',
    }));

  /* ── Yearly report ── */
  const yearlyGroups = groupBy(records, r => r.date?.slice(0, 4));
  const yearlyData   = Object.entries(yearlyGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([yr, rows]) => ({
      period: yr,
      days: rows.length,
      hours: parseFloat(rows.reduce((s, r) => s + (r.hoursWorked || 0), 0).toFixed(2)),
      months: new Set(rows.map(r => r.date?.slice(0, 7))).size,
    }));

  const dailyCols = [
    { key: 'date',        label: 'Date' },
    { key: 'checkIn',     label: 'Check In' },
    { key: 'checkOut',    label: 'Check Out' },
    {
      key: 'hoursWorked', label: 'Hours Worked',
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
      key: 'actions', label: '',
      render: (_, row) => (
        <button
          onClick={() => handleDelete(row.id)}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}
          title="Delete"
        >🗑</button>
      )
    }
  ];

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="ts-subtabs">
        {[['daily','📅 Daily'],['monthly','📆 Monthly Report'],['yearly','📊 Yearly Report']].map(([k, l]) => (
          <button key={k} className={`ts-subtab${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {/* ── Daily ── */}
      {sub === 'daily' && (
        <>
          <div className="ts-add-card">
            <div className="ts-add-title">➕ Add Timesheet Entry</div>
            <div className="ts-form-row">
              <div className="ts-form-group">
                <label className="ts-form-label">Date</label>
                <input className="ts-form-input" type="date" value={form.date} onChange={e => sf('date', e.target.value)} />
              </div>
              <div className="ts-form-group">
                <label className="ts-form-label">Check In</label>
                <input className="ts-form-input" type="time" value={form.checkIn} onChange={e => sf('checkIn', e.target.value)} />
              </div>
              <div className="ts-form-group">
                <label className="ts-form-label">Check Out</label>
                <input className="ts-form-input" type="time" value={form.checkOut} onChange={e => sf('checkOut', e.target.value)} />
              </div>
              <div className="ts-form-group">
                <label className="ts-form-label">Notes</label>
                <input className="ts-form-input" placeholder="Optional notes" value={form.notes} onChange={e => sf('notes', e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <span className="btn-spinner" /> : 'Save'}
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading…</p>
          ) : (
            <Table columns={dailyCols} data={records} emptyText="No timesheet entries yet. Add one above." />
          )}
        </>
      )}

      {/* ── Monthly ── */}
      {sub === 'monthly' && (
        <>
          <div className="ts-report-grid">
            {monthlyData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet.</p>
            ) : monthlyData.map(m => (
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
            <Table
              columns={[
                { key: 'period', label: 'Month' },
                { key: 'days',   label: 'Days Present' },
                { key: 'hours',  label: 'Total Hours', render: v => `${v}h` },
              ]}
              data={monthlyData.map((m, i) => ({ ...m, id: i }))}
              emptyText="No monthly data."
            />
          )}
        </>
      )}

      {/* ── Yearly ── */}
      {sub === 'yearly' && (
        <>
          <div className="ts-report-grid">
            {yearlyData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet.</p>
            ) : yearlyData.map(y => (
              <div className="ts-report-card" key={y.period}>
                <div className="ts-report-period">{y.period}</div>
                <div className="ts-report-stat"><span className="ts-report-stat-label">Days Present</span><span className="ts-report-stat-val">{y.days}</span></div>
                <div className="ts-report-stat"><span className="ts-report-stat-label">Total Hours</span><span className="ts-report-stat-val">{y.hours}h</span></div>
                <div className="ts-report-stat"><span className="ts-report-stat-label">Active Months</span><span className="ts-report-stat-val">{y.months}</span></div>
              </div>
            ))}
          </div>
          {yearlyData.length > 0 && (
            <Table
              columns={[
                { key: 'period', label: 'Year' },
                { key: 'days',   label: 'Total Days' },
                { key: 'hours',  label: 'Total Hours', render: v => `${v}h` },
                { key: 'months', label: 'Months Active' },
              ]}
              data={yearlyData.map((y, i) => ({ ...y, id: i }))}
              emptyText="No yearly data."
            />
          )}
        </>
      )}
    </div>
  );
}
