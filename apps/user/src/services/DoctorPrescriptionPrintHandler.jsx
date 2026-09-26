import { formatDate } from '../utils/formatters'
import { printService } from './printService'

/**
 * DoctorPrescriptionPrintHandler — Specialized print handler for Doctor's
 * Digital OPD Consultation & Prescription Slip.
 * - Renders ONLY prescribed medicines and ONLY ordered lab tests
 * - Displays Hospital Brand Logo (/image/image.png)
 * - Resolves full patient address details
 * - Expands doctor notes section space
 */
export class DoctorPrescriptionPrintHandler {
  /**
   * Print a doctor consultation slip.
   * @param {Object} booking
   */
  static async printPrescription(booking) {
    if (!booking) return console.warn('DoctorPrescriptionPrintHandler: No booking provided')

    // 1. Open popup window SYNCHRONOUSLY before async calls to prevent browser popup blocking
    let printWin = null
    try {
      printWin = window.open('', '_blank', 'width=920,height=780,scrollbars=yes')
      if (printWin) {
        printWin.document.open()
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head><title>Preparing Doctor Prescription...</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:90vh; color:#0369a1;">
            <div style="font-size:18px; font-weight:700; margin-bottom:8px;">KG Nanda Hospital</div>
            <div style="font-size:14px; color:#64748b;">Generating Doctor Prescription Slip...</div>
          </body>
          </html>
        `)
        printWin.document.close()
      }
    } catch (e) {
      console.warn('Popup window blocked, fallback to window.print()', e)
    }

    // 2. Fetch enriched slip details
    let slipData = booking
    try {
      slipData = await printService.getSlipData(booking)
    } catch (err) {
      console.warn('Using provided booking object for prescription print', err)
    }

    // Preserve locally passed prescription if available on booking
    if (booking.prescription) {
      slipData.prescription = booking.prescription
    }

    // 3. Populate print window HTML
    if (printWin && !printWin.closed) {
      const html = this._buildPrescriptionHTML(slipData)
      printWin.document.open()
      printWin.document.write(html)
      printWin.document.close()

      const triggerPrint = () => {
        try {
          printWin.focus()
          printWin.print()
        } catch (e) {
          console.error('Print trigger failed', e)
        }
      }

      printWin.onload = () => setTimeout(triggerPrint, 300)
      setTimeout(triggerPrint, 600)
    } else {
      window.print()
    }
  }

  /** Build HTML document for Doctor's Prescription slip */
  static _buildPrescriptionHTML(booking) {
    const isIPD =
      booking.type === 'HOSPITALIZATION' ||
      booking.service_name?.toLowerCase().includes('ipd') ||
      booking.service_name?.toLowerCase().includes('hospitalization')

    const docTitle = isIPD ? 'IPD Doctor Prescription' : 'OPD Doctor Consultation Slip'
    const isOldPatient = Boolean(booking.isOld || booking.is_old)
    const patientStatusLabel = isOldPatient ? ' (Old Patient पुराना मरीज)' : ' (नया मरीज)'

    const tokenDisplay = booking.token_number
      ? String(booking.token_number).startsWith('T-')
        ? booking.token_number
        : `Token #${booking.token_number}`
      : booking.time_slot || '—'

    const generatedTime = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    const appointmentDate = formatDate(booking.preferredDate || booking.date)
    const source = booking.source_label || booking.created_by || booking.bookingSource || 'WhatsApp Bot'
    const doctorFee = booking.consultation_fee || booking.doctor_fee || 500

    // Full Address Resolution
    const addrLine = booking.address || booking.patient_address || booking.patientId?.address || booking.patient?.address || ''
    const distLine = booking.district || booking.patient_district || booking.patientId?.district || booking.patient?.district || ''
    const pinLine = booking.pinCode || booking.pincode || booking.pin_code || booking.patient_pin_code || booking.patientId?.pinCode || booking.patient?.pinCode || ''
    const addressParts = [addrLine, distLine, pinLine].filter(Boolean)
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '—'

    const accentBg = isIPD ? '#dcfce7' : '#e0f2fe'
    const accentBorder = isIPD ? '#bbf7d0' : '#bae6fd'
    const accentText = isIPD ? '#14532d' : '#0c4a6e'
    const titleColor = isIPD ? '#15803d' : '#0284c7'

    // Prescription Data
    const rx = booking.prescription || booking.meta?.prescription || {}
    const rxVitals = rx.vitals || {}
    const rxNotes = rx.doctor_notes || ''
    const prescribedMeds = rx.medicines || []
    const orderedTests = rx.tests || []

    const adviceList = rx.additional_advice || []

    const genMeds = prescribedMeds.filter(m => !m.target || m.target === 'General')
    const femMeds = prescribedMeds.filter(m => m.target === 'Female Partner')
    const malMeds = prescribedMeds.filter(m => m.target === 'Male Partner')

    const genTests = orderedTests.filter(t => !t.target || t.target === 'General')
    const femTests = orderedTests.filter(t => t.target === 'Female Partner')
    const malTests = orderedTests.filter(t => t.target === 'Male Partner')

    const renderMedTable = (meds, isFemale) => {
      const bg = isFemale ? '#fce7f3' : '#dbeafe'
      const border = isFemale ? '#f9a8d4' : '#93c5fd'
      const title = isFemale ? '♀ FEMALE PARTNER MEDICATIONS' : '♂ MALE PARTNER MEDICATIONS'
      
      let html = `
  <div class="tbl-wrap" style="border-color:${border}; margin-bottom:0;">
    <div class="tbl-header" style="background:${bg}; border-color:${border}; color:#0f172a;">
      <span>${title}</span>
    </div>
    <table class="p-tbl">
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">Sr.No.</th>
          <th>Medicine Name</th>
          <th style="width:60px;">Dosage</th>
          <th style="width:70px;">Frequency</th>
          <th style="width:50px;">Duration</th>
          <th style="width:80px;">Remarks</th>
          <th style="width:25px; text-align:center;">☐</th>
        </tr>
      </thead>
      <tbody>`
      if (meds.length === 0) {
        html += `<tr><td colspan="7" style="text-align:center; color:#64748b; font-style:italic; padding:8px 4px;">No medications</td></tr>`
      } else {
        meds.forEach((pm, idx) => {
          html += `<tr>
            <td style="text-align:center; font-weight:600;">${idx + 1}</td>
            <td style="font-weight:700; color:#0369a1;">${pm.name || pm.medicine_name || ''}</td>
            <td>${pm.dosage || '—'}</td>
            <td>${pm.frequency || '—'}</td>
            <td>${pm.duration || '—'}</td>
            <td>${pm.remarks || ''}</td>
            <td style="text-align:center;"><div class="chk"></div></td>
          </tr>`
        })
      }
      html += `</tbody></table></div>`
      return html
    }

    const renderGenMedTable = (meds) => {
      if (meds.length === 0) return ''
      let html = `
  <div class="tbl-wrap" style="margin-bottom:6px;">
    <div class="tbl-header"><span>GENERAL MEDICATIONS</span></div>
    <table class="p-tbl">
      <thead>
        <tr>
          <th style="width:38px; text-align:center;">Sr. No.</th>
          <th>Medicine Name</th>
          <th style="width:90px;">Dosage</th>
          <th style="width:100px;">Frequency</th>
          <th style="width:80px;">Duration</th>
          <th style="width:120px;">Remarks</th>
          <th style="width:38px; text-align:center;">☐</th>
        </tr>
      </thead>
      <tbody>`
      meds.forEach((pm, idx) => {
        html += `<tr>
          <td style="text-align:center; font-weight:600;">${idx + 1}</td>
          <td style="font-weight:700; color:#0369a1;">${pm.name || pm.medicine_name || ''}</td>
          <td>${pm.dosage || '—'}</td>
          <td>${pm.frequency || '—'}</td>
          <td>${pm.duration || '—'}</td>
          <td>${pm.remarks || ''}</td>
          <td style="text-align:center;"><div class="chk"></div></td>
        </tr>`
      })
      html += `</tbody></table></div>`
      return html
    }

    const renderTestTable = (tests, isFemale) => {
      const bg = isFemale ? '#fce7f3' : '#dbeafe'
      const border = isFemale ? '#f9a8d4' : '#93c5fd'
      const title = isFemale ? '♀ FEMALE TESTS' : '♂ MALE TESTS'
      
      let html = `
  <div class="tbl-wrap" style="border-color:${border}; margin-bottom:0;">
    <div class="tbl-header" style="background:${bg}; border-color:${border}; color:#0f172a;">
      <span>${title}</span>
    </div>
    <table class="p-tbl">
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">Sr.No.</th>
          <th>Test Name</th>
          <th style="width:120px;">Remarks</th>
          <th style="width:25px; text-align:center;">☐</th>
        </tr>
      </thead>
      <tbody>`
      if (tests.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center; color:#64748b; font-style:italic; padding:8px 4px;">No tests</td></tr>`
      } else {
        tests.forEach((pt, idx) => {
          html += `<tr>
            <td style="text-align:center; font-weight:600;">${idx + 1}</td>
            <td style="font-weight:700; color:#0369a1;">${pt.name || pt.test_name || ''}</td>
            <td>${pt.remarks || ''}</td>
            <td style="text-align:center;"><div class="chk"></div></td>
          </tr>`
        })
      }
      html += `</tbody></table></div>`
      return html
    }

    const renderGenTestTable = (tests) => {
      if (tests.length === 0) return ''
      let html = `
  <div class="tbl-wrap" style="margin-bottom:6px;">
    <div class="tbl-header"><span>GENERAL TESTS</span></div>
    <table class="p-tbl">
      <thead>
        <tr>
          <th style="width:38px; text-align:center;">Sr. No.</th>
          <th>Test Name</th>
          <th style="width:250px;">Remarks</th>
          <th style="width:38px; text-align:center;">☐</th>
        </tr>
      </thead>
      <tbody>`
      tests.forEach((pt, idx) => {
        html += `<tr>
          <td style="text-align:center; font-weight:600;">${idx + 1}</td>
          <td style="font-weight:700; color:#0369a1;">${pt.name || pt.test_name || ''}</td>
          <td>${pt.remarks || ''}</td>
          <td style="text-align:center;"><div class="chk"></div></td>
        </tr>`
      })
      html += `</tbody></table></div>`
      return html
    }

    let adviceHTML = ''
    if (adviceList && adviceList.length > 0) {
      adviceHTML = `<ul style="padding-left:16px; margin:4px 0; font-size:10px; color:#1e293b;">`
      adviceList.forEach(adv => {
        adviceHTML += `<li style="margin-bottom:2px;">${adv.advice || adv}</li>`
      })
      adviceHTML += `</ul>`
    } else {
      adviceHTML = `<div style="color:#64748b; font-style:italic; font-size:10px; margin-top:4px;">No additional advice</div>`
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${docTitle} — ${booking.patient_name || 'Patient'}</title>
<style>
  @page { size: A4 portrait; margin: 4mm 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .slip {
    border: 1.5px solid ${isIPD ? '#16a34a' : '#0284c7'};
    border-radius: 8px;
    padding: 10px 12px;
    background: #fff;
    margin: 0 auto;
    max-width: 800px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo-img { height: 48px; max-width: 180px; object-fit: contain; }
  .hospital-name { font-size: 19px; font-weight: 800; color: #0369a1; line-height: 1.1; }
  .doc-title { font-size: 13px; font-weight: 700; color: ${titleColor}; margin-top: 1px; }
  .gen-time { font-size: 10px; color: #64748b; font-weight:600; text-align: right; }
  /* Stats Bar */
  .stats-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: ${accentBg}; border: 1px solid ${accentBorder};
    border-radius: 5px; padding: 4px 8px; margin-bottom: 6px; gap: 6px;
  }
  .stat-label { font-size: 9px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.3px; }
  .stat-value { font-size: 11px; font-weight: 700; color: ${accentText}; margin-top: 1px; }
  /* Two Columns */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .detail-box { border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; background: #f8fafc; }
  .box-header {
    font-size: 10px; font-weight: 800; color: #0369a1; text-transform: uppercase;
    letter-spacing: 0.3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px;
  }
  .highlight { color: #d97706; font-weight: 700; }
  .field-row { display: flex; font-size: 10px; line-height: 1.35; margin-bottom: 2px; }
  .field-name { font-weight: 700; color: #334155; min-width: 80px; }
  .field-val { color: #0f172a; font-weight: 600; flex: 1; }
  /* Vitals */
  .vitals-wrap { border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
  .vitals-title { font-size: 9.5px; font-weight: 800; color: #0369a1; background: #f0f9ff; padding: 3px 8px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
  .vitals-grid { display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; }
  .vital-header { font-size: 8.5px; font-weight: 700; color: #0369a1; padding: 2px 2px; border-right: 1px solid #e2e8f0; background: #f8fafc; }
  .vital-header:last-child { border-right: none; }
  .vital-cell { height: 18px; font-size: 10px; font-weight: 700; color: #0f172a; display:flex; align-items:center; justify-content:center; border-right: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
  .vital-cell:last-child { border-right: none; }
  /* Doctor Notes */
  .rx-box { border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 12px; margin-bottom: 8px; min-height: 140px; }
  .rx-title { font-size: 10px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px; }
  .notes-text { font-size: 11px; color: #1e293b; font-weight: 600; line-height: 1.5; white-space: pre-wrap; }
  .ruled-line { border-bottom: 1px solid #e2e8f0; margin-top: 22px; height: 1px; }
  /* Tables */
  .tbl-wrap { border: 1px solid #0284c7; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
  .tbl-header { background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 800; padding: 4px 8px; display: flex; justify-content: space-between; border-bottom: 1px solid #0284c7; }
  .tbl-sub { font-size: 8.5px; font-weight: 600; color: #0284c7; }
  table.p-tbl { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  table.p-tbl th { background: #f8fafc; color: #0369a1; font-weight: 700; padding: 3px 6px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #e2e8f0; text-align: left; }
  table.p-tbl th:last-child { border-right: none; }
  table.p-tbl td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #e2e8f0; color: #0f172a; height: 18px; overflow: hidden; white-space: nowrap; }
  table.p-tbl td:last-child { border-right: none; }
  .chk { display: inline-block; width: 11px; height: 11px; border: 1.2px solid #0369a1; border-radius: 2px; text-align: center; line-height: 9px; font-size: 8px; font-weight: 800; color: #0369a1; }
  .section-full-header { display: flex; justify-content: space-between; align-items: flex-end; background: #f1f5f9; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 10px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
  /* Signature */
  .sig-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; padding-top: 4px; }
  .sig-box { width: 190px; height: 42px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fafafa; display: flex; align-items: flex-end; padding: 3px 8px; }
  .sig-title { font-size: 9px; font-weight: 700; color: #475569; }
  .notice { font-size: 8.5px; color: #0284c7; font-weight: 700; margin-top: 2px; line-height: 1.25; }
  .stamp { font-size: 9px; font-weight: 800; color: #94a3b8; border: 1px dashed #94a3b8; padding: 12px 18px; border-radius: 4px; text-align: center; }
  /* Footer */
  .footer-bar { display: flex; align-items: center; justify-content: space-around; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 12px; margin-top: 10px; }
  .contact { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: #15803d; }
  .contact-icon-wa { width: 18px; height: 18px; border-radius: 50%; background: #25d366; display: flex; align-items: center; justify-content: center; color: #fff; }
  .contact-icon-phone { width: 18px; height: 18px; border-radius: 50%; background: #0284c7; display: flex; align-items: center; justify-content: center; color: #fff; }
  .contact-icon-desk { width: 18px; height: 18px; border-radius: 50%; background: #0369a1; display: flex; align-items: center; justify-content: center; color: #fff; }
</style>
</head>
<body>

<div class="slip">
  <!-- Header -->
  <div class="header">
    <div class="brand">
      <img src="/image/image.png" class="logo-img" alt="Hospital Logo" onError="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <div style="display:none; width:40px; height:40px; background:#0284c7; border-radius:50%; color:#fff; align-items:center; justify-content:center; font-weight:800; font-size:18px;">KGN</div>
      <div>
        <div class="hospital-name">KG Nanda Hospital</div>
        <div class="doc-title">${docTitle}</div>
      </div>
    </div>
    <div class="gen-time">Generated: ${generatedTime}</div>
  </div>

  <!-- Stats Bar -->
  <div class="stats-bar">
    <div><div class="stat-label">UHID:</div><div class="stat-value">${booking.uhid || 'KGN-PENDING'}</div></div>
    <div><div class="stat-label">TOKEN:</div><div class="stat-value">${tokenDisplay}</div></div>
    <div><div class="stat-label">SOURCE:</div><div class="stat-value">${source}</div></div>
    <div><div class="stat-label">DOCTOR FEES:</div><div class="stat-value">₹ ${doctorFee}</div></div>
  </div>

  <!-- Two Column Details -->
  <div class="two-col">
    <div class="detail-box">
      <div class="box-header">PATIENT DETAILS<span class="highlight">${patientStatusLabel}</span></div>
      <div class="field-row"><span class="field-name">Name:</span><span class="field-val">${booking.patient_name || '—'}</span></div>
      <div class="field-row"><span class="field-name">Age/Gender:</span><span class="field-val">${booking.age ? booking.age + ' Yrs' : '—'} / ${booking.gender || '—'}</span></div>
      <div class="field-row"><span class="field-name">Mobile:</span><span class="field-val">+91 ${booking.mobile || '—'}</span></div>
      <div class="field-row"><span class="field-name">Address:</span><span class="field-val">${fullAddress}</span></div>
    </div>
    <div class="detail-box">
      <div class="box-header">VISIT &amp; CLINICAL DETAILS</div>
      <div class="field-row"><span class="field-name">Visit Type:</span><span class="field-val">${isIPD ? 'Hospitalization (IPD Admission)' : 'OPD Appointment'}</span></div>
      <div class="field-row"><span class="field-name">${isIPD ? 'Admission Date:' : 'Appt Date:'}</span><span class="field-val">${appointmentDate}</span></div>
      <div class="field-row"><span class="field-name">Dept / Doctor:</span><span class="field-val">${booking.doctor_name || 'General Doctor'}${booking.doctor_specialization ? ' — ' + booking.doctor_specialization : ''}</span></div>
      <div class="field-row"><span class="field-name">Chief Complaint:</span><span class="field-val">${booking.problemDescription || booking.problem_description || 'Routine Consultation / Checkup'}</span></div>
    </div>
  </div>

  <!-- Vitals -->
  <div class="vitals-wrap">
    <div class="vitals-title">VITALS SECTION (FOR CLINICAL USE)</div>
    <div class="vitals-grid">
      <div class="vital-header">BP (mmHg)</div>
      <div class="vital-header">Pulse (bpm)</div>
      <div class="vital-header">Temp (°F)</div>
      <div class="vital-header">Weight (kg)</div>
      <div class="vital-header">SpO2 (%)</div>
      <div class="vital-cell">${rxVitals.bp || ''}</div>
      <div class="vital-cell">${rxVitals.pulse || ''}</div>
      <div class="vital-cell">${rxVitals.temp || ''}</div>
      <div class="vital-cell">${rxVitals.weight || ''}</div>
      <div class="vital-cell">${rxVitals.spo2 || ''}</div>
    </div>
  </div>

  <!-- Doctor Notes -->
  <div class="rx-box">
    <div class="rx-title">DOCTOR'S NOTES / CLINICAL DIAGNOSIS</div>
    ${rxNotes ? `<div class="notes-text">${rxNotes}</div>` : `<div class="ruled-line"></div><div class="ruled-line"></div><div class="ruled-line"></div><div class="ruled-line"></div>`}
  </div>

  <!-- Prescribed Medicines Section -->
  <div class="section-full-header">
    <span>PRESCRIBED MEDICINES</span>
    <span style="font-weight:600; font-size:8.5px; color:#475569;">(Only selected medicines)</span>
  </div>
  ${renderGenMedTable(genMeds)}
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
    ${renderMedTable(femMeds, true)}
    ${renderMedTable(malMeds, false)}
  </div>

  <!-- Ordered Lab Tests Section -->
  <div class="section-full-header">
    <span>ORDERED LAB TESTS</span>
  </div>
  ${renderGenTestTable(genTests)}
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
    ${renderTestTable(femTests, true)}
    ${renderTestTable(malTests, false)}
  </div>

  <!-- Additional Advice + Next Follow-up Section -->
  <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 6px; margin-bottom: 8px;">
    <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 6px 8px;">
      <div style="font-size:10px; font-weight:800; color:#0369a1; text-transform:uppercase; margin-bottom:4px; border-bottom:1px solid #e2e8f0; padding-bottom:2px;">ADDITIONAL ADVICE / LIFESTYLE RECOMMENDATIONS</div>
      ${adviceHTML}
    </div>
    <div style="border: 1px solid #cbd5e1; border-radius: 5px; padding: 6px 8px; background:#f8fafc;">
      <div style="font-size:10px; font-weight:800; color:#0369a1; text-transform:uppercase; margin-bottom:4px; border-bottom:1px solid #e2e8f0; padding-bottom:2px;">NEXT FOLLOW-UP</div>
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px;">
        <div style="display:flex; justify-content:space-between; font-size:9.5px;"><span style="font-weight:700; color:#475569;">Date:</span> <span>________________</span></div>
        <div style="display:flex; justify-content:space-between; font-size:9.5px;"><span style="font-weight:700; color:#475569;">Time:</span> <span>________________</span></div>
        <div style="display:flex; justify-content:space-between; font-size:9.5px;"><span style="font-weight:700; color:#475569;">Mode:</span> <span>Clinic / Video</span></div>
      </div>
    </div>
  </div>

  <!-- Signature -->
  <div class="sig-area">
    <div>
      <div class="sig-box"><div class="sig-title">Doctor's Signature</div></div>
    </div>
    <div class="stamp">HOSPITAL STAMP</div>
  </div>

  <!-- Footer -->
  <div class="footer-bar">
    <div class="contact">
      <div class="contact-icon-wa">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      </div>
      <span>WhatsApp Chatbot: <strong>+91 8853991899</strong></span>
    </div>
    <div class="contact">
      <div class="contact-icon-phone">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </div>
      <span>Call Helpline: <strong>+91 9838850287</strong></span>
    </div>
    <div class="contact">
      <div class="contact-icon-desk">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
      </div>
      <span>Helpdesk: <strong>+91 8840376333</strong></span>
    </div>
  </div>
</div>

</body>
</html>`
  }
}

export default DoctorPrescriptionPrintHandler
