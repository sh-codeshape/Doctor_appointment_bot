import conversationRepo from "./conversation.repository.js";
import doctorService from "../doctor/doctor.service.js";
import departmentService from "../department/department.service.js";
import patientService from "../patient/patient.service.js";
import { STEPS, MESSAGES } from "./conversation.steps.js";
import { getDateOptions } from "../../utils/dateHelpers.js";
import logger from "../../utils/logger.js";

import { opdHandler } from "./handlers/opd.handler.js";
import { hospitalizationHandler } from "./handlers/hospitalization.handler.js";
import { medicineHandler } from "./handlers/medicine.handler.js";
import { backHandler } from "./handlers/back.handler.js";

class ConversationService {
  constructor() {
    this.messagingProvider = null;
  }

  setProvider(provider) {
    this.messagingProvider = provider;
  }

  async handleMessage(phone, message) {
    const isImage = message.type === "image";
    const input = isImage ? "" : message.body.trim();

    // Explicit reset keywords — work at any step
    if (!isImage) {
      const lower = input.trim().toLowerCase();
      if (["00", "menu", "reset"].includes(lower)) {
        return this.resetAndWelcome(phone);
      }
    }

    let state = await conversationRepo.findByPhone(phone);
    if (!state) {
      return this.resetAndWelcome(phone);
    }

    // Greetings only reset when the user is at the main menu
    if (!isImage) {
      const lower = input.trim().toLowerCase();
      const greetings = ["hi", "hello", "hey", "start"];
      if (
        state.currentStep === STEPS.WELCOME &&
        greetings.some((g) => lower === g || lower.startsWith(g))
      ) {
        return this.resetAndWelcome(phone);
      }
    }

    // Handle "Back" (0)
    if (!isImage && input === "0" && state.currentStep !== STEPS.WELCOME) {
      return backHandler.handleBack(this, phone, state);
    }

    try {
      if (isImage && state.currentStep !== STEPS.MED_PRESCRIPTION) {
        return this.sendMessage(phone, MESSAGES.invalidInput());
      }

      switch (state.currentStep) {
        case STEPS.WELCOME:
          return await this.handleWelcome(phone, state, input);

        // OPD Flow
        case STEPS.OPD_DEPARTMENT:
          return await opdHandler.handleOpdDepartment(
            this,
            phone,
            state,
            input,
          );
        case STEPS.OPD_PATIENT_TYPE_EARLY:
          return await opdHandler.handlePatientTypeEarly(
            this,
            phone,
            state,
            input,
          );
        case STEPS.OPD_GYNAE_CATEGORY:
          return await opdHandler.handleOpdGynaeCategory(
            this,
            phone,
            state,
            input,
          );
        case STEPS.OPD_INFERTILITY_VISIT:
          return await opdHandler.handleInfertilityVisit(
            this,
            phone,
            state,
            input,
          );
        case STEPS.OPD_INFERTILITY_VISIT_OTHER:
          return await opdHandler.handleInfertilityVisitOther(
            this,
            phone,
            state,
            input,
          );
        case STEPS.OPD_DOCTOR:
          return await opdHandler.handleOpdDoctor(this, phone, state, input);
        case STEPS.SELECT_DATE:
          return await opdHandler.handleSelectDate(this, phone, state, input);
        case STEPS.WHO_FOR:
          return await opdHandler.handleWhoFor(this, phone, state, input);
        case STEPS.PATIENT_NAME:
          return await opdHandler.handlePatientName(this, phone, state, input);
        case STEPS.PATIENT_MOBILE:
          return await opdHandler.handlePatientMobile(
            this,
            phone,
            state,
            input,
          );
        case STEPS.PATIENT_AGE:
          return await opdHandler.handlePatientAge(this, phone, state, input);
        case STEPS.PATIENT_GENDER:
          return await opdHandler.handlePatientGender(
            this,
            phone,
            state,
            input,
          );
        case STEPS.PATIENT_TYPE:
          return await opdHandler.handlePatientType(this, phone, state, input);
        case STEPS.PATIENT_DISTRICT:
          return await opdHandler.handlePatientDistrict(
            this,
            phone,
            state,
            input,
          );
        case STEPS.PATIENT_ADDRESS:
          return await opdHandler.handlePatientAddress(
            this,
            phone,
            state,
            input,
          );
        case STEPS.PATIENT_PINCODE:
          return await opdHandler.handlePatientPinCode(
            this,
            phone,
            state,
            input,
          );
        case STEPS.PATIENT_PROBLEM:
          return await opdHandler.handlePatientProblem(
            this,
            phone,
            state,
            input,
          );

        case STEPS.REVIEW:
          await opdHandler.handleReview(this, phone, state, input);
          await this.sendLocation(phone, {
            latitude: 25.3524371,
            longitude: 82.8434218,
            name: "KG Nanda Hospital",
            address: "Bichhiya Kala, Chandauli, Uttar Pradesh 232104",
          });
          return;
        // Hospitalization Flow
        case STEPS.HOSP_WHO_FOR:
          return await hospitalizationHandler.handleHospWhoFor(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_NAME:
          return await hospitalizationHandler.handleHospName(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_MOBILE:
          return await hospitalizationHandler.handleHospMobile(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_AGE:
          return await hospitalizationHandler.handleHospAge(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_GENDER:
          return await hospitalizationHandler.handleHospGender(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_TYPE:
          return await hospitalizationHandler.handleHospType(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_DISTRICT:
          return await hospitalizationHandler.handleHospDistrict(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_ADDRESS:
          return await hospitalizationHandler.handleHospAddress(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_PINCODE:
          return await hospitalizationHandler.handleHospPinCode(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_PROBLEM:
          return await hospitalizationHandler.handleHospProblem(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_DATE:
          return await hospitalizationHandler.handleHospDate(
            this,
            phone,
            state,
            input,
          );
        case STEPS.HOSP_REVIEW:
          await hospitalizationHandler.handleHospReview(
            this,
            phone,
            state,
            input,
          );
          await this.sendLocation(phone, {
            latitude: 25.3524371,
            longitude: 82.8434218,
            name: "KG Nanda Hospital",
            address: "Bichhiya Kala, Chandauli, Uttar Pradesh 232104",
          });
          return;
        // Medicine Flow
        case STEPS.MED_PRESCRIPTION:
          return await medicineHandler.handleMedPrescription(
            this,
            phone,
            state,
            message,
          );
        case STEPS.MED_WHO_FOR:
          return await medicineHandler.handleMedWhoFor(
            this,
            phone,
            state,
            input,
          );
        case STEPS.MED_NAME:
          return await medicineHandler.handleMedName(this, phone, state, input);
        case STEPS.MED_ADDRESS:
          return await medicineHandler.handleMedAddress(
            this,
            phone,
            state,
            input,
          );
        case STEPS.MED_PINCODE:
          return await medicineHandler.handleMedPinCode(
            this,
            phone,
            state,
            input,
          );

        default:
          return this.resetAndWelcome(phone);
      }
    } catch (err) {
      logger.error(`Conversation error for ${phone}:`, err.message);
      await this.sendMessage(
        phone,
        'Error processing request. Please type "menu".',
      );
    }
  }

  // ─── Main Menu ─────────────────────────────────────────

  async handleWelcome(phone, state, input) {
    switch (input) {
      case "1": {
        // OPD
        const deps = await departmentService.getActiveDepartments();
        if (!deps.length) {
          await conversationRepo.upsert(phone, {
            currentFlow: "OPD_BOOKING",
            currentStep: STEPS.OPD_DOCTOR,
          });
          const docs = await doctorService.getActiveDoctors();
          return this.sendMessage(phone, MESSAGES.doctors("All Doctors", docs));
        }
        await conversationRepo.upsert(phone, {
          currentFlow: "OPD_BOOKING",
          currentStep: STEPS.OPD_DEPARTMENT,
        });
        return this.sendMessage(phone, MESSAGES.departments(deps));
      }
      case "2": {
        // Hospitalization
        const patients = (await patientService.findAllByPhone(phone)) || [];
        if (patients.length > 0) {
          await conversationRepo.upsert(phone, {
            currentFlow: "HOSPITALIZATION",
            currentStep: STEPS.HOSP_WHO_FOR,
          });
          return this.sendMessage(phone, MESSAGES.hospWhoFor(patients));
        }
        await conversationRepo.upsert(phone, {
          currentFlow: "HOSPITALIZATION",
          currentStep: STEPS.HOSP_NAME,
        });
        return this.sendMessage(phone, MESSAGES.hospStart());
      }
      case "3": // Medicine Order
        await conversationRepo.upsert(phone, {
          currentFlow: "MEDICINE",
          currentStep: STEPS.MED_PRESCRIPTION,
        });
        return this.sendMessage(phone, MESSAGES.medStart());
      case "4": // General Query
        await this.sendMessage(phone, MESSAGES.info());

        // i have hardcoded this so it's not a good way but it's fine
        await this.sendLocation(phone, {
          latitude: 25.3524371,
          longitude: 82.8434218,
          name: "KG Nanda Hospital",
          address: "Bichhiya Kala, Chandauli, Uttar Pradesh 232104",
        });
        return;
      case "5": // Support
        return this.sendMessage(phone, MESSAGES.support());
      case "6": // Email Help
        return this.sendMessage(phone, MESSAGES.email());
      case "0": // Main Menu
        return this.sendMessage(phone, MESSAGES.welcome());
      default:
        return this.sendMessage(phone, MESSAGES.invalidInput());
    }
  }

  // ─── Helpers ───────────────────────────────────────────

  async resetAndWelcome(phone) {
    await conversationRepo.resetState(phone);
    return this.sendMessage(phone, MESSAGES.welcome());
  }

  async sendMessage(phone, body) {
    if (!this.messagingProvider) {
      logger.warn(
        "No messaging provider set — message not sent:",
        body.slice(0, 50),
      );
      return;
    }
    await this.messagingProvider.sendTextMessage(phone, body);
  }

  async sendLocation(phone, body) {
    if (!this.messagingProvider || typeof this.messagingProvider.sendLocationMessage !== 'function') {
      logger.warn("No messaging provider set or sendLocationMessage missing — location not sent:", body);
      return;
    }

    return this.messagingProvider.sendLocationMessage(phone, body);
  }

  async sendDateOptions(phone, state, buildMsg) {
    if (!this.messagingProvider) {
      logger.warn("No messaging provider set — date options not sent");
      return;
    }
    const options = getDateOptions(7);
    await conversationRepo.upsert(phone, {
      stateData: {
        ...state?.stateData,
        dateOptions: options.map((o) => o.date.toISOString()),
      },
    });
    return this.sendMessage(phone, buildMsg(options));
  }
}

export default new ConversationService();
