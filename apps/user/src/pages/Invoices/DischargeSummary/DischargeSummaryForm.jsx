import React, { useEffect, useMemo, useState } from "react";
import styles from "./DischargeSummaryForm.module.css";

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

const DIAGNOSIS_OPTIONS = [
  "ACUTE APPENDICITIS",
  "CHOLELITHIASIS / CHRONIC CHOLECYSTITIS",
  "RIGHT INGUINAL HERNIA",
  "LEFT INGUINAL HERNIA",
  "BILATERAL INGUINAL HERNIA",
  "VENTRAL / EPIGASTRIC HERNIA",
  "UMBILICAL / INCISIONAL HERNIA",
  "RIGHT / LEFT RENAL CALCULUS",
  "URETERIC CALCULUS",
  "BENIGN PROSTATIC HYPERPLASIA (BPH)",
  "RIGHT / LEFT HYDROCELE",
  "FISTULA IN ANO / ANAL FISSURE / HAEMORRHOIDS",
  "DIABETES MELLITUS TYPE 2",
  "ESSENTIAL HYPERTENSION",
  "ACUTE GASTROENTERITIS / DEHYDRATION",
  "FEVER WITH THROMBOCYTOPENIA / DENGUE",
  "ENTERIC FEVER / TYPHOID",
  "URINARY TRACT INFECTION (UTI)",
  "FULL TERM PREGNANCY IN LABOUR",
  "PREVIOUS LSCS WITH SCAR TENDERNESS",
  "OVARIAN CYST / FIBROID UTERUS",
  "ACUTE CHOLECYSTITIS",
  "FRACTURE SHAFT FEMUR / TIBIA",
];

const PROCEDURE_OPTIONS = [
  "LAPAROSCOPIC CHOLECYSTECTOMY",
  "OPEN CHOLECYSTECTOMY",
  "LAPAROSCOPIC APPENDECTOMY",
  "OPEN APPENDECTOMY",
  "HERNIOPLASTY / HERNIORRHAPHY (MESH REPAIR)",
  "LAPAROSCOPIC TEP / TAPP HERNIA REPAIR",
  "HYDROCELECTOMY (JABOULAY'S / LORD'S)",
  "FISTULECTOMY / FISSURECTOMY / HAEMORRHOIDECTOMY",
  "PCNL (PERCUTANEOUS NEPHROLITHOTOMY)",
  "URSL (URETEROSCOPIC LITHOTRIPSY)",
  "TURP (TRANSURETHRAL RESECTION OF PROSTATE)",
  "CYSTOSCOPY + DJ STENTING",
  "DJ STENT REMOVAL",
  "NORMAL VAGINAL DELIVERY (NVD) WITH EPISIOTOMY",
  "LOWER SEGMENT CAESAREAN SECTION (LSCS)",
  "TOTAL ABDOMINAL HYSTERECTOMY (TAH) ± BSO",
  "DIAGNOSTIC LAPAROSCOPY",
  "INCISION & DRAINAGE (I&D)",
  "WOUND DEBRIDEMENT & SUTURING",
  "CONSERVATIVE / MEDICAL MANAGEMENT",
];

const emptyPatient = {
  ipUmrNo: "",
  dischargeDate: new Date().toISOString().slice(0, 10),
  dischargeTime: "",
  ipdDays: "",
  ward: "",
  bedNo: "",
  admissionDate: "",
  admissionTime: "",
  patientName: "",
  fatherHusbandName: "",
  ageDob: "",
  sex: "",
  uhid: "",
  bookingNo: "",
  telephone: "",
  maritalStatus: "",
  address: "",
  consultantName: "",
  consultants: [""],
  anaestheticsDoctor: "",
};

const emptyForm = {
  diagnosis: "",
  procedure: "",
  notes: "",
  preparedBy: "",
  preparedDate: new Date().toISOString().slice(0, 10),
  consultantSignature: "",
  seal: "",
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};


const doctorOptionValue = (doctor) => {
  if (!doctor) return "";
  const raw = String(doctor).trim();
  return formatDoctorName(raw);
};

function normalizePatient(data = {}) {
  return {
    ...emptyPatient,
    ipUmrNo:
      data.ipUmrNo ||
      data.ipUmrNoNumber ||
      data.ipdNo ||
      data.hospitalNo ||
      data.ipNo ||
      data.umrNo ||
      "",
    dischargeDate:
      data.dischargeDate ||
      data.dateOfDischarge ||
      data.discharge_date ||
      "",
    dischargeTime:
      data.dischargeTime ||
      data.timeOfDischarge ||
      data.discharge_time ||
      "",
    ipdDays:
      data.ipdDays ||
      data.ipdDaysCount ||
      data.lengthOfStay ||
      data.days ||
      "",
    ward: data.ward || data.wardName || "",
    bedNo: data.bedNo || data.bedNumber || data.bed || "",
    admissionDate:
      data.admissionDate ||
      data.dateOfAdmission ||
      data.admission_date ||
      "",
    admissionTime:
      data.admissionTime ||
      data.timeOfAdmission ||
      data.admission_time ||
      "",
    patientName: data.patientName || data.name || data.patient_name || "",
    fatherHusbandName:
      data.fatherHusbandName ||
      data.fatherName ||
      data.husbandName ||
      data.relativeName ||
      "",
    ageDob:
      data.ageDob ||
      data.age ||
      data.ageDateOfBirth ||
      data.dateOfBirth ||
      data.dob ||
      "",
    sex: data.sex || data.gender || "",
    uhid: data.uhid || data.UHID || data.uhidNo || data.uhid_no || "",
    bookingNo:
      data.bookingNo ||
      data.bookingNumber ||
      data.bookingId ||
      data.booking_id ||
      data.booking_no ||
      "",
    telephone:
      data.telephone ||
      data.mobile ||
      data.phone ||
      data.mobileNumber ||
      data.contactNo ||
      "",
    maritalStatus:
      data.maritalStatus ||
      data.marital_status ||
      "",
    address:
      data.address ||
      data.patientAddress ||
      data.patient_address ||
      "",
    consultantName: consultantVal ? formatDoctorName(consultantVal) : "",
    consultants: consultantsList.length ? consultantsList.map((c) => formatDoctorName(c)) : [""],
    anaestheticsDoctor:
      doctorOptionValue(
        data.anaestheticsDoctor ||
        data.anestheticsDoctor ||
        data.anaesthetist ||
        data.anesthesiologist ||
        ""
      ),
  };
}

export default function DischargeSummaryForm() {
  const [uhid, setUhid] = useState("");
  const [bookingNo, setBookingNo] = useState("");
  const [patient, setPatient] = useState(emptyPatient);
  const [form, setForm] = useState(emptyForm);
  const [doctorList, setDoctorList] = useState(DOCTORS);
  const [showDoctorManage, setShowDoctorManage] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({ name: "", qualification: "" });

  const [diagnosisList, setDiagnosisList] = useState(DIAGNOSIS_OPTIONS);
  const [showDiagnosisManage, setShowDiagnosisManage] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState(null);
  const [diagnosisForm, setDiagnosisForm] = useState({ text: "" });

  const [procedureList, setProcedureList] = useState(PROCEDURE_OPTIONS);
  const [showProcedureManage, setShowProcedureManage] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [procedureForm, setProcedureForm] = useState({ text: "" });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    try {
      const savedDoctors = localStorage.getItem("kgNandaDischargeDoctors");
      if (savedDoctors) {
        const parsedDocs = JSON.parse(savedDoctors);
        if (Array.isArray(parsedDocs) && parsedDocs.length) setDoctorList(parsedDocs);
      }
    } catch {
      // Defaults remain active.
    }

    try {
      const savedDiagnoses = localStorage.getItem("kgNandaDischargeDiagnoses");
      if (savedDiagnoses) {
        const parsed = JSON.parse(savedDiagnoses);
        if (Array.isArray(parsed) && parsed.length) setDiagnosisList(parsed);
      }
    } catch {
      // Defaults remain active.
    }

    try {
      const savedProcedures = localStorage.getItem("kgNandaDischargeProcedures");
      if (savedProcedures) {
        const parsed = JSON.parse(savedProcedures);
        if (Array.isArray(parsed) && parsed.length) setProcedureList(parsed);
      }
    } catch {
      // Defaults remain active.
    }
  }, []);

  const persistDoctors = (next) => {
    setDoctorList(next);
    try {
      localStorage.setItem("kgNandaDischargeDoctors", JSON.stringify(next));
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
          const anaestheticsDoctor =
            prev.anaestheticsDoctor === editingDoctor.name
              ? name
              : prev.anaestheticsDoctor;
          return {
            ...prev,
            consultants,
            consultantName: consultants.filter(Boolean).join(", "),
            anaestheticsDoctor,
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

  const persistDiagnoses = (next) => {
    setDiagnosisList(next);
    try {
      localStorage.setItem("kgNandaDischargeDiagnoses", JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const resetDiagnosisForm = () => {
    setEditingDiagnosis(null);
    setDiagnosisForm({ text: "" });
  };

  const saveMasterDiagnosis = () => {
    const text = String(diagnosisForm.text || "").trim().toUpperCase();
    if (!text) {
      alert("Diagnosis text is required.");
      return;
    }

    if (editingDiagnosis !== null) {
      const next = diagnosisList.map((item, idx) =>
        idx === editingDiagnosis ? text : item
      );
      persistDiagnoses(next);
    } else {
      if (diagnosisList.includes(text)) {
        alert("This diagnosis already exists in the list.");
        return;
      }
      const next = [text, ...diagnosisList];
      persistDiagnoses(next);
    }
    resetDiagnosisForm();
  };

  const editMasterDiagnosis = (item, index) => {
    setEditingDiagnosis(index);
    setDiagnosisForm({ text: item });
  };

  const deleteMasterDiagnosis = (index) => {
    const item = diagnosisList[index];
    if (!window.confirm(`Delete "${item}" from the diagnosis list?`)) return;
    const next = diagnosisList.filter((_, idx) => idx !== index);
    persistDiagnoses(next);
    if (editingDiagnosis === index) {
      resetDiagnosisForm();
    }
  };

  const persistProcedures = (next) => {
    setProcedureList(next);
    try {
      localStorage.setItem("kgNandaDischargeProcedures", JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const resetProcedureForm = () => {
    setEditingProcedure(null);
    setProcedureForm({ text: "" });
  };

  const saveMasterProcedure = () => {
    const text = String(procedureForm.text || "").trim().toUpperCase();
    if (!text) {
      alert("Procedure text is required.");
      return;
    }

    if (editingProcedure !== null) {
      const next = procedureList.map((item, idx) =>
        idx === editingProcedure ? text : item
      );
      persistProcedures(next);
    } else {
      if (procedureList.includes(text)) {
        alert("This procedure already exists in the list.");
        return;
      }
      const next = [text, ...procedureList];
      persistProcedures(next);
    }
    resetProcedureForm();
  };

  const editMasterProcedure = (item, index) => {
    setEditingProcedure(index);
    setProcedureForm({ text: item });
  };

  const deleteMasterProcedure = (index) => {
    const item = procedureList[index];
    if (!window.confirm(`Delete "${item}" from the procedure list?`)) return;
    const next = procedureList.filter((_, idx) => idx !== index);
    persistProcedures(next);
    if (editingProcedure === index) {
      resetProcedureForm();
    }
  };

  const updatePatient = (field, value) => {
    setPatient((prev) => ({ ...prev, [field]: value }));
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

  const calculateIpdDays = useMemo(() => {
    if (!patient.admissionDate || !patient.dischargeDate) return "";
    const admission = new Date(patient.admissionDate);
    const discharge = new Date(patient.dischargeDate);
    if (Number.isNaN(admission.getTime()) || Number.isNaN(discharge.getTime())) {
      return "";
    }
    const diff = Math.ceil(
      (discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(1, diff);
  }, [patient.admissionDate, patient.dischargeDate]);

  useEffect(() => {
    const cleanUhid = String(uhid || "").replace(/\s/g, "");
    const cleanBooking = String(bookingNo || "").trim();

    if (!cleanUhid && !cleanBooking) {
      setLoading(false);
      setStatus("");
      return undefined;
    }

    if (!cleanBooking && cleanUhid.length < 3) {
      setStatus("");
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setStatus("Fetching patient record...");

      try {
        const endpoints = [];

        if (cleanUhid) {
          endpoints.push(
            `${API_BASE}/api/patients/lookup?value=${encodeURIComponent(cleanUhid)}&type=uhid`,
            `${API_BASE}/patients/search?uhid=${encodeURIComponent(cleanUhid)}`,
            `${API_BASE}/patients/uhid/${encodeURIComponent(cleanUhid)}`
          );
        }

        if (cleanBooking) {
          endpoints.push(
            `${API_BASE}/api/patients/lookup?value=${encodeURIComponent(cleanBooking)}&type=booking`,
            `${API_BASE}/patients/search?bookingId=${encodeURIComponent(cleanBooking)}`,
            `${API_BASE}/patients/booking/${encodeURIComponent(cleanBooking)}`,
            `${API_BASE}/bookings/search?bookingId=${encodeURIComponent(cleanBooking)}`
          );
        }

        let patientData = null;

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
              break;
            }
          } catch (requestError) {
            if (requestError.name === "AbortError") throw requestError;
          }
        }

        if (!patientData) {
          setStatus(
            cleanBooking
              ? "No patient found for this Token Number."
              : "No patient found for this UHID No."
          );
          return;
        }

        const normalized = normalizePatient(patientData);
        if (!normalized.ipdDays && calculateIpdDays) {
          normalized.ipdDays = calculateIpdDays;
        }

        setPatient((prev) => ({
          ...prev,
          ...normalized,
          uhid: normalized.uhid || cleanUhid || prev.uhid,
          bookingNo: normalized.bookingNo || cleanBooking || prev.bookingNo,
        }));

        setStatus(
          `✓ Patient found: ${
            normalized.patientName || normalized.uhid || normalized.bookingNo
          }`
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
  }, [uhid, bookingNo, calculateIpdDays]);

  const saveSummary = async (printAfterSave = false) => {
    if (!patient.patientName && !patient.uhid && !patient.bookingNo) {
      setStatus("Please enter patient details or UHID / Token Number.");
      if (printAfterSave) {
        setTimeout(() => window.print(), 200);
      }
      return;
    }

    const payload = {
      ...patient,
      ...form,
      ipdDays: patient.ipdDays || calculateIpdDays || "",
      createdAt: new Date().toISOString(),
    };

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/discharge-summaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Save failed");

      setStatus("Discharge summary saved successfully.");
    } catch {
      setStatus(
        "Summary saved locally. Print is available."
      );
    } finally {
      setSaving(false);
    }

    if (printAfterSave) {
      setTimeout(() => window.print(), 200);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.screenHeader}>
       
      </header>

      <main className={styles.card}>
        <section className={styles.lookupBox}>
          <div className={styles.lookupGrid}>
            <div className={styles.lookupField}>
              <span>UHID No.</span>
              <div className={styles.lookupInputRow}>
                <input
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                  placeholder="Enter UHID No."
                />
              </div>
            </div>

            <div className={styles.lookupField}>
              <span>Token Number</span>
              <div className={styles.lookupInputRow}>
                <input
                  value={bookingNo}
                  onChange={(e) => setBookingNo(e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                  placeholder="Enter Token Number"
                />
              </div>
            </div>
          </div>

          {status && <div className={styles.status}>{status}</div>}
        </section>

        <section className={styles.section}>
         

          <div className={styles.grid}>
            <Field label="I.P. / UMR No.">
              <input
                value={patient.ipUmrNo}
                onChange={(e) => updatePatient("ipUmrNo", e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
              />
            </Field>

            <Field label="Discharge Date">
              <input
                type="date"
                value={patient.dischargeDate}
                onChange={(e) =>
                  updatePatient("dischargeDate", e.target.value)
                }
              />
            </Field>

            <Field label="Discharge Time">
              <input
                type="time"
                value={patient.dischargeTime}
                onChange={(e) =>
                  updatePatient("dischargeTime", e.target.value)
                }
              />
            </Field>

            <Field label="No. of IPD Days">
              <input
                value={patient.ipdDays || calculateIpdDays}
                onChange={(e) => updatePatient("ipdDays", e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </Field>

            <Field label="Ward">
              <input
                value={patient.ward}
                onChange={(e) => updatePatient("ward", e.target.value.replace(/[^a-zA-Z0-9\s\-\/]/g, ''))}
              />
            </Field>

            <Field label="Bed No.">
              <input
                value={patient.bedNo}
                onChange={(e) => updatePatient("bedNo", e.target.value.replace(/[^a-zA-Z0-9\s\-\/]/g, ''))}
              />
            </Field>

            <Field label="Admission Date">
              <input
                type="date"
                value={patient.admissionDate}
                onChange={(e) =>
                  updatePatient("admissionDate", e.target.value)
                }
              />
            </Field>

            <Field label="Admission Time">
              <input
                type="time"
                value={patient.admissionTime}
                onChange={(e) =>
                  updatePatient("admissionTime", e.target.value)
                }
              />
            </Field>

            <Field label="Patient's Name" wide>
              <input
                value={patient.patientName}
                onChange={(e) =>
                  updatePatient("patientName", e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))
                }
              />
            </Field>

            <Field label="Father's / Husband's Name" wide>
              <input
                value={patient.fatherHusbandName}
                onChange={(e) =>
                  updatePatient("fatherHusbandName", e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))
                }
              />
            </Field>

            <Field label="Age / Date of Birth">
              <input
                value={patient.ageDob}
                onChange={(e) => updatePatient("ageDob", e.target.value.replace(/[^0-9a-zA-Z\s\-\/]/g, '').slice(0, 15))}
              />
            </Field>

            <Field label="Sex">
              <select
                value={patient.sex}
                onChange={(e) => updatePatient("sex", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="UHID No.">
              <input
                value={patient.uhid}
                onChange={(e) => updatePatient("uhid", e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
              />
            </Field>

          

            <Field label="Tel. No.">
              <input
                value={patient.telephone}
                onChange={(e) =>
                  updatePatient("telephone", e.target.value.replace(/\D/g, '').slice(0, 10))
                }
              />
            </Field>

            <Field label="Marital Status">
              <select
                value={patient.maritalStatus}
                onChange={(e) =>
                  updatePatient("maritalStatus", e.target.value)
                }
              >
                <option value="">Select</option>
                <option value="Married">Married</option>
                <option value="Unmarried">Unmarried</option>
                <option value="Widow">Widow</option>
                <option value="Widower">Widower</option>
                <option value="Divorced">Divorced</option>
              </select>
            </Field>

            <Field label="Address" wide>
              <textarea
                value={patient.address}
                onChange={(e) => updatePatient("address", e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/#]/g, ''))}
                rows="2"
              />
            </Field>

            <div style={{ gridColumn: "span 2", marginTop: "4px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    color: "#244d6f",
                    fontSize: "14px",
                    fontWeight: "800",
                  }}
                >
                  Consultant Doctor Name(s)
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetDoctorForm();
                      setShowDoctorManage(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 12px",
                      border: "1px solid #bae6fd",
                      borderRadius: "7px",
                      background: "#f0f9ff",
                      color: "#0284c7",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Manage Doctors
                  </button>
                  <button
                    type="button"
                    onClick={addConsultant}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 12px",
                      border: "1px solid #a9d7f2",
                      borderRadius: "7px",
                      background: "#e0f2fe",
                      color: "#0284c7",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    + Add Consultant
                  </button>
                </div>
              </div>

              {(patient.consultants && patient.consultants.length > 0
                ? patient.consultants
                : [patient.consultantName || ""]
              ).map((consultant, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "24px",
                      color: "#64748b",
                      fontSize: "12px",
                      fontWeight: "750",
                      textAlign: "center",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <select
                    value={consultant}
                    onChange={(e) => updateConsultant(index, e.target.value)}
                    className={styles.doctorSelect}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Consultant Doctor</option>
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
                        width: "36px",
                        height: "36px",
                        border: "1px solid #fee2e2",
                        borderRadius: "6px",
                        background: "#fef2f2",
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: "bold",
                        fontSize: "15px",
                      }}
                      title="Remove consultant"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ gridColumn: "span 2", marginTop: "4px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    color: "#244d6f",
                    fontSize: "14px",
                    fontWeight: "800",
                  }}
                >
                  Anaesthetics Dr.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetDoctorForm();
                    setShowDoctorManage(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    border: "1px solid #bae6fd",
                    borderRadius: "7px",
                    background: "#f0f9ff",
                    color: "#0284c7",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Manage Doctors
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                  value={patient.anaestheticsDoctor}
                  onChange={(e) =>
                    updatePatient("anaestheticsDoctor", e.target.value)
                  }
                  className={styles.doctorSelect}
                  style={{ flex: 1 }}
                >
                  <option value="">Select Anaesthetics Doctor</option>
                  {patient.anaestheticsDoctor &&
                    !doctorList.some((d) => d.name === patient.anaestheticsDoctor) && (
                      <option value={patient.anaestheticsDoctor}>
                        {formatDoctorName(patient.anaestheticsDoctor)}
                      </option>
                    )}
                  {doctorList.map((doctor) => (
                    <option key={doctor.id} value={doctor.name}>
                      {formatDoctorName(doctor.name)}{doctor.qualification ? ` — ${doctor.qualification}` : ''}
                    </option>
                  ))}
                </select>

                {patient.anaestheticsDoctor && (
                  <button
                    type="button"
                    onClick={() => updatePatient("anaestheticsDoctor", "")}
                    style={{
                      width: "36px",
                      height: "36px",
                      border: "1px solid #fee2e2",
                      borderRadius: "6px",
                      background: "#fef2f2",
                      color: "#dc2626",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: "bold",
                      fontSize: "15px",
                    }}
                    title="Remove / Clear Anaesthetics Doctor"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.documentSection}>
            <div className={styles.documentHeading} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <span>DIAGNOSIS</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    resetDiagnosisForm();
                    setShowDiagnosisManage(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    border: "1px solid #bae6fd",
                    borderRadius: "6px",
                    background: "#f0f9ff",
                    color: "#0284c7",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    height: "36px",
                  }}
                >
                  Manage Diagnoses
                </button>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Quick Select:</span>
                <select
                  style={{
                    height: "36px",
                    borderRadius: "6px",
                    border: "1px solid #c8d9e5",
                    padding: "0 10px",
                    background: "#ffffff",
                    color: "#173b5d",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    maxWidth: "280px",
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateForm(
                        "diagnosis",
                        form.diagnosis
                          ? `${form.diagnosis}, ${e.target.value}`
                          : e.target.value
                      );
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select Diagnosis</option>
                  {diagnosisList.map((diag, idx) => (
                    <option key={idx} value={diag}>
                      {diag}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={form.diagnosis}
              onChange={(e) => updateForm("diagnosis", e.target.value)}
              placeholder="Enter or select diagnosis..."
              rows="4"
            />
          </div>

          <div className={styles.documentSection}>
            <div className={styles.documentHeading} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <span>PROCEDURE</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    resetProcedureForm();
                    setShowProcedureManage(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    border: "1px solid #bae6fd",
                    borderRadius: "6px",
                    background: "#f0f9ff",
                    color: "#0284c7",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    height: "36px",
                  }}
                >
                  Manage Procedures
                </button>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Quick Select:</span>
                <select
                  style={{
                    height: "36px",
                    borderRadius: "6px",
                    border: "1px solid #c8d9e5",
                    padding: "0 10px",
                    background: "#ffffff",
                    color: "#173b5d",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    maxWidth: "280px",
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateForm(
                        "procedure",
                        form.procedure
                          ? `${form.procedure}, ${e.target.value}`
                          : e.target.value
                      );
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select Procedure</option>
                  {procedureList.map((proc, idx) => (
                    <option key={idx} value={proc}>
                      {proc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={form.procedure}
              onChange={(e) => updateForm("procedure", e.target.value)}
              placeholder="Enter or select procedure / operation details..."
              rows="4"
            />
          </div>

          <div className={styles.documentSection}>
            <div className={styles.documentHeading}>NOTE</div>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              placeholder="Enter discharge advice / notes..."
              rows="4"
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>02</span>
            <div>
              <h2>Prepared &amp; Signature Details</h2>
              <p>Print par ye details document ke bottom mein show hongi.</p>
            </div>
          </div>

          <div className={styles.grid}>
            <Field label="Prepared By">
              <input
                value={form.preparedBy}
                onChange={(e) => updateForm("preparedBy", e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))}
                placeholder="Dr. / Staff Name"
              />
            </Field>

            <Field label="Date">
              <input
                type="date"
                value={form.preparedDate}
                onChange={(e) =>
                  updateForm("preparedDate", e.target.value)
                }
              />
            </Field>

            <Field label="Consultant's Signature">
              <input
                value={form.consultantSignature}
                onChange={(e) =>
                  updateForm("consultantSignature", e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))
                }
                placeholder="Signature / Name"
              />
            </Field>

            <Field label="Seal">
              <input
                value={form.seal}
                onChange={(e) => updateForm("seal", e.target.value)}
                placeholder="Hospital / Doctor Seal"
              />
            </Field>
          </div>
        </section>

        <div className={styles.bottomActions}>
          <button
            className={styles.secondary}
            disabled={saving}
            onClick={() => saveSummary(false)}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            className={styles.primary}
            disabled={saving}
            onClick={() => saveSummary(true)}
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

      {showDiagnosisManage && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setShowDiagnosisManage(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Manage Diagnoses</h3>
                <p>Add new diagnoses, edit text or remove items from the quick select list.</p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowDiagnosisManage(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.masterFormSingle}>
              <input
                value={diagnosisForm.text}
                onChange={(e) =>
                  setDiagnosisForm({ text: e.target.value })
                }
                placeholder="Diagnosis text e.g. ACUTE APPENDICITIS"
              />

              <button
                className={styles.primarySmall}
                onClick={saveMasterDiagnosis}
              >
                {editingDiagnosis !== null ? "Update" : "Add"}
              </button>

              {editingDiagnosis !== null && (
                <button
                  className={styles.cancelSmall}
                  onClick={resetDiagnosisForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className={styles.masterList}>
              {diagnosisList.map((item, index) => (
                <div className={styles.masterRow} key={index}>
                  <div>
                    <strong>{item}</strong>
                  </div>

                  <div className={styles.masterActions}>
                    <button onClick={() => editMasterDiagnosis(item, index)}>
                      Edit
                    </button>

                    <button
                      className={styles.dangerText}
                      onClick={() => deleteMasterDiagnosis(index)}
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

      {showProcedureManage && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setShowProcedureManage(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Manage Procedures</h3>
                <p>Add new procedures, edit text or remove items from the quick select list.</p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowProcedureManage(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.masterFormSingle}>
              <input
                value={procedureForm.text}
                onChange={(e) =>
                  setProcedureForm({ text: e.target.value })
                }
                placeholder="Procedure text e.g. LAPAROSCOPIC APPENDECTOMY"
              />

              <button
                className={styles.primarySmall}
                onClick={saveMasterProcedure}
              >
                {editingProcedure !== null ? "Update" : "Add"}
              </button>

              {editingProcedure !== null && (
                <button
                  className={styles.cancelSmall}
                  onClick={resetProcedureForm}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className={styles.masterList}>
              {procedureList.map((item, index) => (
                <div className={styles.masterRow} key={index}>
                  <div>
                    <strong>{item}</strong>
                  </div>

                  <div className={styles.masterActions}>
                    <button onClick={() => editMasterProcedure(item, index)}>
                      Edit
                    </button>

                    <button
                      className={styles.dangerText}
                      onClick={() => deleteMasterProcedure(index)}
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
          <span className={styles.printTitle}>DISCHARGE SUMMARY</span>
        </div>

        <div className={styles.printMainBox}>
          {/* Top Section: IPD / Admission / Discharge details */}
          <div className={styles.printTopSection}>
            <div className={styles.printRow}>
              <div style={{ width: '32%' }}><b>I.P./UMR No : </b>{patient.ipUmrNo}</div>
              <div style={{ width: '28%' }}><b>Discharge Date : </b>{formatDate(patient.dischargeDate)}</div>
              <div style={{ width: '20%' }}><b>Time : </b>{patient.dischargeTime || ''}</div>
              <div style={{ width: '20%', textAlign: 'right' }}><b>No. of IPD Days : </b>{patient.ipdDays || calculateIpdDays}</div>
            </div>
            <div className={styles.printRow}>
              <div style={{ width: '25%' }}><b>Ward : </b>{patient.ward}</div>
              <div style={{ width: '25%' }}><b>Bed No : </b>{patient.bedNo}</div>
              <div style={{ width: '28%' }}><b>Admission Date : </b>{formatDate(patient.admissionDate)}</div>
              <div style={{ width: '22%' }}><b>Time : </b>{patient.admissionTime || ''}</div>
            </div>
          </div>

          {/* Patient Details Section */}
          <div className={styles.printPatientSection}>
            <div className={styles.printRow}>
              <div style={{ width: '50%' }}><b>Patient's Name : </b>{patient.patientName}</div>
              <div style={{ width: '50%' }}><b>Father's/Husband's Name : </b>{patient.fatherHusbandName}</div>
            </div>

            <div className={styles.printRow}>
              <div style={{ width: '35%' }}><b>Age/Date of Birth : </b>{patient.ageDob ? `${patient.ageDob} Y` : ''}</div>
              <div style={{ width: '25%' }}><b>Sex : </b>{patient.sex}</div>
              <div style={{ width: '40%' }}><b>UHID No : </b>{patient.uhid}</div>
            </div>

            <div className={styles.printRow}>
              <div style={{ width: '50%' }}><b>Tel no. : </b>{patient.telephone}</div>
              <div style={{ width: '50%' }}><b>Marital Status : </b>{patient.maritalStatus}</div>
            </div>

            <div className={styles.printRow}>
              <div style={{ width: '100%' }}><b>Address : </b>{patient.address}</div>
            </div>

            <div className={styles.printRow} style={{ alignItems: 'flex-start', marginBottom: 0 }}>
              <div style={{ width: '60%', display: 'flex', gap: '4px' }}>
                <b style={{ whiteSpace: 'nowrap' }}>Consultant Name : </b>
                <div>
                  {(patient.consultants && patient.consultants.filter(Boolean).length > 0
                    ? patient.consultants.filter(Boolean)
                    : [patient.consultantName]
                  ).filter(Boolean).map((c, i) => (
                    <div key={i} style={{ fontWeight: 'normal' }}>
                      {formatDoctorName(c).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ width: '40%' }}>
                <b>Anaesthetics Dr : </b>
                <span style={{ fontWeight: 'normal' }}>
                  {patient.anaestheticsDoctor ? formatDoctorName(patient.anaestheticsDoctor).toUpperCase() : ''}
                </span>
              </div>
            </div>
          </div>

          {/* DIAGNOSIS Section */}
          <div className={styles.printDiagnosisSection}>
            <div className={styles.printSectionLabel}>DIAGNOSIS</div>
            <div className={styles.printSectionBody}>
              {form.diagnosis ? String(form.diagnosis).toUpperCase() : ''}
            </div>
          </div>

          {/* PROCEDURE Section */}
          <div className={styles.printProcedureSection}>
            <div className={styles.printSectionLabel}>PROCEDURE</div>
            <div className={styles.printSectionBody}>
              {form.procedure ? String(form.procedure).toUpperCase() : ''}
            </div>
          </div>
        </div>

        {/* Note below box */}
        <div className={styles.printNote}>
          <b>NOTE :- </b>मरीज को चावल, दूध, दही,फल ज्यादा मसालेदार भोजन व वजनी सामान उठाना और सीढ़ी चढ़ना मना है
        </div>

        {/* Signatures */}
        <div className={styles.printSignatureRow}>
          <div>
            <div>
              <b>Prepared by : Dr</b>
              <span>{form.preparedBy ? ` ${form.preparedBy}` : '...........................................................'}</span>
            </div>
            <div>
              <b>Date : </b>
              <span>{form.preparedDate ? ` ${formatDate(form.preparedDate)}` : '........................................................................'}</span>
            </div>
          </div>
          <div>
            <div>
              <b>Consultant's Signature : </b>
              <span>{form.consultantSignature ? ` ${form.consultantSignature}` : '...........................................'}</span>
            </div>
            <div>
              <b>Seal : </b>
              <span>{form.seal ? ` ${form.seal}` : '.........................................................................'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
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
