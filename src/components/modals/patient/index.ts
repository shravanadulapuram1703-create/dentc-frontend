// Patient Modal Components - Barrel Export

export * from './types';
export * from './constants';
export { patientFormReducer, patientTypesReducer } from './reducers';
export { default as PatientHeader } from './PatientHeader';
export { default as PatientIdentitySection } from './PatientIdentitySection';
export { default as AddressSection } from './AddressSection';
export { default as PatientStatusSection } from './PatientStatusSection';
export { default as FooterActions } from './FooterActions';
