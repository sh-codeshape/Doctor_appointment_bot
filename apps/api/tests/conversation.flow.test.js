import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock all external modules BEFORE importing the service ──────────
vi.mock('../src/modules/conversation/conversation.repository.js', () => ({
  default: { findByPhone: vi.fn(), upsert: vi.fn(), resetState: vi.fn(), deleteByPhone: vi.fn() }
}))
vi.mock('../src/modules/doctor/doctor.service.js', () => ({
  default: { getActiveDoctors: vi.fn(), getDoctorById: vi.fn(), getDoctorsByDepartment: vi.fn() }
}))
vi.mock('../src/modules/department/department.service.js', () => ({
  default: { getActiveDepartments: vi.fn() }
}))
vi.mock('../src/modules/booking/booking.service.js', () => ({
  default: { createBooking: vi.fn() }
}))
vi.mock('../src/modules/patient/patient.service.js', () => ({
  default: { findByPhone: vi.fn(), findOrCreateByPhone: vi.fn(), registerPatientWithBooking: vi.fn(), findAllByPhone: vi.fn() }
}))
vi.mock('../src/modules/medicine/medicineOrder.service.js', () => ({
  default: { createOrder: vi.fn() }
}))
vi.mock('../src/utils/cloudinary.js', () => ({
  uploadPrescriptionImage: vi.fn().mockResolvedValue('https://res.cloudinary.com/demo/image/upload/rx.jpg'),
}))
vi.mock('../src/utils/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

// ── Imports ─────────────────────────────────────────────────────────
import conversationService from '../src/modules/conversation/conversation.service.js'
import { toEmojiDigit } from '../src/modules/conversation/conversation.steps.js'
import conversationRepo from '../src/modules/conversation/conversation.repository.js'
import doctorService from '../src/modules/doctor/doctor.service.js'
import departmentService from '../src/modules/department/department.service.js'
import patientService from '../src/modules/patient/patient.service.js'
import medicineOrderService from '../src/modules/medicine/medicineOrder.service.js'

// ── Fixtures ────────────────────────────────────────────────────────
const DEPT = { _id: 'dept1', name: 'General Consultation' }
const DOCTOR = { _id: 'doc1', name: 'Dr. Smith', qualifications: 'MBBS', departmentId: 'dept1' }
const PATIENT_NEW = { _id: 'pat1', name: 'Unknown' }
const PATIENT_RETURNING = { _id: 'pat1', name: 'Raj Kumar', age: 30, gender: 'Male', district: 'Jaunpur', address: 'Civil Lines' }
const PHONE = '919999999999'

let stateStore
let mockProvider

function setupStateStore() {
  stateStore = {}
  conversationRepo.findByPhone.mockImplementation(async (p) => stateStore[p] || null)
  conversationRepo.upsert.mockImplementation(async (p, data) => {
    stateStore[p] = { ...(stateStore[p] || {}), phone: p, ...data }
    return stateStore[p]
  })
  conversationRepo.resetState.mockImplementation(async (p) => {
    stateStore[p] = {
      phone: p, currentStep: 'WELCOME', currentFlow: null,
      selectedDoctorId: null, selectedDate: null,
      tempName: null, tempAge: null, tempGender: null, stateData: {},
    }
    return stateStore[p]
  })
}

function setupDefaultMocks() {
  departmentService.getActiveDepartments.mockResolvedValue([DEPT])
  doctorService.getActiveDoctors.mockResolvedValue([DOCTOR])
  doctorService.getDoctorsByDepartment.mockResolvedValue([DOCTOR])
  doctorService.getDoctorById.mockResolvedValue(DOCTOR)
  patientService.findByPhone.mockResolvedValue(null)
  patientService.findAllByPhone.mockResolvedValue([])
  patientService.findOrCreateByPhone.mockResolvedValue(PATIENT_NEW)
  patientService.registerPatientWithBooking.mockResolvedValue({
    patient: { _id: 'pat1', name: 'John Doe', uhid: 'KGN-092026-00042' },
    booking: { _id: 'b1', bookingId: 'BK-20260907-001', tokenNumber: 'T-OPD-07092026-001' },
  })
  medicineOrderService.createOrder.mockResolvedValue({ _id: 'm1', orderId: 'MED-202609-001' })
}

/** Send a text message, return the last reply */
async function send(text) {
  await conversationService.handleMessage(PHONE, { type: 'text', body: text })
  const calls = mockProvider.sendTextMessage.mock.calls
  return calls.length ? calls[calls.length - 1][1] : null
}

/** Drive a new patient to the REVIEW step, return the review text */
async function driveToReview() {
  await send('hi')        // WELCOME
  await send('1')         // OPD → departments
  await send('1')         // dept → OPD_PATIENT_TYPE_EARLY
  await send('2')         // New Patient → doctors
  await send('1')         // doctor → dates
  await send('1')         // date → patient name (new patient)
  await send('John Doe')  // → mobile
  await send('9876543210')// → age
  await send('30')        // → age → gender
  await send('1')         // Male → district
  await send('Jaunpur')   // → address
  await send('Civil Lines') // → PIN code
  await send('222001')    // → problem
  return send('Fever for 2 days')   // → REVIEW
}

// ═══════════════════════════════════════════════════════════════════
describe('Conversation Booking Flow (current)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = { sendTextMessage: vi.fn(), downloadMedia: vi.fn() }
    conversationService.setProvider(mockProvider)
    setupStateStore()
    setupDefaultMocks()
  })

  it('welcomes a first-time user', async () => {
    const reply = await send('hi')
    expect(reply).toContain('Namaste')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('goes WELCOME → departments → doctors → dates', async () => {
    await send('hi')
    let reply = await send('1')
    expect(reply).toContain('General Consultation')
    expect(stateStore[PHONE].currentStep).toBe('OPD_DEPARTMENT')

    reply = await send('1')
    expect(reply).toContain('PATIENT TYPE')
    expect(stateStore[PHONE].currentStep).toBe('OPD_PATIENT_TYPE_EARLY')

    reply = await send('2')
    expect(reply).toContain('Dr. Smith')
    expect(stateStore[PHONE].currentStep).toBe('OPD_DOCTOR')

    reply = await send('1')
    expect(reply).toContain('Dr. Smith')
    expect(stateStore[PHONE].currentStep).toBe('SELECT_DATE')
  })

  it('completes the full OPD flow for a new patient via shared registration', async () => {
    const review = await driveToReview()
    expect(review).toContain('REVIEW')
    expect(stateStore[PHONE].currentStep).toBe('REVIEW')

    const reply = await send('1')
    expect(patientService.registerPatientWithBooking).toHaveBeenCalledWith(
      expect.objectContaining({ phone: PHONE, name: 'John Doe', type: 'OPD', pinCode: '222001' }),
      { source: 'whatsapp' },
      { validate: false }
    )
    expect(reply).toContain('T-OPD-07092026-001')
    expect(reply).toContain('KGN-092026-00042')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('routes a returning patient through WHO_FOR', async () => {
    patientService.findAllByPhone.mockResolvedValue([PATIENT_RETURNING])
    await send('hi'); await send('1'); await send('1'); await send('2'); await send('1')
    const reply = await send('1')
    expect(reply).toContain('BOOKING FOR WHOM')
    expect(stateStore[PHONE].currentStep).toBe('WHO_FOR')

    const next = await send('2') // someone else → full form
    expect(next).toContain('Patient Name')
    expect(stateStore[PHONE].currentStep).toBe('PATIENT_NAME')
  })

  it('steps back with 0', async () => {
    await send('hi'); await send('1')
    const reply = await send('0')
    expect(reply).toContain('Namaste')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('resets with menu/00 from mid-flow', async () => {
    await send('hi'); await send('1'); await send('1')
    const reply = await send('menu')
    expect(reply).toContain('Namaste')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('rejects invalid department/doctor/date inputs', async () => {
    await send('hi'); await send('1')
    let reply = await send('99')
    expect(reply).toContain('Invalid input')

    await send('1') // patient type early
    await send('2') // new patient -> doctor
    reply = await send('99')
    expect(reply).toContain('Invalid input')

    await send('1')
    reply = await send('not-a-date')
    expect(reply).toContain('Select Appointment Date')
  })

  it('rejects bad mobile/age/gender in patient form', async () => {
    await send('hi'); await send('1'); await send('1'); await send('2'); await send('1'); await send('1')
    await send('John Doe')
    let reply = await send('123')
    expect(reply).toContain('Invalid Mobile Number')
    await send('9876543210')
    reply = await send('999')
    expect(reply).toContain('Invalid input')
    await send('30')
    reply = await send('9')
    expect(reply).toContain('Invalid input')
  })

  it('completes the hospitalization flow via shared registration including patient type (isOld)', async () => {
    patientService.registerPatientWithBooking.mockResolvedValue({
      patient: { _id: 'pat1', name: 'Ramesh', uhid: 'KGN-092026-00043' },
      booking: { _id: 'b2', bookingId: 'BK-20260907-002', tokenNumber: 'HOSP-001' },
    })
    await send('hi')
    await send('2')
    expect(stateStore[PHONE].currentStep).toBe('HOSP_NAME')
    await send('Ramesh')
    await send('9876543210') // mobile
    await send('45')         // age
    await send('1')          // Male
    await send('1')          // Old/Existing Patient (isOld = true)
    await send('Jaunpur')    // district
    await send('Civil Lines')// address
    expect(stateStore[PHONE].currentStep).toBe('HOSP_PINCODE')
    await send('222001')     // PIN code
    expect(stateStore[PHONE].currentStep).toBe('HOSP_PROBLEM')
    await send('Chest pain') // problem
    expect(stateStore[PHONE].currentStep).toBe('HOSP_DATE')
    const review = await send('1') // date selection -> REVIEW
    expect(review).toContain('REVIEW HOSPITALIZATION')
    expect(stateStore[PHONE].currentStep).toBe('HOSP_REVIEW')
    const reply = await send('1') // confirm review -> done
    expect(patientService.registerPatientWithBooking).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'HOSPITALIZATION', isOld: true, name: 'Ramesh', pinCode: '222001' }),
      { source: 'whatsapp' },
      { validate: false }
    )
    expect(reply).toContain('Hospitalization Request Received')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('routes a returning patient through HOSP_WHO_FOR in hospitalization flow', async () => {
    patientService.findAllByPhone.mockResolvedValue([PATIENT_RETURNING])
    await send('hi')
    const reply = await send('2')
    expect(reply).toContain('HOSPITALIZATION')
    expect(stateStore[PHONE].currentStep).toBe('HOSP_WHO_FOR')

    const typeMsg = await send('1') // Select Raj Kumar
    expect(typeMsg).toContain('PATIENT TYPE')
    expect(stateStore[PHONE].currentStep).toBe('HOSP_TYPE')

    await send('1') // Old Patient (isOld = true) -> problem (since Raj Kumar has district/address)
    expect(stateStore[PHONE].currentStep).toBe('HOSP_PROBLEM')
    await send('Severe pain')
    const review = await send('1') // date option 1 -> HOSP_REVIEW
    expect(review).toContain('REVIEW HOSPITALIZATION')
    expect(stateStore[PHONE].currentStep).toBe('HOSP_REVIEW')
  })

  it('completes the medicine flow with a prescription image (asking name for first-time user)', async () => {
    mockProvider.downloadMedia.mockResolvedValue({ mimeType: 'image/jpeg', buffer: Buffer.from('img') })
    await send('hi')
    await send('3')
    expect(stateStore[PHONE].currentStep).toBe('MED_PRESCRIPTION')
    await conversationService.handleMessage(PHONE, { type: 'image', imageId: 'img1' })
    expect(stateStore[PHONE].currentStep).toBe('MED_NAME')
    await send('Ramesh Kumar')
    expect(stateStore[PHONE].currentStep).toBe('MED_ADDRESS')
    await send('Civil Lines, Jaunpur')
    expect(stateStore[PHONE].currentStep).toBe('MED_PINCODE')
    const reply = await send('222001')
    expect(medicineOrderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryAddress: 'Civil Lines, Jaunpur', pinCode: '222001' })
    )
    expect(reply).toContain('Prescription Received')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('re-asks for the photo when text is sent instead of an image', async () => {
    await send('hi'); await send('3')
    const reply = await send('no photo, just text')
    expect(reply).toContain('prescription')
    expect(stateStore[PHONE].currentStep).toBe('MED_PRESCRIPTION')
  })

  it('shows info/support/email options without leaving WELCOME', async () => {
    await send('hi')
    for (const opt of ['4', '5', '6']) {
      const reply = await send(opt)
      expect(reply).toBeTruthy()
      expect(stateStore[PHONE].currentStep).toBe('WELCOME')
    }
  })

  it('correctly formats single and multi-digit numbers to keycap emojis (including numbers > 9)', () => {
    expect(toEmojiDigit(1)).toBe('1️⃣')
    expect(toEmojiDigit(9)).toBe('9️⃣')
    expect(toEmojiDigit(10)).toBe('1️⃣0️⃣')
    expect(toEmojiDigit(12)).toBe('1️⃣2️⃣')
  })

  it('rejects mobile numbers not matching exactly 10 digits', async () => {
    await send('hi'); await send('1'); await send('1'); await send('2'); await send('1'); await send('1')
    await send('Jane Doe')
    let reply = await send('987654321') // 9 digits
    expect(reply).toContain('Invalid Mobile Number')
    reply = await send('98765432100') // 11 digits
    expect(reply).toContain('Invalid Mobile Number')
    reply = await send('9876543210') // valid 10 digits
    expect(reply).toContain('Age')
  })

  it('validates 6-digit PIN code in a separate question', async () => {
    await send('hi'); await send('1'); await send('1'); await send('2'); await send('1'); await send('1')
    await send('Jane Doe'); await send('9876543210'); await send('25'); await send('1'); await send('Jaunpur')
    let reply = await send('Civil Lines')
    expect(reply).toContain('PIN Code')
    expect(stateStore[PHONE].currentStep).toBe('PATIENT_PINCODE')
    reply = await send('123') // invalid pin
    expect(reply).toContain('Invalid PIN Code')
    reply = await send('232104') // valid pin
    expect(reply).toContain('Health Problem')
    expect(stateStore[PHONE].currentStep).toBe('PATIENT_PROBLEM')
  })

  it('handles Gynaecology Infertility visit options (2-10) and Option 11 for custom visit number', async () => {
    departmentService.getActiveDepartments.mockResolvedValue([{ _id: 'deptGynae', name: 'Gynaecology & Obstetrics' }])
    await send('hi')
    await send('1') // OPD
    await send('1') // Gynae dept
    await send('1') // Old patient
    let reply = await send('1') // Infertility category
    expect(reply).toContain('2nd Visit')
    expect(reply).toContain('10th Visit')
    expect(reply).toContain('1️⃣1️⃣')
    expect(stateStore[PHONE].currentStep).toBe('OPD_INFERTILITY_VISIT')

    // Selecting option 11 -> prompts for custom visit number
    reply = await send('11')
    expect(reply).toContain('visit number')
    expect(stateStore[PHONE].currentStep).toBe('OPD_INFERTILITY_VISIT_OTHER')

    // Replying with visit 12 -> transitions to doctor selection
    reply = await send('12')
    expect(stateStore[PHONE].currentStep).toBe('OPD_DOCTOR')
    expect(stateStore[PHONE].stateData.visitNumber).toBe(12)
  })

  it('rejects booking when patient already has a booking on the preferred date', async () => {
    patientService.registerPatientWithBooking.mockRejectedValueOnce(
      new (await import('../src/middleware/errorHandler.js')).AppError('Patient already has a booking for this appointment date. Maximum 1 request per day is allowed.', 400)
    )

    await send('hi'); await send('1'); await send('1'); await send('2'); await send('1'); await send('1')
    await send('Jane Doe'); await send('9876543210'); await send('25'); await send('1'); await send('Jaunpur')
    await send('Civil Lines'); await send('232104'); await send('Fever')
    const reply = await send('1') // Confirm

    expect(reply).toContain('Booking Limit Reached')
    expect(stateStore[PHONE].currentStep).toBe('WELCOME')
  })

  it('rejects booking and sends bilingual message when doctor max patient limit is reached', async () => {
    patientService.registerPatientWithBooking.mockRejectedValueOnce(
      new (await import('../src/middleware/errorHandler.js')).AppError('Dr. Smith has reached the maximum daily limit of 30 patients for 30/08/2026. Please select another date or doctor.', 400)
    )

    await send('hi'); await send('1'); await send('1'); await send('2'); await send('1'); await send('1')
    await send('Jane Doe'); await send('9876543210'); await send('25'); await send('1'); await send('Jaunpur')
    await send('Civil Lines'); await send('232104'); await send('Fever')
    const reply = await send('1') // Confirm

    expect(reply).toContain('Daily OPD limit has crossed')
    expect(reply).toContain('इस डेट की OPD फुल हो चुकी है')
    expect(reply).toContain('All right reserved by the hospital')
    expect(stateStore[PHONE].currentStep).toBe('SELECT_DATE')
  })

  it('safely handles function parameters and non-string values passed to sendMessage', async () => {
    // Send a message with a function parameter directly
    await conversationService.sendMessage(PHONE, () => 'Test message string')
    expect(mockProvider.sendTextMessage).toHaveBeenCalledWith(PHONE, 'Test message string')

    // Send a message with a number
    await conversationService.sendMessage(PHONE, 123456)
    expect(mockProvider.sendTextMessage).toHaveBeenCalledWith(PHONE, '123456')
  })
})

