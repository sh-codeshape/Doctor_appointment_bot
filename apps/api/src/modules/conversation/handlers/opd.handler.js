import conversationRepo from '../conversation.repository.js'
import doctorService from '../../doctor/doctor.service.js'
import patientService from '../../patient/patient.service.js'
import departmentService from '../../department/department.service.js'
import bookingRepo from '../../booking/booking.repository.js'
import { STEPS, MESSAGES } from '../conversation.steps.js'
import { resolveDate } from '../../../utils/dateHelpers.js'

const getId = (obj) => obj._id || obj.id

const isAnandDoctor = (d) => {
  if (!d) return false
  const idStr = String(d.id || d._id || '')
  if (idStr === '2') return true
  return /^\s*(dr\.?\s*)?anand\b/i.test(d.name || '')
}

export const opdHandler = {
  async handleOpdDepartment(service, phone, state, input) {
    const deps = await departmentService.getOpdWhatsAppDepartments()
    const idx = parseInt(input, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= deps.length) return service.sendMessage(phone, MESSAGES.invalidInput())
    
    const selectedDept = deps[idx]

    // ALL departments: ask Old/New patient first
    await conversationRepo.upsert(phone, {
      currentStep: STEPS.OPD_PATIENT_TYPE_EARLY,
      stateData: { ...state?.stateData, departmentId: getId(selectedDept), departmentName: selectedDept.name }
    })
    return service.sendMessage(phone, MESSAGES.patientTypeEarly(selectedDept.name))
  },

  async handlePatientTypeEarly(service, phone, state, input) {
    const choice = input.trim()
    let isOld = false
    if (choice === '1') isOld = true
    else if (choice === '2') isOld = false
    else return service.sendMessage(phone, MESSAGES.invalidInput())

    const deptId = state?.stateData?.departmentId
    const deptName = state?.stateData?.departmentName || ''
    const isGynae = /gyn|obstetric|स्त्री/i.test(deptName)

    await conversationRepo.upsert(phone, {
      stateData: { ...state.stateData, isOld }
    })

    if (isGynae) {
      if (!isOld) {
        // New Patient + Gynaecology → show ONLY Dr. Anand
        let docs = await doctorService.getDoctorsByDepartment(deptId)
        if (!docs.length) docs = await doctorService.getActiveDoctors()
        const drAnandDocs = docs.filter(isAnandDoctor)
        const finalDocs = drAnandDocs.length > 0 ? drAnandDocs : docs

        await conversationRepo.upsert(phone, {
          currentStep: STEPS.OPD_DOCTOR,
          stateData: { ...state.stateData, isOld, category: 'NewPatient' }
        })
        return service.sendMessage(phone, MESSAGES.doctors(deptName, finalDocs))
      } else {
        // Old Patient + Gynaecology → ask Infertility vs Others
        await conversationRepo.upsert(phone, {
          currentStep: STEPS.OPD_GYNAE_CATEGORY,
          stateData: { ...state.stateData, isOld }
        })
        return service.sendMessage(phone, MESSAGES.gynaeCategory())
      }
    }

    // Non-Gynaecology departments → show normal doctor listing
    let docs = await doctorService.getDoctorsByDepartment(deptId)
    if (!docs.length) docs = await doctorService.getActiveDoctors()

    await conversationRepo.upsert(phone, {
      currentStep: STEPS.OPD_DOCTOR,
      stateData: { ...state.stateData, isOld }
    })
    return service.sendMessage(phone, MESSAGES.doctors(deptName, docs))
  },

  async handleOpdGynaeCategory(service, phone, state, input) {
    const choice = input.trim()
    const deptId = state?.stateData?.departmentId
    const deptName = state?.stateData?.departmentName || 'Gynaecology & Obstetrics'

    let docs = await doctorService.getDoctorsByDepartment(deptId)
    if (!docs.length) docs = await doctorService.getActiveDoctors()

    const drAnandDocs = docs.filter(isAnandDoctor)
    const otherDocs = docs.filter(d => !isAnandDoctor(d))

    if (choice === '2') {
      // Others → Dr. Anand ONLY
      const finalDocs = drAnandDocs.length > 0 ? drAnandDocs : docs
      await conversationRepo.upsert(phone, {
        currentStep: STEPS.OPD_DOCTOR,
        stateData: { ...state.stateData, category: 'Others' }
      })
      return service.sendMessage(phone, MESSAGES.doctors(deptName, finalDocs))
    }

    if (choice === '1') {
      // Infertility → check DB for past infertility visits for this patient/phone
      const patients = await patientService.findAllByPhone(phone)
      const primaryPatient = patients[0]
      const pastVisits = primaryPatient ? await bookingRepo.getLatestInfertilityVisitCount(primaryPatient.id) : 0

      if (pastVisits === 0) {
        // No past infertility visits found in DB → prompt patient for visit number
        await conversationRepo.upsert(phone, {
          currentStep: STEPS.OPD_INFERTILITY_VISIT,
          stateData: { ...state.stateData, category: 'Infertility' }
        })
        return service.sendMessage(phone, MESSAGES.infertilityVisitPrompt())
      }

      // Has past visits in DB → current visit number is pastVisits + 1
      const currentVisitNumber = pastVisits + 1
      const isAnandTurn = (currentVisitNumber % 3 === 1)
      const finalDocs = isAnandTurn
        ? (drAnandDocs.length > 0 ? drAnandDocs : docs)
        : (otherDocs.length > 0 ? otherDocs : docs)

      await conversationRepo.upsert(phone, {
        currentStep: STEPS.OPD_DOCTOR,
        stateData: {
          ...state.stateData,
          category: 'Infertility',
          visitNumber: currentVisitNumber
        }
      })
      return service.sendMessage(phone, MESSAGES.doctors(deptName, finalDocs))
    }

    return service.sendMessage(phone, MESSAGES.invalidInput())
  },

  async handleInfertilityVisit(service, phone, state, input) {
    const match = input.trim().match(/\d+/)
    const n = match ? parseInt(match[0], 10) : NaN
    if (isNaN(n)) return service.sendMessage(phone, MESSAGES.invalidInput())

    if (n === 11) {
      await conversationRepo.upsert(phone, {
        currentStep: STEPS.OPD_INFERTILITY_VISIT_OTHER,
        stateData: { ...state.stateData, category: 'Infertility' }
      })
      return service.sendMessage(phone, MESSAGES.infertilityVisitOtherPrompt())
    }

    if (n < 2 || n > 10) return service.sendMessage(phone, MESSAGES.invalidInput())

    const deptId = state?.stateData?.departmentId
    const deptName = state?.stateData?.departmentName || 'Gynaecology & Obstetrics'

    let docs = await doctorService.getDoctorsByDepartment(deptId)
    if (!docs.length) docs = await doctorService.getActiveDoctors()

    const drAnandDocs = docs.filter(isAnandDoctor)
    const otherDocs = docs.filter(d => !isAnandDoctor(d))

    const isAnandTurn = (n % 3 === 1)
    const finalDocs = isAnandTurn
      ? (drAnandDocs.length > 0 ? drAnandDocs : docs)
      : (otherDocs.length > 0 ? otherDocs : docs)

    await conversationRepo.upsert(phone, {
      currentStep: STEPS.OPD_DOCTOR,
      stateData: { ...state.stateData, category: 'Infertility', visitNumber: n }
    })
    return service.sendMessage(phone, MESSAGES.doctors(deptName, finalDocs))
  },

  async handleInfertilityVisitOther(service, phone, state, input) {
    const match = input.trim().match(/\d+/)
    const n = match ? parseInt(match[0], 10) : NaN
    if (isNaN(n) || n < 1) return service.sendMessage(phone, MESSAGES.invalidInput())

    const deptId = state?.stateData?.departmentId
    const deptName = state?.stateData?.departmentName || 'Gynaecology & Obstetrics'

    let docs = await doctorService.getDoctorsByDepartment(deptId)
    if (!docs.length) docs = await doctorService.getActiveDoctors()

    const drAnandDocs = docs.filter(isAnandDoctor)
    const otherDocs = docs.filter(d => !isAnandDoctor(d))

    const isAnandTurn = (n % 3 === 1)
    const finalDocs = isAnandTurn
      ? (drAnandDocs.length > 0 ? drAnandDocs : docs)
      : (otherDocs.length > 0 ? otherDocs : docs)

    await conversationRepo.upsert(phone, {
      currentStep: STEPS.OPD_DOCTOR,
      stateData: { ...state.stateData, category: 'Infertility', visitNumber: n }
    })
    return service.sendMessage(phone, MESSAGES.doctors(deptName, finalDocs))
  },

  async handleOpdDoctor(service, phone, state, input) {
    let docs
    const deptId = state?.stateData?.departmentId
    if (deptId) {
      docs = await doctorService.getDoctorsByDepartment(deptId)
      if (!docs.length) docs = await doctorService.getActiveDoctors()
    } else {
      docs = await doctorService.getActiveDoctors()
    }

    const category = state?.stateData?.category
    const visitNumber = state?.stateData?.visitNumber

    // Apply Gynaecology doctor filtering
    if (category === 'NewPatient' || category === 'Others') {
      const drAnand = docs.filter(isAnandDoctor)
      if (drAnand.length > 0) docs = drAnand
    } else if (category === 'Infertility') {
      const n = parseInt(visitNumber, 10) || 1
      if (n % 3 === 1) {
        const drAnand = docs.filter(isAnandDoctor)
        if (drAnand.length > 0) docs = drAnand
      } else {
        const otherDocs = docs.filter(d => !isAnandDoctor(d))
        if (otherDocs.length > 0) docs = otherDocs
      }
    }

    const idx = parseInt(input, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= docs.length) return service.sendMessage(phone, MESSAGES.invalidInput())
    
    const selectedDoctor = docs[idx]
    await conversationRepo.upsert(phone, {
      currentStep: STEPS.SELECT_DATE,
      selectedDoctorId: getId(selectedDoctor)
    })
    return service.sendDateOptions(phone, state, (opts) => MESSAGES.selectDate(selectedDoctor.name, opts))
  },

  async handleSelectDate(service, phone, state, input) {
    const dateOptions = state?.stateData?.dateOptions || []
    let date = null

    const looksLikeDate = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(input.trim())
    const idx = parseInt(input, 10)

    if (!looksLikeDate && !isNaN(idx) && idx >= 1 && idx <= dateOptions.length) {
      date = new Date(dateOptions[idx - 1])
    }

    if (!date) date = resolveDate(input)

    if (!date) {
      const doctor = await doctorService.getDoctorById(state.selectedDoctorId)
      return service.sendDateOptions(phone, state, (opts) => MESSAGES.selectDate(doctor?.name || 'Doctor', opts))
    }
    
    const dateStr = date.toLocaleDateString('en-IN')
    
    const patients = await patientService.findAllByPhone(phone)
    
    await conversationRepo.upsert(phone, {
      selectedDate: date.toISOString(),
      stateData: { ...state.stateData, dateStr }
    })

    if (patients.length > 0) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.WHO_FOR })
      return service.sendMessage(phone, MESSAGES.whoFor(patients))
    } else {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_NAME })
      return service.sendMessage(phone, MESSAGES.patientName())
    }
  },

  async handleWhoFor(service, phone, state, input) {
    const patients = await patientService.findAllByPhone(phone)
    const idx = parseInt(input, 10)

    if (!isNaN(idx) && idx >= 1 && idx <= patients.length) {
      const selected = patients[idx - 1]
      const hasAddress = Boolean(selected.district && selected.district !== 'N/A' && selected.address && selected.address !== 'N/A')
      // isOld is already known from OPD_PATIENT_TYPE_EARLY → skip PATIENT_TYPE
      const nextStep = hasAddress ? STEPS.PATIENT_PROBLEM : STEPS.PATIENT_DISTRICT

      await conversationRepo.upsert(phone, {
        currentStep: nextStep,
        tempName: selected.name,
        tempAge: selected.age,
        tempGender: selected.gender,
        stateData: { 
          ...state.stateData,
          isExistingPatient: true,
          district: selected.district || 'N/A', 
          address: selected.address || 'N/A' 
        }
      })
      if (hasAddress) {
        return service.sendMessage(phone, MESSAGES.patientProblem())
      }
      return service.sendMessage(phone, MESSAGES.patientDistrict())
    } else if (idx === patients.length + 1) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_NAME })
      return service.sendMessage(phone, MESSAGES.patientName())
    }
    return service.sendMessage(phone, MESSAGES.invalidInput())
  },

  async handlePatientName(service, phone, state, input) {
    if (input.length < 2) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_MOBILE, tempName: input })
    return service.sendMessage(phone, MESSAGES.patientMobile())
  },

  async handlePatientMobile(service, phone, state, input) {
    const cleanNum = input.replace(/\D/g, '')
    if (cleanNum.length !== 10) return service.sendMessage(phone, MESSAGES.invalidMobile())
    await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_AGE, stateData: { ...state.stateData, mobile: cleanNum } })
    return service.sendMessage(phone, MESSAGES.patientAge())
  },

  async handlePatientAge(service, phone, state, input) {
    const age = parseInt(input, 10)
    if (isNaN(age) || age < 1 || age > 120) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_GENDER, tempAge: age })
    return service.sendMessage(phone, MESSAGES.patientGender())
  },

  async handlePatientGender(service, phone, state, input) {
    const genderMap = { '1': 'Male', '2': 'Female', '3': 'Other' }
    const gender = genderMap[input]
    if (!gender) return service.sendMessage(phone, MESSAGES.invalidInput())

    // isOld is already known from OPD_PATIENT_TYPE_EARLY
    // If it's somehow not set, fall back to asking
    if (state.stateData?.isOld === undefined && state.stateData?.isOld === null) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_TYPE, tempGender: gender })
      return service.sendMessage(phone, MESSAGES.patientType(state.tempName))
    }

    // Skip PATIENT_TYPE → go to DISTRICT or PROBLEM
    const isExisting = state.stateData?.isExistingPatient === true
    const hasAddress = Boolean(state.stateData?.district && state.stateData?.district !== 'N/A' && state.stateData?.address && state.stateData?.address !== 'N/A')
    const nextStep = (isExisting && hasAddress) ? STEPS.PATIENT_PROBLEM : STEPS.PATIENT_DISTRICT

    await conversationRepo.upsert(phone, {
      currentStep: nextStep,
      tempGender: gender
    })

    if (isExisting && hasAddress) {
      return service.sendMessage(phone, MESSAGES.patientProblem())
    }
    return service.sendMessage(phone, MESSAGES.patientDistrict())
  },

  async handlePatientType(service, phone, state, input) {
    // Fallback: only reached if isOld wasn't set early
    let isOld = false
    if (input === '1') isOld = true
    else if (input === '2') isOld = false
    else return service.sendMessage(phone, MESSAGES.invalidInput())

    const isExisting = state.stateData?.isExistingPatient === true
    const hasAddress = Boolean(state.stateData?.district && state.stateData?.district !== 'N/A' && state.stateData?.address && state.stateData?.address !== 'N/A')
    const nextStep = (isExisting && hasAddress) ? STEPS.PATIENT_PROBLEM : STEPS.PATIENT_DISTRICT

    await conversationRepo.upsert(phone, {
      currentStep: nextStep,
      stateData: { ...state.stateData, isOld }
    })

    if (isExisting && hasAddress) {
      return service.sendMessage(phone, MESSAGES.patientProblem())
    }
    return service.sendMessage(phone, MESSAGES.patientDistrict())
  },

  async handlePatientDistrict(service, phone, state, input) {
    await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_ADDRESS, stateData: { ...state.stateData, district: input } })
    return service.sendMessage(phone, MESSAGES.patientAddress())
  },

  async handlePatientAddress(service, phone, state, input) {
    if (!input || input.trim().length < 2) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_PINCODE, stateData: { ...state.stateData, address: input.trim() } })
    return service.sendMessage(phone, MESSAGES.patientPinCode())
  },

  async handlePatientPinCode(service, phone, state, input) {
    const cleanPin = input.trim().replace(/\D/g, '')
    if (cleanPin.length !== 6) return service.sendMessage(phone, MESSAGES.invalidPinCode())
    await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_PROBLEM, stateData: { ...state.stateData, pinCode: cleanPin } })
    return service.sendMessage(phone, MESSAGES.patientProblem())
  },

  async handlePatientProblem(service, phone, state, input) {
    await conversationRepo.upsert(phone, { currentStep: STEPS.REVIEW, stateData: { ...state.stateData, problem: input } })
    
    const freshState = await conversationRepo.findByPhone(phone)
    const doctor = await doctorService.getDoctorById(freshState.selectedDoctorId)
    
    return service.sendMessage(phone, MESSAGES.review({
      doctorName: doctor.name,
      date: freshState.stateData.dateStr,
      name: freshState.tempName,
      mobile: freshState.stateData.mobile || phone,
      age: freshState.tempAge,
      gender: freshState.tempGender,
      isOld: freshState.stateData.isOld,
      district: freshState.stateData.district,
      address: freshState.stateData.address,
      pinCode: freshState.stateData.pinCode,
      problem: freshState.stateData.problem,
    }))
  },

  async handleReview(service, phone, state, input) {
    if (input === '2') {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_NAME })
      return service.sendMessage(phone, MESSAGES.patientName())
    }
    if (input !== '1') return service.sendMessage(phone, MESSAGES.invalidInput())

    const doctorCheck = await doctorService.getDoctorById(state.selectedDoctorId)
    if (!doctorCheck || doctorCheck.isActive === false) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_DEPARTMENT })
      return service.sendMessage(phone, MESSAGES.doctorUnavailable())
    }

    try {
      const { patient, booking } = await patientService.registerPatientWithBooking(
        {
          phone,
          name: state.tempName,
          age: state.tempAge,
          gender: state.tempGender,
          isOld: state.stateData.isOld,
          district: state.stateData.district,
          address: state.stateData.address,
          pinCode: state.stateData.pinCode || '',
          doctorId: state.selectedDoctorId,
          departmentId: state.stateData.departmentId,
          serviceId: state.selectedServiceId || null,
          preferredDate: state.selectedDate,
          problemDescription: state.stateData.problem,
          type: 'OPD',
          category: state.stateData?.category || '',
          visitNumber: state.stateData?.visitNumber || null,
        },
        { source: 'whatsapp' },
        { validate: false }
      )

      const doctor = await doctorService.getDoctorById(state.selectedDoctorId)

      await service.sendMessage(phone, MESSAGES.appointmentConfirmed({
        tokenNumber: booking.tokenNumber,
        uhid: patient.uhid || 'KGN-NEW',
        doctorName: doctor.name,
        date: state.stateData.dateStr,
        name: state.tempName,
        mobile: phone
      }))

      await conversationRepo.resetState(phone)
    } catch (err) {
      if (err.message && err.message.includes('already has a booking')) {
        await conversationRepo.resetState(phone)
        return service.sendMessage(phone, MESSAGES.dailyBookingLimitExceeded())
      }
      if (err.message && (err.message.includes('maximum daily limit') || err.message.includes('reached the maximum'))) {
        const freshState = await conversationRepo.findByPhone(phone)
        const doctor = await doctorService.getDoctorById(freshState.selectedDoctorId)
        const dateStr = freshState.stateData?.dateStr || 'the selected date'
        const maxCap = doctor?.maxPatientsPerDay || doctor?.max_patients_per_day || 30

        await conversationRepo.upsert(phone, { currentStep: STEPS.SELECT_DATE })
        return service.sendMessage(phone, MESSAGES.maxPatientsReached(doctor?.name || '', dateStr))
      }
      throw err
    }
  },
}
