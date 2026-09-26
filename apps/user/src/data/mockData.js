/**
 * Mock Data for development.
 * 
 * This file provides realistic dummy data so the UI works
 * without a backend. When VITE_USE_MOCK=false, this file is never used.
 * 
 * Structure mirrors the expected API response shapes exactly,
 * making the switch to real data seamless.
 */

// ── Departments (mirror seed) ──
export const mockDepartments = [
  { id: 1, name: 'Obstetrics & Gynaecology' },
  { id: 2, name: 'Laparoscopic & General Surgery' },
  { id: 3, name: 'Orthopaedics' },
  { id: 4, name: 'Urology' },
  { id: 5, name: 'Anaesthetist' },
  { id: 6, name: 'General Surgery (Shalya)' },
  { id: 7, name: 'Paediatric' },
  { id: 8, name: 'ENT' },
  { id: 9, name: 'RMO - Resident Medical Officer' },
]

// ── Doctors (mirror seed - 17+ official roster doctors) ──
export const mockDoctors = [
  { id: 1, department_id: 2, name: 'Abhinav Katiyar', role: 'Laparoscopic Surgeon', department: 'Laparoscopic & General Surgery', qualification: 'MBBS, DNB', experience: '12+ Years', consultation_fee: 500, old_patient_fee: 300, emergency_fee: 800, is_active: true, image: '' },
  { id: 2, department_id: 1, name: 'Anand Prakash Tiwari', role: 'Senior Gynaecologist & Infertility Specialist', department: 'Obstetrics & Gynaecology', qualification: 'M.S. (Obs & Gynae)', experience: '15+ Years', consultation_fee: 500, old_patient_fee: 300, emergency_fee: 800, is_active: true, image: '' },
  { id: 3, department_id: 4, name: 'Vikram Singh', role: 'Urologist', department: 'Urology', qualification: 'MBBS, MCH', experience: '14+ Years', consultation_fee: 600, old_patient_fee: 350, emergency_fee: 1000, is_active: true, image: '' },
  { id: 4, department_id: 3, name: 'Arun Kumar Singh', role: 'Orthopedic Surgeon', department: 'Orthopaedics', qualification: 'MBBS', experience: '10+ Years', consultation_fee: 400, old_patient_fee: 250, emergency_fee: 700, is_active: true, image: '' },
  { id: 5, department_id: 2, name: 'Vishwanath Pratap Singh', role: 'Laparoscopic Surgeon', department: 'Laparoscopic & General Surgery', qualification: 'MBBS, MS', experience: '11+ Years', consultation_fee: 500, old_patient_fee: 300, emergency_fee: 800, is_active: true, image: '' },
  { id: 6, department_id: 3, name: 'Pankaj Kumar Singh', role: 'Orthopedic Specialist', department: 'Orthopaedics', qualification: 'MBBS, MS', experience: '13+ Years', consultation_fee: 500, old_patient_fee: 300, emergency_fee: 800, is_active: true, image: '' },
  { id: 7, department_id: 5, name: 'Sushil Krishna Murti', role: 'Anesthesiologist', department: 'Anaesthetist', qualification: 'MBBS, MD', experience: '16+ Years', consultation_fee: 500, old_patient_fee: 300, emergency_fee: 800, is_active: true, image: '' },
  { id: 8, department_id: 6, name: 'Mrityunjay Prasad', role: 'General & Ayurvedic Surgeon', department: 'General Surgery (Shalya)', qualification: 'MS (Shalya)', experience: '12+ Years', consultation_fee: 400, old_patient_fee: 250, emergency_fee: 700, is_active: true, image: '' },
  { id: 9, department_id: 9, name: 'Ankit Kumar Singh', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'MBBS', experience: '6+ Years', consultation_fee: 300, old_patient_fee: 200, emergency_fee: 500, is_active: true, image: '' },
  { id: 10, department_id: 7, name: 'Prabhunath Dubey', role: 'Pediatric Specialist', department: 'Paediatric', qualification: 'BMS, PGDNC', experience: '10+ Years', consultation_fee: 350, old_patient_fee: 200, emergency_fee: 600, is_active: true, image: '' },
  { id: 11, department_id: 8, name: 'Abhinav Mishra', role: 'ENT Specialist', department: 'ENT', qualification: 'MBBS, MS (ENT)', experience: '9+ Years', consultation_fee: 400, old_patient_fee: 250, emergency_fee: 700, is_active: true, image: '' },
  { id: 12, department_id: 6, name: 'Yogesh Kumar Pandey', role: 'General & Ayurvedic Surgeon', department: 'General Surgery (Shalya)', qualification: 'MS (Shalya)', experience: '11+ Years', consultation_fee: 400, old_patient_fee: 250, emergency_fee: 700, is_active: true, image: '' },
  { id: 13, department_id: 9, name: 'Akhilesh Kumar Singh', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'BAMS (RMO)', experience: '7+ Years', consultation_fee: 300, old_patient_fee: 200, emergency_fee: 500, is_active: true, image: '' },
  { id: 14, department_id: 3, name: 'Niket Raj Garg', role: 'Orthopedic Surgeon', department: 'Orthopaedics', qualification: 'MBBS, MS', experience: '10+ Years', consultation_fee: 450, old_patient_fee: 300, emergency_fee: 750, is_active: true, image: '' },
  { id: 15, department_id: 7, name: 'Dilip Kumar Gupta', role: 'Senior Pediatrician', department: 'Paediatric', qualification: 'MBBS, DCH', experience: '14+ Years', consultation_fee: 400, old_patient_fee: 250, emergency_fee: 700, is_active: true, image: '' },
  { id: 16, department_id: 9, name: 'Parvez Ahmad', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'BAMS, MD', experience: '8+ Years', consultation_fee: 300, old_patient_fee: 200, emergency_fee: 500, is_active: true, image: '' },
  { id: 17, department_id: 9, name: 'Umesh Kumar Maurya', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'MBBS', experience: '9+ Years', consultation_fee: 350, old_patient_fee: 200, emergency_fee: 600, is_active: true, image: '' },
  { id: 18, department_id: 1, name: 'Shobha Jaiswal', role: 'Gynecologist & Obstetrician', department: 'Obstetrics & Gynaecology', qualification: 'MBBS, MS (Obs & Gynae)', experience: '12+ Years', consultation_fee: 400, old_patient_fee: 250, emergency_fee: 700, is_active: true, image: '' },
  { id: 19, department_id: 1, name: 'Sadhna Chaurasiya', role: 'Gynecologist & Obstetrician', department: 'Obstetrics & Gynaecology', qualification: 'MBBS, DGO', experience: '9+ Years', consultation_fee: 350, old_patient_fee: 200, emergency_fee: 600, is_active: true, image: '' },
]

// ── Services ──
export const mockServices = [
  { id: 1, name: 'Gynecology Consultation', description: 'Expert consultation', is_active: true },
  { id: 2, name: 'General Consultation', description: 'Regular checkup', is_active: true },
  { id: 3, name: 'General Surgery', description: 'Surgical services', is_active: true },
  { id: 4, name: 'Urology', description: 'Urinary tract screening', is_active: true },
]

// ── Bookings ──
// Identity rules (mirror backend D2/D3): one UHID per phone (family shares it),
// every booking gets its own token (per doctor per day). created_by=null means
// WhatsApp bot; a staff code means registered by that staff member.
export const mockBookings = [
  {
    id: 1,
    booking_id: 'BK-20260820-001',
    doctor_id: 2,
    doctor_name: 'Abhishek Kumar Singh',
    service_id: 1,
    service_name: 'General Consultation',
    patient_name: 'Rahul Kumar',
    mobile: '9876543210',
    uhid: 'KGN-2026-00001',
    token_number: 'T-002',
    type: 'OPD',
    date: '2026-08-20',
    time_slot: '11:00 AM',
    status: 'confirmed',
    created_by: null,
    created_at: '2026-08-19T14:30:00Z',
    updated_at: '2026-08-19T15:00:00Z',
  },
  {
    id: 2,
    booking_id: 'BK-20260820-002',
    doctor_id: 1,
    doctor_name: 'Anand Prakash Tiwari',
    service_id: 1,
    service_name: 'General Consultation',
    patient_name: 'Neha Singh',
    mobile: '9876543211',
    uhid: 'KGN-2026-00002',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-20',
    time_slot: '10:00 AM',
    status: 'confirmed',
    created_by: null,
    created_at: '2026-08-19T16:00:00Z',
    updated_at: '2026-08-19T16:30:00Z',
  },
  {
    id: 3,
    booking_id: 'BK-20260820-003',
    doctor_id: 3,
    doctor_name: 'Yogesh Pandey',
    service_id: 3,
    service_name: 'Bone & Joint',
    patient_name: 'Amit Gupta',
    mobile: '9876543212',
    uhid: 'KGN-2026-00003',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-20',
    time_slot: '12:00 PM',
    status: 'pending',
    created_by: null,
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
  {
    id: 4,
    booking_id: 'BK-20260821-001',
    doctor_id: 2,
    doctor_name: 'Abhishek Kumar Singh',
    service_id: 2,
    service_name: 'Skin Treatment',
    patient_name: 'Pooja Yadav',
    mobile: '9876543213',
    uhid: 'KGN-2026-00004',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-21',
    time_slot: '05:00 PM',
    status: 'completed',
    created_by: null,
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-21T17:30:00Z',
  },
  {
    id: 5,
    booking_id: 'BK-20260822-001',
    doctor_id: 1,
    doctor_name: 'Anand Prakash Tiwari',
    service_id: 1,
    service_name: 'General Consultation',
    patient_name: 'Vikram Mehra',
    mobile: '9876543214',
    uhid: 'KGN-2026-00005',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-22',
    time_slot: '09:00 AM',
    status: 'cancelled',
    created_by: null,
    created_at: '2026-08-21T11:00:00Z',
    updated_at: '2026-08-22T08:00:00Z',
  },
  {
    id: 6,
    booking_id: 'BK-20260825-001',
    doctor_id: 3,
    doctor_name: 'Yogesh Pandey',
    service_id: 3,
    service_name: 'Bone & Joint',
    patient_name: 'Sneha Kapoor',
    mobile: '9876543215',
    uhid: 'KGN-2026-00006',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-25',
    time_slot: '02:00 PM',
    status: 'confirmed',
    created_by: null,
    created_at: '2026-08-24T10:00:00Z',
    updated_at: '2026-08-24T10:30:00Z',
  },
  {
    id: 7,
    booking_id: 'BK-20260826-001',
    doctor_id: 2,
    doctor_name: 'Abhishek Kumar Singh',
    service_id: 2,
    service_name: 'Skin Treatment',
    patient_name: 'Ravi Sharma',
    mobile: '9876543216',
    uhid: 'KGN-2026-00007',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-26',
    time_slot: '11:30 AM',
    status: 'pending',
    created_by: null,
    created_at: '2026-08-25T16:00:00Z',
    updated_at: '2026-08-25T16:00:00Z',
  },
  {
    id: 8,
    booking_id: 'BK-20260828-001',
    doctor_id: 1,
    doctor_name: 'Anand Prakash Tiwari',
    service_id: 1,
    service_name: 'General Consultation',
    patient_name: 'Priya Nair',
    mobile: '9876543217',
    uhid: 'KGN-2026-00008',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-08-28',
    time_slot: '04:00 PM',
    status: 'confirmed',
    created_by: 'KGN_RC_001',
    created_at: '2026-08-27T09:00:00Z',
    updated_at: '2026-08-27T09:30:00Z',
  },
  {
    id: 9,
    booking_id: 'BK-20260830-001',
    doctor_id: 3,
    doctor_name: 'Yogesh Pandey',
    service_id: 3,
    service_name: 'Bone & Joint',
    patient_name: 'Arjun Reddy',
    mobile: '9876543218',
    uhid: 'KGN-2026-00009',
    token_number: 'T-002',
    type: 'OPD',
    date: '2026-08-30',
    time_slot: '10:30 AM',
    status: 'completed',
    created_by: null,
    created_at: '2026-08-29T14:00:00Z',
    updated_at: '2026-08-30T11:00:00Z',
  },
  {
    id: 10,
    booking_id: 'BK-20260901-001',
    doctor_id: 2,
    doctor_name: 'Abhishek Kumar Singh',
    service_id: 2,
    service_name: 'Skin Treatment',
    patient_name: 'Kavita Joshi',
    mobile: '9876543219',
    uhid: 'KGN-2026-00010',
    token_number: 'T-001',
    type: 'OPD',
    date: '2026-09-01',
    time_slot: '03:00 PM',
    status: 'pending',
    created_by: null,
    created_at: '2026-08-31T12:00:00Z',
    updated_at: '2026-08-31T12:00:00Z',
  },
  {
    // Family follow-up: SAME phone + SAME UHID as booking 1, NEW token (D2/D3 demo)
    id: 11,
    booking_id: 'BK-20260902-001',
    doctor_id: 2,
    doctor_name: 'Abhishek Kumar Singh',
    service_id: 1,
    service_name: 'General Consultation',
    patient_name: 'Rahul Kumar',
    mobile: '9876543210',
    uhid: 'KGN-2026-00001',
    token_number: 'T-003',
    type: 'OPD',
    date: '2026-09-02',
    time_slot: '10:00 AM',
    status: 'confirmed',
    created_by: 'KGN_RC_001',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:30:00Z',
  },
  {
    // Hospitalization: booking ID only, no doctor, no token
    id: 12,
    booking_id: 'BK-20260902-002',
    doctor_id: null,
    doctor_name: '—',
    service_id: null,
    service_name: 'Hospitalization',
    patient_name: 'Ramesh Kumar',
    mobile: '9876543220',
    uhid: 'KGN-2026-00011',
    token_number: null,
    type: 'HOSPITALIZATION',
    date: '2026-09-03',
    time_slot: '—',
    status: 'pending',
    created_by: null,
    created_at: '2026-09-02T09:00:00Z',
    updated_at: '2026-09-02T09:00:00Z',
  },
]

// ── Time Slots ──
export const mockTimeSlots = [
  { id: 1, doctor_id: 1, time: '09:00 AM', is_booked: false },
  { id: 2, doctor_id: 1, time: '10:00 AM', is_booked: true },
  { id: 3, doctor_id: 1, time: '11:00 AM', is_booked: false },
  { id: 4, doctor_id: 1, time: '12:00 PM', is_booked: false },
  { id: 5, doctor_id: 1, time: '02:00 PM', is_booked: true },
  { id: 6, doctor_id: 1, time: '03:00 PM', is_booked: false },
  { id: 7, doctor_id: 1, time: '04:00 PM', is_booked: true },
  { id: 8, doctor_id: 1, time: '05:00 PM', is_booked: false },
  { id: 9, doctor_id: 2, time: '10:00 AM', is_booked: true },
  { id: 10, doctor_id: 2, time: '11:00 AM', is_booked: true },
  { id: 11, doctor_id: 2, time: '11:30 AM', is_booked: true },
  { id: 12, doctor_id: 2, time: '12:00 PM', is_booked: false },
  { id: 13, doctor_id: 2, time: '03:00 PM', is_booked: true },
  { id: 14, doctor_id: 2, time: '04:00 PM', is_booked: false },
  { id: 15, doctor_id: 2, time: '05:00 PM', is_booked: true },
  { id: 16, doctor_id: 3, time: '09:00 AM', is_booked: false },
  { id: 17, doctor_id: 3, time: '10:00 AM', is_booked: false },
  { id: 18, doctor_id: 3, time: '10:30 AM', is_booked: true },
  { id: 19, doctor_id: 3, time: '12:00 PM', is_booked: true },
  { id: 20, doctor_id: 3, time: '02:00 PM', is_booked: true },
  { id: 21, doctor_id: 3, time: '03:00 PM', is_booked: false },
  { id: 22, doctor_id: 3, time: '04:00 PM', is_booked: false },
]

// ── Dashboard Stats ──
export const mockDashboardStats = {
  totalBookings: 128,
  todayBookings: 24,
  confirmed: 98,
  cancelled: 10,
  totalRevenue: 86400,
  totalDoctors: 4,
  activeDoctors: 3,
  totalPatients: 95,
}

// ── Chart Data (Last 7 days) ──
export const mockChartData = [
  { date: 'Aug 26', bookings: 12, confirmed: 9, cancelled: 1 },
  { date: 'Aug 27', bookings: 18, confirmed: 15, cancelled: 2 },
  { date: 'Aug 28', bookings: 15, confirmed: 12, cancelled: 1 },
  { date: 'Aug 29', bookings: 22, confirmed: 18, cancelled: 3 },
  { date: 'Aug 30', bookings: 19, confirmed: 16, cancelled: 1 },
  { date: 'Aug 31', bookings: 25, confirmed: 20, cancelled: 2 },
  { date: 'Sep 01', bookings: 17, confirmed: 8, cancelled: 0 },
]

// ── Patients (derived from bookings; enriched for print slips) ──
export const mockPatients = [
  { id: 1, name: 'Rahul Kumar', mobile: '9876543210', uhid: 'KGN-2026-00001', age: 45, gender: 'Male', district: 'Prayagraj', address: '123, Rose Garden, Civil Lines', pinCode: '211001', isOld: false, total_bookings: 5, last_visit: '2026-08-20' },
  { id: 2, name: 'Neha Singh', mobile: '9876543211', uhid: 'KGN-2026-00002', age: 28, gender: 'Female', district: 'Prayagraj', address: '45, MG Road', pinCode: '211001', isOld: false, total_bookings: 3, last_visit: '2026-08-20' },
  { id: 3, name: 'Amit Gupta', mobile: '9876543212', uhid: 'KGN-2026-00003', age: 52, gender: 'Male', district: 'Jaunpur', address: '78, Station Road', pinCode: '222001', isOld: true, total_bookings: 2, last_visit: '2026-08-20' },
  { id: 4, name: 'Pooja Yadav', mobile: '9876543213', uhid: 'KGN-2026-00004', age: 31, gender: 'Female', district: 'Jaunpur', address: '12, Olandganj', pinCode: '222001', isOld: true, total_bookings: 4, last_visit: '2026-08-21' },
  { id: 5, name: 'Vikram Mehra', mobile: '9876543214', uhid: 'KGN-2026-00005', age: 60, gender: 'Male', district: 'Prayagraj', address: '9, Tagore Town', pinCode: '211002', isOld: false, total_bookings: 1, last_visit: '2026-08-22' },
  { id: 6, name: 'Sneha Kapoor', mobile: '9876543215', uhid: 'KGN-2026-00006', age: 24, gender: 'Female', district: 'Varanasi', address: '3, Sigra', pinCode: '221001', isOld: true, total_bookings: 6, last_visit: '2026-08-25' },
  { id: 7, name: 'Ravi Sharma', mobile: '9876543216', uhid: 'KGN-2026-00007', age: 38, gender: 'Male', district: 'Jaunpur', address: '56, Sadar Bazar', pinCode: '222001', isOld: false, total_bookings: 2, last_visit: '2026-08-26' },
  { id: 8, name: 'Priya Nair', mobile: '9876543217', uhid: 'KGN-2026-00008', age: 29, gender: 'Female', district: 'Prayagraj', address: '21, Alopibagh', pinCode: '211006', isOld: true, total_bookings: 3, last_visit: '2026-08-28' },
  { id: 9, name: 'Arjun Reddy', mobile: '9876543218', uhid: 'KGN-2026-00009', age: 47, gender: 'Male', district: 'Varanasi', address: '7, Lanka', pinCode: '221005', isOld: true, total_bookings: 7, last_visit: '2026-08-30' },
  { id: 10, name: 'Kavita Joshi', mobile: '9876543219', uhid: 'KGN-2026-00010', age: 55, gender: 'Female', district: 'Jaunpur', address: '33, Wajidpur', pinCode: '222001', isOld: false, total_bookings: 1, last_visit: '2026-09-01' },
  { id: 11, name: 'Ramesh Kumar', mobile: '9876543220', uhid: 'KGN-2026-00011', age: 62, gender: 'Male', district: 'Jaunpur', address: '14, Katra', pinCode: '222001', isOld: true, total_bookings: 1, last_visit: '2026-09-02' },
]

// ── Mock Users (all roles, mock login) ──
// Demo passwords: super123 / admin123 / doctor123 / recep123 / pharm123
export const mockUsers = [
  { id: 1, name: 'Super Admin', email: 'super@kgnanda.com', role: 'superadmin', staffCode: 'KGN_SA_001', doctorId: null, phone: '9876543200', salary: 0, joiningDate: '2026-01-01', address: 'KG Nanda Hospital', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], is_active: true },
  { id: 2, name: 'Hospital Admin', email: 'admin@docbot.com', role: 'admin', staffCode: 'KGN_ADM_001', doctorId: null, phone: '9876543201', salary: 60000, joiningDate: '2026-02-01', address: 'KG Nanda Hospital', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], is_active: true },
  { id: 3, name: 'Anand Prakash Tiwari', email: 'doctor@kgnanda.com', role: 'doctor', staffCode: 'KGN_DOC_001', doctorId: 1, phone: '+91 98765 00001', salary: 80000, joiningDate: '2026-03-01', address: 'KG Nanda Hospital', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], is_active: true },
  { id: 4, name: 'Front Desk', email: 'reception@kgnanda.com', role: 'receptionist', staffCode: 'KGN_RC_001', doctorId: null, phone: '9876543201', salary: 18000, joiningDate: '2026-04-01', address: 'Jaunpur', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], is_active: true },
  { id: 5, name: 'Pharmacy Desk', email: 'pharmacy@kgnanda.com', role: 'pharmacy', staffCode: 'KGN_PHR_001', doctorId: null, phone: '9876543202', salary: 20000, joiningDate: '2026-04-15', address: 'Jaunpur', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], is_active: true },
]

export const mockUserPasswords = {
  'super@kgnanda.com': 'super123',
  'admin@docbot.com': 'admin123',
  'doctor@kgnanda.com': 'doctor123',
  'reception@kgnanda.com': 'recep123',
  'pharmacy@kgnanda.com': 'pharm123',
}

// ── Mock User (Admin) — kept for backwards compat ──
export const mockUser = mockUsers[1]

// ── Medicine Orders (mock) ──
export const mockMedicineOrders = [
  {
    id: 1,
    order_id: 'MED-202608-001',
    patient_name: 'Rahul Kumar',
    mobile: '9876543210',
    address: 'Sector 12, Rohini, Delhi 110085',
    prescription_url: '/uploads/rx_demo1.jpg',
    customer_notes: 'Sugar medicine monthly',
    staff_notes: '',
    status: 'pending',
    created_by: null,
    created_at: '2026-08-28T10:00:00Z',
  },
  {
    id: 2,
    order_id: 'MED-202608-002',
    patient_name: 'Neha Singh',
    mobile: '9876543211',
    address: 'Civil Lines, Jaunpur 222001',
    prescription_url: '/uploads/rx_demo2.jpg',
    customer_notes: '',
    staff_notes: 'Called, confirmed generic substitute OK',
    status: 'processing',
    created_by: null,
    created_at: '2026-08-29T11:00:00Z',
  },
  {
    id: 3,
    order_id: 'MED-202609-001',
    patient_name: 'Amit Gupta',
    mobile: '9876543212',
    address: 'Station Road, Jaunpur 222001',
    prescription_url: '/uploads/rx_demo3.jpg',
    customer_notes: 'Urgent — fever',
    staff_notes: '',
    status: 'dispatched',
    created_by: 'KGN_RC_001',
    created_at: '2026-09-01T09:00:00Z',
  },
]

// ── Mock identity counters (UHID per phone + name combination) ──
// Seeded from the bookings above so mock registration continues the series.
export const mockIdentityState = {
  uhidByPhoneAndName: {
    '9876543210:rahul kumar': 'KGN-2026-00001',
    '9876543211:neha singh': 'KGN-2026-00002',
    '9876543212:amit gupta': 'KGN-2026-00003',
    '9876543213:pooja yadav': 'KGN-2026-00004',
    '9876543214:vikram mehra': 'KGN-2026-00005',
    '9876543215:sneha kapoor': 'KGN-2026-00006',
    '9876543216:ravi sharma': 'KGN-2026-00007',
    '9876543217:priya nair': 'KGN-2026-00008',
    '9876543218:arjun reddy': 'KGN-2026-00009',
    '9876543219:kavita joshi': 'KGN-2026-00010',
    '9876543220:ramesh kumar': 'KGN-2026-00011',
  },
  uhidByPhone: {
    '9876543210': 'KGN-2026-00001',
    '9876543211': 'KGN-2026-00002',
    '9876543212': 'KGN-2026-00003',
    '9876543213': 'KGN-2026-00004',
    '9876543214': 'KGN-2026-00005',
    '9876543215': 'KGN-2026-00006',
    '9876543216': 'KGN-2026-00007',
    '9876543217': 'KGN-2026-00008',
    '9876543218': 'KGN-2026-00009',
    '9876543219': 'KGN-2026-00010',
    '9876543220': 'KGN-2026-00011',
  },
  nextUhidSeq: 12,
  bookingSeqByDay: {},
  tokenSeqByDoctorDay: {},
  nextStaffSeqByRole: { superadmin: 2, admin: 2, doctor: 2, receptionist: 2, pharmacy: 2 },
}

export const STAFF_CODE_PREFIX = {
  superadmin: 'KGN_SA_',
  admin: 'KGN_ADM_',
  doctor: 'KGN_DOC_',
  receptionist: 'KGN_RC_',
  pharmacy: 'KGN_PHR_',
}

// ── Settings ──
export const mockSettings = {
  clinic_name: 'DocBot Clinic',
  clinic_address: '123 Health Street, Medical City',
  clinic_phone: '+91 98765 00000',
  whatsapp_number: '9161138859',
  whatsapp_api_status: 'connected',
  notification_booking_confirm: true,
  notification_booking_reminder: true,
  notification_booking_cancel: true,
  reminder_hours_before: 2,
}

// ── Doctor-wise Report ──
export const mockDoctorReport = [
  { doctor: 'Anand Prakash Tiwari', bookings: 42, revenue: 21000, completion_rate: 85 },
  { doctor: 'Abhishek Kumar Singh', bookings: 38, revenue: 30400, completion_rate: 92 },
  { doctor: 'Yogesh Pandey', bookings: 35, revenue: 35000, completion_rate: 78 },
  { doctor: 'Vikram Singh', bookings: 13, revenue: 15600, completion_rate: 88 },
]

// ── Status Distribution ──
export const mockStatusDistribution = [
  { name: 'Confirmed', value: 98, color: '#25D366' },
  { name: 'Pending', value: 15, color: '#f0ad4e' },
  { name: 'Completed', value: 5, color: '#58a6ff' },
  { name: 'Cancelled', value: 10, color: '#f85149' },
]

// ── Master Medicines Catalog (by Department) ──
export const mockMedicines = [
  // Obstetrics & Gynaecology (dept_id: 1)
  { id: 1, department_id: 1, name: 'Tab. Paracetamol 500 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '5 days' },
  { id: 2, department_id: 1, name: 'Tab. Ibuprofen 400 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'After meals', default_duration: '3 days' },
  { id: 3, department_id: 1, name: 'Tab. Pantoprazole 40 mg', dosage_form: 'Tab', default_dosage: '1-0-0', default_frequency: 'Before breakfast', default_duration: '7 days' },
  { id: 4, department_id: 1, name: 'Tab. Amoxicillin 500 mg', dosage_form: 'Tab', default_dosage: '1-1-1', default_frequency: 'Every 8 hours', default_duration: '5 days' },
  { id: 5, department_id: 1, name: 'Tab. Metronidazole 400 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '5 days' },
  { id: 6, department_id: 1, name: 'Tab. Doxycycline 100 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '7 days' },
  { id: 7, department_id: 1, name: 'Tab. Calcium + Vitamin D3', dosage_form: 'Tab', default_dosage: '0-1-0', default_frequency: 'Once daily', default_duration: '30 days' },
  { id: 8, department_id: 1, name: 'Tab. Ferrous Sulphate 200 mg', dosage_form: 'Tab', default_dosage: '1-0-0', default_frequency: 'Once daily', default_duration: '30 days' },
  { id: 9, department_id: 1, name: 'Tab. Folic Acid 5 mg', dosage_form: 'Tab', default_dosage: '1-0-0', default_frequency: 'Once daily', default_duration: '30 days' },
  { id: 10, department_id: 1, name: 'Tab. Norethisterone 5 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '5 days' },
  { id: 11, department_id: 1, name: 'Tranexamic Acid 500 mg', dosage_form: 'Tab', default_dosage: '1-1-1', default_frequency: 'Thrice daily', default_duration: '3 days' },
  { id: 12, department_id: 1, name: 'Cap. Probiotic', dosage_form: 'Cap', default_dosage: '1-0-0', default_frequency: 'Once daily', default_duration: '10 days' },
  { id: 13, department_id: 1, name: 'Syrup. Antacid', dosage_form: 'Syrup', default_dosage: '2 tsp', default_frequency: 'Thrice daily after food', default_duration: '7 days' },
  { id: 14, department_id: 1, name: 'Cream. Clotrimazole 1%', dosage_form: 'Cream', default_dosage: 'Local application', default_frequency: 'Twice daily', default_duration: '7 days' },

  // Laparoscopic & General Surgery (dept_id: 2)
  { id: 15, department_id: 2, name: 'Tab. Cefixime 200 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '5 days' },
  { id: 16, department_id: 2, name: 'Tab. Ondansetron 4 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'As needed for nausea', default_duration: '3 days' },
  { id: 17, department_id: 2, name: 'Tab. Aceclofenac + Paracetamol', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily after food', default_duration: '5 days' },
  { id: 18, department_id: 2, name: 'Cap. Omeprazole 20 mg', dosage_form: 'Cap', default_dosage: '1-0-0', default_frequency: 'Before meals', default_duration: '10 days' },
  { id: 19, department_id: 2, name: 'Tab. Chymoral Forte', dosage_form: 'Tab', default_dosage: '1-1-1', default_frequency: 'Before food', default_duration: '5 days' },

  // Orthopaedics (dept_id: 3)
  { id: 20, department_id: 3, name: 'Tab. Etoricoxib 90 mg', dosage_form: 'Tab', default_dosage: '1-0-0', default_frequency: 'Once daily after food', default_duration: '7 days' },
  { id: 21, department_id: 3, name: 'Tab. Methylcobalamin 1500 mcg', dosage_form: 'Tab', default_dosage: '0-0-1', default_frequency: 'At bedtime', default_duration: '30 days' },
  { id: 22, department_id: 3, name: 'Gel. Diclofenac Topical', dosage_form: 'Gel', default_dosage: 'Local application', default_frequency: '3 times daily', default_duration: '7 days' },
  { id: 23, department_id: 3, name: 'Tab. Thiocolchicoside 4 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '5 days' },

  // Urology (dept_id: 4)
  { id: 24, department_id: 4, name: 'Tab. Tamsulosin 0.4 mg', dosage_form: 'Tab', default_dosage: '0-0-1', default_frequency: 'After dinner', default_duration: '30 days' },
  { id: 25, department_id: 4, name: 'Tab. Nitrofurantoin 100 mg', dosage_form: 'Tab', default_dosage: '1-0-1', default_frequency: 'Twice daily with food', default_duration: '7 days' },
  { id: 26, department_id: 4, name: 'Syrup. Disodium Hydrogen Citrate', dosage_form: 'Syrup', default_dosage: '2 tsp in water', default_frequency: 'Thrice daily', default_duration: '10 days' },

  // Paediatric (dept_id: 7)
  { id: 27, department_id: 7, name: 'Syp. Paracetamol 250 mg / 5ml', dosage_form: 'Syrup', default_dosage: '5 ml', default_frequency: 'Every 6 hours as needed', default_duration: '3 days' },
  { id: 28, department_id: 7, name: 'Syp. Amoxicillin + Clavulanate', dosage_form: 'Syrup', default_dosage: '5 ml', default_frequency: 'Twice daily', default_duration: '5 days' },
  { id: 29, department_id: 7, name: 'Drops. Vitamin D3', dosage_form: 'Drops', default_dosage: '1 ml', default_frequency: 'Once daily', default_duration: '30 days' },

  // ENT (dept_id: 8)
  { id: 30, department_id: 8, name: 'Tab. Levocetirizine 5 mg', dosage_form: 'Tab', default_dosage: '0-0-1', default_frequency: 'At bedtime', default_duration: '10 days' },
  { id: 31, department_id: 8, name: 'Drops. Ciprofloxacin Ear Drops', dosage_form: 'Drops', default_dosage: '2 drops in ear', default_frequency: 'Thrice daily', default_duration: '7 days' },
  { id: 32, department_id: 8, name: 'Spray. Oxymetazoline Nasal', dosage_form: 'Spray', default_dosage: '1 puff each nostril', default_frequency: 'Twice daily', default_duration: '5 days' },
]

// ── Master Lab Tests Catalog (by Department) ──
export const mockLabTests = [
  { id: 1, department_id: 1, name: 'CBC (Complete Blood Count)', category: 'Haematology' },
  { id: 2, department_id: 1, name: 'Urine Routine & Microscopy', category: 'Pathology' },
  { id: 3, department_id: 1, name: 'Urine Culture & Sensitivity', category: 'Microbiology' },
  { id: 4, department_id: 1, name: 'Ultrasound (USG)', category: 'Radiology' },
  { id: 5, department_id: 1, name: 'Pap Smear', category: 'Cytology' },
  { id: 6, department_id: 1, name: 'Hormone Profile (e.g. TSH, LH, FSH, Prolactin)', category: 'Endocrinology' },
  { id: 7, department_id: 1, name: 'Blood Sugar (Fasting / PP)', category: 'Biochemistry' },
  { id: 8, department_id: 1, name: 'Lipid Profile', category: 'Biochemistry' },
  { id: 9, department_id: 1, name: 'Liver Function Test (LFT)', category: 'Biochemistry' },
  { id: 10, department_id: 2, name: 'Kidney Function Test (KFT / RFT)', category: 'Biochemistry' },
  { id: 11, department_id: 2, name: 'Coagulation Profile (PT/INR)', category: 'Haematology' },
  { id: 12, department_id: 2, name: 'CT Scan (Abdomen / Pelvis)', category: 'Radiology' },
  { id: 13, department_id: 3, name: 'X-Ray (Joint / Bone)', category: 'Radiology' },
  { id: 14, department_id: 3, name: 'Serum Calcium & Vitamin D', category: 'Biochemistry' },
  { id: 15, department_id: 3, name: 'Uric Acid', category: 'Biochemistry' },
  { id: 16, department_id: 4, name: 'KUB Ultrasound', category: 'Radiology' },
  { id: 17, department_id: 4, name: 'PSA (Prostate Specific Antigen)', category: 'Biochemistry' },
]

// ── Master Additional Advice Catalog ──
export const mockAdditionalAdvice = [
  { id: 1, department_id: 1, advice: 'Drink plenty of water and stay hydrated.' },
  { id: 2, department_id: 1, advice: 'Avoid lifting heavy weights for the next 2 weeks.' },
  { id: 3, department_id: 1, advice: 'Maintain a protein-rich diet.' },
  { id: 4, department_id: 1, advice: 'Follow up after 7 days with reports.' },
]
