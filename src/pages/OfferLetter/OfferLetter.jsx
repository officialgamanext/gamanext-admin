import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './OfferLetter.css';

/* ─── Helpers ────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];

const fmt = (dateStr) => {
  if (!dateStr) return '___________';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const currency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '___________';
  return `₹${num.toLocaleString('en-IN')}`;
};

const INITIAL = {
  // Company
  companyName: 'GamaNext Technologies Pvt. Ltd.',
  companyAddress: 'Hyderabad, Telangana, India',
  companyEmail: 'hr@gamanext.com',
  companyPhone: '+91 90000 00000',
  // Candidate
  candidateName: '',
  candidateAddress: '',
  candidateEmail: '',
  // Role
  designation: '',
  department: '',
  employmentType: 'Full-time',
  workMode: 'On-site',
  reportingManager: '',
  workLocation: 'Hyderabad, Telangana',
  workingHours: '9:00 AM – 6:00 PM, Monday to Saturday',
  // Dates & Salary
  joiningDate: '',
  offerDate: today(),
  offerValidTill: '',
  ctcAnnual: '',
  noticePeriod: '30',
  // Sections on/off
  showProbation: true,
  probationMonths: '6',
  showBenefits: true,
  benefits: 'Health Insurance, Provident Fund (PF), Paid Leaves (18 days/year), Performance Bonus',
  showCompBreakdown: true,
  // Signatory
  hrName: '',
  hrDesignation: 'HR Manager',
  authorisedName: '',
  authorisedDesignation: 'Director',
};

/* ── Compensation breakdown helper ── */
const buildBreakdown = (ctcAnnual) => {
  const annual  = parseFloat(ctcAnnual);
  if (isNaN(annual) || annual <= 0) return null;
  const monthly = annual / 12;
  const basic   = Math.round(monthly * 0.40);
  const hra     = Math.round(monthly * 0.20);
  const ta      = Math.round(monthly * 0.05);
  const medical = Math.round(monthly * 0.05);
  const special = Math.round(monthly - basic - hra - ta - medical);
  const pf      = 0;  // PF not applicable currently
  const grossM  = Math.round(basic + hra + ta + medical + special);
  const netM    = grossM; // No deductions
  const fmt2    = (n) => `₹${n.toLocaleString('en-IN')}`;
  return [
    { label: 'Basic Salary',              monthly: fmt2(basic),   annual: fmt2(basic * 12) },
    { label: 'House Rent Allowance (HRA)',monthly: fmt2(hra),     annual: fmt2(hra * 12)   },
    { label: 'Transport Allowance',       monthly: fmt2(ta),      annual: fmt2(ta * 12)    },
    { label: 'Medical Allowance',         monthly: fmt2(medical), annual: fmt2(medical * 12) },
    { label: 'Special Allowance',         monthly: fmt2(special), annual: fmt2(special * 12) },
    { label: 'Gross Salary',              monthly: fmt2(grossM),  annual: fmt2(grossM * 12), bold: true },
    { label: 'Provident Fund (Employee)', monthly: fmt2(pf),      annual: fmt2(pf), muted: true },
    { label: 'Net Take-Home',             monthly: fmt2(netM),    annual: fmt2(netM * 12), bold: true, accent: true },
  ];
};

/* ── Greeting / salutation helper ── */
const toTitleCase = (str) =>
  str.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

/* ─── Form Section wrapper ────────────────────────── */
function Section({ icon, title, children }) {
  return (
    <div className="ol-section">
      <div className="ol-section-head">
        <span className="ol-section-icon">{icon}</span>
        <span className="ol-section-title">{title}</span>
      </div>
      <div className="ol-section-body">{children}</div>
    </div>
  );
}

/* ─── Input row ───────────────────────────────────── */
function Field({ label, children, span }) {
  return (
    <div className={`ol-field${span ? ` span-${span}` : ''}`}>
      <label className="ol-label">{label}</label>
      {children}
    </div>
  );
}

/* ─── Toggle switch ───────────────────────────────── */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="ol-toggle-wrap">
      <div className={`ol-toggle${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
        <div className="ol-toggle-knob" />
      </div>
      <span className="ol-toggle-label">{label}</span>
    </label>
  );
}

/* ═══════════════════════════════════════════════════
   OFFER LETTER PREVIEW DOCUMENT
═══════════════════════════════════════════════════ */
function OfferLetterDoc({ form, innerRef }) {
  const {
    companyName, companyAddress, companyEmail, companyPhone,
    candidateName, candidateAddress, candidateEmail,
    designation, department, employmentType, workMode, reportingManager,
    workLocation, workingHours,
    joiningDate, offerDate, offerValidTill, ctcAnnual, noticePeriod,
    showProbation, probationMonths, showBenefits, benefits, showCompBreakdown,
    hrName, hrDesignation, authorisedName, authorisedDesignation,
  } = form;

  const candidate = candidateName || 'Candidate Name';
  const role      = designation   || 'Role';

  return (
    <div className="ol-doc" ref={innerRef}>
      {/* Header */}
      <div className="ol-doc-header">
        <div className="ol-doc-logo">
          <div className="ol-doc-logo-icon">
            <img src="/fav.png" alt="GamaNext Logo" className="ol-doc-logo-img" />
          </div>
          <div>
            <div className="ol-doc-company">{companyName || 'Company Name'}</div>
            <div className="ol-doc-meta">{companyAddress}</div>
          </div>
        </div>
        <div className="ol-doc-contact">
          <div>{companyEmail}</div>
          <div>{companyPhone}</div>
        </div>
      </div>

      <div className="ol-doc-divider" />

      {/* Title */}
      <div className="ol-doc-title-row">
        <h1 className="ol-doc-title">OFFER LETTER</h1>
        <div className="ol-doc-ref">
          <div>Date: {fmt(offerDate)}</div>
          {offerValidTill && <div className="ol-doc-valid">Valid till: {fmt(offerValidTill)}</div>}
        </div>
      </div>

      {/* Salutation */}
      <p className="ol-doc-para">
        Dear <strong>{toTitleCase(candidate)}</strong>,
      </p>

      <p className="ol-doc-para">
        We are pleased to extend this offer of employment and welcome you to the{' '}
        <strong>{companyName || 'Company'}</strong> family. After careful consideration of your
        qualifications and experience, we are confident that you will make a valuable contribution
        to our team. The terms and conditions of your employment are set out below.
      </p>

      {/* Employment Details table */}
      <div className="ol-doc-table">
        <div className="ol-doc-table-title">📋 Employment Details</div>
        <div className="ol-doc-rows">
          {[
            ['Full Name',           toTitleCase(candidate)],
            ['Designation',         role],
            ['Department',          department || '—'],
            ['Employment Type',     employmentType],
            ['Work Mode',           workMode],
            workLocation           && ['Work Location',      workLocation],
            reportingManager       && ['Reporting Manager',  reportingManager],
            candidateEmail         && ['Email',              candidateEmail],
            candidateAddress       && ['Address',            candidateAddress],
            ['Date of Joining',     fmt(joiningDate)],
            ['Offer Valid Till',    fmt(offerValidTill)],
            noticePeriod           && ['Notice Period',      `${noticePeriod} days`],
          ].filter(Boolean).map(([label, value]) => (
            <div className="ol-doc-row" key={label}>
              <span className="ol-doc-row-label">{label}</span>
              <span className="ol-doc-row-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compensation Breakdown */}
      {showCompBreakdown && buildBreakdown(ctcAnnual) && (
        <div className="ol-doc-block">
          <div className="ol-doc-block-title">💰 Compensation Structure</div>
          <p className="ol-doc-para" style={{ marginBottom: 8 }}>
            Your total annual Cost to Company (CTC) is <strong>{currency(ctcAnnual)}</strong>.
            The indicative break-up of your compensation is as follows:
          </p>
          <div className="ol-doc-table">
            <div className="ol-doc-comp-head">
              <span className="ol-doc-row-label" style={{ fontWeight: 700, color: '#374151' }}>Component</span>
              <span className="ol-doc-comp-col" style={{ fontWeight: 700, color: '#374151' }}>Monthly (₹)</span>
              <span className="ol-doc-comp-col" style={{ fontWeight: 700, color: '#374151' }}>Annual (₹)</span>
            </div>
            {buildBreakdown(ctcAnnual).map((row) => (
              <div
                key={row.label}
                className={`ol-doc-comp-row${row.bold ? ' ol-comp-bold' : ''}${row.accent ? ' ol-comp-accent' : ''}${row.muted ? ' ol-comp-muted' : ''}`}
              >
                <span className="ol-doc-row-label" style={{ color: 'inherit' }}>{row.label}</span>
                <span className="ol-doc-comp-col">{row.monthly}</span>
                <span className="ol-doc-comp-col">{row.annual}</span>
              </div>
            ))}
          </div>
          <p className="ol-doc-para" style={{ fontSize: 11, color: '#6b7280', marginTop: 6, marginBottom: 0 }}>
            * The above is indicative. Actual take-home may vary based on applicable statutory deductions and tax liability.
          </p>
        </div>
      )}

      {/* Working Hours */}
      {workingHours && (
        <div className="ol-doc-block">
          <div className="ol-doc-block-title">🕘 Working Hours</div>
          <p className="ol-doc-para">
            Your standard working hours will be <strong>{workingHours}</strong>.
            {workLocation ? <> You will be based out of <strong>{workLocation}</strong>.</> : ''}{' '}
            The company may require you to work additional hours based on project requirements,
            for which applicable compensation or compensatory off will be granted in accordance
            with company policy.
          </p>
        </div>
      )}

      {/* Probation */}
      {showProbation && (
        <div className="ol-doc-block">
          <div className="ol-doc-block-title">⏳ Probation Period</div>
          <p className="ol-doc-para">
            You will be on a probation period of <strong>{probationMonths} month(s)</strong> from
            your date of joining. During this period, your performance, conduct, and suitability
            for the role will be evaluated. Either party may terminate the employment during
            probation with <strong>one week's written notice</strong>. Upon successful completion,
            you will be confirmed as a permanent employee of {companyName || 'the Company'}.
          </p>
        </div>
      )}

      {/* Notice Period */}
      {noticePeriod && (
        <div className="ol-doc-block">
          <div className="ol-doc-block-title">📢 Notice Period</div>
          <p className="ol-doc-para">
            After confirmation, either party wishing to terminate the employment shall provide a
            written notice of <strong>{noticePeriod} days</strong> or pay salary in lieu thereof.
            The company reserves the right to waive the notice period at its discretion.
          </p>
        </div>
      )}

      {/* Benefits */}
      {showBenefits && (
        <div className="ol-doc-block">
          <div className="ol-doc-block-title">🎁 Benefits &amp; Perquisites</div>
          <p className="ol-doc-para">{benefits}</p>
        </div>
      )}

      {/* Confidentiality */}
      <div className="ol-doc-block">
        <div className="ol-doc-block-title">🔒 Confidentiality &amp; Code of Conduct</div>
        <p className="ol-doc-para">
          As an employee of <strong>{companyName || 'the Company'}</strong>, you will have access
          to proprietary, confidential, and sensitive business information. You are required to
          maintain strict confidentiality of all such information during and after the term of
          your employment. You will also be required to sign the Company's Non-Disclosure Agreement
          (NDA) and adhere to the Code of Conduct as outlined in the Employee Handbook.
        </p>
      </div>

      {/* General Terms */}
      <div className="ol-doc-block">
        <div className="ol-doc-block-title">📄 General Terms &amp; Conditions</div>
        <ul className="ol-doc-list">
          <li>This offer is contingent upon successful completion of background verification and document validation.</li>
          <li>You must submit all required original documents (educational certificates, ID proofs, previous employment records) on or before the date of joining.</li>
          <li>Any misrepresentation of facts or suppression of information in your application may lead to immediate termination of employment.</li>
          <li>You will be governed by the HR policies, service rules, and standing orders of the company, as amended from time to time.</li>
          <li>This offer letter supersedes all prior communications, representations, or agreements relating to this position.</li>
          <li>This offer is valid till <strong>{fmt(offerValidTill)}</strong>. If not accepted by this date, the offer shall stand automatically withdrawn.</li>
        </ul>
      </div>

      <p className="ol-doc-para">
        We believe this offer reflects our confidence in your abilities and our commitment to
        building a mutually rewarding professional relationship. Please sign and return a copy
        of this letter along with the acceptance declaration as confirmation of your agreement
        to the above terms and conditions.
      </p>

      <p className="ol-doc-para">
        We look forward to having you on board and wish you a fulfilling career with{' '}
        <strong>{companyName || 'us'}</strong>. Should you have any questions, please feel free
        to reach out to our HR team at <strong>{companyEmail}</strong>.
      </p>

      <p className="ol-doc-para">Warm regards,</p>

      {/* Signatories */}
      <div className="ol-doc-sig-row">
        <div className="ol-doc-sig">
          <div className="ol-doc-sig-line" />
          <div className="ol-doc-sig-name">{hrName || 'HR Manager'}</div>
          <div className="ol-doc-sig-role">{hrDesignation}</div>
          <div className="ol-doc-sig-co">{companyName || 'Company'}</div>
        </div>
        {authorisedName && (
          <div className="ol-doc-sig">
            <div className="ol-doc-sig-line" />
            <div className="ol-doc-sig-name">{authorisedName}</div>
            <div className="ol-doc-sig-role">{authorisedDesignation}</div>
            <div className="ol-doc-sig-co">{companyName || 'Company'}</div>
          </div>
        )}
        <div className="ol-doc-sig ol-doc-sig-accept">
          <div className="ol-doc-sig-line" />
          <div className="ol-doc-sig-name">Candidate Signature</div>
          <div className="ol-doc-sig-role">{toTitleCase(candidate)}</div>
          <div className="ol-doc-sig-role">Date: ___________</div>
        </div>
      </div>

      <div className="ol-doc-footer">
        <div className="ol-doc-footer-co">{companyName}</div>
        <div className="ol-doc-footer-note">This is a computer-generated document.</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function OfferLetter() {
  const [form, setForm]           = useState(INITIAL);
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  /* ── PDF ── */
  const handleDownload = async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = pdf.internal.pageSize.getHeight();
      const margin  = 10;
      const usable  = pdfW - margin * 2;
      const imgH    = (canvas.height * usable) / canvas.width;

      let y = margin;
      let remaining = imgH;

      while (remaining > 0) {
        const pageHeight = pdfH - margin * 2;
        const sliceH     = Math.min(remaining, pageHeight);
        const srcY       = (imgH - remaining) / imgH * canvas.height;
        const srcH       = sliceH / imgH * canvas.height;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL('image/png');
        pdf.addImage(sliceData, 'PNG', margin, margin, usable, sliceH);

        remaining -= sliceH;
        if (remaining > 0) { pdf.addPage(); y = margin; }
      }

      const filename = `OfferLetter_${(form.candidateName || 'Candidate').replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="ol-page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-title-area">
          <h1 className="page-title">Offer Letter</h1>
          <p className="page-subtitle">Fill in the details, preview the offer letter, then download as PDF</p>
        </div>
        <div className="page-toolbar">
          <button
            className="btn btn-secondary"
            onClick={() => setShowPreview(v => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            {showPreview ? 'Hide Preview' : 'Preview Letter'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <><span className="btn-spinner" /> Generating PDF…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className={`ol-layout${showPreview ? ' preview-open' : ''}`}>
        {/* LEFT: Form */}
        <div className="ol-form-col">

          {/* 1. Company Details */}
          <Section icon="🏢" title="Company Details">
            <div className="ol-grid">
              <Field label="Company Name" span={2}>
                <input className="ol-input" value={form.companyName}
                  onChange={e => set('companyName', e.target.value)} placeholder="e.g. GamaNext Technologies" />
              </Field>
              <Field label="Company Address" span={2}>
                <input className="ol-input" value={form.companyAddress}
                  onChange={e => set('companyAddress', e.target.value)} placeholder="City, State, Country" />
              </Field>
              <Field label="HR Email">
                <input className="ol-input" type="email" value={form.companyEmail}
                  onChange={e => set('companyEmail', e.target.value)} placeholder="hr@company.com" />
              </Field>
              <Field label="HR Phone">
                <input className="ol-input" value={form.companyPhone}
                  onChange={e => set('companyPhone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </Field>
            </div>
          </Section>

          {/* 2. Candidate Details */}
          <Section icon="👤" title="Candidate Details">
            <div className="ol-grid">
              <Field label="Full Name *" span={2}>
                <input className="ol-input" value={form.candidateName}
                  onChange={e => set('candidateName', e.target.value)} placeholder="e.g. Rahul Sharma" />
              </Field>
              <Field label="Email Address">
                <input className="ol-input" type="email" value={form.candidateEmail}
                  onChange={e => set('candidateEmail', e.target.value)} placeholder="candidate@email.com" />
              </Field>
              <Field label="Address" span={2}>
                <textarea className="ol-textarea" rows={2} value={form.candidateAddress}
                  onChange={e => set('candidateAddress', e.target.value)} placeholder="Candidate's residential address" />
              </Field>
            </div>
          </Section>

          {/* 3. Role Details */}
          <Section icon="💼" title="Role Details">
            <div className="ol-grid">
              <Field label="Designation *">
                <input className="ol-input" value={form.designation}
                  onChange={e => set('designation', e.target.value)} placeholder="e.g. Software Engineer" />
              </Field>
              <Field label="Department">
                <input className="ol-input" value={form.department}
                  onChange={e => set('department', e.target.value)} placeholder="e.g. Engineering" />
              </Field>
              <Field label="Employment Type">
                <select className="ol-select" value={form.employmentType}
                  onChange={e => set('employmentType', e.target.value)}>
                  {['Full-time','Part-time','Contract','Internship','Freelance'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Work Mode">
                <select className="ol-select" value={form.workMode}
                  onChange={e => set('workMode', e.target.value)}>
                  {['On-site','Remote','Hybrid'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reporting Manager" span={2}>
                <input className="ol-input" value={form.reportingManager}
                  onChange={e => set('reportingManager', e.target.value)} placeholder="Manager's full name (optional)" />
              </Field>
              <Field label="Work Location">
                <input className="ol-input" value={form.workLocation}
                  onChange={e => set('workLocation', e.target.value)} placeholder="e.g. Hyderabad, Telangana" />
              </Field>
              <Field label="Working Hours">
                <input className="ol-input" value={form.workingHours}
                  onChange={e => set('workingHours', e.target.value)} placeholder="e.g. 9 AM – 6 PM, Mon–Sat" />
              </Field>
            </div>
          </Section>

          {/* 4. Dates & Salary */}
          <Section icon="📅" title="Dates &amp; Compensation">
            <div className="ol-grid">
              <Field label="Offer Date">
                <input className="ol-input" type="date" value={form.offerDate}
                  onChange={e => set('offerDate', e.target.value)} />
              </Field>
              <Field label="Offer Valid Till">
                <input className="ol-input" type="date" value={form.offerValidTill}
                  onChange={e => set('offerValidTill', e.target.value)} />
              </Field>
              <Field label="Date of Joining">
                <input className="ol-input" type="date" value={form.joiningDate}
                  onChange={e => set('joiningDate', e.target.value)} />
              </Field>
              <Field label="Annual CTC (₹)">
                <input className="ol-input" type="number" value={form.ctcAnnual}
                  onChange={e => set('ctcAnnual', e.target.value)} placeholder="e.g. 600000" />
              </Field>
              <Field label="Notice Period (days)">
                <input className="ol-input" type="number" value={form.noticePeriod}
                  onChange={e => set('noticePeriod', e.target.value)} placeholder="e.g. 30" />
              </Field>
            </div>
          </Section>

          {/* 5. Probation */}
          <Section icon="⏳" title="Probation Period">
            <div className="ol-grid">
              <Field label="" span={2}>
                <Toggle checked={form.showProbation} onChange={v => set('showProbation', v)}
                  label="Include probation clause" />
              </Field>
              {form.showProbation && (
                <Field label="Probation Duration (months)">
                  <input className="ol-input" type="number" min={1} max={24}
                    value={form.probationMonths}
                    onChange={e => set('probationMonths', e.target.value)} placeholder="e.g. 6" />
                </Field>
              )}
            </div>
          </Section>

          {/* 6. Benefits */}
          <Section icon="🎁" title="Benefits &amp; Perks">
            <div className="ol-grid">
              <Field label="" span={2}>
                <Toggle checked={form.showBenefits} onChange={v => set('showBenefits', v)}
                  label="Include benefits section" />
              </Field>
              <Field label="" span={2}>
                <Toggle checked={form.showCompBreakdown} onChange={v => set('showCompBreakdown', v)}
                  label="Include compensation breakdown table" />
              </Field>
              {form.showBenefits && (
                <Field label="Benefits (comma separated)" span={2}>
                  <textarea className="ol-textarea" rows={3} value={form.benefits}
                    onChange={e => set('benefits', e.target.value)}
                    placeholder="Health Insurance, PF, Paid Leaves…" />
                </Field>
              )}
            </div>
          </Section>

          {/* 7. Signatories */}
          <Section icon="✍️" title="Signatories">
            <div className="ol-grid">
              <Field label="HR Signatory Name">
                <input className="ol-input" value={form.hrName}
                  onChange={e => set('hrName', e.target.value)} placeholder="HR's full name" />
              </Field>
              <Field label="HR Designation">
                <input className="ol-input" value={form.hrDesignation}
                  onChange={e => set('hrDesignation', e.target.value)} placeholder="e.g. HR Manager" />
              </Field>
              <Field label="Authorised Signatory Name">
                <input className="ol-input" value={form.authorisedName}
                  onChange={e => set('authorisedName', e.target.value)} placeholder="Director / CEO (optional)" />
              </Field>
              <Field label="Authorised Designation">
                <input className="ol-input" value={form.authorisedDesignation}
                  onChange={e => set('authorisedDesignation', e.target.value)} placeholder="e.g. Director" />
              </Field>
            </div>
          </Section>
        </div>

        {/* RIGHT: Preview */}
        {showPreview && (
          <div className="ol-preview-col">
            <div className="ol-preview-sticky">
              <div className="ol-preview-bar">
                <span className="ol-preview-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Live Preview
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? <><span className="btn-spinner" /> PDF…</> : <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download</>}
                </button>
              </div>
              <div className="ol-preview-scroll">
                <div className="ol-preview-paper-wrap">
                  <OfferLetterDoc form={form} innerRef={docRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* If preview hidden, still render doc (hidden) for PDF capture */}
        {!showPreview && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
            <OfferLetterDoc form={form} innerRef={docRef} />
          </div>
        )}
      </div>

      {/* Mobile download bar */}
      {!showPreview && (
        <div className="ol-mobile-bar">
          <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? <><span className="btn-spinner" /> PDF…</> : <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PDF</>}
          </button>
        </div>
      )}
    </div>
  );
}
