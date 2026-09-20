// PatientProblem.js

const patientProblemCategoryPrompt = () => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: {
      text: "🩺 *Patient Problem / मरीज की समस्या*\n\nकृपया मरीज की स्वास्थ्य समस्या की श्रेणी चुनें या लिखकर बताएं।\n\nPlease select the patient's health problem category or type it out."
    },
    action: {
      buttons: [
        {
          type: "reply",
          reply: {
            id: "CHOOSE_PART_1",
            title: "Common Problems"
          }
        },
        {
          type: "reply",
          reply: {
            id: "CHOOSE_PART_2",
            title: "More Problems"
          }
        },
        {
          type: "reply",
          reply: {
            id: "CHOOSE_TYPE",
            title: "Type Problem"
          }
        }
      ]
    }
  }
});

const patientProblemsPart1 = () => ({
  type: "interactive",
  interactive: {
    type: "list",
    header: {
      type: "text",
      text: "🩺 Patient Problem"
    },
    body: {
      text: "कृपया मरीज की स्वास्थ्य समस्या का चयन करें।\n\nPlease select the patient's health problem."
    },
    footer: {
      text: "Select one option"
    },
    action: {
      button: "Select Problem",
      sections: [
        {
          title: "Common Health Problems",
          rows: [
            {
              id: "LOW_BACK_PAIN",
              title: "Low Back Pain",
              description: "कमर में दर्द होना"
            },
            {
              id: "FEVER_COUGH",
              title: "Fever & Cough",
              description: "बुखार एवं खांसी"
            },
            {
              id: "FEVER_JAUNDICE",
              title: "Fever & Jaundice",
              description: "बुखार एवं पीलिया"
            },
            {
              id: "DIFFUSE_ABDOMINAL_PAIN",
              title: "Diffuse Abdominal Pain",
              description: "पेट में दर्द होना"
            },
            {
              id: "ABDOMINAL_PAIN_VOMITING",
              title: "Abdominal Pain & Vomiting",
              description: "पेट में दर्द के साथ उल्टी होना"
            },
            {
              id: "AMENORRHEA",
              title: "Amenorrhea",
              description: "मासिक धर्म का न आना"
            },
            {
              id: "DYSMENORRHEA",
              title: "Dysmenorrhea",
              description: "मासिक धर्म के दौरान असहनीय दर्द एवं ऐंठन"
            },
            {
              id: "MENORRHAGIA",
              title: "Menorrhagia",
              description: "अत्यधिक या भारी मासिक धर्म"
            }
          ]
        }
      ]
    }
  }
});

const patientProblemsPart2 = () => ({
  type: "interactive",
  interactive: {
    type: "list",
    header: {
      type: "text",
      text: "🩺 Patient Problem"
    },
    body: {
      text: "कृपया मरीज की स्वास्थ्य समस्या का चयन करें।\n\nPlease select the patient's health problem."
    },
    footer: {
      text: "Select one option"
    },
    action: {
      button: "Select Problem",
      sections: [
        {
          title: "Other Health Problems",
          rows: [
            {
              id: "PCOD",
              title: "PCOD",
              description: "अनियमित पीरियड्स, वजन बढ़ना, त्वचा की समस्याएं"
            },
            {
              id: "ENTEROCOLITIS",
              title: "Enterocolitis",
              description: "छोटी आंत और बड़ी आंत को एक साथ होने वाली सूजन"
            },
            {
              id: "COLITIS",
              title: "Colitis",
              description: "बड़ी आंत की सूजन"
            },
            {
              id: "NEPHROLITHIASIS",
              title: "Nephrolithiasis",
              description: "मूत्र की पथरी या किडनी स्टोन"
            },
            {
              id: "CHOLESTATIC_LIVER_DISEASE",
              title: "Cholestatic Liver Disease",
              description: "लिवर से पित्त (Bile) का प्रवाह धीमा या पूरी तरह रुक जाना"
            },
            {
              id: "OBSTRUCTIVE_JAUNDICE",
              title: "Obstructive Jaundice",
              description: "Bile Duct में blockage के कारण पित्त आगे नहीं बढ़ पाता"
            },
            {
              id: "GALLBLADDER_STONES",
              title: "Gallbladder Stones",
              description: "पित्ताशय की पथरी / Gallbladder Stone"
            },
            {
              id: "OTHER",
              title: "Other",
              description: "अन्य समस्या लिखें / Write your problem"
            }
          ]
        }
      ]
    }
  }
});

// Selected problem ka readable data
const patientProblemData = {
  LOW_BACK_PAIN: {
    en: "Low Back Pain",
    hi: "कमर में दर्द होना"
  },
  FEVER_COUGH: {
    en: "Fever & Cough",
    hi: "बुखार एवं खांसी"
  },
  FEVER_JAUNDICE: {
    en: "Fever & Jaundice",
    hi: "बुखार एवं पीलिया"
  },
  DIFFUSE_ABDOMINAL_PAIN: {
    en: "Diffuse Abdominal Pain",
    hi: "पेट में दर्द होना"
  },
  ABDOMINAL_PAIN_VOMITING: {
    en: "Abdominal Pain & Vomiting",
    hi: "पेट में दर्द के साथ उल्टी होना"
  },
  AMENORRHEA: {
    en: "Amenorrhea",
    hi: "मासिक धर्म का न आना"
  },
  DYSMENORRHEA: {
    en: "Dysmenorrhea",
    hi: "मासिक धर्म के दौरान असहनीय दर्द एवं ऐंठन"
  },
  MENORRHAGIA: {
    en: "Menorrhagia",
    hi: "अत्यधिक या भारी मासिक धर्म"
  },
  PCOD: {
    en: "PCOD",
    hi: "अनियमित पीरियड्स, वजन बढ़ना, त्वचा की समस्याएं एवं अनचाहे बाल"
  },
  ENTEROCOLITIS: {
    en: "Enterocolitis",
    hi: "छोटी आंत और बड़ी आंत की सूजन"
  },
  COLITIS: {
    en: "Colitis",
    hi: "बड़ी आंत की सूजन"
  },
  NEPHROLITHIASIS: {
    en: "Nephrolithiasis",
    hi: "मूत्र की पथरी या किडनी स्टोन"
  },
  CHOLESTATIC_LIVER_DISEASE: {
    en: "Cholestatic Liver Disease",
    hi: "लिवर से पित्त (Bile) का प्रवाह धीमा या रुक जाना"
  },
  OBSTRUCTIVE_JAUNDICE: {
    en: "Obstructive Jaundice",
    hi: "Bile Duct में blockage के कारण पित्त का आगे न बढ़ पाना"
  },
  GALLBLADDER_STONES: {
    en: "Gallbladder Stones",
    hi: "पित्ताशय की पथरी"
  }
};

// Other option select hone par ye message bheje
const PatientProblem = () =>
  `🩺 *Patient Problem / मरीज की समस्या*\n\nकृपया मरीज की स्वास्थ्य समस्या लिखें।\n\nPlease type the patient's health problem.\n\nExample:\n• Stomach Pain\n• Headache\n• Chest Pain\n\n0️⃣ Back | 00 Main Menu`;

export {
  patientProblemCategoryPrompt,
  patientProblemsPart1,
  patientProblemsPart2,
  patientProblemData,
  PatientProblem,
};
