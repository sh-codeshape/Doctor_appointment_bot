import conversationRepo from '../conversation.repository.js'
import doctorService from '../../doctor/doctor.service.js'
import departmentService from '../../department/department.service.js'
import patientService from '../../patient/patient.service.js'
import { STEPS, MESSAGES } from '../conversation.steps.js'

export const backHandler = {
  async handleBack(service, phone, state) {
    // ── OPD Flow ──────────────────────────────────────────
    if (state.currentStep === STEPS.OPD_DEPARTMENT) {
      return service.resetAndWelcome(phone)
    }
    if (state.currentStep === STEPS.OPD_PATIENT_TYPE_EARLY) {
      const deps = await departmentService.getActiveDepartments()
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_DEPARTMENT })
      return service.sendMessage(phone, MESSAGES.departments(deps))
    }
    if (state.currentStep === STEPS.OPD_GYNAE_CATEGORY) {
      // Back from Gynae category → re-ask Old/New
      const deptName = state.stateData?.departmentName || ''
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_PATIENT_TYPE_EARLY })
      return service.sendMessage(phone, MESSAGES.patientTypeEarly(deptName))
    }
    if (state.currentStep === STEPS.OPD_INFERTILITY_VISIT) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_GYNAE_CATEGORY })
      return service.sendMessage(phone, MESSAGES.gynaeCategory())
    }
    if (state.currentStep === STEPS.OPD_INFERTILITY_VISIT_OTHER) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_INFERTILITY_VISIT })
      return service.sendMessage(phone, MESSAGES.infertilityVisitPrompt())
    }
    if (state.currentStep === STEPS.OPD_DOCTOR) {
      // Determine where to go back based on context
      if (state.stateData?.category === 'Infertility') {
        await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_GYNAE_CATEGORY })
        return service.sendMessage(phone, MESSAGES.gynaeCategory())
      }
      if (state.stateData?.category === 'Others') {
        await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_GYNAE_CATEGORY })
        return service.sendMessage(phone, MESSAGES.gynaeCategory())
      }
      if (state.stateData?.category === 'NewPatient') {
        // New patient Gynae → back to Old/New question
        const deptName = state.stateData?.departmentName || ''
        await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_PATIENT_TYPE_EARLY })
        return service.sendMessage(phone, MESSAGES.patientTypeEarly(deptName))
      }
      // Non-Gynae → back to Old/New patient type
      const deptName = state.stateData?.departmentName || ''
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_PATIENT_TYPE_EARLY })
      return service.sendMessage(phone, MESSAGES.patientTypeEarly(deptName))
    }
    if (state.currentStep === STEPS.SELECT_DATE) {
      const selectedDoc = await doctorService.getDoctorById(state.selectedDoctorId)
      const docs = await doctorService.getDoctorsByDepartment(selectedDoc.departmentId)
      await conversationRepo.upsert(phone, { currentStep: STEPS.OPD_DOCTOR })
      return service.sendMessage(phone, MESSAGES.doctors('Doctors', docs))
    }
    if (state.currentStep === STEPS.WHO_FOR) {
      const selectedDoc = await doctorService.getDoctorById(state.selectedDoctorId)
      await conversationRepo.upsert(phone, { currentStep: STEPS.SELECT_DATE })
      return service.sendDateOptions(phone, state, (opts) => MESSAGES.selectDate(selectedDoc?.name || 'Doctor', opts))
    }
    if (state.currentStep === STEPS.PATIENT_NAME) {
      const selectedDoc = await doctorService.getDoctorById(state.selectedDoctorId)
      await conversationRepo.upsert(phone, { currentStep: STEPS.SELECT_DATE })
      return service.sendDateOptions(phone, state, (opts) => MESSAGES.selectDate(selectedDoc?.name || 'Doctor', opts))
    }
    if (state.currentStep === STEPS.PATIENT_MOBILE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_NAME })
      return service.sendMessage(phone, MESSAGES.patientName())
    }
    if (state.currentStep === STEPS.PATIENT_AGE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_MOBILE })
      return service.sendMessage(phone, MESSAGES.patientMobile())
    }
    if (state.currentStep === STEPS.PATIENT_GENDER) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_AGE })
      return service.sendMessage(phone, MESSAGES.patientAge())
    }
    if (state.currentStep === STEPS.PATIENT_TYPE) {
      // Fallback: if somehow reached, go back to gender
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_GENDER })
      return service.sendMessage(phone, MESSAGES.patientGender())
    }
    if (state.currentStep === STEPS.PATIENT_DISTRICT) {
      // isOld is known early so PATIENT_TYPE is skipped → go back to PATIENT_GENDER
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_GENDER })
      return service.sendMessage(phone, MESSAGES.patientGender())
    }
    if (state.currentStep === STEPS.PATIENT_ADDRESS) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_DISTRICT })
      return service.sendMessage(phone, MESSAGES.patientDistrict())
    }
    if (state.currentStep === STEPS.PATIENT_PINCODE) {
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_ADDRESS })
      return service.sendMessage(phone, MESSAGES.patientAddress())
    }
    if (state.currentStep === STEPS.PATIENT_PROBLEM) {
      const isExisting = state.stateData?.isExistingPatient === true
      if (isExisting) {
        // Existing patient skips district/address → go back to PATIENT_GENDER
        await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_GENDER })
        return service.sendMessage(phone, MESSAGES.patientGender())
      }
      await conversationRepo.upsert(phone, { currentStep: STEPS.PATIENT_PINCODE })
      return service.sendMessage(phone, MESSAGES.patientPinCode())
    }
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
      const hasAddress = Boolean(state.stateData?.district && state.stateData?.district !== 'N/A' && state.stateData?.address && state.stateData?.address !== 'N/A')
      if (isExisting && hasAddress) {
        await conversationRepo.upsert(phone, { currentStep: STEPS.HOSP_TYPE })
        return service.sendMessage(phone, MESSAGES.hospType(state.tempName))
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
