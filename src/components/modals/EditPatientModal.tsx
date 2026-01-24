import { X, Calendar, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  patientData?: any;
}

export default function EditPatientModal({
  isOpen,
  onClose,
  onSave,
  patientData,
}: EditPatientModalProps) {
  const [showSSN, setShowSSN] = useState(false);
  const [showAppointmentTimes, setShowAppointmentTimes] =
    useState(false);
  const [patientNote, setPatientNote] = useState("");
  const [hipaaNote, setHipaaNote] = useState("");
  const [isOrthoPatient, setIsOrthoPatient] = useState(false);
  const [studentStatus, setStudentStatus] = useState("No");

  // Form state
  const [formData, setFormData] = useState({
    patientId: "900097",
    respPartyId: "900068",
    title: "",
    preferredName: "Nick",
    pronouns: "Please Select",
    firstName: "Nicolas",
    lastName: "Miller",
    dob: "12/08/1993",
    sex: "Male",
    email: "",
    address1: "910 Watson St.",
    address2: "",
    city: "Coraopolis",
    state: "PA",
    zip: "15108",
    maritalStatus: "Single",
    ethnicity: "Nothing selected",
    referralType: "Patient",
    referredBy: "",
    preferredLanguage: "English",
    heightFt: "0",
    heightIn: "0.00",
    weight: "0",
    weightUnit: "lbs",
    chartNum: "",
    ssn: "",
    driverLicense: "",
    mediId: "",
    homePhone: "814-473-3058",
    cellPhone: "814-473-3058",
    workPhone: "",
    preferredContactMethod: "No Preference",
    schoolName: "",
    active: true,
    noAutoSMS: false,
    noAutoEmail: false,
    assignBenefitsToPatient: false,
    noCorrespondence: false,
    hipaaAgreement: true,
    addToQuickFill: false,
    preferredAppointmentTimes: "Please Select",
    healthcareGuardianName: "",
    healthcareGuardianPhone: "",
    emergencyContact: "",
    emergencyPhone: "",
    feeSchedule: "United Concordia PPO Plans - Excel",
    preferredProvider: "2022 - Jinna, Dhileep",
    preferredHygienist: "None",
    referredTo: "Please Select",
    referredToDate: "",
  });

  const [patientTypes, setPatientTypes] = useState({
    child: false,
    collectionProblem: false,
    employeeFamily: false,
    geriatric: false,
    shortNoticeAppointment: false,
    singleParent: false,
    spanishSpeaking: false,
  });

  const [appointmentPreferences, setAppointmentPreferences] =
    useState({
      mon: { am: false, pm: false },
      tue: { am: false, pm: false },
      wed: { am: false, pm: false },
      thu: { am: false, pm: false },
      fri: { am: false, pm: false },
      sat: { am: false, pm: false },
      sun: { am: false, pm: false },
    });

  const ethnicityOptions = [
    "Nothing selected",
    "Hispanic or Latino",
    "Not Hispanic or Latino",
    "Declined to Specify",
  ];

  const referralTypeOptions = [
    "Patient",
    "Doctor",
    "Friend/Family",
    "Insurance",
    "Website",
    "Social Media",
    "Advertisement",
    "Walk-in",
    "Other",
  ];

  const contactMethodOptions = [
    "No Preference",
    "Home Phone",
    "Cell Phone",
    "Work Phone",
    "Email",
    "Text Message",
  ];

  const handleAppointmentTimeCheckAll = () => {
    const allChecked = {
      mon: { am: true, pm: true },
      tue: { am: true, pm: true },
      wed: { am: true, pm: true },
      thu: { am: true, pm: true },
      fri: { am: true, pm: true },
      sat: { am: true, pm: true },
      sun: { am: true, pm: true },
    };
    setAppointmentPreferences(allChecked);
  };

  const handleAppointmentTimeReset = () => {
    const allUnchecked = {
      mon: { am: false, pm: false },
      tue: { am: false, pm: false },
      wed: { am: false, pm: false },
      thu: { am: false, pm: false },
      fri: { am: false, pm: false },
      sat: { am: false, pm: false },
      sun: { am: false, pm: false },
    };
    setAppointmentPreferences(allUnchecked);
  };

  const handleSave = () => {
    // Validation for required fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.dob ||
      !formData.sex ||
      !formData.address1 ||
      !formData.city ||
      !formData.state ||
      !formData.zip
    ) {
      alert("Please fill in all required fields marked with *");
      return;
    }

    onSave({
      ...formData,
      patientTypes,
      appointmentPreferences,
      patientNote,
      hipaaNote,
    });
    onClose();
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this patient? This action cannot be undone.",
      )
    ) {
      // Delete logic here
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto border-4 border-[#3A6EA5]">
        {/* Header - Medical Slate Theme */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2.5 flex items-center justify-between z-10 border-b-4 border-[#1F3A5F]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-white">
                PATIENT INFORMATION
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOrthoPatient}
                  onChange={(e) =>
                    setIsOrthoPatient(e.target.checked)
                  }
                  className="w-3.5 h-3.5 rounded border-2 border-white"
                />
                <span className="text-sm">Ortho Patient</span>
              </label>
            </div>
            <div className="text-[#B0C4DE] text-xs mt-1">
              Modified By: UDAFIX | Modified On: 12/21/2025
              10:23 AM PT
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#16314d] p-1.5 rounded transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Top Bar Info - Medical Slate Theme */}
        <div className="bg-[#F7F9FC] px-4 py-2 border-b-2 border-[#E2E8F0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <div>
              Home Office:{" "}
              <span className="text-[#1F3A5F] font-semibold">
                MOON
              </span>
            </div>
            <div>
              First Visit:{" "}
              <span className="text-[#1F3A5F] font-semibold">
                09/08/2015
              </span>
            </div>
            <div>
              Exit Pnt:{" "}
              <span className="text-[#1F3A5F] font-semibold">
                -1639.69
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-4">
          {/* Left Column - Main Form */}
          <div className="col-span-8 space-y-4">
            {/* Patient ID and Resp Party ID */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={formData.patientId}
                  readOnly
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Resp Party ID
                </label>
                <input
                  type="text"
                  value={formData.respPartyId}
                  readOnly
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
                />
              </div>
            </div>

            {/* Title, Preferred Name, Pronouns */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Title
                </label>
                <select
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                >
                  <option value=""></option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Preferred Name
                </label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredName: e.target.value,
                    })
                  }
                  placeholder="Nick"
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Pronouns
                </label>
                <select
                  value={formData.pronouns}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pronouns: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                >
                  <option value="Please Select">
                    Please Select
                  </option>
                  <option value="He/Him">He/Him</option>
                  <option value="She/Her">She/Her</option>
                  <option value="They/Them">They/Them</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* First Name, Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Last Name{" "}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastName: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  First Name{" "}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firstName: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* DOB, Age, Sex */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Birth Date{" "}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dob: e.target.value,
                      })
                    }
                    placeholder="MM/DD/YYYY"
                    required
                    className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  />
                  <button className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors">
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Age
                </label>
                <input
                  type="text"
                  value="32"
                  readOnly
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Sex <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sex: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Marital Status, Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Marital Status
                </label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maritalStatus: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Address{" "}
                <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.address1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address1: e.target.value,
                  })
                }
                required
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent mb-2 text-sm"
              />
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Address 2
              </label>
              <input
                type="text"
                value={formData.address2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address2: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
              />
            </div>

            {/* City, State, Zip */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  City <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      city: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  State{" "}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      state: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                >
                  <option value="PA">PA</option>
                  <option value="OH">OH</option>
                  <option value="NY">NY</option>
                  <option value="NJ">NJ</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Zip <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      zip: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* PATIENT STATUS Section */}
            <div className="border-t-2 border-[#E2E8F0] pt-3">
              <h3 className="text-[#1F3A5F] font-bold mb-3 text-sm uppercase tracking-wide">
                PATIENT STATUS
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Ethnicity
                  </label>
                  <select
                    value={formData.ethnicity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ethnicity: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    {ethnicityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Referral Type{" "}
                    <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={formData.referralType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        referralType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    {referralTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Referred By
                  </label>
                  <input
                    type="text"
                    value={formData.referredBy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        referredBy: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Preferred Language
                  </label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredLanguage: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-4 gap-3 mt-3">
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Height (ft)
                  </label>
                  <input
                    type="text"
                    value={formData.heightFt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heightFt: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Height (in)
                  </label>
                  <input
                    type="text"
                    value={formData.heightIn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heightIn: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Unit
                  </label>
                  <select
                    value={formData.weightUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weightUnit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PATIENT NOTE Section */}
            <div className="border-t-2 border-[#E2E8F0] pt-3">
              <h3 className="text-[#1F3A5F] font-bold mb-3 text-sm uppercase tracking-wide">
                PATIENT NOTE
              </h3>
              <div className="space-y-3">
                {/* Identity & Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Chart #
                    </label>
                    <input
                      type="text"
                      value={formData.chartNum}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chartNum: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      SSN
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showSSN ? "text" : "password"}
                        value={formData.ssn}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ssn: e.target.value,
                          })
                        }
                        placeholder="***-**-****"
                        className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSSN(!showSSN)}
                        className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors flex items-center gap-1 text-sm"
                      >
                        {showSSN ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span>SHOW</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Driver License
                    </label>
                    <input
                      type="text"
                      value={formData.driverLicense}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          driverLicense: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Medi ID
                    </label>
                    <input
                      type="text"
                      value={formData.mediId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mediId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Home #
                    </label>
                    <input
                      type="text"
                      value={formData.homePhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          homePhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Cell #
                    </label>
                    <input
                      type="text"
                      value={formData.cellPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cellPhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Work #
                    </label>
                    <input
                      type="text"
                      value={formData.workPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          workPhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Pref Contact Method
                    </label>
                    <select
                      value={formData.preferredContactMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferredContactMethod:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    >
                      {contactMethodOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Student Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                      Student
                    </label>
                    <select
                      value={studentStatus}
                      onChange={(e) =>
                        setStudentStatus(e.target.value)
                      }
                      className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    >
                      <option value="No">No</option>
                      <option value="Part-time">
                        Part-time
                      </option>
                      <option value="Full-time">
                        Full-time
                      </option>
                    </select>
                  </div>
                  {studentStatus !== "No" && (
                    <div>
                      <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                        School Name
                      </label>
                      <input
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            schoolName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          active: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      Active
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noAutoSMS}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          noAutoSMS: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      No Auto SMS
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignBenefitsToPatient}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assignBenefitsToPatient:
                            e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      Assign Benefits to Patient
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noAutoEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          noAutoEmail: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      No Auto Email
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noCorrespondence}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          noCorrespondence: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      No Correspondence
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hipaaAgreement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hipaaAgreement: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      HIPAA Agreement
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.addToQuickFill}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addToQuickFill: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] text-sm">
                      Add Patient to Quick-Fill List
                    </span>
                  </label>
                </div>

                {/* Preferred Appointment Times */}
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Preferred Appointment Times
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.preferredAppointmentTimes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferredAppointmentTimes:
                            e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    >
                      <option value="Please Select">
                        Please Select
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setShowAppointmentTimes(true)
                      }
                      className="px-3 py-1.5 text-[#3A6EA5] hover:text-[#1F3A5F] font-medium text-sm whitespace-nowrap"
                    >
                      Set Times
                    </button>
                  </div>
                </div>

                {/* Patient Note */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#1E293B] font-medium text-sm">
                      Patient Note (Max 1000 chars)
                    </label>
                    <span className="text-[#64748B] text-xs">
                      {1000 - patientNote.length} remaining
                    </span>
                  </div>
                  <textarea
                    value={patientNote}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        setPatientNote(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent h-20 text-sm"
                  />
                </div>

                {/* HIPAA Information Sharing */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#1F3A5F] font-bold text-sm uppercase tracking-wide">
                      HIPAA Information Sharing (Max 1000 chars)
                    </label>
                    <span className="text-[#64748B] text-xs">
                      {1000 - hipaaNote.length} remaining
                    </span>
                  </div>
                  <textarea
                    value={hipaaNote}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        setHipaaNote(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent h-20 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Patient Type & Office Settings */}
          <div className="col-span-4 space-y-4">
            {/* Patient Type */}
            <div className="bg-[#F7F9FC] p-3 rounded-lg border-2 border-[#E2E8F0]">
              <h3 className="text-[#1F3A5F] font-bold mb-2 text-sm uppercase tracking-wide">
                Patient Type
              </h3>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.child}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        child: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    CH - Child
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.collectionProblem}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        collectionProblem: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    CP - Collection Problem, See Notes
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.employeeFamily}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        employeeFamily: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    EF - Employee & Family
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.geriatric}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        geriatric: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    GR - Geriatric
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      patientTypes.shortNoticeAppointment
                    }
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        shortNoticeAppointment:
                          e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    SN - Short Notice Appointment
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.singleParent}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        singleParent: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    SP - Single Parent
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.spanishSpeaking}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        spanishSpeaking: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] text-sm">
                    SS - Spanish Speaking
                  </span>
                </label>
              </div>
            </div>

            {/* Health Care Guardian */}
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Health Care Guardian Name
              </label>
              <input
                type="text"
                value={formData.healthcareGuardianName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    healthcareGuardianName: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent mb-2 text-sm"
              />
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Health Care Guardian Phone
              </label>
              <input
                type="text"
                value={formData.healthcareGuardianPhone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    healthcareGuardianPhone: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Emergency Contact
              </label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent mb-2 text-sm"
              />
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Emergency Phone
              </label>
              <input
                type="text"
                value={formData.emergencyPhone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyPhone: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
              />
            </div>

            {/* OFFICE Section */}
            <div className="border-t-2 border-[#E2E8F0] pt-3">
              <h3 className="text-[#1F3A5F] font-bold mb-2 text-sm uppercase tracking-wide">
                OFFICE
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="flex items-center gap-1 text-[#1E293B] font-medium mb-1 text-sm">
                    Fee Schedule
                    <span className="text-[#3A6EA5] cursor-pointer hover:text-[#1F3A5F]">
                      ℹ️
                    </span>
                  </label>
                  <select
                    value={formData.feeSchedule}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        feeSchedule: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    <option value="United Concordia PPO Plans - Excel">
                      United Concordia PPO Plans - Excel
                    </option>
                    <option value="Standard Fee">
                      Standard Fee
                    </option>
                    <option value="PPO Plan">PPO Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Pref Provider
                  </label>
                  <select
                    value={formData.preferredProvider}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredProvider: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    <option value="2022 - Jinna, Dhileep">
                      2022 - Jinna, Dhileep
                    </option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Pref Hygienist
                  </label>
                  <select
                    value={formData.preferredHygienist}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredHygienist: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Referred To
                  </label>
                  <select
                    value={formData.referredTo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        referredTo: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                  >
                    <option value="Please Select">
                      Please Select
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                    Ref To Date
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.referredToDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referredToDate: e.target.value,
                        })
                      }
                      placeholder="MM/DD/YYYY"
                      className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
                    />
                    <button className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors">
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Medical Slate Theme */}
        <div className="sticky bottom-0 bg-[#F7F9FC] border-t-2 border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors text-sm font-medium">
              UPDATE ADDRESSES
            </button>
            <button className="px-3 py-1.5 bg-[#F59E0B] text-white rounded hover:bg-[#D97706] transition-colors text-sm font-medium">
              MOVE PATIENTS
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-[#EF4444] text-white rounded hover:bg-[#DC2626] transition-colors text-sm font-medium"
            >
              DELETE PATIENT
            </button>
            <button className="px-3 py-1.5 bg-[#8B5CF6] text-white rounded hover:bg-[#7C3AED] transition-colors text-sm font-medium">
              PATIENT PICTURE
            </button>
            <button className="px-3 py-1.5 bg-[#8B5CF6] text-white rounded hover:bg-[#7C3AED] transition-colors text-sm font-medium">
              PATIENT FINGERPRINT
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-6 py-1.5 bg-[#2FB9A7] text-white rounded hover:bg-[#26a396] transition-colors font-bold text-sm shadow-md"
            >
              SAVE
            </button>
            <button
              onClick={onClose}
              className="px-6 py-1.5 bg-[#64748B] text-white rounded hover:bg-[#475569] transition-colors font-bold text-sm"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Times Popup - Medical Slate Theme */}
      {showAppointmentTimes && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl border-4 border-[#3A6EA5]">
            <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2.5 flex items-center justify-between rounded-t-lg border-b-4 border-[#1F3A5F]">
              <h3 className="font-bold text-white">
                PREFERRED APPOINTMENT TIMES
              </h3>
              <button
                onClick={() => setShowAppointmentTimes(false)}
                className="text-white hover:bg-[#16314d] p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <div className="p-4">
              <table className="w-full border-2 border-[#E2E8F0]">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                    <th className="border border-[#E2E8F0] px-4 py-2 text-left font-bold">
                      Day
                    </th>
                    <th className="border border-[#E2E8F0] px-4 py-2 text-center font-bold">
                      AM
                    </th>
                    <th className="border border-[#E2E8F0] px-4 py-2 text-center font-bold">
                      PM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    "mon",
                    "tue",
                    "wed",
                    "thu",
                    "fri",
                    "sat",
                    "sun",
                  ].map((day) => (
                    <tr
                      key={day}
                      className="hover:bg-[#F7F9FC]"
                    >
                      <td className="border border-[#E2E8F0] px-4 py-2 capitalize text-[#1E293B] font-medium">
                        {day}
                      </td>
                      <td className="border border-[#E2E8F0] px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={
                            appointmentPreferences[
                              day as keyof typeof appointmentPreferences
                            ].am
                          }
                          onChange={(e) =>
                            setAppointmentPreferences({
                              ...appointmentPreferences,
                              [day]: {
                                ...appointmentPreferences[
                                  day as keyof typeof appointmentPreferences
                                ],
                                am: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                        />
                      </td>
                      <td className="border border-[#E2E8F0] px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={
                            appointmentPreferences[
                              day as keyof typeof appointmentPreferences
                            ].pm
                          }
                          onChange={(e) =>
                            setAppointmentPreferences({
                              ...appointmentPreferences,
                              [day]: {
                                ...appointmentPreferences[
                                  day as keyof typeof appointmentPreferences
                                ],
                                pm: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAppointmentTimeCheckAll}
                  className="px-4 py-1.5 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors font-medium text-sm"
                >
                  Check All
                </button>
                <button
                  onClick={handleAppointmentTimeReset}
                  className="px-4 py-1.5 bg-[#64748B] text-white rounded hover:bg-[#475569] transition-colors font-medium text-sm"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowAppointmentTimes(false)}
                  className="px-4 py-1.5 bg-[#2FB9A7] text-white rounded hover:bg-[#26a396] transition-colors font-medium text-sm ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}