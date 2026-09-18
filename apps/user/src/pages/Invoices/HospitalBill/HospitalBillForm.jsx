import React, { useEffect, useMemo, useState } from "react";
import styles from "./HospitalBillForm.module.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function formatDoctorName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

const DOCTORS = [
  { id: 1, name: "Dr. Abhinav Katiyar", qualification: "MBBS, DNB" },
  { id: 2, name: "Dr. Anand Prakash Tiwari", qualification: "M.S. (Obs & Gynae)" },
  { id: 3, name: "Dr. Vikram Singh", qualification: "MBBS, MCH" },
  { id: 4, name: "Dr. Arun Kumar Singh", qualification: "MBBS" },
  { id: 5, name: "Dr. Vishwanath Pratap Singh", qualification: "MBBS, MS" },
  { id: 6, name: "Dr. Pankaj Kumar Singh", qualification: "MBBS, MS" },
  { id: 7, name: "Dr. Sushil Krishna Murti", qualification: "MBBS, MD" },
  { id: 8, name: "Dr. Mrityunjay Prasad", qualification: "MS (Shalya)" },
  { id: 9, name: "Dr. Ankit Kumar Singh", qualification: "MBBS" },
  { id: 10, name: "Dr. Prabhunath Dubey", qualification: "BMS, PGDNC" },
  { id: 11, name: "Dr. Abhinav Mishra", qualification: "MBBS, MS (ENT)" },
  { id: 12, name: "Dr. Yogesh Kumar Pandey", qualification: "MS (Shalya)" },
  { id: 13, name: "Dr. Akhilesh Kumar Singh", qualification: "BAMS (RMO)" },
  { id: 14, name: "Dr. Niket Raj Garg", qualification: "MBBS, MS" },
  { id: 15, name: "Dr. Dilip Kumar Gupta", qualification: "MBBS, DCH" },
  { id: 16, name: "Dr. Parvez Ahmad", qualification: "BAMS, MD" },
  { id: 17, name: "Dr. Umesh Kumar Maurya", qualification: "MBBS" },
  { id: 18, name: "Dr. Shobha Jaiswal", qualification: "MBBS, MS (Obs & Gynae)" },
  { id: 19, name: "Dr. Sadhna Chaurasiya", qualification: "MBBS, DGO" },
];

const DEFAULT_PARTICULARS = [
  { id: "admission", name: "ADMISSION CHARGE", charge: 200 },
  { id: "anesthesia", name: "ANESTHESIA CHARGE", charge: 3000 },
  { id: "surgeon", name: "SURGEON CHARGE", charge: 5000 },
  { id: "doctor", name: "DOCTOR VISIT CHARGE", charge: 300 },
  { id: "nursing", name: "NURSING CHARGE", charge: 100 },
  { id: "bed", name: "BED CHARGE", charge: 500 },
  { id: "medicine", name: "MEDICINE CHARGE", charge: 0 },
  { id: "lab", name: "LABORATORY / INVESTIGATION CHARGE", charge: 0 },
  { id: "ot", name: "OT / OPERATION CHARGE", charge: 0 },
  { id: "room", name: "ROOM CHARGE", charge: 0 },
  { id: "icu", name: "ICU CHARGE", charge: 0 },
  { id: "other", name: "OTHER CHARGE", charge: 0 },
];

const QUANTITY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const emptyPatient = {
  patientName: "",
  age: "",
  sex: "",
  uhid: "",
  bookingNo: "",
  hospitalNo: "",
  relativeName: "",
  address: "",
  mobile: "",
  billNo: "",
  billDate: new Date().toISOString().slice(0, 10),
  admissionDate: "",
  dischargeDate: "",
  consultantName: "",
  consultants: [""],
};

const newRow = () => ({
  particularId: "",
  particular: "",
  charge: "",
  daysQty: "1",
  amount: 0,
});

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
};

function amountInWords(number) {
  const n = Math.round(Number(number || 0));
  if (!n) return "Rupees Zero Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
    "Eighty", "Ninety",
  ];

  const two = (x) =>
    x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ` ${ones[x % 10]}` : "");

  const convert = (x) => {
    let result = "";
    if (x >= 10000000) {
      result += `${convert(Math.floor(x / 10000000))} Crore `;
      x %= 10000000;
    }
    if (x >= 100000) {
      result += `${convert(Math.floor(x / 100000))} Lakh `;
      x %= 100000;
    }
    if (x >= 1000) {
      result += `${convert(Math.floor(x / 1000))} Thousand `;
      x %= 1000;
    }
    if (x >= 100) {
      result += `${ones[Math.floor(x / 100)]} Hundred `;
      x %= 100;
    }
    if (x) result += two(x);
    return result.trim();
  };

  return `Rupees ${convert(n)} Only`;
}

function normalizePatient(data = {}) {
  const consultantVal =
    data.consultantName ||
    data.doctorName ||
    data.consultant ||
    data.doctor ||
    "";

  const consultantsList = (Array.isArray(data.consultants)
    ? data.consultants
    : consultantVal
        .split(/[,/]+/)
        .map((s) => s.trim())
        .filter(Boolean)
  ).map((c) => formatDoctorName(c));

  return {
    ...emptyPatient,
    patientName: data.patientName || data.name || data.patient_name || "",
    age: data.age || data.patientAge || "",
    sex: data.sex || data.gender || "",
    uhid: data.uhid || data.UHID || data.uhidNo || data.uhid_no || "",
    bookingNo:
      data.bookingNo ||
      data.bookingNumber ||
      data.booking_id ||
      data.bookingId ||
      data.booking_no ||
      "",
    hospitalNo:
      data.hospitalNo ||
      data.ipdNo ||
      data.hospital_no ||
      data.ipdNumber ||
      data.hospitalNumber ||
      "",
    relativeName:
      data.relativeName ||
      data.fatherName ||
      data.husbandName ||
      data.relative_name ||
      "",
    address: data.address || data.patientAddress || data.patient_address || "",
    mobile:
      data.mobile ||
      data.phone ||
      data.mobileNumber ||
      data.contactNo ||
      data.relativeContactNo ||
      "",
    billNo: data.billNo || data.billNumber || "",
    billDate: data.billDate || emptyPatient.billDate,
    admissionDate:
      data.admissionDate ||
      data.dateOfAdmission ||
      data.admission_date ||
      "",
    dischargeDate:
      data.dischargeDate ||
      data.dateOfDischarge ||
      data.discharge_date ||
      "",
    consultantName: consultantVal ? formatDoctorName(consultantVal) : "",
    consultants: consultantsList.length ? consultantsList : [""],
  };
}

export default function HospitalBillForm() {
  const [uhidSearch, setUhidSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [patient, setPatient] = useState(emptyPatient);
  const [items, setItems] = useState([newRow()]);
  const [particulars, setParticulars] = useState(DEFAULT_PARTICULARS);
  const [doctorList, setDoctorList] = useState(DOCTORS);
  const [showDoctorManage, setShowDoctorManage] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({ name: "", qualification: "" });
  const [showManage, setShowManage] = useState(false);
  const [editingParticular, setEditingParticular] = useState(null);
  const [masterForm, setMasterForm] = useState({ name: "", charge: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const savedParticulars = localStorage.getItem("kgNandaBillParticulars");
      if (savedParticulars) {
        const parsed = JSON.parse(savedParticulars);
        if (Array.isArray(parsed) && parsed.length) setParticulars(parsed);
      }
    } catch {
      // Defaults remain active.
    }

    try {
      const savedDoctors = localStorage.getItem("kgNandaBillDoctors");
      if (savedDoctors) {
        const parsedDocs = JSON.parse(savedDoctors);
        if (Array.isArray(parsedDocs) && parsedDocs.length) setDoctorList(parsedDocs);
      }
    } catch {
      // Defaults remain active.
    }
  }, []);

  const persistParticulars = (next) => {
    setParticulars(next);
    localStorage.setItem("kgNandaBillParticulars", JSON.stringify(next));
  };

  const persistDoctors = (next) => {
    setDoctorList(next);
    try {
      localStorage.setItem("kgNandaBillDoctors", JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const resetDoctorForm = () => {
    setEditingDoctor(null);
    setDoctorForm({ name: "", qualification: "" });
  };

  const saveMasterDoctor = () => {
    const rawName = String(doctorForm.name || "").trim();
    if (!rawName) {
      alert("Doctor name is required.");
      return;
    }
    const name = formatDoctorName(rawName);
    const qualification = String(doctorForm.qualification || "").trim();

    if (editingDoctor) {
      const next = doctorList.map((d) =>
        d.id === editingDoctor.id ? { ...d, name, qualification } : d
      );
      persistDoctors(next);

      if (editingDoctor.name !== name) {
        setPatient((prev) => {
          const consultants = (prev.consultants || []).map((c) =>
            c === editingDoctor.name ? name : c
          );
          return {
            ...prev,
            consultants,
            consultantName: consultants.filter(Boolean).join(", "),
          };
        });
      }
    } else {
      const exists = doctorList.some(
        (d) => d.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        alert("This doctor is already in the list.");
        return;
      }
      const next = [
        ...doctorList,
        {
          id: Date.now(),
          name,
          qualification,
        },
      ];
      persistDoctors(next);
    }
    resetDoctorForm();
  };

  const editMasterDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorForm({
      name: doctor.name || "",
      qualification: doctor.qualification || "",
    });
  };

  const deleteMasterDoctor = (id) => {
    const doc = doctorList.find((d) => d.id === id);
    if (!doc) return;
    if (!window.confirm(`Delete "${doc.name}" from the doctor list?`)) return;
    const next = doctorList.filter((d) => d.id !== id);
    persistDoctors(next);
  };

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items]
  );

  const updatePatient = (field, value) =>
    setPatient((prev) => ({ ...prev, [field]: value }));

  const addConsultant = () => {
    setPatient((prev) => ({
      ...prev,
      consultants: [...(prev.consultants || [""]), ""],
    }));
  };

  const removeConsultant = (index) => {
    setPatient((prev) => {
      const list = prev.consultants || [""];
      const next = list.length === 1 ? [""] : list.filter((_, i) => i !== index);
      return {
        ...prev,
        consultants: next,
        consultantName: next.filter(Boolean).join(", "),
      };
    });
  };

  const updateConsultant = (index, value) => {
    setPatient((prev) => {
      const list = [...(prev.consultants || [""])];
      list[index] = value;
      return {
        ...prev,
        consultants: list,
        consultantName: list.filter(Boolean).join(", "),
      };
    });
  };

  useEffect(() => {
    const uhid = String(uhidSearch || "").replace(/\s/g, "");
    const bookingNo = String(bookingSearch || "").trim();

    if (!uhid && !bookingNo) {
      setLoading(false);
      setStatus("");
      return undefined;
    }

    if (!bookingNo && uhid.length < 3) {
      setStatus("");
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setStatus("Fetching patient data...");

      try {
        const endpoints = [];

        if (uhid) {
          endpoints.push(
            `${API_BASE}/api/patients/lookup?value=${encodeURIComponent(uhid)}&type=uhid`,
            `${API_BASE}/patients/search?uhid=${encodeURIComponent(uhid)}`,
            `${API_BASE}/patients/uhid/${encodeURIComponent(uhid)}`
          );
        }

        if (bookingNo) {
          endpoints.push(
            `${API_BASE}/api/patients/lookup?value=${encodeURIComponent(bookingNo)}&type=booking`,
            `${API_BASE}/patients/search?bookingId=${encodeURIComponent(bookingNo)}`,
            `${API_BASE}/patients/booking/${encodeURIComponent(bookingNo)}`,
            `${API_BASE}/bookings/search?bookingId=${encodeURIComponent(bookingNo)}`
          );
        }

        let patientData = null;
        let itemsData = null;

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              signal: controller.signal,
              credentials: "include",
            });

            if (!response.ok) continue;

            const payload = await response.json();
            const raw =
              payload.patient ||
              payload.data?.patient ||
              payload.data ||
              payload.booking ||
              payload;

            if (
              raw &&
              (raw.name ||
                raw.patientName ||
                raw.patient_name ||
                raw.uhid ||
                raw.UHID ||
                raw.bookingNo ||
                raw.bookingNumber ||
                raw.bookingId)
            ) {
              patientData = raw;
              if (Array.isArray(payload.items)) {
                itemsData = payload.items;
              }
              break;
            }
          } catch (requestError) {
            if (requestError.name === "AbortError") throw requestError;
          }
        }

        if (!patientData) {
          setStatus(
            bookingNo
              ? "No patient found for this Token Number."
              : "No patient found for this UHID No."
          );
          return;
        }

        const nextPatient = normalizePatient(patientData);
        setPatient((prev) => ({
          ...prev,
          ...nextPatient,
          uhid: nextPatient.uhid || uhid || prev.uhid,
          bookingNo: nextPatient.bookingNo || bookingNo || prev.bookingNo,
        }));

        if (itemsData && Array.isArray(itemsData)) {
          setItems(
            itemsData.map((item) => {
              const qty = item.daysQty || item.quantity || item.days || 1;
              const charge = item.charge || 0;
              return {
                particularId: item.particularId || "",
                particular: item.particular || item.description || "",
                charge,
                daysQty: String(qty),
                amount: item.amount ?? Number(charge || 0) * Number(qty || 1),
              };
            })
          );
        }

        setStatus(
          `✓ Patient found: ${nextPatient.patientName || nextPatient.uhid || nextPatient.bookingNo}`
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus(
            "Patient not found. Please check entered UHID / Token Number."
          );
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [uhidSearch, bookingSearch]);

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (field === "particularId") {
          const selected = particulars.find((p) => p.id === value);
          const charge = selected ? Number(selected.charge || 0) : 0;
          const qty = Number(item.daysQty || 1);

          return {
            ...item,
            particularId: value,
            particular: selected?.name || "",
            charge: String(charge),
            amount: charge * qty,
          };
        }

        if (field === "charge") {
          const charge = Number(value || 0);
          const qty = Number(item.daysQty || 1);

          return {
            ...item,
            charge: value,
            amount: charge * qty,
          };
        }

        if (field === "daysQty") {
          const qty = Number(value || 0);
          const charge = Number(item.charge || 0);

          return {
            ...item,
            daysQty: value,
            amount: charge * qty,
          };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, newRow()]);

  const removeItem = (index) => {
    setItems((prev) =>
      prev.length === 1 ? [newRow()] : prev.filter((_, i) => i !== index)
    );
  };

  const resetMasterForm = () => {
    setEditingParticular(null);
    setMasterForm({ name: "", charge: "" });
  };

  const saveMasterParticular = () => {
    const name = masterForm.name.trim();
    const charge = Number(masterForm.charge || 0);

    if (!name) return;

    if (editingParticular) {
      persistParticulars(
        particulars.map((item) =>
          item.id === editingParticular.id
            ? { ...item, name: name.toUpperCase(), charge }
            : item
        )
      );
    } else {
      persistParticulars([
        ...particulars,
        {
          id: `custom-${Date.now()}`,
          name: name.toUpperCase(),
          charge,
        },
      ]);
    }

    resetMasterForm();
  };

  const editMasterParticular = (item) => {
    setEditingParticular(item);
    setMasterForm({
      name: item.name,
      charge: String(item.charge ?? 0),
    });
  };

  const deleteMasterParticular = (id) => {
    if (!window.confirm("Delete this billing particular?")) return;

    persistParticulars(particulars.filter((item) => item.id !== id));

    setItems((prev) =>
      prev.map((row) => (row.particularId === id ? newRow() : row))
    );
  };

  const saveBill = async (printAfterSave = false) => {
    if (!patient.patientName && !patient.uhid && !patient.bookingNo) {
      setStatus("Please enter patient details or UHID / Token Number.");
      if (printAfterSave) {
        setTimeout(() => window.print(), 200);
      }
      return;
    }

    const payload = {
      ...patient,
      items,
      totalAmount: total,
      amountInWords: amountInWords(total),
      createdAt: new Date().toISOString(),
    };

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/hospital-bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Save failed");

      const result = await response.json().catch(() => ({}));

      if (result.billNo || result.data?.billNo) {
        updatePatient("billNo", result.billNo || result.data.billNo);
      }

      setStatus("Hospital bill saved successfully.");
    } catch {
      setStatus("Bill saved locally. Print is available.");
    } finally {
      setSaving(false);
    }

    if (printAfterSave) {
      setTimeout(() => window.print(), 200);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.screenHeader}>
       
      </div>

      <main className={styles.card}>
        <section className={styles.lookupBox}>
          <div className={styles.lookupGrid}>
            <div className={styles.lookupField}>
              <span>UHID No.</span>
              <div className={styles.lookupInputRow}>
                <input
                  value={uhidSearch}
                  onChange={(e) => setUhidSearch(e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                  placeholder="Enter UHID No."
                />
              </div>
            </div>

            <div className={styles.lookupField}>
              <span>Token Number</span>
              <div className={styles.lookupInputRow}>
                <input
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                  placeholder="Enter Token Number"
                />
              </div>
            </div>
          </div>

          {status && <div className={styles.status}>{status}</div>}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>01</span>
            <div>
              <h2>Patient &amp; Bill Details</h2>
            
            </div>
          </div>

          <div className={styles.grid}>
            <Field label="Patient Name">
              <input
                value={patient.patientName}
                onChange={(e) =>
                  updatePatient("patientName", e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))
                }
                placeholder="e.g. Mr Surendra Agrahari"
              />
            </Field>

            <Field label="Age (Y-M-D)">
              <input
                value={patient.age}
                onChange={(e) => updatePatient("age", e.target.value.replace(/[^0-9a-zA-Z\s\-\/]/g, '').slice(0, 15))}
                placeholder="e.g. 35Y / 35"
              />
            </Field>

            <Field label="Sex">
              <select
                value={patient.sex}
                onChange={(e) => updatePatient("sex", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="UHID No.">
              <input
                value={patient.uhid}
                onChange={(e) => updatePatient("uhid", e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                placeholder="UHID No."
              />
            </Field>

          

            <Field label="Hospital / IPD No.">
              <input
                value={patient.hospitalNo}
                onChange={(e) => updatePatient("hospitalNo", e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                placeholder="IPD No."
              />
            </Field>

            <Field label="Relative Name">
              <input
                value={patient.relativeName}
                onChange={(e) =>
                  updatePatient("relativeName", e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))
                }
                placeholder="Father's / Husband's / Relative Name"
              />
            </Field>

            <Field label="Relative Contact No.">
              <input
                value={patient.mobile}
                onChange={(e) => updatePatient("mobile", e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 digit contact number"
              />
            </Field>

            <Field label="Patient Address" wide>
              <input
                value={patient.address}
                onChange={(e) => updatePatient("address", e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/#]/g, ''))}
                placeholder="Patient Address"
              />
            </Field>

            <Field label="Bill No.">
              <input
                value={patient.billNo}
                onChange={(e) => updatePatient("billNo", e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                placeholder="Bill No."
              />
            </Field>

            <Field label="Bill Date">
              <input
                type="date"
                value={patient.billDate}
                onChange={(e) => updatePatient("billDate", e.target.value)}
              />
            </Field>

            <Field label="Date of Admission">
              <input
                type="date"
                value={patient.admissionDate}
                onChange={(e) =>
                  updatePatient("admissionDate", e.target.value)
                }
              />
            </Field>

            <Field label="Date of Discharge">
              <input
                type="date"
                value={patient.dischargeDate}
                onChange={(e) =>
                  updatePatient("dischargeDate", e.target.value)
                }
              />
            </Field>

            <div style={{ gridColumn: 'span 4', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#244d6f', fontSize: '14.5px', fontWeight: '850' }}>Consultant / Doctor Name(s)</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetDoctorForm();
                      setShowDoctorManage(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      border: '1px solid #bae6fd',
                      borderRadius: '7px',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Manage Doctors
                  </button>
                  <button
                    type="button"
                    onClick={addConsultant}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      border: '1px solid #a9d7f2',
                      borderRadius: '7px',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Consultant
                  </button>
                </div>
              </div>

              {(patient.consultants && patient.consultants.length > 0
                ? patient.consultants
                : [patient.consultantName || '']
              ).map((consultant, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: '750',
                      textAlign: 'center',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <select
                    value={consultant}
                    onChange={(e) => updateConsultant(index, e.target.value)}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '8px',
                      border: '1px solid #c8d9e5',
                      padding: '0 12px',
                      background: '#fbfdff',
                      color: '#173b5d',
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    <option value="">Select Doctor</option>
                    {consultant &&
                      !doctorList.some((d) => d.name === consultant) && (
                        <option value={consultant}>{formatDoctorName(consultant)}</option>
                      )}
                    {doctorList.map((doctor) => (
                      <option key={doctor.id} value={doctor.name}>
                        {formatDoctorName(doctor.name)}{doctor.qualification ? ` — ${doctor.qualification}` : ''}
                      </option>
                    ))}
                  </select>
                  {(patient.consultants || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeConsultant(index)}
                      style={{
                        width: '38px',
                        height: '38px',
                        border: '1px solid #fee2e2',
                        borderRadius: '6px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '15px',
                      }}
                      title="Remove consultant"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>02</span>
            <div>
              <h2>Bill Particulars</h2>
              <p>
                Particular, Charge aur Days / Qty dropdown se select karein.
                Amount automatically calculate hoga.
              </p>
            </div>

            <button
              className={styles.manageButton}
              onClick={() => setShowManage(true)}
            >
              ⚙ Manage Particulars
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.editTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Particular / Service</th>
                  <th>Charge</th>
                  <th>Days / Qty</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className={styles.serial}>
                      {String(index + 1).padStart(2, "0")}
                    </td>

                    <td>
                      <select
                        value={item.particularId}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "particularId",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select Particular / Service</option>
                        {particulars.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={item.charge}
                        onChange={(e) =>
                          updateItem(index, "charge", e.target.value)
                        }
                      >
                        <option value="">Select Charge</option>
                        {Array.from(
                          new Map(
                            particulars.map((p) => [
                              String(p.charge ?? 0),
                              Number(p.charge ?? 0),
                            ])
                          ).entries()
                        )
                          .sort((a, b) => a[1] - b[1])
                          .map(([value, numericValue]) => (
                            <option key={value} value={value}>
                              ₹ {money(numericValue)}
                            </option>
                          ))}
                        <option value="0">₹ 0.00</option>
                      </select>
                    </td>

                    <td>
                      <select
                        value={item.daysQty}
                        onChange={(e) =>
                          updateItem(index, "daysQty", e.target.value)
                        }
                      >
                        {QUANTITY_OPTIONS.map((qty) => (
                          <option key={qty} value={qty}>
                            {qty}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className={styles.amount}>
                      ₹ {money(item.amount)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => removeItem(index)}
                        title="Delete row"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className={styles.addButton}
            onClick={addItem}
          >
            + Add Particular Row
          </button>

          <div className={styles.totalArea}>
            <div className={styles.words}>
              <strong>Amount In Words</strong>
              <span>{amountInWords(total)}</span>
            </div>

            <div className={styles.totalBox}>
              <span>Bill Amount Rs</span>
              <strong>₹ {money(total)}</strong>
            </div>
          </div>
        </section>

        <div className={styles.bottomActions}>
          <button
            className={styles.secondary}
            onClick={() => saveBill(false)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            className={styles.primary}
            onClick={() => saveBill(true)}
            disabled={saving}
          >
            🖨 Save &amp; Print A4
          </button>
        </div>
      </main>

      {showDoctorManage && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setShowDoctorManage(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Manage Doctors</h3>
                <p>Add new doctors, edit qualification or remove doctors from the list.</p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowDoctorManage(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.masterForm}>
              <input
                value={doctorForm.name}
                onChange={(e) =>
                  setDoctorForm((p) => ({
                    ...p,
                    name: e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''),
                  }))
                }
                placeholder="Doctor name e.g. Dr. Ramesh Gupta"
              />

              <input
                value={doctorForm.qualification}
                onChange={(e) =>
                  setDoctorForm((p) => ({
                    ...p,
                    qualification: e.target.value.replace(/[^a-zA-Z0-9\s,.\(\)\-\/&]/g, ''),
                  }))
                }
                placeholder="Qualification e.g. MBBS, MD"
              />

              <button
                className={styles.primarySmall}
                onClick={saveMasterDoctor}
              >
                {editingDoctor ? "Update" : "Add"}
              </button>

              {editingDoctor && (
                <button
                  className={styles.cancelSmall}
                  onClick={resetDoctorForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className={styles.masterList}>
              {doctorList.map((doctor) => (
                <div className={styles.masterRow} key={doctor.id}>
                  <div>
                    <strong>{formatDoctorName(doctor.name)}</strong>
                    <span>{doctor.qualification || "No qualification"}</span>
                  </div>

                  <div className={styles.masterActions}>
                    <button onClick={() => editMasterDoctor(doctor)}>
                      Edit
                    </button>

                    <button
                      className={styles.dangerText}
                      onClick={() => deleteMasterDoctor(doctor.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showManage && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setShowManage(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Manage Bill Particulars</h3>
                <p>
                  Reusable services aur unke default charges manage karein.
                </p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowManage(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.masterForm}>
              <input
                value={masterForm.name}
                onChange={(e) =>
                  setMasterForm((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
                placeholder="Particular name e.g. ECG CHARGE"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={masterForm.charge}
                onChange={(e) =>
                  setMasterForm((p) => ({
                    ...p,
                    charge: e.target.value,
                  }))
                }
                placeholder="Default charge"
              />

              <button
                className={styles.primarySmall}
                onClick={saveMasterParticular}
              >
                {editingParticular ? "Update" : "Add"}
              </button>

              {editingParticular && (
                <button
                  className={styles.cancelSmall}
                  onClick={resetMasterForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className={styles.masterList}>
              {particulars.map((item) => (
                <div className={styles.masterRow} key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>₹ {money(item.charge)}</span>
                  </div>

                  <div className={styles.masterActions}>
                    <button onClick={() => editMasterParticular(item)}>
                      Edit
                    </button>

                    <button
                      className={styles.dangerText}
                      onClick={() => deleteMasterParticular(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.printDocument} printDocument`}>
        <div className={styles.printHeader}>
          <div className={styles.printLogo}>
            <img
              src="/image/image.png"
              alt="KG Nanda Hospital Logo"
              className={styles.printLogoImg}
            />
            <div className={styles.printLogoBrand}>
              <strong className={styles.printLogoName}>K.G. Nanda Hospital</strong>
              <span className={styles.printLogoSub}>......Because we care</span>
            </div>
          </div>

          <div className={styles.printHospital}>
            <h1>K.G. NANDA HOSPITAL</h1>
            <div>WARD NO.-11 SANJAY NAGAR G.T. ROAD CHANDAULI</div>
          </div>

          <div className={styles.printHeaderSpacer} />
        </div>

        <div className={styles.printTitleBox}>
          <span className={styles.printTitle}>HOSPITAL BILL</span>
        </div>

        <table className={styles.printInfo}>
          <tbody>
            <tr>
              <td style={{ width: '48%' }}>
                <b>Patient Name :</b> {patient.patientName}
              </td>
              <td style={{ width: '52%' }}>
                <b>Bill No :</b> {patient.billNo}
              </td>
            </tr>

            <tr>
              <td>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '6mm' }}>
                  <span><b>Age (Y-M-D)</b> &nbsp; {patient.age}</span>
                  <span><b>Sex-</b> {patient.sex}</span>
                </div>
              </td>
              <td>
                <b>Bill Date:</b> {formatDate(patient.billDate)}
              </td>
            </tr>

            <tr>
              <td>
                <b>UHID No :</b> {patient.uhid}
              </td>
              <td>
                <b>Date of Admission :</b> {formatDate(patient.admissionDate)}
              </td>
            </tr>

            <tr>
              <td>
                <b>Hosp No :</b> {patient.hospitalNo}
              </td>
              <td>
                <b>Date of Discharge :</b> {formatDate(patient.dischargeDate)}
              </td>
            </tr>

            <tr>
              <td>
                <b>Relative Name</b> {patient.relativeName}
              </td>
              <td>
                <b>Relative Contact No:</b> {patient.mobile}
              </td>
            </tr>

            <tr>
              <td>
                <b>Pt. Address</b> {patient.address}
              </td>
              <td>
                <b>Consultant Name :</b>{" "}
                {(patient.consultants || []).filter(Boolean).length
                  ? (patient.consultants || [])
                      .filter(Boolean)
                      .map((c) => formatDoctorName(c))
                      .join(", ")
                  : formatDoctorName(patient.consultantName)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className={styles.printTable}>
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>Sr</th>
              <th style={{ width: '45%' }}>Particular</th>
              <th style={{ width: '17%', textAlign: 'right' }}>Charge</th>
              <th style={{ width: '13%', textAlign: 'center' }}>Days/Qty</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>

          <tbody>
            {items
              .filter((item) => item.particular || Number(item.amount))
              .map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td>{item.particular}</td>
                  <td style={{ textAlign: 'right' }}>{money(item.charge)}</td>
                  <td style={{ textAlign: 'center' }}>{item.daysQty}</td>
                  <td style={{ textAlign: 'right' }}>{money(item.amount)}</td>
                </tr>
              ))}

            <tr className={styles.printTotal}>
              <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                Bill Amount Rs
              </td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                {money(total)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className={styles.amountWords}>
          <b>Amount In Words - </b> {amountInWords(total)}
        </div>

        <div className={styles.signatureRow}>
          <span>Bill Receiver Signature</span>
          <span>Accoutant</span>
          <span>For K.G. NANDA HOSPITAL</span>
        </div>

        <div className={styles.printFooter}>
          FOR ENQUIRY PLSEASE CONTACT -.-9838850287 ; 6394817132 ;7275470447 8840376333
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
