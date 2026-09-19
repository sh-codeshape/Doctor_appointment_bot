/**
 * KG Nanda Hospital Conversation Steps and Bilingual Messages
 */

import languageService from "../../utils/language.js";

export const STEPS = {
  WELCOME: "WELCOME",

  // OPD Booking Flow
  OPD_DEPARTMENT: "OPD_DEPARTMENT",
  OPD_PATIENT_TYPE_EARLY: "OPD_PATIENT_TYPE_EARLY",
  OPD_GYNAE_CATEGORY: "OPD_GYNAE_CATEGORY",
  OPD_INFERTILITY_VISIT: "OPD_INFERTILITY_VISIT",
  OPD_INFERTILITY_VISIT_OTHER: "OPD_INFERTILITY_VISIT_OTHER",
  OPD_DOCTOR: "OPD_DOCTOR",
  SELECT_DATE: "SELECT_DATE",
  WHO_FOR: "WHO_FOR",
  PATIENT_NAME: "PATIENT_NAME",
  PATIENT_MOBILE: "PATIENT_MOBILE",
  PATIENT_AGE: "PATIENT_AGE",
  PATIENT_GENDER: "PATIENT_GENDER",
  PATIENT_TYPE: "PATIENT_TYPE",
  PATIENT_DISTRICT: "PATIENT_DISTRICT",
  PATIENT_ADDRESS: "PATIENT_ADDRESS",
  PATIENT_PINCODE: "PATIENT_PINCODE",
  PATIENT_PROBLEM: "PATIENT_PROBLEM",
  REVIEW: "REVIEW",

  // Hospitalization Flow
  HOSP_WHO_FOR: "HOSP_WHO_FOR",
  HOSP_NAME: "HOSP_NAME",
  HOSP_MOBILE: "HOSP_MOBILE",
  HOSP_AGE: "HOSP_AGE",
  HOSP_GENDER: "HOSP_GENDER",
  HOSP_TYPE: "HOSP_TYPE",
  HOSP_DISTRICT: "HOSP_DISTRICT",
  HOSP_ADDRESS: "HOSP_ADDRESS",
  HOSP_PINCODE: "HOSP_PINCODE",
  HOSP_PROBLEM: "HOSP_PROBLEM",
  HOSP_DATE: "HOSP_DATE",
  HOSP_REVIEW: "HOSP_REVIEW",

  // Medicine Order Flow
  MED_PRESCRIPTION: "MED_PRESCRIPTION",
  MED_WHO_FOR: "MED_WHO_FOR",
  MED_NAME: "MED_NAME",
  MED_ADDRESS: "MED_ADDRESS",
  MED_PINCODE: "MED_PINCODE",

  // Static flows
  SUPPORT: "SUPPORT",
};

export const toEmojiDigit = (num) => {
  return String(num)
    .split("")
    .map((digit) => (digit >= "0" && digit <= "9" ? `${digit}️⃣` : digit))
    .join("");
};

export const MESSAGES = {
  welcome: () =>
    `🙏 *Namaste! Welcome to KG Nanda Hospital*\nनमस्ते! 🙏 के. जी. नंदा अस्पताल में आपका स्वागत है।\n\n*For any assistance, please select an option:*\nकिसी भी सहायता के लिए नीचे दिए गए विकल्प में से एक चुनें।\n\n1️⃣ OPD / Outpatient Department (ओपीडी)\n2️⃣ Hospitalization (अस्पताल में भर्ती)\n3️⃣ Online Medicine Order (ऑनलाइन दवा)\n4️⃣ General Query / Information (सामान्य जानकारी)\n5️⃣ Talk to Support (सहायता केंद्र)\n6️⃣ Email Help (ईमेल सहायता)\n\n👉 *Reply with the number to continue.*\n👉 आगे बढ़ने के लिए नंबर टाइप करें।`,

  departments: (deps) => {
    let msg = `🏥 *OPD / Outpatient Department*\nओपीडी / बाह्य रोग विभाग\n\n*Kindly select a department:*\nकृपया विभाग चुनें:\n\n`;
    deps.forEach((d, i) => {
      const label = languageService.formatBilingual(d.name, d.nameHindi, {
        brackets: true,
      });
      msg += `${toEmojiDigit(i + 1)} ${label}\n`;
    });
    msg += `\n👉 *Reply with number* | 0️⃣ *Main Menu*`;
    return msg;
  },

  patientTypeEarly: (deptName = "") =>
    `📋 *PATIENT TYPE / मरीज का प्रकार*${deptName ? `\n🏥 Department: ${deptName}` : ""}\n\n*Is this an Existing/Old Patient or a New Patient at KG Nanda Hospital?*\nक्या मरीज अस्पताल का पुराना मरीज है या नया मरीज?\n\n1️⃣ Old / Existing Patient (पुराना मरीज)\n2️⃣ New Patient (नया मरीज)\n\n0️⃣ Back | 00 Main Menu`,

  gynaeCategory: () =>
    `🏥 *Gynaecology & Obstetrics / स्त्री रोग एवं प्रसूति विभाग*\n\n*Please select consultation type / कृपया श्रेणी चुनें:*\n\n1️⃣ Infertility / बांझपन (निःसंतानता)\n2️⃣ Others / अन्य\n\n0️⃣ Back | 00 Main Menu`,

  infertilityVisitPrompt: () =>
    `🩺 *Infertility Consultation / बांझपन परामर्श*\n\n*Which visit number is this for the patient?*\nमरीज़ की बांझपन इलाज की यह कौन सी विजिट (बार) है?\n\n2️⃣ 2nd Visit (दूसरी बार)\n3️⃣ 3rd Visit (तीसरी बार)\n4️⃣ 4th Visit (चौथी बार)\n5️⃣ 5th Visit (पांचवीं बार)\n6️⃣ 6th Visit (छठी बार)\n7️⃣ 7th Visit (सातवीं बार)\n8️⃣ 8th Visit (आठवीं बार)\n9️⃣ 9th Visit (नौवीं बार)\n🔟 10th Visit (दसवीं बार)\n1️⃣1️⃣ Other Visit / Any other visit number (अन्य)\n\n0️⃣ Back | 00 Main Menu`,

  infertilityVisitOtherPrompt: () =>
    `🩺 *Infertility Consultation / बांझपन परामर्श*\n\n*Please type your visit number:*\nकृपया अपनी विजिट संख्या (जैसे 11, 12, 15......) टाइप करें:\n\n0️⃣ Back | 00 Main Menu`,

  doctors: (deptName, docs) => {
    const bilingualDept = languageService.formatBilingual(deptName, null, {
      brackets: true,
    });
    let msg = `👩‍⚕️ *${bilingualDept}*\n\n`;
    docs.forEach((d, i) => {
      const { bilingualName, bilingualQual } = languageService.formatDoctor(d);
      msg += `${toEmojiDigit(i + 1)} ${bilingualName}\n*${bilingualQual}*\n\n`;
    });
    msg += `👉 *Reply with doctor number to book appointment.*\n👉 अपॉइंटमेंट के लिए डॉक्टर नंबर टाइप करें।\n\n0️⃣ Back | 00 Main Menu`;
    return msg;
  },

  selectDate: (doctorName, options = []) => {
    if (!options.length) {
      return `👨‍⚕️ *Doctor Selected: ${doctorName}*\nआपने ${doctorName} का चयन किया है।\n\n📅 *Select Appointment Date / अपॉइंटमेंट की तारीख चुनें:*\n\n*Please type your preferred date in this format:*\nकृपया अपनी पसंदीदा तारीख इस फॉर्मेट में टाइप करें:\n\n📅 *DD/MM/YYYY*\n*(Example: 30/08/2026)*\n\n0️⃣ Back | 00 Main Menu`;
    }
    let msg = `👨‍⚕️ *Doctor Selected: ${doctorName}*\nआपने ${doctorName} का चयन किया है।\n\n📅 *Select Appointment Date / अपॉइंटमेंट की तारीख चुनें:*\n\n`;
    options.forEach((opt, i) => {
      msg += `${toEmojiDigit(i + 1)} ${opt.dateStr} \n          ${opt.label}\n`;
    });
    msg += `\n👉 *Reply with the number to book, or type a date (DD/MM/YYYY).*\n👉 अपॉइंटमेंट के लिए नंबर भेजें या तारीख (DD/MM/YYYY) टाइप करें।\n\n0️⃣ Back | 00 Main Menu`;
    return msg;
  },

  whoFor: (patients = []) => {
    let msg = `👤 *BOOKING FOR WHOM?*\n*कृपया चुनें कि अपॉइंटमेंट किसके लिए है:*\n\n`;
    if (Array.isArray(patients) && patients.length > 0) {
      patients.forEach((p, idx) => {
        msg += `${toEmojiDigit(idx + 1)} ${p.name}\n`;
      });
      msg += `${toEmojiDigit(patients.length + 1)} Someone Else / Family Member (नया मरीज)\n\n`;
    } else if (typeof patients === "string" && patients) {
      msg += `1️⃣ ${patients}\n2️⃣ Someone Else / Family Member (नया मरीज)\n\n`;
    } else {
      msg += `1️⃣ Someone Else / Family Member (नया मरीज)\n\n`;
    }
    msg += `0️⃣ Back | 00 Main Menu`;
    return msg;
  },

  patientName: () =>
    `📝 *Patient Name / मरीज का नाम*\n*Please enter the patient's full name.*\nमरीज का पूरा नाम दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  patientMobile: () =>
    `📱 *Mobile Number / मोबाइल नंबर*\n*Please enter 10-digit mobile number of patient/guardian.*\nमरीज/अभिभावक का 10 अंकों का मोबाइल नंबर दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  patientAge: () =>
    `🎂 *Age / उम्र*\n*Please enter the patient's age.*\nमरीज की उम्र दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  patientGender: () =>
    `⚧ *Gender / लिंग*\n*Please reply with:*\n1️⃣ Male / पुरुष\n2️⃣ Female / महिला\n3️⃣ Other / अन्य\n\n0️⃣ Back | 00 Main Menu`,

  patientType: (name = "") =>
    `📋 *PATIENT TYPE / मरीज का प्रकार*${name ? `\n*Patient: ${name}*` : ""}\n\n*Is this an Existing/Old Patient or a New Patient at KG Nanda Hospital?*\nक्या मरीज अस्पताल का पुराना मरीज है या नया मरीज?\n\n1️⃣ Old / Existing Patient (पुराना मरीज)\n2️⃣ New Patient (नया मरीज)\n\n0️⃣ Back | 00 Main Menu`,

  patientDistrict: () =>
    `📍 *District / जिले का नाम*\n*Please enter your district name.*\nअपने जिले का नाम दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  patientAddress: () =>
    `🏠 *Residential Address / आवासीय पता*\n*Please enter your residential address.*\nअपना आवासीय पता दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  patientPinCode: () =>
    `📮 *PIN Code / पिन कोड*\n*Please enter your 6-digit PIN code.*\n6 अंकों का पिन कोड दर्ज करें। (उदा: 232104)\n\n0️⃣ Back | 00 Main Menu`,

  patientProblem: () =>
    `🩺 *Health Problem / स्वास्थ्य समस्या*\n*Please briefly describe the patient's health problem.*\nकृपया मरीज की समस्या का संक्षिप्त विवरण दें।\n\n0️⃣ Back | 00 Main Menu`,

  review: (data) =>
    `📋 *REVIEW APPOINTMENT REQUEST*\n\n👨‍⚕️ Doctor: ${data.doctorName}\n📅 Preferred Date: ${data.date}\n\n👤 Patient: ${data.name}\n📱 Mobile: ${data.mobile}\n🎂 Age: ${data.age}\n⚧ Gender: ${data.gender}\n🏥 Type: ${data.isOld ? "Old / Existing Patient (पुराना मरीज)" : "New Patient (नया मरीज)"}\n📍 District: ${data.district}\n🏠 Address: ${data.address}${data.pinCode ? ` - ${data.pinCode}` : ""}\n🩺 Problem: ${data.problem}\n\n*Confirm details?*\n1️⃣ Confirm / पुष्टि करें\n2️⃣ Edit / बदलाव करें\n0️⃣ Main Menu`,

  appointmentConfirmed: (data) =>
    `✅ *Appointment Request Received!*\n✅ अपॉइंटमेंट अनुरोध सफलतापूर्वक प्राप्त हुआ!\n\n🎫 *Token No:* ${data.tokenNumber}\n🆔 *UHID No:* ${data.uhid}\n\n📋 *Appointment Details / विवरण:*\n👨‍⚕️ Doctor: ${data.doctorName}\n📅 Date: ${data.date}\n👤 Name: ${data.name}\n📱 Mobile: ${data.mobile}\n\n📌 *Your booking has been confirmed.*\n📌 आपकी बुकिंग की पुष्टि कर दी गई है।।\n\n👉 *To return to the main menu, send "Hi" or "Start".*\n👉 मुख्य मेनू पर लौटने के लिए "Hi" या "Start" भेजें।`,

  // Hospitalization
  hospWhoFor: (patients = []) => {
    let msg = `🏥 *HOSPITALIZATION / भर्ती किसके लिए है?*\n\n*Please choose a patient:* / कृपया मरीज चुनें:\n\n`;
    if (Array.isArray(patients) && patients.length > 0) {
      patients.forEach((p, idx) => {
        msg += `${toEmojiDigit(idx + 1)} ${p.name} (${p.age}y / ${p.gender || "N/A"})\n`;
      });
      msg += `${toEmojiDigit(patients.length + 1)} ➕ Add New Patient / नया मरीज जोड़ें\n\n`;
    } else {
      msg += `1️⃣ ➕ Add New Patient / नया मरीज जोड़ें\n\n`;
    }
    msg += `0️⃣ Back | 00 Main Menu`;
    return msg;
  },

  hospStart: () =>
    `🏥 *Hospitalization / Admission*\nअस्पताल में भर्ती हेतु अपॉइंटमेंट\n\n*To schedule a hospitalization, please enter the patient's full name:*\nभर्ती हेतु कृपया मरीज का पूरा नाम दर्ज करें:\n\n0️⃣ Back | 00 Main Menu`,

  hospMobile: () =>
    `📱 *Mobile Number / मोबाइल नंबर*\n*Please enter 10-digit mobile number of patient/guardian.*\nमरीज/अभिभावक का 10 अंकों का मोबाइल नंबर दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  hospAge: () =>
    `🎂 *Please enter the patient's age.*\nमरीज की उम्र दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  hospGender: () =>
    `⚧ *Gender / लिंग*\n*Please reply with:*\n1️⃣ Male / पुरुष\n2️⃣ Female / महिला\n3️⃣ Other / अन्य\n\n0️⃣ Back | 00 Main Menu`,

  hospType: (name = "") =>
    `📋 *PATIENT TYPE / मरीज का प्रकार*${name ? `\n*Patient: ${name}*` : ""}\n\n*Is this an Existing/Old Patient or a New Patient at KG Nanda Hospital?*\nक्या मरीज अस्पताल का पुराना मरीज है या नया मरीज?\n\n1️⃣ Old / Existing Patient (पुराना मरीज)\n2️⃣ New Patient (नया मरीज)\n\n0️⃣ Back | 00 Main Menu`,

  hospDistrict: () =>
    `📍 *District / जिले का नाम*\n*Please enter your district name.*\nअपने जिले का नाम दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  hospAddress: () =>
    `🏠 *Residential Address / आवासीय पता*\n*Please enter your residential address.*\nअपना आवासीय पता दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  hospPinCode: () =>
    `📮 *PIN Code / पिन कोड*\n*Please enter your 6-digit PIN code.*\n6 अंकों का पिन कोड दर्ज करें। (उदा: 232104)\n\n0️⃣ Back | 00 Main Menu`,

  hospProblem: () =>
    `🩺 *Please describe the illness/problem.*\nबीमारी का विवरण दें।\n\n0️⃣ Back | 00 Main Menu`,

  hospDate: (options = []) => {
    let msg = `🏥 *Preferred Admission Date / पसंदीदा भर्ती तारीख:*\n\n`;
    if (options.length) {
      options.forEach((opt, i) => {
        msg += `${toEmojiDigit(i + 1)} ${opt.dateStr} \n          ${opt.label}\n`;
      });
      msg += `\n👉 *Reply with the number to book, or type a date (DD/MM/YYYY).*\n👉 अपॉइंटमेंट के लिए नंबर भेजें या तारीख (DD/MM/YYYY) टाइप करें।\n0️⃣ Back | 00 Main Menu`;
    } else {
      msg += `\n*Please type your preferred date in DD/MM/YYYY format.*\nकृपया DD/MM/YYYY फॉर्मेट में तारीख लिखें।\n0️⃣ Back | 00 Main Menu`;
    }
    return msg;
  },

  hospReview: (data) =>
    `📋 *REVIEW HOSPITALIZATION REQUEST*\n\n🏥 Type: Hospitalization / Admission\n📅 Preferred Date: ${data.date}\n\n👤 Patient: ${data.name}\n📱 Mobile: ${data.mobile}\n🎂 Age: ${data.age}\n⚧ Gender: ${data.gender}\n🏥 Patient Status: ${data.isOld ? "Old / Existing Patient (पुराना मरीज)" : "New Patient (नया मरीज)"}\n📍 District: ${data.district}\n🏠 Address: ${data.address}${data.pinCode ? ` - ${data.pinCode}` : ""}\n🩺 Illness/Problem: ${data.problem}\n\n*Confirm hospitalization request?*\n1️⃣ Confirm / पुष्टि करें\n2️⃣ Edit / बदलाव करें\n0️⃣ Main Menu`,

  hospDone: (data = {}) =>
    `✅ *Hospitalization Request Received!*\n✅ अस्पताल में भर्ती का अनुरोध प्राप्त हुआ!\n\n${data.uhid ? `🆔 *UHID No:* ${data.uhid}\n` : ""}${data.tokenNumber ? `🎫 *Token No:* ${data.tokenNumber}\n` : ""}\nKindly contact the hospital reception desk.\nकृपया अस्पताल की रिसेप्शन से संपर्क करें\n\n👉 *To return to the main menu, send "Hi" or "Start".*\n👉 मुख्य मेनू पर लौटने के लिए "Hi" या "Start" भेजें।`,

  // Medicine
  medStart: () =>
    `💊 *Online Medicine Order*\nऑनलाइन घर बैठे दवा मंगाने की सुविधा\n\n📷 *Please send a photo of your prescription.*\nकृपया अपनी पर्ची की फोटो भेजें।\n\n0️⃣ Back | 00 Main Menu`,

  medWhoFor: (patients = []) => {
    let msg = `💊 *ORDER MEDICINE FOR WHOM?*\n*दवा किसके लिए मंगा रहे हैं?*\n\n`;
    if (Array.isArray(patients) && patients.length > 0) {
      patients.forEach((p, idx) => {
        msg += `${toEmojiDigit(idx + 1)} ${p.name}\n`;
      });
      msg += `${toEmojiDigit(patients.length + 1)} Someone Else / Family Member (नया मरीज)\n\n`;
    } else if (typeof patients === "string" && patients) {
      msg += `1️⃣ ${patients}\n2️⃣ Someone Else / Family Member (नया मरीज)\n\n`;
    } else {
      msg += `1️⃣ Someone Else / Family Member (नया मरीज)\n\n`;
    }
    msg += `0️⃣ Back | 00 Main Menu`;
    return msg;
  },

  medName: () =>
    `👤 *Patient Name / मरीज का नाम*\n*Please enter the patient's full name.*\nकृपया मरीज का पूरा नाम दर्ज करें।\n\n0️⃣ Back | 00 Main Menu`,

  medAddress: () =>
    `🏠 *Delivery Address / डिलीवरी का पता*\n*Please provide your complete delivery address.*\nकृपया अपना पूरा डिलीवरी पता भेजें।\n\n0️⃣ Back | 00 Main Menu`,

  medPinCode: () =>
    `📮 *PIN Code / पिन कोड*\n*Please enter your 6-digit PIN code for delivery.*\nडिलीवरी के लिए 6 अंकों का पिन कोड दर्ज करें। (उदा: 232104)\n\n0️⃣ Back | 00 Main Menu`,

  medDone: () =>
    `✅ *Prescription Received!*\nआपकी रिक्वेस्ट दर्ज कर ली गई है\n\n Our team will confirm the order and delivery details.\nहमारी टीम ऑर्डर और डिलीवरी की जानकारी देगी।\n\n👉 *To return to the main menu, send "Hi" or "Start".*\n👉 मुख्य मेनू पर लौटने के लिए "Hi" या "Start" भेजें।`,

  // Info / Support
  info: () =>
    `ℹ️ *General Query / Information*\nसामान्य जानकारी / अन्य जानकारी\n\n*Hospital Timings / अस्पताल का समय:*\n🕘 24x7 \n🕘 Sunday: Emergency only\n\n*Address / पता:*\n📍 KG Nanda Hospital, 
    Bichhiya Kala, Chandauli \n\n*Services / सेवाएं:*\n• OPD Consultation\n• Hospitalization\n• Emergency Care\n• Online Medicine Delivery\n\n0️⃣ Main Menu`,
  support: () =>
    `📞 *Talk to Support*\nअस्पताल सहायता केंद्र से संपर्क करें\n\n*For assistance, contact our helpline:*\n\n1️⃣ First Helpline: 8840376333\n2️⃣ Second Helpline: 9838850287\n\n0️⃣ Main Menu`,

  email: () =>
    `📧 *Email Help / ईमेल सहायता*\n\n*For email assistance, contact us at:*\n📧 admin@kgnandahospital.com\n\n0️⃣ Main Menu`,

  dailyBookingLimitExceeded: (uhid = '') =>
    `❌ *Booking Limit Reached / बुक सीमा पूरी*\n\n*A booking already exists for this patient${uhid ? ` (UHID: ${uhid})` : ''} on this date. Only 1 request per patient is allowed per day.*\nइस मरीज${uhid ? ` (UHID: ${uhid})` : ''} का इस तारीख के लिए पहले से अपॉइंटमेंट दर्ज है। एक मरीज के लिए प्रतिदिन केवल 1 अनुरोध की अनुमति है।\n\n0️⃣ Main Menu`,

  invalidInput: () =>
    `❌ Invalid input. Please try again or type "menu".\nगलत इनपुट। कृपया पुनः प्रयास करें।`,

  invalidMobile: () =>
    `❌ *Invalid Mobile Number / अमान्य मोबाइल नंबर*\n\n*Please enter a valid 10-digit mobile number.*\nकृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें। (उदा: 9876543210)\n\n0️⃣ Back | 00 Main Menu`,

  invalidPinCode: () =>
    `❌ *Invalid PIN Code / अमान्य पिन कोड*\n\n*Please enter a valid 6-digit PIN code.*\nकृपया 6 अंकों का सही पिन कोड दर्ज करें। (उदा: 232104)\n\n0️⃣ Back | 00 Main Menu`,

  doctorUnavailable: () =>
    `❌ *Selected Doctor is Unavailable / डॉक्टर उपलब्ध नहीं हैं*\n*The selected doctor is currently offline or inactive. Please select another doctor.*\nचयनित डॉक्टर वर्तमान में उपलब्ध या सक्रिय नहीं हैं। कृपया दूसरे डॉक्टर का चयन करें।`,

  maxPatientsReached: (doctorName = '', dateStr = '') =>
    `⚠️ *OPD Limit Reached / ओपीडी सीमा समाप्त*${doctorName ? `\n👨‍⚕️ Doctor: ${doctorName}` : ''}${dateStr ? `\n📅 Date: ${dateStr}` : ''}\n\nDaily OPD limit has crossed, Kindly book for another day\nइस डेट की OPD फुल हो चुकी है कृपया किसी अन्य दिन की OPD बुक करें\n\nAll right reserved by the hospital\n\n0️⃣ Back | 00 Main Menu`,
};
