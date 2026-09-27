import conversationRepo from '../conversation.repository.js'
import doctorService from '../../doctor/doctor.service.js'
import departmentService from '../../department/department.service.js'
import patientService from '../../patient/patient.service.js'
import { STEPS, MESSAGES } from '../conversation.steps.js'

export const backHandler = {
  async handleBack(service, phone, state) {
    // ── OPD Flow (New order: WHO_FOR → Patient Info → Department → Doctor → Date → Address → Problem → Review) ──

    // WHO_FOR → back to main menu
    if (state.currentStep === STEPS.WHO_FOR) {
      return service.resetAndWelcome(phone)
    }

    // PATIENT_NAME → back to WHO_FOR (or main menu if no patients)
    if (state.currentStep === STEPS.PATIENT_NAME) {
      const patients = await patientService.findAllByPhone(phone)
      if (patients.length > 0) {
        await conversationRepo.upsert(phone, { currentStep: STEPS.WHO_FOR })
        return service.sendMessage(phone, MESSAGES.whoFor(patients))
      }
      return service.resetAndWelcome(phone)
    }

    // PATIENT_MOBILE → back to PATIENT_NAME
    if (state.currentStep === STEPS.PATIENT_MOBILE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_NAME })
      return service.sendMessage(phone, MESSAGES.patientName())
    }

    // PATIENT_AGE → back to PATIENT_MOBILE
    if (state.currentStep === STEPS.PATIENT_AGE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_MOBILE })
      return service.sendMessage(phone, MESSAGES.patientMobile())
    }

    // PATIENT_GENDER → back to PATIENT_AGE
    if (state.currentStep === STEPS.PATIENT_GENDER) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_AGE })
      return service.sendMessage(phone, MESSAGES.patientAge())
    }

    // OPD_PATIENT_TYPE_EARLY → back to PATIENT_GENDER
    if (state.currentStep === STEPS.OPD_PATIENT_TYPE_EARLY) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_GENDER })
      return service.sendMessage(phone, MESSAGES.patientGender())
    }

    // OPD_DEPARTMENT → back depends on patient path
    if (state.currentStep === STEPS.OPD_DEPARTMENT) {
      if (state.stateData?.isExistingPatient) {
        // Existing patient → back to WHO_FOR
        const patients = await patientService.findAllByPhone(phone)
        await conversationRepo.upsert(phone, { currentStep: STEPS.WHO_FOR })
        return service.sendMessage(phone, MESSAGES.whoFor(patients))
      }
      // New patient → back to OPD_PATIENT_TYPE_EARLY
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_PATIENT_TYPE_EARLY })
      return service.sendMessage(phone, MESSAGES.patientType(state.tempName))
    }

    // OPD_GYNAE_CATEGORY → back to OPD_DEPARTMENT
    if (state.currentStep === STEPS.OPD_GYNAE_CATEGORY) {
      const deps = await departmentService.getOpdWhatsAppDepartments()
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_DEPARTMENT })
      return service.sendMessage(phone, MESSAGES.departments(deps))
    }

    // OPD_INFERTILITY_VISIT → back to OPD_GYNAE_CATEGORY
    if (state.currentStep === STEPS.OPD_INFERTILITY_VISIT) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_GYNAE_CATEGORY })
      return service.sendMessage(phone, MESSAGES.gynaeCategory())
    }

    // OPD_INFERTILITY_VISIT_OTHER → back to OPD_INFERTILITY_VISIT
    if (state.currentStep === STEPS.OPD_INFERTILITY_VISIT_OTHER) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_INFERTILITY_VISIT })
      return service.sendMessage(phone, MESSAGES.infertilityVisitPrompt())
    }

    // OPD_DOCTOR → back depends on context
    if (state.currentStep === STEPS.OPD_DOCTOR) {
      if (state.stateData?.category === 'Infertility') {
        await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_GYNAE_CATEGORY })
        return service.sendMessage(phone, MESSAGES.gynaeCategory())
      }
      if (state.stateData?.category === 'Others') {
        await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_GYNAE_CATEGORY })
        return service.sendMessage(phone, MESSAGES.gynaeCategory())
      }
      // Non-Gynae or NewPatient → back to department
      const deps = await departmentService.getOpdWhatsAppDepartments()
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_DEPARTMENT })
      return service.sendMessage(phone, MESSAGES.departments(deps))
    }

    // SELECT_DATE → back to OPD_DOCTOR
    if (state.currentStep === STEPS.SELECT_DATE) {
      const selectedDoc = await doctorService.getDoctorById(state.selectedDoctorId)
      let docs = await doctorService.getDoctorsByDepartment(selectedDoc.departmentId)

      const category = state.stateData?.category
      const visitNumber = state.stateData?.visitNumber

      const isAnandDoctor = (d) => {
        if (!d) return false
        const idStr = String(d.id || d._id || '')
        if (idStr === '2') return true
        return /^\s*(dr\.?\s*)?anand\b/i.test(d.name || '')
      }

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

      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_DOCTOR })
      return service.sendMessage(phone, MESSAGES.doctors('Doctors', docs))
    }

    // PATIENT_DISTRICT → back to SELECT_DATE
    if (state.currentStep === STEPS.PATIENT_DISTRICT) {
      const selectedDoc = await doctorService.getDoctorById(state.selectedDoctorId)
      await conversationRepo.upsert(phone, { currentStep: STEPS.SELECT_DATE })
      return service.sendDateOptions(phone, state, (opts) => MESSAGES.selectDate(selectedDoc?.name || 'Doctor', opts))
    }

    // PATIENT_ADDRESS → back to PATIENT_DISTRICT
    if (state.currentStep === STEPS.PATIENT_ADDRESS) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_DISTRICT })
      return service.sendMessage(phone, MESSAGES.patientDistrict())
    }

    // PATIENT_PINCODE → back to PATIENT_ADDRESS
    if (state.currentStep === STEPS.PATIENT_PINCODE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_ADDRESS })
      return service.sendMessage(phone, MESSAGES.patientAddress())
    }

    // PATIENT_PROBLEM → back to PATIENT_PINCODE (or SELECT_DATE for existing patients with address)
    if (state.currentStep === STEPS.PATIENT_PROBLEM) {
      const isExisting = state.stateData?.isExistingPatient === true
      const hasAddress = state.stateData?.hasAddress === true || Boolean(
        state.stateData?.district && state.stateData?.district !== 'N/A' &&
        state.stateData?.address && state.stateData?.address !== 'N/A'
      )
      if (isExisting && hasAddress) {
        const selectedDoc = await doctorService.getDoctorById(state.selectedDoctorId)
        await conversationRepo.upsert(phone, { currentStep: STEPS.SELECT_DATE })
        return service.sendDateOptions(phone, state, (opts) => MESSAGES.selectDate(selectedDoc?.name || 'Doctor', opts))
      }
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_PINCODE })
      return service.sendMessage(phone, MESSAGES.patientPinCode())
    }

    // REVIEW → back to PATIENT_PROBLEM
    if (state.currentStep === STEPS.REVIEW) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_PROBLEM })
      return service.sendMessage(phone, MESSAGES.patientProblem())
    }

    // ── Hospitalization Flow ──────────────────────────────
    if (state.currentStep === STEPS.HOSP_WHO_FOR) {
      return service.resetAndWelcome(phone)
    }
    if (state.currentStep === STEPS.HOSP_NAME) {
      const patients = await patientService.findAllByPhone(phone)
      if (patients.length > 0) {
        await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_WHO_FOR })
        return service.sendMessage(phone, MESSAGES.hospWhoFor(patients))
      }
      return service.resetAndWelcome(phone)
    }
    if (state.currentStep === STEPS.HOSP_MOBILE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_NAME })
      return service.sendMessage(phone, MESSAGES.hospStart())
    }
    if (state.currentStep === STEPS.HOSP_AGE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_MOBILE })
      return service.sendMessage(phone, MESSAGES.hospMobile())
    }
    if (state.currentStep === STEPS.HOSP_GENDER) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_AGE })
      return service.sendMessage(phone, MESSAGES.hospAge())
    }
    if (state.currentStep === STEPS.HOSP_TYPE) {
      const isExisting = state.stateData?.isExistingPatient === true
      if (isExisting) {
        const patients = await patientService.findAllByPhone(phone)
        await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_WHO_FOR })
        return service.sendMessage(phone, MESSAGES.hospWhoFor(patients))
      }
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_GENDER })
      return service.sendMessage(phone, MESSAGES.hospGender())
    }
    if (state.currentStep === STEPS.HOSP_DISTRICT) {
      const isExisting = state.stateData?.isExistingPatient === true
      if (isExisting) {
        const patients = await patientService.findAllByPhone(phone)
        await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_WHO_FOR })
        return service.sendMessage(phone, MESSAGES.hospWhoFor(patients))
      }
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_TYPE })
      return service.sendMessage(phone, MESSAGES.hospType(state.tempName))
    }
    if (state.currentStep === STEPS.HOSP_ADDRESS) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_DISTRICT })
      return service.sendMessage(phone, MESSAGES.hospDistrict())
    }
    if (state.currentStep === STEPS.HOSP_PINCODE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_ADDRESS })
      return service.sendMessage(phone, MESSAGES.hospAddress())
    }
    if (state.currentStep === STEPS.HOSP_PROBLEM) {
      const isExisting = state.stateData?.isExistingPatient === true
      if (isExisting) {
        const patients = await patientService.findAllByPhone(phone)
        await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_WHO_FOR })
        return service.sendMessage(phone, MESSAGES.hospWhoFor(patients))
      }
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_PINCODE })
      return service.sendMessage(phone, MESSAGES.hospPinCode())
    }
    if (state.currentStep === STEPS.HOSP_DATE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_PROBLEM })
      return service.sendMessage(phone, MESSAGES.hospProblem())
    }
    if (state.currentStep === STEPS.HOSP_REVIEW) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_DATE })
      return service.sendDateOptions(phone, state, (opts) => MESSAGES.hospDate(opts))
    }

    // ── Medicine Flow ─────────────────────────────────────
    if (state.currentStep === STEPS.MED_PRESCRIPTION) {
      return service.resetAndWelcome(phone)
    }
    if (state.currentStep === STEPS.MED_WHO_FOR) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.MED_PRESCRIPTION })
      return service.sendMessage(phone, MESSAGES.medStart())
    }
    if (state.currentStep === STEPS.MED_NAME) {
      const patients = await patientService.findAllByPhone(phone)
      const prevStep = patients.length > 0 ? STEPS.MED_WHO_FOR : STEPS.MED_PRESCRIPTION
      await conversationRepo.upsert(phone, { currentStep: prevStep })
      return service.sendMessage(phone, prevStep === STEPS.MED_WHO_FOR ? MESSAGES.medWhoFor(patients) : MESSAGES.medStart())
    }
    if (state.currentStep === STEPS.MED_ADDRESS) {
      const patients = await patientService.findAllByPhone(phone)
      const isSelf = state.stateData?.isSelf === true
      const prevStep = isSelf ? STEPS.MED_WHO_FOR : (patients.length > 0 ? STEPS.MED_NAME : STEPS.MED_PRESCRIPTION)
      await conversationRepo.upsert(phone, { currentStep: prevStep })
      if (prevStep === STEPS.MED_WHO_FOR) return service.sendMessage(phone, MESSAGES.medWhoFor(patients))
      if (prevStep === STEPS.MED_NAME) return service.sendMessage(phone, MESSAGES.medName())
      return service.sendMessage(phone, MESSAGES.medStart())
    }
    if (state.currentStep === STEPS.MED_PINCODE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.MED_ADDRESS })
      return service.sendMessage(phone, MESSAGES.medAddress())
    }

    return service.resetAndWelcome(phone)
  },
}
