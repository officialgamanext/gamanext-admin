import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, doc, setDoc, getDocs, query, orderBy, where, serverTimestamp 
} from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import Table from '../../components/Table/Table';
import './Invoices.css';

/* ─── Helpers ────────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const getInvoicePrefixDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${month}${year}`;
};

/* ─── Icons ──────────────────────────────────────────── */
const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
);

const DownloadIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
);

const BackIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
);

/* ─── Components ─────────────────────────────────────── */

function Section({ icon, title, children }) {
    return (
        <div className="inv-section">
            <div className="inv-section-head">
                <span className="inv-section-icon">{icon}</span>
                <span className="inv-section-title">{title}</span>
            </div>
            <div className="inv-section-body">{children}</div>
        </div>
    );
}

function Field({ label, children, span }) {
    return (
        <div className={`inv-field${span ? ` span-${span}` : ''}`}>
            <label className="inv-label">{label}</label>
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   INVOICE DOCUMENT PREVIEW
   ═══════════════════════════════════════════════════ */
function InvoiceDoc({ invoice, innerRef }) {
    const {
        invoiceId, date,
        companyName, companyAddress, companyEmail, companyPhone,
        customerName, customerAddress, customerEmail, customerPhone,
        items, terms,
    } = invoice;

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (parseFloat(item.discount) || 0), 0);
    const totalFinal = items.reduce((sum, item) => sum + (parseFloat(item.finalAmount) || 0), 0);

    return (
        <div className="idoc" ref={innerRef}>
            {/* Header */}
            <div className="idoc-header">
                <div className="idoc-logo-area">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <img src="/fav.png" alt="Logo" style={{ height: '50px', width: 'auto' }} />
                        <div className="idoc-company">{companyName}</div>
                    </div>
                    <div className="idoc-meta">
                        {companyAddress}<br />
                        Email: {companyEmail}<br />
                        Phone: {companyPhone}
                    </div>
                </div>
                <div className="idoc-title-area">
                    <h1 className="idoc-title">INVOICE</h1>
                    <div className="idoc-inv-id">#{invoiceId}</div>
                    <div className="idoc-meta" style={{ marginTop: 8 }}>
                        Date: {formatDate(date)}
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="idoc-info-grid">
                <div>
                    <div className="idoc-label">Bill To</div>
                    <div className="idoc-val">
                        <strong>{customerName || 'Customer Name'}</strong><br />
                        {customerEmail && `Email: ${customerEmail}`}<br />
                        {customerPhone && `Phone: ${customerPhone}`}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="idoc-table">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>Sl.No</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right', width: 100 }}>Amount</th>
                        <th style={{ textAlign: 'right', width: 100 }}>Discount</th>
                        <th style={{ textAlign: 'right', width: 120 }}>Final Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{item.description}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.discount)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.finalAmount)}</td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                                No items added yet
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Totals */}
            <div className="idoc-total-box">
                <div className="idoc-total-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="idoc-total-row">
                    <span>Total Discount</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="idoc-total-row idoc-total-final">
                    <span>Total Amount</span>
                    <span>{formatCurrency(totalFinal)}</span>
                </div>
            </div>

            {/* Terms */}
            {terms.length > 0 && (
                <div className="idoc-terms">
                    <div className="idoc-terms-title">Terms & Conditions</div>
                    <ul className="idoc-terms-list">
                        {terms.map((t, idx) => <li key={idx}>{t}</li>)}
                    </ul>
                </div>
            )}

            {/* Footer */}
            <div className="idoc-footer">
                <div className="idoc-footer-note">
                    Thank you for your business!<br />
                    This is a computer-generated invoice.
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Invoices() {
    const [view, setView] = useState('list'); // 'list' or 'create'
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    
    const DEFAULT_TERMS = [
        "50% of the total project cost must be paid in advance before the project begins.",
        "The remaining 50% must be paid upon project completion, before final delivery.",
        "Any work not included in the agreed project scope will be charged separately."
    ];

    // Form State
    const [form, setForm] = useState({
        invoiceId: '',
        date: today(),
        companyName: 'GamaNext Technologies',
        companyAddress: 'Nellore, Andhrapradesh, India',
        companyEmail: 'billing@gamanext.com',
        companyPhone: '+91 90000 00000',
        customerName: '',
        customerAddress: '',
        customerEmail: '',
        customerPhone: '',
        items: [{ slNo: 1, description: '', amount: '', discount: '', finalAmount: 0 }],
        terms: DEFAULT_TERMS,
        totalAmount: 0,
    });

    const [showPreview, setShowPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewingInvoice, setPreviewingInvoice] = useState(null);
    const docRef = useRef(null);

    /* ── Initial Form ── */
    const EMPTY_FORM = {
        invoiceId: '',
        date: today(),
        companyName: 'GamaNext Technologies',
        companyAddress: 'Nellore, Andhrapradesh, India',
        companyEmail: 'billing@gamanext.com',
        companyPhone: '+91 90000 00000',
        customerName: '',
        customerAddress: '',
        customerEmail: '',
        customerPhone: '',
        items: [{ slNo: 1, description: '', amount: '', discount: '', finalAmount: 0 }],
        terms: DEFAULT_TERMS,
        totalAmount: 0,
    };

    /* ── Fetch Invoices ── */
    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view === 'list') fetchInvoices();
    }, [view, fetchInvoices]);

    /* ── Generate Invoice ID ── */
    useEffect(() => {
        if (view === 'create' && !form.invoiceId) {
            const generateId = async () => {
                const prefixDate = getInvoicePrefixDate();
                const prefix = `GN${prefixDate}`;
                
                const q = query(collection(db, 'invoices'), where('invoiceId', '>=', prefix), where('invoiceId', '<=', prefix + '\uf8ff'));
                const snap = await getDocs(q);
                const count = snap.size + 1;
                
                setForm(f => ({ ...f, invoiceId: `${prefix}${count}` }));
            };
            generateId();
        }
    }, [view, form.invoiceId]);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    /* ── Item Handlers ── */
    const updateItem = (index, field, val) => {
        const newItems = [...form.items];
        newItems[index][field] = val;
        
        // Auto-calculate final amount
        const amt = parseFloat(newItems[index].amount) || 0;
        const dis = parseFloat(newItems[index].discount) || 0;
        newItems[index].finalAmount = Math.max(0, amt - dis);
        
        const total = newItems.reduce((sum, it) => sum + (it.finalAmount || 0), 0);
        setForm(f => ({ ...f, items: newItems, totalAmount: total }));
    };

    const addItem = () => {
        setForm(f => ({
            ...f,
            items: [...f.items, { slNo: f.items.length + 1, description: '', amount: '', discount: '', finalAmount: 0 }]
        }));
    };

    const removeItem = (index) => {
        if (form.items.length === 1) return;
        const newItems = form.items.filter((_, i) => i !== index).map((it, i) => ({ ...it, slNo: i + 1 }));
        const total = newItems.reduce((sum, it) => sum + (it.finalAmount || 0), 0);
        setForm(f => ({ ...f, items: newItems, totalAmount: total }));
    };

    /* ── Term Handlers ── */
    const updateTerm = (index, val) => {
        const newTerms = [...form.terms];
        newTerms[index] = val;
        set('terms', newTerms);
    };

    const addTerm = () => set('terms', [...form.terms, '']);
    const removeTerm = (idx) => set('terms', form.terms.filter((_, i) => i !== idx));

    /* ── Actions ── */
    const editInvoice = (invoice) => {
        setForm(invoice);
        setView('create');
    };

    const previewInvoice = (invoice) => {
        setPreviewingInvoice(invoice);
    };

    const downloadInvoice = async (invoice) => {
        setForm(invoice);
        // Wait for React to render the component with the new form state
        setTimeout(async () => {
            await generatePDF();
        }, 300);
    };

    /* ── Save and Download ── */
    const handleSave = async (download = false) => {
        if (!form.customerName.trim()) {
            toast.error('Please enter customer name');
            return;
        }
        
        setSaving(true);
        try {
            const invoiceData = {
                ...form,
                updatedAt: serverTimestamp(),
            };
            if (!invoiceData.createdAt) {
                invoiceData.createdAt = serverTimestamp();
            }
            
            await setDoc(doc(db, 'invoices', form.invoiceId), invoiceData);
            
            if (download) {
                await generatePDF();
            }
            
            toast.success('Invoice saved successfully');
            setView('list');
            setForm(EMPTY_FORM);
        } catch (err) {
            console.error('Error saving invoice:', err);
            toast.error('Failed to save invoice');
        } finally {
            setSaving(false);
        }
    };

    const generatePDF = async () => {
        if (!docRef.current) {
            console.error('docRef is null');
            return;
        }
        
        try {
            console.log('Generating PDF for ID:', form.invoiceId);
            
            // Wait a tiny bit just in case
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(docRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: true,
                width: 794,
                windowWidth: 794,
                removeContainer: true,
            });

            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error('Canvas capture resulted in 0 dimensions');
            }

            const pdf = new jsPDF({ 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'a4',
            });

            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            
            // We'll capture the whole thing and slice manually
            const imgH_mm = (canvas.height * pdfW) / canvas.width;
            let remainingH_mm = imgH_mm;
            let currentPathY_px = 0;

            while (remainingH_mm > 0) {
                const sliceH_mm = Math.min(remainingH_mm, pdfH);
                const sliceH_px = (sliceH_mm * canvas.width) / pdfW;

                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceH_px;
                
                const ctx = sliceCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                ctx.drawImage(
                    canvas, 
                    0, currentPathY_px, canvas.width, sliceH_px, 
                    0, 0, canvas.width, sliceH_px
                );
                
                // Use JPEG for reliability
                const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85);
                pdf.addImage(sliceData, 'JPEG', 0, 0, pdfW, sliceH_mm);

                remainingH_mm -= sliceH_mm;
                currentPathY_px += sliceH_px;

                if (remainingH_mm > 0.5) { // Threshold for adding a new page
                    pdf.addPage();
                }
            }

            pdf.save(`Invoice_${form.invoiceId || 'Download'}.pdf`);
            console.log('PDF Saved');
        } catch (err) {
            console.error('PDF Generation Error:', err);
            toast.error('Failed to generate PDF');
        }
    };

    /* ── Filtering ── */
    const filtered = invoices.filter(inv => {
        const matchSearch = 
            (inv.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
            (inv.invoiceId || '').toLowerCase().includes(search.toLowerCase());
        const matchDate = !dateFilter || inv.date === dateFilter;
        return matchSearch && matchDate;
    });

    /* ── Table Columns ── */
    const columns = [
        { key: 'invoiceId', label: 'Invoice ID', render: v => <span style={{ fontWeight: 600, color: '#6366f1' }}>{v}</span> },
        { key: 'date', label: 'Date', render: v => formatDate(v) },
        { key: 'customerName', label: 'Customer' },
        { key: 'totalAmount', label: 'Total', render: v => <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span> },
        {
            key: 'actions', label: 'Actions',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="action-icon-btn" title="Preview" onClick={() => previewInvoice(row)}>
                        <EyeIcon />
                    </button>
                    <button className="action-icon-btn" title="Edit" onClick={() => editInvoice(row)}>
                        <EditIcon />
                    </button>
                    <button className="action-icon-btn" title="Download PDF" onClick={() => downloadInvoice(row)}>
                        <DownloadIcon />
                    </button>
                </div>
            )
        }
    ];

    if (view === 'create') {
        return (
            <div className="invoices-page">
                <div className="page-header">
                    <div className="page-title-area">
                        <button className="btn-back" onClick={() => setView('list')}>
                            <BackIcon />
                        </button>
                        <div>
                            <h1 className="page-title">Create Invoice</h1>
                            <p className="page-subtitle">Fill in the details to generate a new invoice</p>
                        </div>
                    </div>
                    <div className="page-toolbar">
                        <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)}>
                            <EyeIcon /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                        <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
                            {saving ? 'Saving...' : 'Save & Download'}
                        </button>
                    </div>
                </div>

                <div className={`inv-layout ${showPreview ? 'preview-open' : ''}`}>
                    <div className="inv-form-col">
                        
                        {/* Company Details */}
                        <Section icon="🏢" title="Company Details">
                            <div className="inv-grid">
                                <Field label="Company Name" span={2}>
                                    <input className="inv-input" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                                </Field>
                                <Field label="Company Address" span={2}>
                                    <input className="inv-input" value={form.companyAddress} onChange={e => set('companyAddress', e.target.value)} />
                                </Field>
                                <Field label="Email">
                                    <input className="inv-input" value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} />
                                </Field>
                                <Field label="Phone">
                                    <input className="inv-input" value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} />
                                </Field>
                            </div>
                        </Section>

                        {/* Invoice & Customer Details */}
                        <Section icon="👤" title="Invoice & Customer Details">
                            <div className="inv-grid">
                                <Field label="Invoice ID">
                                    <input className="inv-input" value={form.invoiceId} disabled />
                                </Field>
                                <Field label="Date">
                                    <input className="inv-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                                </Field>
                                <Field label="Customer Name" span={2}>
                                    <input className="inv-input" placeholder="Enter customer name" value={form.customerName} onChange={e => set('customerName', e.target.value)} />
                                </Field>
                                {/* Customer Address hidden from form as per request, only displayed in invoice doc */}
                                <Field label="Customer Email">
                                    <input className="inv-input" type="email" placeholder="customer@email.com" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
                                </Field>
                                <Field label="Customer Phone">
                                    <input className="inv-input" placeholder="+91 XXXXX XXXXX" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
                                </Field>
                            </div>
                        </Section>

                        {/* Items Section */}
                        <Section icon="📦" title="Invoice Items">
                            <div style={{ overflowX: 'auto' }}>
                                <table className="inv-items-table">
                                    <thead>
                                        <tr>
                                            <th className="sl-col">Sl.No</th>
                                            <th className="desc-col">Description</th>
                                            <th className="amt-col">Amount</th>
                                            <th className="dis-col">Discount</th>
                                            <th className="final-col">Final Amount</th>
                                            <th className="actions-col"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="sl-col">{item.slNo}</td>
                                                <td className="desc-col">
                                                    <input className="inv-input" placeholder="Item description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} style={{ width: '100%' }} />
                                                </td>
                                                <td className="amt-col">
                                                    <input className="inv-input" type="number" placeholder="0.00" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} style={{ width: '100%' }} />
                                                </td>
                                                <td className="dis-col">
                                                    <input className="inv-input" type="number" placeholder="0.00" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} style={{ width: '100%' }} />
                                                </td>
                                                <td className="final-col">
                                                    {formatCurrency(item.finalAmount)}
                                                </td>
                                                <td className="actions-col">
                                                    <button className="remove-item-btn" onClick={() => removeItem(idx)}>
                                                        <TrashIcon />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button className="add-item-btn" onClick={addItem}>
                                <PlusIcon /> Add Item
                            </button>

                            <div className="inv-footer">
                                <div className="inv-total-box">
                                    <div className="inv-total-row">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(form.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}</span>
                                    </div>
                                    <div className="inv-total-row">
                                        <span>Total Discount</span>
                                        <span>-{formatCurrency(form.items.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0))}</span>
                                    </div>
                                    <div className="inv-total-row inv-total-final">
                                        <span>Total Amount</span>
                                        <span>{formatCurrency(form.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        {/* Terms Section */}
                        <Section icon="📜" title="Terms & Conditions">
                            <div className="inv-terms-list">
                                {form.terms.map((term, idx) => (
                                    <div key={idx} className="inv-term-item">
                                        <input className="inv-input" value={term} onChange={e => updateTerm(idx, e.target.value)} style={{ flex: 1 }} />
                                        <button className="remove-item-btn" onClick={() => removeTerm(idx)}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                                <button className="add-item-btn" onClick={addTerm} style={{ alignSelf: 'flex-start' }}>
                                    <PlusIcon /> Add Term
                                </button>
                            </div>
                        </Section>

                    </div>

                    {/* Preview Column */}
                    {showPreview && (
                        <div className="inv-preview-col">
                            <div className="inv-preview-sticky">
                                <div className="inv-preview-bar">
                                    <span className="inv-preview-badge">Live Preview</span>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleSave(true)}>Download PDF</button>
                                </div>
                                <div className="inv-preview-scroll">
                                    <div className="inv-preview-paper-wrap">
                                        <InvoiceDoc invoice={form} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="invoices-page">
            <div className="page-header">
                <div className="page-title-area">
                    <h1 className="page-title">Invoices</h1>
                    <p className="page-subtitle">
                        {loading ? 'Loading...' : `${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} found`}
                    </p>
                </div>
                <div className="page-toolbar">
                    <div className="toolbar-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID or customer..." />
                    </div>
                    <div className="toolbar-search">
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setView('create'); }}>
                        <PlusIcon /> Create Invoice
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>
                    <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                    Loading invoices...
                </div>
            ) : filtered.length > 0 ? (
                <Table columns={columns} data={filtered} />
            ) : (
                <div className="inv-list-empty">
                    <div className="inv-list-empty-icon">📂</div>
                    <h3>No Invoices Found</h3>
                    <p>Try adjusting your filters or create a new invoice.</p>
                </div>
            )}

            {/* Preview Modal */}
            {previewingInvoice && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPreviewingInvoice(null)}>
                    <div className="modal-box" style={{ width: '850px', maxWidth: '95vw', padding: '0', background: '#f1f5f9', overflow: 'hidden' }}>
                        <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
                            <span className="modal-title">Invoice Preview - {previewingInvoice.invoiceId}</span>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    const inv = previewingInvoice;
                                    setPreviewingInvoice(null);
                                    downloadInvoice(inv);
                                }}>
                                    <DownloadIcon /> Download PDF
                                </button>
                                <button className="modal-close" onClick={() => setPreviewingInvoice(null)}>×</button>
                            </div>
                        </div>
                        <div className="modal-body" style={{ padding: '30px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <InvoiceDoc invoice={previewingInvoice} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Always rendered hidden doc for PDF generation (Creation & List Action) */}
            <div 
                ref={docRef}
                data-invoice-capture
                style={{ 
                    position: 'absolute', 
                    left: '-10000px', 
                    top: '0', 
                    width: '794px', 
                    background: 'white',
                    color: '#1e293b',
                    display: 'block'
                }}
            >
                <InvoiceDoc invoice={form} />
            </div>
        </div>
    );
}
