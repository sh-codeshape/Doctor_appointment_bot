import conversationRepo from '../conversation.repository.js'
import patientService from '../../patient/patient.service.js'
import { STEPS, MESSAGES } from '../conversation.steps.js'
import { resolveDate, formatDateDisplay } from '../../../utils/dateHelpers.js'

export const hospitalizationHandler = {
  async handleHospWhoFor(service, phone, state, input) {
    const patients = await patientService.findAllByPhone(phone)
    const idx = parseInt(input, 10)

    if (!isNaN(idx) && idx >= 1 && idx <= patients.length) {
      const selected = patients[idx - 1]
      const hasAddress = Boolean(selected.district && selected.district !== 'N/A' && selected.address && selected.address !== 'N/A')
      const nextStep = hasAddress ? STEPS.HOSP_PROBLEM : STEPS.HOSP_DISTRICT

      await conversationRepo.upsert(phone, {
        currentStep: nextStep,
        tempName: selected.name,
        tempAge: selected.age,
        tempGender: selected.gender,
        stateData: {
          ...state.stateData,
          isExistingPatient: true,
          isOld: selected.isOld ?? true,
          district: selected.district || 'N/A',
          address: selected.address || 'N/A'
        }
      })
      if (hasAddress) {
        return service.sendMessage(phone, MESSAGES.hospProblem())
      }
      return service.sendMessage(phone, MESSAGES.hospDistrict())
    } else if (idx === patients.length + 1) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_NAME })
      return service.sendMessage(phone, MESSAGES.hospStart())
    }
    return service.sendMessage(phone, MESSAGES.invalidInput())
  },

  async handleHospName(service, phone, state, input) {
    if (!input || input.length < 2) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_MOBILE, tempName: input })
    return service.sendMessage(phone, MESSAGES.hospMobile())
  },

  async handleHospMobile(service, phone, state, input) {
    const cleanNum = input.replace(/\D/g, '')
    if (cleanNum.length !== 10) return service.sendMessage(phone, MESSAGES.invalidMobile())
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_AGE, stateData: { ...state.stateData, mobile: cleanNum } })
    return service.sendMessage(phone, MESSAGES.hospAge())
  },

  async handleHospAge(service, phone, state, input) {
    const age = parseInt(input, 10)
    if (isNaN(age) || age < 1 || age > 120) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_GENDER, tempAge: age })
    return service.sendMessage(phone, MESSAGES.hospGender())
  },

  async handleHospGender(service, phone, state, input) {
    const genderMap = { '1': 'Male', '2': 'Female', '3': 'Other' }
    const gender = genderMap[input]
    if (!gender) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_TYPE, tempGender: gender })
    return service.sendMessage(phone, MESSAGES.hospType(state.tempName))
  },

  async handleHospType(service, phone, state, input) {
    let isOld = false
    if (input === '1') isOld = true
    else if (input === '2') isOld = false
    else return service.sendMessage(phone, MESSAGES.invalidInput())

    const isExisting = state.stateData?.isExistingPatient === true
    const hasAddress = Boolean(state.stateData?.district && state.stateData?.district !== 'N/A' && state.stateData?.address && state.stateData?.address !== 'N/A')
    const nextStep = (isExisting && hasAddress) ? STEPS.HOSP_PROBLEM : STEPS.HOSP_DISTRICT

    await conversationRepo.upsert(phone, {
      currentStep: nextStep,
      stateData: { ...state.stateData, isOld }
    })

    if (isExisting && hasAddress) {
      return service.sendMessage(phone, MESSAGES.hospProblem())
    }
    return service.sendMessage(phone, MESSAGES.hospDistrict())
  },

  async handleHospDistrict(service, phone, state, input) {
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_ADDRESS, stateData: { ...state.stateData, district: input } })
    return service.sendMessage(phone, MESSAGES.hospAddress())
  },

  async handleHospAddress(service, phone, state, input) {
    if (!input || input.trim().length < 2) return service.sendMessage(phone, MESSAGES.invalidInput())
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_PINCODE, stateData: { ...state.stateData, address: input.trim() } })
    return service.sendMessage(phone, MESSAGES.hospPinCode())
  },

  async handleHospPinCode(service, phone, state, input) {
    const cleanPin = input.trim().replace(/\D/g, '')
    if (cleanPin.length !== 6) return service.sendMessage(phone, MESSAGES.invalidPinCode())
    await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_PROBLEM, stateData: { ...state.stateData, pinCode: cleanPin } })
    return service.sendMessage(phone, MESSAGES.hospProblem())
  },

  async handleHospProblem(service, phone, state, input) {
    const newState = await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_DATE, stateData: { ...state.stateData, problem: input } })
    return service.sendDateOptions(phone, newState, (opts) => MESSAGES.hospDate(opts))
  },

  async handleHospDate(service, phone, state, input) {
    const dateOptions = state?.stateData?.dateOptions || []
    let date = null

    const looksLikeDate = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(input.trim())
    const idx = parseInt(input, 10)

    if (!looksLikeDate && !isNaN(idx) && idx >= 1 && idx <= dateOptions.length) {
      date = new Date(dateOptions[idx - 1])
    }
    if (!date) date = resolveDate(input)
    if (!date) return service.sendDateOptions(phone, state, (opts) => MESSAGES.hospDate(opts))

    const dateStr = formatDateDisplay(date)
    await conversationRepo.upsert(phone, {
      currentStep: STEPS.HOSP_REVIEW,
      selectedDate: date,
      stateData: { ...state.stateData, dateStr }
    })

    const freshState = await conversationRepo.findByPhone(phone)
    return service.sendMessage(phone, MESSAGES.hospReview({
      date: dateStr,
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

  async handleHospReview(service, phone, state, input) {
    if (input === '2') {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_NAME })
      return service.sendMessage(phone, MESSAGES.hospStart())
    }
    if (input !== '1') return service.sendMessage(phone, MESSAGES.invalidInput())

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
          preferredDate: state.selectedDate,
          problemDescription: state.stateData.problem,
          type: 'HOSPITALIZATION',
        },
        { source: 'whatsapp' },
        { validate: false }
      )

      await service.sendMessage(phone, MESSAGES.hospDone({
        uhid: patient?.uhid || 'KGN-NEW',
        tokenNumber: booking?.tokenNumber || 'HOSP-001'
      }))
      await service.sendLocation(phone, {
        latitude: 25.3524371,
        longitude: 82.8434218,
        name: "KG Nanda Hospital",
        address: "Bichhiya Kala, Chandauli, Uttar Pradesh 232104",
      })
      await conversationRepo.resetState(phone)
    } catch (err) {
      if (err.message && err.message.includes('already has a booking')) {
        await conversationRepo.resetState(phone)
        return service.sendMessage(phone, MESSAGES.dailyBookingLimitExceeded())
      }
      if (err.message && (err.message.includes('maximum daily limit') || err.message.includes('reached the maximum'))) {
        await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_DATE })
        return service.sendMessage(phone, MESSAGES.maxPatientsReached('', state.stateData?.dateStr || ''))
      }
      throw err
    }
  },
}
