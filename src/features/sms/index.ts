// Public surface of the patient SMS module (Messages inbox + SMS/Email log).

export { default as PatientMessagesPage } from "./PatientMessagesPage";
export { default as PatientCommunicationPage } from "./PatientCommunicationPage";
export { usePatientSms } from "./hooks/usePatientSms";
export { useSmsMergeContext } from "./hooks/useSmsMergeContext";
export { getSmsTransport, SMS_MODE } from "./smsService";
export type { SmsEntry, SmsStatus, SmsMessageType, SmsFilter } from "./smsModel";
export type { SmsTransport, SmsSendInput, SmsSendCapability } from "./transport/types";
